import { Hono } from "hono";
import type { Variables } from "../core/hono-types";
import { profileAsync } from "../core/server-timing";

type SiteCheckRequest = {
    urls?: string[];
};

type SiteCheckResult = {
    url: string;
    ok: boolean;
    status: number;
    statusText: string;
    latency: number;
    checkedAt: string;
    finalUrl?: string;
    error?: string;
};

const MAX_CHECKS = 8;
const REQUEST_TIMEOUT = 6000;

export function SitesService(): Hono<{
    Bindings: Env;
    Variables: Variables;
}> {
    const app = new Hono<{
        Bindings: Env;
        Variables: Variables;
    }>();

    app.post("/check", async (c) => {
        const body = await profileAsync(c, "sites_check_parse", async (): Promise<SiteCheckRequest> => c.req.json<SiteCheckRequest>().catch(() => ({})));
        const urls = (body.urls || [])
            .map((url: string) => normalizeUrl(url))
            .filter((url: string | null): url is string => Boolean(url))
            .slice(0, MAX_CHECKS);

        if (urls.length === 0) {
            return c.json([]);
        }

        const requestHost = new URL(c.req.url).host;
        const selfHosts = new Set([requestHost, "rin-blog-100759.100759.workers.dev"]);
        const results = await profileAsync(c, "sites_check_fetch", () => Promise.all(urls.map((url) => checkSite(url, selfHosts))));
        return c.json(results);
    });

    return app;
}

function normalizeUrl(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return null;
        }
        return url.toString();
    } catch {
        return null;
    }
}

async function checkSite(url: string, selfHosts: Set<string>): Promise<SiteCheckResult> {
    const startedAt = Date.now();
    const checkedAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const host = new URL(url).host;

    if (selfHosts.has(host)) {
        clearTimeout(timeout);
        return {
            url,
            ok: true,
            status: 200,
            statusText: "Online",
            latency: Date.now() - startedAt,
            checkedAt,
            finalUrl: url,
        };
    }

    try {
        let response = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "FuHeng-Blog-Site-Monitor/1.0",
            },
        });

        if (response.status === 405 || response.status === 403) {
            response = await fetch(url, {
                method: "GET",
                redirect: "follow",
                signal: controller.signal,
                headers: {
                    "User-Agent": "FuHeng-Blog-Site-Monitor/1.0",
                },
            });
        }

        return {
            url,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText || (response.ok ? "OK" : "Error"),
            latency: Date.now() - startedAt,
            checkedAt,
            finalUrl: response.url,
        };
    } catch (error) {
        return {
            url,
            ok: false,
            status: 0,
            statusText: "Unavailable",
            latency: Date.now() - startedAt,
            checkedAt,
            error: error instanceof Error ? error.message : "Check failed",
        };
    } finally {
        clearTimeout(timeout);
    }
}
