import { Helmet } from "react-helmet";
import { siteName } from "../utils/constants";
import { useSiteConfig } from "../hooks/useSiteConfig";

type Platform = "Cloudflare Workers" | "Cloudflare Pages" | "Vercel" | "自有服务器";

type SiteItem = {
    name: string;
    url: string;
    description: string;
    platform: Platform;
    role: string;
    status: string;
    color: string;
};

const platformTone: Record<Platform, string> = {
    "Cloudflare Workers": "border-orange-200 bg-orange-50 text-orange-700",
    "Cloudflare Pages": "border-amber-200 bg-amber-50 text-amber-700",
    Vercel: "border-neutral-900 bg-neutral-950 text-white",
    自有服务器: "border-sky-200 bg-sky-50 text-sky-700",
};

const sites: SiteItem[] = [
    {
        name: "FuHeng Blog",
        url: "https://blog.fuheng.vip",
        description: "主站入口，放文章、动态、作品、友链和个人资料。这里是所有内容的起点。",
        platform: "Cloudflare Workers",
        role: "主站",
        status: "运行中",
        color: "bg-teal-600",
    },
    {
        name: "Worker 备用入口",
        url: "https://rin-blog-100759.100759.workers.dev",
        description: "Cloudflare Workers 默认域名，主域名异常时可以作为备用访问入口。",
        platform: "Cloudflare Workers",
        role: "备用",
        status: "运行中",
        color: "bg-orange-500",
    },
];

export function SitesPage() {
    const siteConfig = useSiteConfig();

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
                <section className="border-b border-black/8 pb-5 dark:border-white/10">
                    <p className="site-kicker">Sites</p>
                    <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="site-display text-[1.65rem] font-semibold text-neutral-900 dark:text-white md:text-[2.35rem]">
                                旗下网站
                            </h1>
                            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                                我的所有网站和长期维护入口。保持清楚、轻量、好打开，不做花哨监控。
                            </p>
                        </div>
                        <span className="w-fit rounded-full border border-black/8 bg-white/55 px-4 py-2 text-sm text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                            共 {sites.length} 个站点
                        </span>
                    </div>
                </section>

                <section className="mt-6 space-y-3">
                    {sites.map((site, index) => (
                        <SiteRow key={site.url} site={site} index={index + 1} />
                    ))}
                </section>
            </main>
        </>
    );
}

function SiteRow({ site, index }: { site: SiteItem; index: number }) {
    return (
        <a
            href={site.url}
            target="_blank"
            rel="noreferrer"
            className="site-panel group block rounded-[18px] px-4 py-4 transition hover:-translate-y-0.5 hover:border-theme/30 md:px-5 md:py-5"
        >
            <article className="grid gap-4 md:grid-cols-[56px_1fr_auto] md:items-center">
                <div className="flex items-center gap-3 md:block">
                    <span className={`grid size-11 place-items-center rounded-[14px] text-sm font-semibold text-white ${site.color}`}>
                        {String(index).padStart(2, "0")}
                    </span>
                    <div className="md:hidden">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{site.name}</h2>
                        <p className="mt-1 text-xs text-neutral-400">{cleanUrl(site.url)}</p>
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="hidden items-center gap-3 md:flex">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{site.name}</h2>
                        <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-300">
                            {site.role}
                        </span>
                    </div>
                    <p className="mt-2 text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                        {site.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full border px-2.5 py-1 ${platformTone[site.platform]}`}>
                            {site.platform}
                        </span>
                        <span className="rounded-full border border-black/8 bg-white/45 px-2.5 py-1 text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                            {site.status}
                        </span>
                        <span className="min-w-0 truncate text-neutral-400">{cleanUrl(site.url)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-black/6 pt-3 dark:border-white/10 md:border-0 md:pt-0">
                    <span className="text-sm text-neutral-400 md:hidden">{site.role}</span>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-theme">
                        打开
                        <i className="ri-arrow-right-up-line transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                </div>
            </article>
        </a>
    );
}

function cleanUrl(url: string) {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
