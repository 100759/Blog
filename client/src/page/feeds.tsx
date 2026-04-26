import { type FormEvent, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation, useSearch } from "wouter";
import { FeedCard } from "../components/feed_card";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { preloadRoute } from "../app/routes";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { stripImageUrlMetadata } from "../utils/image-upload";
import { tryInt } from "../utils/int";
import { timeago } from "../utils/timeago";
import { useTranslation } from "react-i18next";

type FeedsData = {
    size: number;
    data: FeedRecord[];
    hasNext: boolean;
}

type FeedRecord = {
    id: string;
    avatar?: string;
    draft?: number;
    listed?: number;
    top?: number;
    title: string;
    category?: string;
    summary: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

type FeedCategory = {
    name: string;
    count: number;
}

export function FeedsPage() {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const query = new URLSearchParams(useSearch());
    const queryCategory = query.get("category")?.trim() || "";
    const queryPage = query.get("page");
    const [, setLocation] = useLocation();
    const [status, setStatus] = useState<"loading" | "idle">("idle");
    const [feeds, setFeeds] = useState<FeedsData>({ size: 0, data: [], hasNext: false });
    const [categories, setCategories] = useState<FeedCategory[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const page = tryInt(1, queryPage);
    const limit = tryInt(siteConfig.pageSize, query.get("limit"));
    const ref = useRef("");

    function fetchFeeds(category: string) {
        client.feed.list({
            page,
            limit,
            type: "normal",
            category: category || undefined,
        }).then(({ data }) => {
            if (data) {
                const normalizedData: FeedsData = {
                    size: data.size,
                    hasNext: data.hasNext,
                    data: (data.data || []).map((item) => ({
                        id: String(item.id),
                        avatar: item.avatar || undefined,
                        title: item.title || t("unlisted"),
                        category: item.category || undefined,
                        summary: item.summary,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                    })),
                };
                setFeeds(normalizedData);
            }
            setStatus("idle");
        }).catch(() => {
            setStatus("idle");
        });
    }

    useEffect(() => {
        const key = `${queryPage} ${queryCategory} ${limit}`;
        if (ref.current === key) return;
        setStatus("loading");
        fetchFeeds(queryCategory);
        ref.current = key;
    }, [limit, queryCategory, queryPage]);

    useEffect(() => {
        client.feed.categories().then(({ data }) => {
            if (data) {
                setCategories(data.filter((item) => item.name.trim().length > 0));
            }
        });
    }, []);

    useEffect(() => {
        if (searchOpen) {
            searchInputRef.current?.focus();
        }
    }, [searchOpen]);

    const currentFeedSet = feeds;
    const allFeeds = currentFeedSet.data || [];
    const featuredFeed = page === 1 ? allFeeds[0] : undefined;
    const remainingFeeds = featuredFeed ? allFeeds.slice(1) : allFeeds;
    const visibleFeeds = featuredFeed ? remainingFeeds : allFeeds;
    const listTitle = queryCategory || t("article.title");
    const listDescription = siteConfig.description || t("article.total$count", { count: currentFeedSet.size });
    const feedListClass =
        siteConfig.feedLayout === "masonry"
            ? "columns-1 gap-5 md:columns-2 [&>*]:mb-5"
            : "grid gap-5 lg:grid-cols-2";

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!searchOpen) {
            setSearchOpen(true);
            return;
        }
        const keyword = searchKeyword.trim();
        if (!keyword) {
            searchInputRef.current?.focus();
            return;
        }
        setLocation(`/search/${encodeURIComponent(keyword)}`);
    }

    return (
        <>
            <Helmet>
                <title>{`${t("article.title")} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteConfig.name} />
                <meta property="og:title" content={t("article.title")} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={feeds.size > 0 || status === "idle"}>
                <main className="w-full pb-14">
                    <section className="wauto ani-show pt-4 md:pt-8">
                        <div className="border-b border-black/8 pb-5 dark:border-white/10">
                            <div className="max-w-3xl">
                                <p className="site-kicker">{listTitle}</p>
                                <h1 className="site-display mt-2 text-[1.45rem] font-semibold text-neutral-900 dark:text-white sm:text-[1.8rem] md:text-[2.1rem]">
                                    {siteConfig.name}
                                </h1>
                                <p className="mt-2 max-w-xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                                    {listDescription}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                                    <span>{t("article.total$count", { count: currentFeedSet.size })}</span>
                                </div>
                            </div>
                            <div className={`-mx-1 mt-4 flex items-center gap-2 px-1 pb-1 ${
                                searchOpen
                                    ? "overflow-hidden"
                                    : "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            }`}>
                                <div className={`${searchOpen ? "hidden sm:flex" : "flex"} shrink-0 gap-2`}>
                                    <TypeToggle href="/" active={!queryCategory} label="全部分类" />
                                    {categories.map((category) => (
                                        <TypeToggle
                                            key={category.name}
                                            href={`/?category=${encodeURIComponent(category.name)}`}
                                            active={queryCategory === category.name}
                                            label={`${category.name} ${category.count}`}
                                        />
                                    ))}
                                </div>
                                <div className={`${searchOpen ? "w-full sm:ml-auto sm:w-auto" : "ml-auto"} flex shrink-0 items-center gap-2`}>
                                    <form
                                        onSubmit={submitSearch}
                                        className={`flex min-h-11 items-center overflow-hidden rounded-full border border-black/10 bg-white/65 shadow-sm transition-all duration-300 focus-within:border-theme/35 focus-within:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:bg-white/[0.07] ${
                                            searchOpen ? "w-full gap-2 px-3 py-1.5 sm:w-[min(68vw,300px)]" : "w-11 justify-center px-0"
                                        }`}
                                    >
                                        <button
                                            type="submit"
                                            aria-label={searchOpen ? "搜索文章" : "展开搜索"}
                                            className={searchOpen ? "text-neutral-400 transition hover:text-theme" : "grid h-11 w-11 place-items-center text-neutral-500 transition hover:text-theme"}
                                        >
                                            <i className="ri-search-line text-base" />
                                        </button>
                                        {searchOpen ? (
                                            <>
                                                <input
                                                    ref={searchInputRef}
                                                    value={searchKeyword}
                                                    onChange={(event) => setSearchKeyword(event.target.value)}
                                                    onBlur={() => {
                                                        if (!searchKeyword.trim()) setSearchOpen(false);
                                                    }}
                                                    placeholder="搜索文章"
                                                    className="min-w-0 flex-1 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
                                                />
                                                {searchKeyword ? (
                                                    <button
                                                        type="button"
                                                        aria-label="清空搜索"
                                                        onClick={() => {
                                                            setSearchKeyword("");
                                                            searchInputRef.current?.focus();
                                                        }}
                                                        className="grid h-7 w-7 place-items-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-100"
                                                    >
                                                        <i className="ri-close-line" />
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="submit"
                                                    className="rounded-full bg-theme/10 px-3 py-1.5 text-xs font-medium text-theme transition hover:bg-theme hover:text-white"
                                                >
                                                    搜索
                                                </button>
                                            </>
                                        ) : null}
                                    </form>
                                    <div className={searchOpen ? "hidden sm:block" : ""}>
                                        <TimelineShortcut />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {featuredFeed ? (
                        <section className="wauto ani-show mt-8">
                            <FeaturedFeedLead feed={featuredFeed} />
                        </section>
                    ) : null}

                    <section className="wauto ani-show mt-6 sm:mt-7">
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5 sm:gap-4">
                            <div>
                                <p className="site-kicker">{listTitle}</p>
                                <h2 className="mt-2 text-[1rem] font-semibold text-neutral-900 dark:text-white sm:text-[1.18rem]">
                                    {t("article.total$count", { count: currentFeedSet.size })}
                                </h2>
                            </div>
                            <div className="rounded-[8px] border border-black/10 bg-white/35 px-3 py-1.5 text-[11px] font-medium text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                                {t("index.title")} {page}
                            </div>
                        </div>

                        <Waiting for={status === "idle"}>
                            <div className={feedListClass}>
                                {visibleFeeds.map(({ id, ...feed }) => (
                                    <FeedCard
                                        key={id}
                                        id={id}
                                        {...feed}
                                        createdAt={new Date(feed.createdAt)}
                                        updatedAt={new Date(feed.updatedAt)}
                                        variant={featuredFeed ? "editorial" : undefined}
                                    />
                                ))}
                            </div>

                            <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                                {page > 1 ? (
                                    <Link href={buildPageHref(queryCategory, page - 1)} className="site-panel inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-medium t-primary">
                                        {t("previous")}
                                    </Link>
                                ) : (
                                    <div />
                                )}
                                {currentFeedSet?.hasNext ? (
                                    <Link href={buildPageHref(queryCategory, page + 1)} className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-theme px-5 py-3 text-sm font-medium text-white">
                                        {t("next")}
                                    </Link>
                                ) : null}
                            </div>
                        </Waiting>
                    </section>
                </main>
            </Waiting>
        </>
    );
}

function TimelineShortcut() {
    return (
        <Link
            href="/timeline"
            aria-label="时间轴"
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-theme/18 bg-[linear-gradient(135deg,rgba(var(--theme-rgb),0.11),rgba(255,255,255,0.76))] px-1.5 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:-translate-y-0.5 hover:border-theme/35 hover:text-theme dark:border-theme/25 dark:bg-[linear-gradient(135deg,rgba(var(--theme-rgb),0.18),rgba(255,255,255,0.05))] dark:text-neutral-100 sm:px-2.5"
            onMouseEnter={() => preloadRoute("/timeline")}
            onTouchStart={() => preloadRoute("/timeline")}
        >
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-theme/12 text-theme ring-1 ring-theme/15">
                <span className="absolute left-1/2 top-1.5 h-5 w-px -translate-x-1/2 rounded-full bg-theme/35" />
                <span className="absolute top-2 h-1.5 w-1.5 rounded-full bg-theme shadow-[0_8px_0_rgba(var(--theme-rgb),0.42),0_16px_0_rgba(var(--theme-rgb),0.24)]" />
                <i className="ri-arrow-down-line absolute bottom-0.5 text-[10px] opacity-70" />
            </span>
            <span className="hidden sm:inline">时间轴</span>
            <i className="ri-arrow-right-line hidden text-theme transition group-hover:translate-x-0.5 sm:inline" />
        </Link>
    );
}

function FeaturedFeedLead({ feed }: { feed: FeedRecord }) {
    const { t } = useTranslation();
    const createdAt = new Date(feed.createdAt);
    const updatedAt = new Date(feed.updatedAt);

    return (
        <Link
            href={`/feed/${feed.id}`}
            target="_blank"
            className="block"
            onMouseEnter={() => preloadRoute("/feed")}
            onTouchStart={() => preloadRoute("/feed")}
        >
            <article className="site-panel overflow-hidden rounded-[10px]">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.56fr)]">
                    <div className="px-4 py-4 sm:px-5 sm:py-6 md:px-7 md:py-8">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                            {feed.top === 1 ? <span className="rounded-full bg-theme/10 px-2 py-1 text-theme">{t("article.top.title")}</span> : null}
                            {feed.draft === 1 ? <span>{t("draft")}</span> : null}
                            {feed.listed === 0 ? <span>{t("unlisted")}</span> : null}
                            {feed.category ? <span>{feed.category}</span> : null}
                        </div>
                        <h2 className="site-display mt-3 text-[1.35rem] font-semibold text-neutral-900 dark:text-white sm:mt-4 sm:text-[1.8rem] md:text-[2.15rem]">
                            {feed.title}
                        </h2>
                        <p className="mt-3 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300 sm:mt-4 sm:text-[15px] sm:leading-7">
                            {feed.summary}
                        </p>
                        <div className="site-rule mt-3 w-full max-w-xl sm:mt-4" />
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400 sm:mt-4 sm:gap-4 sm:text-[12px]">
                            <span title={createdAt.toLocaleString()}>
                                {createdAt.getTime() === updatedAt.getTime() ? timeago(createdAt) : t("feed_card.published$time", { time: timeago(createdAt) })}
                            </span>
                            {createdAt.getTime() !== updatedAt.getTime() ? (
                                <span title={updatedAt.toLocaleString()}>
                                    {t("feed_card.updated$time", { time: timeago(updatedAt) })}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="min-h-[140px] border-t border-black/5 bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.03),rgba(255,255,255,0.1))] p-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.05),rgba(255,255,255,0.02))] sm:min-h-[180px] sm:p-3 lg:min-h-full lg:border-l lg:border-t-0 lg:p-4">
                        {feed.avatar ? (
                            <img
                                src={stripImageUrlMetadata(feed.avatar)}
                                alt=""
                                loading="eager"
                                decoding="async"
                                className="h-full min-h-[140px] w-full rounded-[8px] object-cover sm:min-h-[180px] lg:min-h-[220px]"
                            />
                        ) : (
                            <div className="flex h-full min-h-[140px] w-full items-end rounded-[8px] border border-dashed border-black/10 bg-white/40 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:min-h-[180px] sm:p-5 lg:min-h-[220px]">
                                <div>
                                    <p className="site-kicker">{t("article.title")}</p>
                                    <p className="site-display mt-2 text-[1.2rem] text-neutral-900 dark:text-white sm:mt-3 sm:text-[1.5rem]">{feed.title}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </article>
        </Link>
    );
}

function buildPageHref(category: string, page: number) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/?${query}` : "/";
}

function TypeToggle({ href, active, label }: { href: string; active: boolean; label: string }) {
    return (
        <Link
            href={href}
            className={`inline-flex min-h-10 items-center justify-center rounded-[8px] border px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                    ? "border-theme/20 bg-theme text-white"
                    : "border-black/10 bg-white/55 text-neutral-700 hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
            }`}
        >
            {label}
        </Link>
    );
}
