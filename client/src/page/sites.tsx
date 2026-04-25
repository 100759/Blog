import { Helmet } from "react-helmet";
import { siteName } from "../utils/constants";
import { useSiteConfig } from "../hooks/useSiteConfig";

type SiteItem = {
    name: string;
    url: string;
    description: string;
    tag: string;
    status: string;
};

const sites: SiteItem[] = [
    {
        name: "FuHeng Blog",
        url: "https://blog.fuheng.vip",
        description: "主站，集中放文章、动态、作品和个人站点索引。",
        tag: "主站",
        status: "运行中",
    },
    {
        name: "Cloudflare Worker 站点",
        url: "https://rin-blog-100759.100759.workers.dev",
        description: "当前博客的 Worker 部署地址，可作为备用访问入口。",
        tag: "部署",
        status: "运行中",
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
                    <h1 className="site-display mt-2 text-[1.55rem] font-semibold text-neutral-900 dark:text-white md:text-[2rem]">
                        旗下网站
                    </h1>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                        我的所有网站和长期维护的线上入口，后续新站点会继续补到这里。
                    </p>
                </section>

                <section className="mt-6 grid gap-3 md:grid-cols-2">
                    {sites.map((item) => (
                        <a
                            key={item.url}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="site-panel group flex min-h-[170px] flex-col rounded-[10px] px-4 py-4 transition hover:border-theme/30 md:px-5 md:py-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="site-kicker">{item.tag}</p>
                                    <h2 className="mt-3 truncate text-lg font-semibold text-neutral-900 dark:text-white">{item.name}</h2>
                                </div>
                                <span className="rounded-[8px] border border-black/10 bg-white/45 px-3 py-1.5 text-[11px] font-medium text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                                    {item.status}
                                </span>
                            </div>
                            <p className="mt-4 flex-1 text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                                {item.description}
                            </p>
                            <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/5 pt-4 text-sm dark:border-white/10">
                                <span className="min-w-0 truncate text-neutral-500 dark:text-neutral-400">{item.url.replace(/^https?:\/\//, "")}</span>
                                <i className="ri-arrow-left-line rotate-[135deg] text-neutral-400 transition group-hover:text-theme" />
                            </div>
                        </a>
                    ))}
                </section>
            </main>
        </>
    );
}
