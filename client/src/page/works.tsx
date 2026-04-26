import { useContext, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearch } from "wouter";
import { siteName } from "../utils/constants";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { ClientConfigContext } from "../state/config";
import {
    parseWorksConfig,
    typeMeta,
    workFilters,
    WORKS_CONFIG_KEY,
    type WorkItem,
    type WorkType,
} from "./portfolio-data";

export function WorksPage() {
    const siteConfig = useSiteConfig();
    const config = useContext(ClientConfigContext);
    const works = parseWorksConfig(config.get(WORKS_CONFIG_KEY));
    const query = new URLSearchParams(useSearch());
    const activeType = normalizeType(query.get("type"));
    const visibleWorks = useMemo(
        () => activeType === "all" ? works : works.filter((work) => work.type === activeType),
        [activeType, works],
    );
    const featuredWork = works[0];
    const typeCounts = useMemo(
        () => workFilters.map((filter) => ({
            ...filter,
            count: filter.value === "all" ? works.length : works.filter((work) => work.type === filter.value).length,
        })),
        [works],
    );

    return (
        <>
            <Helmet>
                <title>{`作品 - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content="作品" />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                <section className="border-b border-black/8 pb-5 dark:border-white/10">
                    <p className="site-kicker">Portfolio</p>
                    <div className="mt-2 grid gap-5 md:grid-cols-[1fr_320px] md:items-end">
                        <div>
                            <h1 className="site-display text-[1.65rem] font-semibold text-neutral-900 dark:text-white md:text-[2.35rem]">
                                作品
                            </h1>
                            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                                这里放做过的程序、设计作品和图片素材。开源作品会直接给出 GitHub 或下载入口，闭源作品保留说明和展示。
                            </p>
                        </div>
                        <div className="rounded-[22px] border border-black/8 bg-white/45 p-4 text-sm text-neutral-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                            <span className="site-kicker">Collection</span>
                            <div className="mt-3 flex items-end justify-between">
                                <strong className="site-display text-4xl text-neutral-900 dark:text-white">{works.length}</strong>
                                <span>个作品整理中</span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <span className="rounded-full bg-white/60 px-3 py-1.5 dark:bg-white/[0.05]">程序 {typeCounts.find((item) => item.value === "program")?.count}</span>
                                <span className="rounded-full bg-white/60 px-3 py-1.5 dark:bg-white/[0.05]">设计 {typeCounts.find((item) => item.value === "design")?.count}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {featuredWork ? (
                    <section className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <Link href={`/works/${featuredWork.slug}`} className="group overflow-hidden rounded-[24px] border border-black/8 bg-white/45 shadow-sm transition hover:border-theme/30 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="grid gap-0 md:grid-cols-[minmax(0,0.95fr)_minmax(220px,0.62fr)]">
                                <div className="p-5 md:p-6">
                                    <p className="site-kicker">Featured</p>
                                    <h2 className="mt-3 text-2xl font-semibold text-neutral-900 dark:text-white md:text-3xl">{featuredWork.title}</h2>
                                    <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-300">{featuredWork.summary}</p>
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {featuredWork.metrics.map((item) => (
                                            <span key={item} className="rounded-full border border-black/8 bg-white/60 px-3 py-1.5 text-xs text-neutral-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-300">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-theme">
                                        查看精选项目
                                        <i className="ri-arrow-right-line transition group-hover:translate-x-0.5" />
                                    </span>
                                </div>
                                <WorkVisual work={featuredWork} compact />
                            </div>
                        </Link>
                        <div className="hidden gap-2 rounded-[24px] border border-black/8 bg-white/35 p-3 dark:border-white/10 dark:bg-white/[0.03] lg:grid">
                            {typeCounts.map((filter) => (
                                <Link
                                    key={filter.value}
                                    href={filter.value === "all" ? "/works" : `/works?type=${filter.value}`}
                                    className={`flex items-center justify-between rounded-[14px] border px-3 py-2.5 text-sm transition ${
                                        activeType === filter.value
                                            ? "border-theme/20 bg-theme text-white"
                                            : "border-transparent bg-white/45 text-neutral-600 hover:border-theme/30 hover:text-theme dark:bg-white/[0.04] dark:text-neutral-300"
                                    }`}
                                >
                                    <span>{filter.label}</span>
                                    <span className={activeType === filter.value ? "text-white/80" : "text-neutral-400"}>{filter.count}</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : null}

                <section className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                    {typeCounts.map((filter) => (
                        <Link
                            key={filter.value}
                            href={filter.value === "all" ? "/works" : `/works?type=${filter.value}`}
                            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                                activeType === filter.value
                                    ? "border-theme bg-theme text-white"
                                    : "border-black/10 bg-white/45 text-neutral-600 hover:border-theme/40 hover:text-theme dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300"
                            }`}
                        >
                            {filter.label} {filter.count}
                        </Link>
                    ))}
                </section>

                <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleWorks.map((work) => (
                        <WorkCard key={work.slug} work={work} />
                    ))}
                </section>
            </main>
        </>
    );
}

export function WorkDetailPage({ slug }: { slug: string }) {
    const siteConfig = useSiteConfig();
    const config = useContext(ClientConfigContext);
    const works = parseWorksConfig(config.get(WORKS_CONFIG_KEY));
    const work = works.find((item) => item.slug === slug);

    if (!work) {
        return (
            <main className="wauto ani-show pb-14 pt-10">
                <div className="site-panel rounded-[24px] px-6 py-10 text-center">
                    <p className="site-kicker">Not Found</p>
                    <h1 className="mt-3 text-2xl font-semibold text-neutral-900 dark:text-white">作品不存在</h1>
                    <Link href="/works" className="mt-6 inline-flex rounded-full bg-theme px-5 py-3 text-sm font-medium text-white">
                        返回作品
                    </Link>
                </div>
            </main>
        );
    }

    const meta = typeMeta[work.type];

    return (
        <>
            <Helmet>
                <title>{`${work.title} - 作品 - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={work.title} />
                <meta property="og:description" content={work.summary} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                <Link href="/works" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-theme dark:text-neutral-300">
                    <i className="ri-arrow-left-line" />
                    返回作品
                </Link>

                <section className={`mt-5 overflow-hidden rounded-[28px] border border-black/8 bg-gradient-to-br ${work.coverTone} shadow-sm dark:border-white/10`}>
                    <div className="grid gap-6 p-5 md:grid-cols-[1fr_360px] md:p-8">
                        <div>
                            <p className="site-kicker">{meta.label}</p>
                            <h1 className="site-display mt-3 text-[2rem] font-semibold leading-tight text-neutral-950 md:text-[3rem]">
                                {work.title}
                            </h1>
                            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-neutral-700">
                                {work.summary}
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-medium text-neutral-700">{work.status}</span>
                                <span className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-medium text-neutral-700">{work.date}</span>
                                {work.access ? (
                                    <span className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-medium text-neutral-700">
                                        {work.access.mode === "open" ? "开源" : "闭源"}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        <WorkVisual work={work} />
                    </div>
                </section>

                <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
                    <article className="site-panel rounded-[24px] px-5 py-6 md:px-7 md:py-7">
                        <p className="site-kicker">Detail</p>
                        <h2 className="mt-3 text-xl font-semibold text-neutral-900 dark:text-white">作品说明</h2>
                        <p className="mt-4 text-[15px] leading-8 text-neutral-650 dark:text-neutral-300">
                            {work.detail}
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            {work.metrics.map((item) => (
                                <div key={item} className="rounded-[16px] border border-black/8 bg-white/45 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">Metric</p>
                                    <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">{item}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                            {work.highlights.map((item) => (
                                <div key={item} className="rounded-[18px] border border-black/8 bg-black/[0.02] px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                                    <span className="inline-block size-2 rounded-full bg-theme" />
                                    <p className="mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">{item}</p>
                                </div>
                            ))}
                        </div>
                    </article>

                    <aside className="space-y-4">
                        <div className="site-panel rounded-[24px] px-5 py-5">
                            <p className="site-kicker">Role</p>
                            <p className="mt-3 text-sm leading-6 text-neutral-650 dark:text-neutral-300">{work.role}</p>
                        </div>

                        {work.access ? (
                            <div className="site-panel rounded-[24px] px-5 py-5">
                                <p className="site-kicker">Access</p>
                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                                            {work.access.mode === "open" ? "开源作品" : "闭源作品"}
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-300">
                                            {work.access.mode === "open"
                                                ? work.type === "program"
                                                    ? "可以查看源码仓库。"
                                                    : "可以直接下载素材。"
                                                : "暂不提供公开源码或下载。"}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                                        work.access.mode === "open"
                                            ? "bg-theme/10 text-theme"
                                            : "bg-black/[0.04] text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-300"
                                    }`}>
                                        {work.access.mode === "open" ? "开源" : "闭源"}
                                    </span>
                                </div>
                                {work.access.mode === "open" && work.access.url ? (
                                    <a
                                        href={work.access.url}
                                        target={work.access.url.startsWith("http") ? "_blank" : undefined}
                                        rel={work.access.url.startsWith("http") ? "noreferrer" : undefined}
                                        download={!work.access.url.startsWith("http") ? true : undefined}
                                        className="mt-4 flex items-center justify-between rounded-[18px] border border-theme/20 bg-theme/10 px-4 py-3 text-sm font-medium text-theme transition hover:bg-theme hover:text-white"
                                    >
                                        {work.access.label || (work.type === "program" ? "查看 GitHub" : "下载")}
                                        <i className={work.type === "program" ? "ri-github-line" : "ri-upload-2-line"} />
                                    </a>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="site-panel rounded-[24px] px-5 py-5">
                            <p className="site-kicker">Type</p>
                            <div className="mt-4 flex items-start gap-3">
                                <span className="grid size-11 place-items-center rounded-full bg-theme/10 text-theme">
                                    <i className={meta.icon} />
                                </span>
                                <div>
                                    <h3 className="font-semibold text-neutral-900 dark:text-white">{meta.label}</h3>
                                    <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-300">{meta.intro}</p>
                                </div>
                            </div>
                        </div>

                        <div className="site-panel rounded-[24px] px-5 py-5">
                            <p className="site-kicker">Tools</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {work.tools.map((item) => (
                                    <span key={item} className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {work.href ? (
                            <a
                                href={work.href}
                                target={work.href.startsWith("http") ? "_blank" : undefined}
                                rel={work.href.startsWith("http") ? "noreferrer" : undefined}
                                className="flex items-center justify-between rounded-[24px] bg-theme px-5 py-4 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                            >
                                查看作品入口
                                <i className="ri-arrow-right-up-line" />
                            </a>
                        ) : null}
                    </aside>
                </section>
            </main>
        </>
    );
}

function WorkCard({ work }: { work: WorkItem }) {
    const meta = typeMeta[work.type];

    return (
        <div className="group block h-full">
            <article className="site-panel flex h-full min-h-[260px] flex-col overflow-hidden rounded-[22px] transition hover:-translate-y-0.5 hover:border-theme/30">
                <WorkVisual work={work} compact />
                <div className="flex flex-1 flex-col px-4 py-4 md:px-5">
                    <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-theme">
                            <i className={meta.icon} />
                            {meta.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                            {work.access ? (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                                    work.access.mode === "open"
                                        ? "bg-theme/10 text-theme"
                                        : "bg-black/[0.04] text-neutral-400 dark:bg-white/[0.06]"
                                }`}>
                                    {work.access.mode === "open" ? "开源" : "闭源"}
                                </span>
                            ) : null}
                            <span className="text-xs text-neutral-400">{work.status}</span>
                        </div>
                    </div>
                    <Link href={`/works/${work.slug}`} className="mt-3 text-lg font-semibold text-neutral-900 transition hover:text-theme dark:text-white">
                        {work.title}
                    </Link>
                    <p className="mt-3 line-clamp-3 flex-1 text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                        {work.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {work.highlights.slice(0, 2).map((item) => (
                            <span key={item} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-300">
                                {item}
                            </span>
                        ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4 text-sm dark:border-white/10">
                        <span className="text-neutral-400">{work.date}</span>
                        <div className="inline-flex items-center gap-3">
                            {work.access?.mode === "open" && work.access.url ? (
                                <a
                                    href={work.access.url}
                                    target={work.access.url.startsWith("http") ? "_blank" : undefined}
                                    rel={work.access.url.startsWith("http") ? "noreferrer" : undefined}
                                    download={!work.access.url.startsWith("http") ? true : undefined}
                                    onClick={(event) => event.stopPropagation()}
                                    className="relative z-10 inline-flex items-center gap-1 text-neutral-500 transition hover:text-theme dark:text-neutral-300"
                                >
                                    {work.type === "program" ? "GitHub" : "下载"}
                                    <i className={work.type === "program" ? "ri-github-line" : "ri-upload-2-line"} />
                                </a>
                            ) : null}
                            <Link href={`/works/${work.slug}`} className="inline-flex items-center gap-1 text-theme">
                                详情
                                <i className="ri-arrow-right-line transition group-hover:translate-x-0.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </article>
        </div>
    );
}

function WorkVisual({ work, compact = false }: { work: WorkItem; compact?: boolean }) {
    const height = compact ? "h-[150px]" : "min-h-[260px]";

    if (work.type === "program") {
        return (
            <div className={`${height} bg-gradient-to-br ${work.coverTone} p-4`}>
                <div className="h-full rounded-[18px] border border-black/10 bg-neutral-950 p-4 font-mono text-xs text-emerald-200 shadow-xl">
                    <div className="mb-4 flex gap-1.5">
                        <span className="size-2.5 rounded-full bg-red-400" />
                        <span className="size-2.5 rounded-full bg-amber-300" />
                        <span className="size-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <p>$ open {work.slug}</p>
                    <p className="mt-2 text-emerald-100">status: {work.status}</p>
                    <p className="mt-2 text-cyan-100">type: program</p>
                    <p className="mt-2 text-neutral-400">build: ready</p>
                </div>
            </div>
        );
    }

    if (work.type === "design") {
        return (
            <div className={`${height} bg-gradient-to-br ${work.coverTone} p-4`}>
                <div className="grid h-full grid-cols-[1fr_0.72fr] gap-3">
                    <div className="rounded-[22px] bg-white/70 p-4 shadow-sm">
                        <div className="h-3 w-20 rounded-full bg-neutral-900/80" />
                        <div className="mt-5 h-16 rounded-[18px] bg-theme/20" />
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <span className="h-10 rounded-[12px] bg-white" />
                            <span className="h-10 rounded-[12px] bg-teal-100" />
                            <span className="h-10 rounded-[12px] bg-amber-100" />
                        </div>
                    </div>
                    <div className="rounded-[22px] border border-white/70 bg-white/35 p-3">
                        <div className="h-full rounded-[18px] border border-dashed border-neutral-400/40" />
                    </div>
                </div>
            </div>
        );
    }

    if (work.type === "image") {
        return (
            <div className={`${height} bg-gradient-to-br ${work.coverTone} p-4`}>
                <div className="grid h-full grid-cols-2 gap-2">
                    {(work.gallery || []).slice(0, 4).map((item, index) => (
                        <div key={item} className={`grid place-items-center rounded-[18px] bg-white/70 text-xs font-medium text-neutral-500 shadow-sm ${index === 0 ? "row-span-2" : ""}`}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`${height} bg-gradient-to-br ${work.coverTone} p-4`}>
            <div className="flex h-full flex-col rounded-[20px] border border-black/10 bg-white/70 shadow-sm">
                <div className="flex items-center gap-2 border-b border-black/8 px-4 py-3">
                    <span className="size-2.5 rounded-full bg-red-300" />
                    <span className="size-2.5 rounded-full bg-amber-300" />
                    <span className="size-2.5 rounded-full bg-emerald-300" />
                </div>
                <div className="flex flex-1 flex-col justify-end p-4">
                    <div className="h-4 w-24 rounded-full bg-neutral-900/80" />
                    <div className="mt-3 h-3 w-36 rounded-full bg-neutral-400/40" />
                    <div className="mt-5 h-10 rounded-[14px] bg-theme/20" />
                </div>
            </div>
        </div>
    );
}

function normalizeType(value: string | null): "all" | WorkType {
    if (value === "design" || value === "program" || value === "image") {
        return value;
    }

    return "all";
}
