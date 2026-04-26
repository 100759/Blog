import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useSiteConfig } from "../hooks/useSiteConfig";

const aboutCards = [
    {
        title: "写作与记录",
        text: "把技术折腾、生活片段和阶段性想法留下来，尽量写得真实、清楚，也方便以后回头看。",
        icon: "ri-quill-pen-line",
    },
    {
        title: "产品与设计",
        text: "会整理做过的小程序、界面设计、图片素材和一些还在维护的线上入口。",
        icon: "ri-layout-4-line",
    },
    {
        title: "长期维护",
        text: "这个站点不是一次性展示页，而是一个会慢慢变顺手、变干净的个人内容系统。",
        icon: "ri-seedling-line",
    },
];

const links = [
    { href: "/", label: "文章", icon: "ri-file-list-3-line" },
    { href: "/moments", label: "动态", icon: "ri-quill-pen-line" },
    { href: "/works", label: "作品", icon: "ri-dashboard-line" },
    { href: "/sites", label: "旗下网站", icon: "ri-computer-line" },
    { href: "/friends", label: "朋友们", icon: "ri-user-received-line" },
];

export function AboutPage() {
    const siteConfig = useSiteConfig();
    const description = siteConfig.description || "风遇山止，船到岸停，这里是时光停留的地方。";

    return (
        <>
            <Helmet>
                <title>{`关于 - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteConfig.name} />
                <meta property="og:title" content="关于" />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={document.URL} />
                <meta name="description" content={description} />
            </Helmet>

            <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                <section className="border-b border-black/8 pb-6 dark:border-white/10">
                    <div className="flex items-start gap-4">
                        {siteConfig.avatar ? (
                            <img
                                src={siteConfig.avatar}
                                alt={siteConfig.name}
                                className="mt-1 h-14 w-14 shrink-0 rounded-[18px] border border-black/8 bg-white object-cover shadow-sm dark:border-white/10"
                            />
                        ) : (
                            <div className="mt-1 grid h-14 w-14 shrink-0 place-items-center rounded-[18px] border border-black/8 bg-white/55 text-theme shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                                <i className="ri-user-smile-line text-xl" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="site-kicker">About</p>
                            <h1 className="site-display mt-1 text-[1.75rem] font-semibold text-neutral-900 dark:text-white md:text-[2.45rem]">
                                关于我
                            </h1>
                            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-neutral-600 dark:text-neutral-300 md:text-[15px]">
                                {description}
                            </p>
                            <p className="mt-2 text-[12px] text-neutral-400 dark:text-neutral-500">
                                {siteConfig.name} · 个人博客与作品整理
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-3 md:grid-cols-3">
                    {aboutCards.map((card) => (
                        <article key={card.title} className="rounded-[18px] border border-black/8 bg-white/45 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-theme/10 text-theme">
                                <i className={card.icon} />
                            </span>
                            <h2 className="mt-4 text-base font-semibold text-neutral-900 dark:text-white">{card.title}</h2>
                            <p className="mt-2 text-[13px] leading-6 text-neutral-600 dark:text-neutral-300">{card.text}</p>
                        </article>
                    ))}
                </section>

                <section className="mt-6 rounded-[22px] border border-black/8 bg-white/45 px-4 py-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:px-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="site-kicker">Navigate</p>
                            <h2 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">看看这些内容</h2>
                        </div>
                        <p className="text-[12px] text-neutral-400 dark:text-neutral-500">常用入口，少一点装饰，多一点直接。</p>
                    </div>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {links.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group flex min-h-12 items-center gap-3 rounded-[14px] border border-black/8 bg-white/55 px-3 text-sm font-medium text-neutral-700 transition hover:border-theme/30 hover:bg-theme/10 hover:text-theme dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
                            >
                                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-black/[0.035] text-neutral-500 transition group-hover:text-theme dark:bg-white/[0.06] dark:text-neutral-400">
                                    <i className={item.icon} />
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}
