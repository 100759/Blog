import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { siteName } from "../utils/constants";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { client } from "../app/runtime";
import type { SiteCheckResult } from "../api/client";

type Platform = "cloudflare-workers" | "cloudflare-pages" | "vercel" | "custom";

type SiteItem = {
    name: string;
    url: string;
    description: string;
    tag: string;
    platform: Platform;
    role: string;
    domainType: string;
    accent: string;
};

const platformMeta: Record<Platform, { label: string; short: string; icon: string; tone: string }> = {
    "cloudflare-workers": {
        label: "Cloudflare Workers",
        short: "Workers",
        icon: "ri-cloud-line",
        tone: "bg-orange-50 text-orange-700 border-orange-200",
    },
    "cloudflare-pages": {
        label: "Cloudflare Pages",
        short: "Pages",
        icon: "ri-pages-line",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    vercel: {
        label: "Vercel",
        short: "Vercel",
        icon: "ri-triangle-line",
        tone: "bg-neutral-950 text-white border-neutral-950",
    },
    custom: {
        label: "自有服务器",
        short: "Custom",
        icon: "ri-server-line",
        tone: "bg-sky-50 text-sky-700 border-sky-200",
    },
};

const sites: SiteItem[] = [
    {
        name: "FuHeng Blog",
        url: "https://blog.fuheng.vip",
        description: "主站入口，集中放文章、动态、作品、旗下网站和个人资料。",
        tag: "主站",
        platform: "cloudflare-workers",
        role: "内容中枢",
        domainType: "自定义域名",
        accent: "from-teal-100 via-cyan-50 to-stone-50",
    },
    {
        name: "Worker 备用入口",
        url: "https://rin-blog-100759.100759.workers.dev",
        description: "Cloudflare Workers 默认域名，可作为主域名异常时的备用访问入口。",
        tag: "备用",
        platform: "cloudflare-workers",
        role: "备用线路",
        domainType: "Workers Dev",
        accent: "from-orange-100 via-white to-amber-50",
    },
];

export function SitesPage() {
    const siteConfig = useSiteConfig();
    const [checks, setChecks] = useState<Record<string, SiteCheckResult>>({});
    const [checking, setChecking] = useState(true);
    const onlineCount = Object.values(checks).filter((item) => item.ok).length;
    const avgLatency = useMemo(() => {
        const values = Object.values(checks).filter((item) => item.latency > 0);
        if (!values.length) return 0;
        return Math.round(values.reduce((sum, item) => sum + item.latency, 0) / values.length);
    }, [checks]);

    function runCheck() {
        setChecking(true);
        client.sites.check(sites.map((item) => item.url)).then(({ data }) => {
            if (data) {
                setChecks(Object.fromEntries(data.map((item) => [item.url, item])));
            }
        }).finally(() => {
            setChecking(false);
        });
    }

    useEffect(() => {
        runCheck();
    }, []);

    return (
        <>
            <Helmet>
                <title>{`旗下网站 - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content="旗下网站" />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                <section className="overflow-hidden rounded-[30px] border border-black/8 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white shadow-sm dark:border-white/10">
                    <div className="relative p-5 md:p-8">
                        <div className="absolute right-[-70px] top-[-90px] size-56 rounded-full bg-teal-300/20 blur-3xl" />
                        <div className="absolute bottom-[-90px] left-[20%] size-48 rounded-full bg-cyan-200/10 blur-3xl" />
                        <div className="relative grid gap-7 lg:grid-cols-[1fr_360px] lg:items-end">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-100/80">Site Network</p>
                                <h1 className="site-display mt-4 text-[2rem] font-semibold leading-tight md:text-[3.2rem]">
                                    旗下网站
                                </h1>
                                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/72">
                                    这里整理所有正在维护的网站入口，并自动检测域名可用性、响应耗时和部署平台。像一张自己的线上资产地图，打开就知道哪些站点在线。
                                </p>
                                <div className="mt-6 flex flex-wrap gap-2">
                                    <MetricPill label="站点" value={`${sites.length}`} />
                                    <MetricPill label="在线" value={checking ? "检测中" : `${onlineCount}/${sites.length}`} />
                                    <MetricPill label="平均延迟" value={avgLatency ? `${avgLatency}ms` : "--"} />
                                </div>
                            </div>
                            <div className="rounded-[26px] border border-white/12 bg-white/8 p-4 backdrop-blur">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Monitor</p>
                                        <h2 className="mt-2 text-lg font-semibold">域名检测</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={runCheck}
                                        className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:bg-white/10"
                                    >
                                        {checking ? "检测中..." : "重新检测"}
                                    </button>
                                </div>
                                <div className="mt-5 space-y-3">
                                    {sites.map((site) => (
                                        <MiniStatus key={site.url} site={site} check={checks[site.url]} checking={checking} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-4 lg:grid-cols-2">
                    {sites.map((item) => (
                        <SiteCard key={item.url} site={item} check={checks[item.url]} checking={checking} />
                    ))}
                </section>
            </main>
        </>
    );
}

function MetricPill({ label, value }: { label: string; value: string }) {
    return (
        <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/75">
            {label}
            <strong className="ml-2 text-white">{value}</strong>
        </span>
    );
}

function MiniStatus({ site, check, checking }: { site: SiteItem; check?: SiteCheckResult; checking: boolean }) {
    const status = getStatus(check, checking);

    return (
        <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/8 px-3 py-3">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{site.name}</p>
                <p className="mt-1 truncate text-xs text-white/45">{hostOf(site.url)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${status.className}`}>{status.label}</span>
        </div>
    );
}

function SiteCard({ site, check, checking }: { site: SiteItem; check?: SiteCheckResult; checking: boolean }) {
    const platform = platformMeta[site.platform];
    const status = getStatus(check, checking);

    return (
        <article className="site-panel overflow-hidden rounded-[28px]">
            <div className={`bg-gradient-to-br ${site.accent} p-5 text-neutral-950 md:p-6`}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">{site.tag}</p>
                        <h2 className="mt-3 text-2xl font-semibold">{site.name}</h2>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${platform.tone}`}>
                        <i className={platform.icon} />
                        {platform.short}
                    </span>
                </div>
                <p className="mt-4 max-w-xl text-[14px] leading-6 text-neutral-650">{site.description}</p>
            </div>

            <div className="px-5 py-5 md:px-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <InfoBlock label="状态" value={status.label} statusClass={status.dotClassName} />
                    <InfoBlock label="响应" value={check?.latency ? `${check.latency}ms` : "--"} />
                    <InfoBlock label="HTTP" value={check?.status ? `${check.status}` : "--"} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MetaRow icon="ri-global-line" label="域名" value={hostOf(site.url)} />
                    <MetaRow icon={platform.icon} label="部署平台" value={platform.label} />
                    <MetaRow icon="ri-route-line" label="用途" value={site.role} />
                    <MetaRow icon="ri-shield-check-line" label="类型" value={site.domainType} />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-black/6 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
                        <p className="truncate">最终地址：{check?.finalUrl ? cleanUrl(check.finalUrl) : cleanUrl(site.url)}</p>
                        <p className="mt-1">检测时间：{check?.checkedAt ? formatTime(check.checkedAt) : "等待检测"}</p>
                    </div>
                    <a
                        href={site.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-theme px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    >
                        打开网站
                        <i className="ri-arrow-right-up-line" />
                    </a>
                </div>
            </div>
        </article>
    );
}

function InfoBlock({ label, value, statusClass }: { label: string; value: string; statusClass?: string }) {
    return (
        <div className="rounded-[18px] border border-black/8 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs text-neutral-400">{label}</p>
            <div className="mt-2 flex items-center gap-2">
                {statusClass ? <span className={`size-2 rounded-full ${statusClass}`} /> : null}
                <strong className="text-sm text-neutral-850 dark:text-white">{value}</strong>
            </div>
        </div>
    );
}

function MetaRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 rounded-[16px] bg-black/[0.025] px-3 py-3 dark:bg-white/[0.04]">
            <span className="grid size-9 place-items-center rounded-full bg-white text-theme shadow-sm dark:bg-white/10">
                <i className={icon} />
            </span>
            <div className="min-w-0">
                <p className="text-xs text-neutral-400">{label}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{value}</p>
            </div>
        </div>
    );
}

function getStatus(check: SiteCheckResult | undefined, checking: boolean) {
    if (checking && !check) {
        return {
            label: "检测中",
            className: "bg-white/12 text-white/70",
            dotClassName: "bg-amber-400",
        };
    }

    if (check?.ok) {
        return {
            label: "在线",
            className: "bg-emerald-400/15 text-emerald-100",
            dotClassName: "bg-emerald-500",
        };
    }

    return {
        label: "异常",
        className: "bg-red-400/15 text-red-100",
        dotClassName: "bg-red-500",
    };
}

function hostOf(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return url.replace(/^https?:\/\//, "");
    }
}

function cleanUrl(url: string) {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
