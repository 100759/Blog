import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearch } from "wouter";
import { FeedCard } from "../components/feed_card";
import { HashTag } from "../components/hashtag";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
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
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                            <div className="site-panel site-panel-muted overflow-hidden rounded-[28px] px-5 py-6 md:rounded-[32px] md:px-8 md:py-9">
                                <p className="site-kicker">{listTitle}</p>
                                <h1 className="site-display mt-4 max-w-4xl text-[2.5rem] text-neutral-900 dark:text-white sm:text-[3.15rem] md:text-[4.2rem]">
                                    {siteConfig.name}
                                </h1>
                                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                    {listDescription}
                                </p>
                                <div className="site-rule mt-6 w-full max-w-xl" />
                                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <StatCard label={t("article.title")} value={currentFeedSet.size} />
                                    <StatCard label={t("timeline")} value={page} />
                                    <StatCard className="col-span-2 sm:col-span-1" label={siteConfig.feedLayout} value={remainingFeeds.length + (featuredFeed ? 1 : 0)} />
                                </div>
                            </div>

                            <div className="site-panel overflow-hidden rounded-[28px] px-5 py-6 md:rounded-[32px] md:px-7 md:py-8">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="site-kicker">{t("article.total$count", { count: currentFeedSet.size })}</p>
                                        <h2 className="site-display mt-3 text-[1.95rem] text-neutral-900 dark:text-white sm:text-[2.2rem]">
                                            {listTitle}
                                        </h2>
                                    </div>
                                    {siteConfig.avatar ? (
                                        <img
                                            src={stripImageUrlMetadata(siteConfig.avatar)}
                                            alt={siteConfig.name}
                                            className="h-14 w-14 rounded-[18px] border border-black/10 object-cover shadow-[0_10px_24px_rgba(36,24,19,0.1)] dark:border-white/10 sm:h-16 sm:w-16"
                                        />
                                    ) : null}
                                </div>

                                <div className="mt-6 flex flex-wrap gap-2">
                                    <TypeToggle href="/?type=normal" active={listState === "normal"} label={t("article.title")} />
                                    {profile?.permission ? (
                                        <>
                                            <TypeToggle href="/?type=draft" active={listState === "draft"} label={t("draft_bin")} />
                                            <TypeToggle href="/?type=unlisted" active={listState === "unlisted"} label={t("unlisted")} />
                                        </>
                                    ) : null}
                                </div>

                                <div className="site-rule mt-6 w-full" />

                                <div className="mt-6 grid gap-3">
                                    <SectionLink href="/timeline" label={t("timeline")} icon="ri-time-line" />
                                    <SectionLink href="/moments" label={t("moments.title")} icon="ri-quill-pen-line" />
                                    <SectionLink href="/hashtags" label={t("hashtags")} icon="ri-hashtag" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {featuredFeed ? (
                        <section className="wauto ani-show mt-8">
                            <FeaturedFeedLead feed={featuredFeed} />
                        </section>
                    ) : null}

                    <section className="wauto ani-show mt-7">
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="site-kicker">{listTitle}</p>
                                <h2 className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white sm:text-[2.2rem]">
                                    {t("article.total$count", { count: currentFeedSet.size })}
                                </h2>
                            </div>
                            <div className="rounded-full border border-black/10 bg-white/55 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                                {siteConfig.feedLayout}
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
        <Link href={`/feed/${feed.id}`} target="_blank" className="block">
            <article className="site-panel overflow-hidden rounded-[30px] md:rounded-[36px]">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                    <div className="px-5 py-6 md:px-8 md:py-9">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                            {feed.top === 1 ? <span className="rounded-full bg-theme/10 px-2 py-1 text-theme">{t("article.top.title")}</span> : null}
                            {feed.draft === 1 ? <span>{t("draft")}</span> : null}
                            {feed.listed === 0 ? <span>{t("unlisted")}</span> : null}
                        </div>
                        <h2 className="site-display mt-4 text-[2.2rem] text-neutral-900 dark:text-white sm:text-[2.7rem] md:text-[3.6rem]">
                            {feed.title}
                        </h2>
                        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-neutral-600 dark:text-neutral-300 md:text-[16px] md:leading-8">
                            {feed.summary}
                        </p>
                        <div className="site-rule mt-5 w-full max-w-2xl" />
                        <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
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
                            <div className="mt-6 flex flex-wrap gap-2">
                                {feed.hashtags.map(({ id, name }) => (
                                    <HashTag key={id} name={name} />
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="min-h-[220px] border-t border-black/5 bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.05),rgba(255,255,255,0.2))] p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.08),rgba(255,255,255,0.02))] lg:min-h-full lg:border-l lg:border-t-0 lg:p-5">
                        {feed.avatar ? (
                            <img
                                src={stripImageUrlMetadata(feed.avatar)}
                                alt=""
                                className="h-full min-h-[220px] w-full rounded-[22px] object-cover shadow-[0_14px_30px_rgba(36,24,19,0.12)] lg:min-h-[260px] lg:rounded-[28px]"
                            />
                        ) : (
                            <div className="flex h-full min-h-[220px] w-full items-end rounded-[22px] border border-dashed border-black/10 bg-white/55 p-5 dark:border-white/10 dark:bg-white/[0.04] lg:min-h-[260px] lg:rounded-[28px] lg:p-6">
                                <div>
                                    <p className="site-kicker">{t("article.title")}</p>
                                    <p className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white">{feed.title}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </article>
        </Link>
    );
}

function SectionLink({ href, label, icon }: { href: string; label: string; icon: string }) {
    return (
        <Link
            href={href}
            className="flex min-h-12 items-center justify-between rounded-[20px] border border-black/10 bg-white/55 px-4 py-4 text-sm font-medium text-neutral-700 transition-colors hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
        >
            <span className="flex items-center gap-3">
                <i className={`${icon} text-base`} />
                {label}
            </span>
            <i className="ri-arrow-right-up-line text-base opacity-60" />
        </Link>
    );
}

function StatCard({ label, value, className = "" }: { label: string; value: number | string; className?: string }) {
    return (
        <div className={`rounded-[18px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04] ${className}`}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="site-display mt-2 text-[1.7rem] text-neutral-900 dark:text-white sm:text-[1.9rem]">{value}</p>
        </div>
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
