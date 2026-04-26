import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearch } from "wouter";
import { siteName } from "../utils/constants";
import { useSiteConfig } from "../hooks/useSiteConfig";

type WorkType = "design" | "program" | "image";
type WorkAccess = {
    mode: "open" | "closed";
    label?: string;
    url?: string;
};

type WorkItem = {
    slug: string;
    title: string;
    type: WorkType;
    status: string;
    date: string;
    summary: string;
    detail: string;
    coverTone: string;
    tools: string[];
    highlights: string[];
    role: string;
    metrics: string[];
    access?: WorkAccess;
    href?: string;
    gallery?: string[];
};

const typeMeta: Record<WorkType, { label: string; intro: string; icon: string }> = {
    design: {
        label: "设计作品",
        intro: "品牌、界面、视觉改版和体验整理。",
        icon: "ri-layout-top-line",
    },
    program: {
        label: "程序",
        intro: "能运行、能维护、能持续迭代的小产品。",
        icon: "ri-computer-line",
    },
    image: {
        label: "图片",
        intro: "摄影、插画、视觉素材和灵感收集。",
        icon: "ri-image-line",
    },
};

const works: WorkItem[] = [
    {
        slug: "fuheng-blog",
        title: "FuHeng Blog",
        type: "program",
        status: "长期维护",
        date: "2026",
        summary: "基于 Rin 二开的个人博客系统，覆盖文章、动态、作品、友链、富文本写作和图片上传。",
        detail: "这个项目是主站的核心。目标不是堆功能，而是把写作、动态发布、作品展示和站点管理整合成一个普通人也能顺手使用的个人内容系统。",
        coverTone: "from-teal-100 via-cyan-50 to-stone-50",
        tools: ["React", "Cloudflare Workers", "D1", "R2", "TypeScript"],
        highlights: ["富文本写作", "R2 图片上传", "动态与文章分流", "移动端阅读优化"],
        role: "全栈二开 / 产品整理 / 视觉重构",
        metrics: ["主站系统", "长期维护", "移动端优先"],
        access: {
            mode: "open",
            label: "GitHub 开源地址",
            url: "https://github.com/100759/Blog",
        },
        href: "https://blog.fuheng.vip",
    },
    {
        slug: "mobile-visual-redesign",
        title: "移动端视觉重整",
        type: "design",
        status: "已落地",
        date: "2026",
        summary: "围绕手机阅读体验重新整理字号、留白、导航层级和内容卡片，让页面更像个人站而不是模板站。",
        detail: "这次设计重整的重点是去掉过重的框感和过大的文字，减少 AI 味儿，让移动端更轻、更安静，也更适合长时间浏览。",
        coverTone: "from-amber-100 via-stone-50 to-sky-100",
        tools: ["UI Design", "Responsive", "Tailwind CSS"],
        highlights: ["降低大字号压迫感", "弱化版块边界", "修正顶部安全区", "优化内容首屏"],
        role: "界面重整 / 移动端体验",
        metrics: ["手机端", "阅读体验", "已落地"],
        access: {
            mode: "closed",
        },
    },
    {
        slug: "moment-publisher",
        title: "动态发布器",
        type: "program",
        status: "迭代中",
        date: "2026",
        summary: "给动态板块做的轻量发布工具，支持文字、图片上传和可选地址，尽量接近朋友圈式发布体验。",
        detail: "动态不应该像写文章那么重，所以发布器会保留最少字段：一句话、几张图、一个可选位置。图片展示也按九宫格和紧凑间距处理，方便手机端观看。",
        coverTone: "from-emerald-100 via-white to-lime-50",
        tools: ["React", "R2", "Geolocation", "UX"],
        highlights: ["文字图片混排", "可选定位", "紧凑图片网格", "移动端优先"],
        role: "功能设计 / 发布流程",
        metrics: ["轻发布", "图片上传", "位置可选"],
        access: {
            mode: "closed",
        },
    },
    {
        slug: "portrait-assets",
        title: "头像与站点视觉素材",
        type: "image",
        status: "使用中",
        date: "2026",
        summary: "用于主站头像、卡片占位、社交展示的一组轻量黑白视觉素材。",
        detail: "这组图片素材承担站点识别的作用，不追求复杂，而是保持清晰、亲切、容易记住。后续可以继续扩展成文章封面和动态贴纸体系。",
        coverTone: "from-zinc-100 via-white to-neutral-200",
        tools: ["Illustration", "Avatar", "Brand Asset"],
        highlights: ["黑白线条", "高识别度", "适合小尺寸", "可继续扩展"],
        role: "视觉素材整理",
        metrics: ["品牌识别", "多场景", "轻量素材"],
        access: {
            mode: "open",
            label: "下载素材",
            url: "/avatar.png",
        },
        gallery: ["头像", "文章封面", "卡片占位", "社交分享"],
    },
    {
        slug: "site-index",
        title: "旗下网站索引",
        type: "program",
        status: "已上线",
        date: "2026",
        summary: "把所有长期维护的网站入口集中展示，方便访客从一个地方找到主站、备用地址和后续新项目。",
        detail: "这是一个面向访问者的导航页，也是一份自己的线上资产清单。后续每增加一个站点，都可以在这里作为入口和说明页展示。",
        coverTone: "from-sky-100 via-white to-teal-100",
        tools: ["Information Architecture", "Web", "Navigation"],
        highlights: ["集中入口", "状态标记", "外链直达", "后续可扩展"],
        role: "信息架构 / 页面设计",
        metrics: ["站点索引", "线上入口", "持续扩展"],
        access: {
            mode: "closed",
        },
        href: "/sites",
    },
];

const filters: Array<{ value: "all" | WorkType; label: string }> = [
    { value: "all", label: "全部" },
    { value: "design", label: "设计作品" },
    { value: "program", label: "程序" },
    { value: "image", label: "图片" },
];

export function WorksPage() {
    const siteConfig = useSiteConfig();
    const query = new URLSearchParams(useSearch());
    const activeType = normalizeType(query.get("type"));
    const visibleWorks = useMemo(
        () => activeType === "all" ? works : works.filter((work) => work.type === activeType),
        [activeType],
    );
    const featuredWork = works[0];
    const typeCounts = useMemo(
        () => filters.map((filter) => ({
            ...filter,
            count: filter.value === "all" ? works.length : works.filter((work) => work.type === filter.value).length,
        })),
        [],
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
                                这里放做过的程序、设计作品和图片素材。开源作品会直接给出 GitHub 或下载入口，闭源作品只保留说明和展示。
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
