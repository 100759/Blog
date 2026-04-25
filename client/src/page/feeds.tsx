import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearch } from "wouter";
import { FeedCard } from "../components/feed_card";
import { HashTag } from "../components/hashtag";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { preloadRoute } from "../app/routes";
import { ProfileContext } from "../state/profile";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { stripImageUrlMetadata } from "../utils/image-upload";
import { tryInt } from "../utils/int";
import { siteName } from "../utils/constants";
import { timeago } from "../utils/timeago";
import { useTranslation } from "react-i18next";

type FeedsData = {
    size: number;
    data: FeedRecord[];
    hasNext: boolean;
}

type FeedType = "draft" | "unlisted" | "normal";

type FeedsMap = {
    [key in FeedType]: FeedsData;
}

type FeedRecord = {
    id: string;
    avatar?: string;
    draft?: number;
    listed?: number;
    top?: number;
    title: string;
    summary: string;
    hashtags: { id: number; name: string }[];
    createdAt: Date | string;
    updatedAt: Date | string;
}

export function FeedsPage() {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const query = new URLSearchParams(useSearch());
    const profile = useContext(ProfileContext);
    const queryType = (query.get("type") as FeedType) || "normal";
    const queryPage = query.get("page");
    const [listState, setListState] = useState<FeedType>(queryType);
    const [status, setStatus] = useState<"loading" | "idle">("idle");
    const [feeds, setFeeds] = useState<FeedsMap>({
        draft: { size: 0, data: [], hasNext: false },
        unlisted: { size: 0, data: [], hasNext: false },
        normal: { size: 0, data: [], hasNext: false },
    });
    const page = tryInt(1, queryPage);
    const limit = tryInt(siteConfig.pageSize, query.get("limit"));
    const ref = useRef("");

    function fetchFeeds(type: FeedType) {
        client.feed.list({
            page,
            limit,
            type,
        }).then(({ data }) => {
            if (data) {
                const normalizedData: FeedsData = {
                    size: data.size,
                    hasNext: data.hasNext,
                    data: (data.data || []).map((item) => ({
                        id: String(item.id),
                        avatar: item.avatar || undefined,
                        title: item.title || t("unlisted"),
                        summary: item.summary,
                        hashtags: item.hashtags || [],
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                    })),
                };
                setFeeds((current) => ({
                    ...current,
                    [type]: normalizedData,
                }));
            }
            setStatus("idle");
        }).catch(() => {
            setStatus("idle");
        });
    }

    useEffect(() => {
        const key = `${queryPage} ${queryType} ${limit}`;
        if (ref.current === key) return;
        if (queryType !== listState) {
            setListState(queryType);
        }
        setStatus("loading");
        fetchFeeds(queryType);
        ref.current = key;
    }, [limit, listState, queryPage, queryType]);

    const currentFeedSet = feeds[listState];
    const allFeeds = currentFeedSet.data || [];
    const featuredFeed = listState === "normal" && page === 1 ? allFeeds[0] : undefined;
    const remainingFeeds = featuredFeed ? allFeeds.slice(1) : allFeeds;
    const visibleFeeds = featuredFeed ? remainingFeeds : allFeeds;
    const listTitle = listState === "draft" ? t("draft_bin") : listState === "normal" ? t("article.title") : t("unlisted");
    const listDescription = siteConfig.description || t("article.total$count", { count: currentFeedSet.size });
    const feedListClass =
        siteConfig.feedLayout === "masonry"
            ? "columns-1 gap-5 md:columns-2 [&>*]:mb-5"
            : "grid gap-5 lg:grid-cols-2";

    return (
        <>
            <Helmet>
                <title>{`${t("article.title")} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={t("article.title")} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={feeds.draft.size + feeds.normal.size + feeds.unlisted.size > 0 || status === "idle"}>
                <main className="w-full pb-14">
                    <section className="wauto ani-show pt-4 md:pt-8">
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.34fr)]">
                            <div className="site-panel site-panel-muted overflow-hidden rounded-[18px] px-4 py-4 sm:rounded-[22px] sm:px-5 sm:py-5 md:rounded-[28px] md:px-6 md:py-6">
                                <p className="site-kicker">{listTitle}</p>
                                <h1 className="site-display mt-2.5 max-w-3xl text-[1.4rem] leading-tight text-neutral-900 dark:text-white sm:mt-3 sm:text-[1.85rem] md:text-[2.3rem]">
                                    {siteConfig.name}
                                </h1>
                                <p className="mt-2.5 max-w-xl text-[13px] leading-6 text-neutral-600 dark:text-neutral-300 sm:mt-3 sm:text-[14px]">
                                    {listDescription}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-neutral-500 dark:text-neutral-400 sm:mt-4 sm:gap-x-5">
                                    <span>{t("article.total$count", { count: currentFeedSet.size })}</span>
                                </div>
                            </div>

                            <div className="site-panel overflow-hidden rounded-[18px] px-4 py-4 sm:rounded-[20px] md:rounded-[24px]">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="site-kicker">{t("article.total$count", { count: currentFeedSet.size })}</p>
                                        <h2 className="mt-2 text-[0.98rem] font-semibold tracking-[-0.02em] text-neutral-900 dark:text-white sm:text-[1.12rem]">
                                            {listTitle}
                                        </h2>
                                    </div>
                                    {siteConfig.avatar ? (
                                        <img
                                            src={stripImageUrlMetadata(siteConfig.avatar)}
                                            alt={siteConfig.name}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-10 w-10 rounded-[14px] border border-black/10 object-cover shadow-[0_8px_16px_rgba(36,24,19,0.06)] dark:border-white/10 sm:h-11 sm:w-11"
                                        />
                                    ) : null}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <TypeToggle href="/?type=normal" active={listState === "normal"} label={t("article.title")} />
                                    {profile?.permission ? (
                                        <>
                                            <TypeToggle href="/?type=draft" active={listState === "draft"} label={t("draft_bin")} />
                                            <TypeToggle href="/?type=unlisted" active={listState === "unlisted"} label={t("unlisted")} />
                                        </>
                                    ) : null}
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
                                <h2 className="mt-2.5 text-[1.05rem] font-semibold tracking-[-0.02em] text-neutral-900 dark:text-white sm:mt-3 sm:text-[1.3rem]">
                                    {t("article.total$count", { count: currentFeedSet.size })}
                                </h2>
                            </div>
                            <div className="rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-[11px] font-medium text-neutral-500 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
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
                                    <Link href={`/?type=${listState}&page=${page - 1}`} className="site-panel inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-medium t-primary">
                                        {t("previous")}
                                    </Link>
                                ) : (
                                    <div />
                                )}
                                {currentFeedSet?.hasNext ? (
                                    <Link href={`/?type=${listState}&page=${page + 1}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-theme px-5 py-3 text-sm font-medium text-white shadow-[0_18px_32px_rgba(var(--theme-rgb),0.22)]">
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
            <article className="site-panel overflow-hidden rounded-[18px] sm:rounded-[24px] md:rounded-[36px]">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.56fr)]">
                    <div className="px-4 py-4 sm:px-5 sm:py-6 md:px-7 md:py-8">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                            {feed.top === 1 ? <span className="rounded-full bg-theme/10 px-2 py-1 text-theme">{t("article.top.title")}</span> : null}
                            {feed.draft === 1 ? <span>{t("draft")}</span> : null}
                            {feed.listed === 0 ? <span>{t("unlisted")}</span> : null}
                        </div>
                        <h2 className="site-display mt-3 text-[1.45rem] text-neutral-900 dark:text-white sm:mt-4 sm:text-[2rem] md:text-[2.7rem]">
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
                        {feed.hashtags.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2 sm:mt-6">
                                {feed.hashtags.map(({ id, name }) => (
                                    <HashTag key={id} name={name} />
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="min-h-[140px] border-t border-black/5 bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.03),rgba(255,255,255,0.1))] p-2.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.05),rgba(255,255,255,0.02))] sm:min-h-[180px] sm:p-3 lg:min-h-full lg:border-l lg:border-t-0 lg:p-4">
                        {feed.avatar ? (
                            <img
                                src={stripImageUrlMetadata(feed.avatar)}
                                alt=""
                                loading="eager"
                                decoding="async"
                                className="h-full min-h-[140px] w-full rounded-[14px] object-cover shadow-[0_8px_18px_rgba(36,24,19,0.08)] sm:min-h-[180px] sm:rounded-[18px] lg:min-h-[220px] lg:rounded-[24px]"
                            />
                        ) : (
                            <div className="flex h-full min-h-[140px] w-full items-end rounded-[14px] border border-dashed border-black/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:min-h-[180px] sm:rounded-[18px] sm:p-5 lg:min-h-[220px] lg:rounded-[24px]">
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


function TypeToggle({ href, active, label }: { href: string; active: boolean; label: string }) {
    return (
        <Link
            href={href}
            className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                    ? "border-theme/20 bg-theme text-white shadow-[0_16px_28px_rgba(var(--theme-rgb),0.18)]"
                    : "border-black/10 bg-white/55 text-neutral-700 hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
            }`}
        >
            {label}
        </Link>
    );
}
