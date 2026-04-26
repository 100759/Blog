import { Hono } from "hono";
import { wrapTime } from "hono/timing";
import type { AppContext } from "../core/hono-types";
import { setAIConfig, getAIConfig } from "../utils/db-config";
import { generateAIText, testAIModel } from "../utils/ai";
import { notify } from "../utils/webhook";
import {
    buildCombinedConfigResponse,
    buildClientConfigResponse,
    buildServerConfigResponse,
    isConfigType,
    persistRegularConfig,
    resolveWebhookConfig,
    splitConfigPayload,
} from "./config-helpers";
import { buildHealthCheckResponse } from "./config-health";
import { buildQueueStatusResponse, deleteQueueStatusTask, retryQueueStatusTask } from "./config-queue-status";
import { profileAsync } from "../core/server-timing";
import {
    applyBlurhashCompatUpdate,
    buildCompatTasksResponse,
    listBlurhashCompatCandidates,
    runCompatAISummaryBackfill,
} from "./config-compat-tasks";

export function ConfigService(): Hono {
    const app = new Hono();

    function serializeBootstrapScript(config: Record<string, unknown>) {
        const serialized = JSON.stringify(config)
            .replace(/</g, "\\u003C")
            .replace(/>/g, "\\u003E")
            .replace(/&/g, "\\u0026")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029");

        return `globalThis.__RIN_CLIENT_CONFIG__=${serialized};`;
    }

    function extractUrls(input: string) {
        return Array.from(new Set(input.match(/https?:\/\/[^\s"'<>，。)）]+/g) || [])).slice(0, 3);
    }

    function stripHtml(html: string) {
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, " ")
            .trim();
    }

    function matchMeta(html: string, name: string) {
        const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
        return html.match(pattern)?.[1]?.trim() || "";
    }

    async function fetchPageContext(url: string) {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "FuHengBlog-AI-Publisher/1.0",
                "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
            },
            redirect: "follow",
        });

        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();
        const html = text.slice(0, 160000);
        const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
        const description = matchMeta(html, "description") || matchMeta(html, "og:description");
        const siteName = matchMeta(html, "og:site_name");
        const plainText = contentType.includes("html") ? stripHtml(html) : text.replace(/\s+/g, " ").trim();

        return {
            url,
            finalUrl: response.url,
            status: response.status,
            title,
            description,
            siteName,
            excerpt: plainText.slice(0, 5000),
        };
    }

    function buildPortfolioAIPrompt(target: string, input: string, pages: Array<Record<string, unknown>>) {
        const workSchema = `{
  "title": "作品标题",
  "slug": "english-kebab-case",
  "type": "program | design | image",
  "status": "状态",
  "date": "年份或日期",
  "summary": "一句话介绍，80字内",
  "detail": "详细说明，150到260字",
  "coverTone": "from-teal-100 via-cyan-50 to-stone-50",
  "tools": ["工具或技术"],
  "highlights": ["亮点"],
  "role": "我负责的内容",
  "metrics": ["展示指标"],
  "access": { "mode": "open | closed", "label": "按钮文字", "url": "GitHub或下载地址" },
  "href": "作品入口，可为空",
  "gallery": ["图片分类，可为空"]
}`;
        const siteSchema = `{
  "name": "网站名称",
  "url": "https://example.com",
  "description": "网站说明，80到160字",
  "platform": "Cloudflare Workers | Cloudflare Pages | Vercel | 自有服务器",
  "role": "主站/备用/项目等",
  "status": "运行中/维护中等",
  "color": "bg-teal-600"
}`;

        return [
            "你是一个中文个人站内容管理员。你可以阅读我提供的网页抓取内容，并基于网页事实和用户补充信息生成结构化 JSON。",
            "只输出 JSON，不要 Markdown，不要解释，不要代码块。不要编造网页里没有、用户也没提到的具体技术栈；无法判断时用稳妥、通用的描述。",
            `目标类型：${target === "site" ? "旗下网站" : "作品"}`,
            `JSON 结构：${target === "site" ? siteSchema : workSchema}`,
            "规则：slug 必须是英文小写、数字、短横线；作品 type 只能是 program/design/image；如果检测到 GitHub、源码、开源、下载地址则 access.mode=open，否则 closed；网站平台无法判断时优先 Cloudflare Workers。",
            `用户输入：\n${input}`,
            `网页抓取内容：\n${JSON.stringify(pages, null, 2)}`,
        ].join("\n\n");
    }

    // POST /config/test-ai - Test AI model configuration
    // NOTE: Must be defined BEFORE /:type route to avoid being captured as a type parameter
    app.post('/test-ai', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const env = c.get('env');
        const serverConfig = c.get('serverConfig');
        const body = await wrapTime(c, 'request_body', c.req.json());

        // Get current AI config from database
        const config = await wrapTime(c, 'ai_config', getAIConfig(serverConfig));

        // Build test config with overrides
        const testConfig = {
            provider: body.provider || config.provider,
            model: body.model || config.model,
            api_url: body.api_url !== undefined ? body.api_url : config.api_url,
            api_key: body.api_key !== undefined ? body.api_key : config.api_key,
        };

        // Test prompt
        const testPrompt = body.testPrompt || "Hello! This is a test message. Please respond with a simple greeting.";

        // Use unified test function
        const result = await wrapTime(c, 'ai_test', testAIModel(env, testConfig, testPrompt));
        return c.json(result);
    });

    app.post('/portfolio-ai', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const body = await wrapTime(c, 'request_body', c.req.json()) as {
            target?: "work" | "site";
            input?: string;
        };
        const input = body.input?.trim() || "";

        if (!input) {
            return c.json({ success: false, error: "Input is required" }, 400);
        }

        const urls = extractUrls(input);
        const pages = await wrapTime(c, 'portfolio_url_context', Promise.all(urls.map(async (url) => {
            try {
                return await fetchPageContext(url);
            } catch (error) {
                return {
                    url,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        })));
        const prompt = buildPortfolioAIPrompt(body.target === "site" ? "site" : "work", input, pages);
        const result = await wrapTime(c, 'portfolio_ai', generateAIText(c.get('env'), c.get('serverConfig'), [
            {
                role: "system",
                content: "你是严谨的中文信息抽取助手，必须输出可 JSON.parse 的 JSON 对象。",
            },
            {
                role: "user",
                content: prompt,
            },
        ]));

        return c.json({
            ...result,
            pages,
        });
    });

    app.post('/test-webhook', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const env = c.get('env');
        const serverConfig = c.get('serverConfig');
        const body = await wrapTime(c, 'request_body', c.req.json()) as {
            webhook_url?: string;
            "webhook.method"?: string;
            "webhook.content_type"?: string;
            "webhook.headers"?: string;
            "webhook.body_template"?: string;
            test_message?: string;
        };

        const {
            webhookUrl,
            webhookMethod: resolvedWebhookMethod,
            webhookContentType: resolvedWebhookContentType,
            webhookHeaders: resolvedWebhookHeaders,
            webhookBodyTemplate: resolvedWebhookBodyTemplate,
        } = await wrapTime(c, 'webhook_config', resolveWebhookConfig(serverConfig, env, body));
        const frontendUrl = new URL(c.req.url).origin;
        const testMessage = body.test_message?.trim() || "This is a test webhook message from Rin settings.";

        if (!webhookUrl?.trim()) {
            return c.json({ success: false, error: "Webhook URL is required" }, 400);
        }

        try {
            const response = await wrapTime(c, 'webhook_send', notify(
                    webhookUrl,
                    {
                        event: "webhook.test",
                        message: testMessage,
                        title: "Webhook Test",
                        url: `${frontendUrl}/admin/settings`,
                        username: "admin",
                        content: testMessage,
                        description: "Manual webhook test triggered from settings.",
                    },
                    {
                        method: resolvedWebhookMethod,
                        contentType: resolvedWebhookContentType,
                        headers: resolvedWebhookHeaders,
                        bodyTemplate: resolvedWebhookBodyTemplate,
                    },
                ));

            if (!response) {
                return c.json({ success: false, error: "Webhook request was not sent" }, 400);
            }

            if (!response.ok) {
                const details = await response.text();
                return c.json({
                    success: false,
                    error: `Webhook test failed with status ${response.status}`,
                    details,
                }, 400);
            }

            return c.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return c.json({ success: false, error: message }, 400);
        }
    });

    // GET /config
    app.get('/', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');

        return c.json(await wrapTime(c, 'config_response', buildCombinedConfigResponse(clientConfig, serverConfig, env)));
    });

    // GET /config/health
    app.get('/health', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');

        return c.json(await wrapTime(c, 'health_check', buildHealthCheckResponse(clientConfig, serverConfig, env)));
    });

    app.get('/queue-status', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const db = c.get('db');
        const env = c.get('env');

        return c.json(await wrapTime(c, 'queue_status', buildQueueStatusResponse(db, env)));
    });

    app.get('/compat-tasks', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        return c.json(await wrapTime(c, 'compat_tasks', buildCompatTasksResponse(c.get('db'), c.get('serverConfig'), c.get('env'))));
    });

    app.post('/compat-tasks/ai-summary', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        try {
            const body = c.req.header('content-type')?.includes('application/json')
                ? await wrapTime(c, 'request_body', c.req.json()) as { force?: boolean }
                : {};
            return c.json(await wrapTime(c, 'compat_ai_summary', runCompatAISummaryBackfill(c.get('db'), c.get('cache'), c.get('serverConfig'), c.get('env'), Boolean(body.force))));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return c.text(message, 400);
        }
    });

    app.get('/compat-tasks/blurhash', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        return c.json(await wrapTime(c, 'compat_blurhash_list', listBlurhashCompatCandidates(c.get('db'))));
    });

    app.post('/compat-tasks/blurhash/:id', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const id = Number(c.req.param('id'));
        if (!Number.isInteger(id) || id <= 0) {
            return c.text('Invalid feed id', 400);
        }

        const body = await wrapTime(c, 'request_body', c.req.json()) as { content?: string };
        if (!body.content) {
            return c.text('Content is required', 400);
        }

        try {
            return c.json(await wrapTime(c, 'compat_blurhash_apply', applyBlurhashCompatUpdate(c.get('db'), c.get('cache'), id, body.content)));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = message === 'Feed not found' ? 404 : 400;
            return c.text(message, status);
        }
    });

    app.post('/queue-status/:id/retry', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const id = Number(c.req.param('id'));
        if (!Number.isInteger(id) || id <= 0) {
            return c.text('Invalid feed id', 400);
        }

        try {
            await wrapTime(c, 'queue_retry', retryQueueStatusTask(c.get('db'), c.get('cache'), c.get('serverConfig'), c.get('env'), id));
            return c.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = message === 'Feed not found' ? 404 : 400;
            return c.text(message, status);
        }
    });

    app.delete('/queue-status/:id', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const id = Number(c.req.param('id'));
        if (!Number.isInteger(id) || id <= 0) {
            return c.text('Invalid feed id', 400);
        }

        try {
            await wrapTime(c, 'queue_delete', deleteQueueStatusTask(c.get('db'), c.get('cache'), id));
            return c.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const status = message === 'Feed not found' ? 404 : 400;
            return c.text(message, status);
        }
    });

    app.get('/client/bootstrap.js', async (c: AppContext) => {
        const clientConfig = c.get('clientConfig');
        const serverConfig = c.get('serverConfig');
        const env = c.get('env');
        const profile = <T>(name: string, task: () => Promise<T>) => profileAsync(c, name, task);
        const config = await profileAsync(c, 'bootstrap_client_config', () => buildClientConfigResponse(clientConfig, serverConfig, env, profile));
        const script = await profileAsync(c, 'bootstrap_script', () => Promise.resolve(serializeBootstrapScript(config)));

        return new Response(script, {
            status: 200,
            headers: {
                'content-type': 'application/javascript; charset=utf-8',
                'cache-control': 'public, max-age=0, must-revalidate',
            },
        });
    });

    // GET /config/:type
    app.get('/:type', async (c: AppContext) => {
        const admin = c.get('admin');
        const type = c.req.param('type');
        
        if (!isConfigType(type)) {
            return c.text('Invalid type', 400);
        }
        
        if (type === 'server' && !admin) {
            return c.text('Unauthorized', 401);
        }
        
        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');
        
        if (type === 'server') {
            return c.json(await buildServerConfigResponse(serverConfig, env));
        }
        
        return c.json(await buildClientConfigResponse(clientConfig, serverConfig, env));
    });

    // POST /config
    app.post('/', async (c: AppContext) => {
        const admin = c.get('admin');

        if (!admin) {
            return c.text('Unauthorized', 401);
        }

        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const env = c.get('env');
        const body = await c.req.json() as {
            clientConfig?: Record<string, unknown>;
            serverConfig?: Record<string, unknown>;
        };

        const nextClientConfig = body.clientConfig ?? {};
        const nextServerConfig = body.serverConfig ?? {};

        const { regularConfig: regularClientConfig } = splitConfigPayload(nextClientConfig);
        const { regularConfig: regularServerConfig, aiConfigUpdates } = splitConfigPayload(nextServerConfig);

        await Promise.all([
            persistRegularConfig(clientConfig, regularClientConfig),
            persistRegularConfig(serverConfig, regularServerConfig),
        ]);

        if (Object.keys(aiConfigUpdates).length > 0) {
            await setAIConfig(serverConfig, aiConfigUpdates);
        }

        return c.json(await buildCombinedConfigResponse(clientConfig, serverConfig, env));
    });

    // POST /config/:type
    app.post('/:type', async (c: AppContext) => {
        const admin = c.get('admin');
        const type = c.req.param('type');
        
        if (!isConfigType(type)) {
            return c.text('Invalid type', 400);
        }
        
        if (!admin) {
            return c.text('Unauthorized', 401);
        }
        
        const serverConfig = c.get('serverConfig');
        const clientConfig = c.get('clientConfig');
        const body = await c.req.json();
        const { regularConfig, aiConfigUpdates } = splitConfigPayload(body);
        
        const config = type === 'server' ? serverConfig : clientConfig;
        await persistRegularConfig(config, regularConfig);
        
        if (Object.keys(aiConfigUpdates).length > 0) {
            await setAIConfig(serverConfig, aiConfigUpdates);
        }
        
        return c.text('OK');
    });

    // DELETE /config/cache
    app.delete('/cache', async (c: AppContext) => {
        const admin = c.get('admin');
        
        if (!admin) {
            return c.text('Unauthorized', 401);
        }
        
        const cache = c.get('cache');
        await cache.clear();
        return c.text('OK');
    });

    return app;
}
