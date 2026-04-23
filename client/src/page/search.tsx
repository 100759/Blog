import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Link, useSearch } from "wouter";
import { FeedCard } from "../components/feed_card";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import { tryInt } from "../utils/int";

type SearchFeedRecord = {
    id: number;
    title: string | null;
    summary: string;
    hashtags: { id: number; name: string }[];
    avatar?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
};

type FeedsData = {
    size: number;
    data: SearchFeedRecord[];
    hasNext: boolean;
}

export function SearchPage({ keyword }: { keyword: string }) {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const query = new URLSearchParams(useSearch());
    const [status, setStatus] = useState<"loading" | "idle">("idle");
    const [feeds, setFeeds] = useState<FeedsData>();
    const page = tryInt(1, query.get("page"));
    const limit = tryInt(siteConfig.pageSize, query.get("limit"));
    const feedListClass = siteConfig.feedLayout === "masonry" ? "columns-1 gap-5 md:columns-2 [&>*]:mb-5" : "grid gap-5 lg:grid-cols-2";
    const ref = useRef("");

    function fetchFeeds() {
        if (!keyword) return;
        client.search.search(keyword, {
            page,
            limit,
        }).then(({ data }) => {
            if (data) {
                setFeeds(data as FeedsData);
                setStatus("idle");
            }
        }).catch(() => {
            setStatus("idle");
        });
    }

    useEffect(() => {
        const key = `${page} ${limit} ${keyword}`;
        if (ref.current === key) return;
        setStatus("loading");
        fetchFeeds();
        ref.current = key;
    }, [page, limit, keyword]);

    const title = t("article.search.title$keyword", { keyword });

    return (
        <>
            <Helmet>
                <title>{`${title} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={title} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={status === "idle"}>
                <main className="wauto ani-show pb-14 pt-8">
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
                        <div className="site-panel site-panel-muted rounded-[32px] px-6 py-8 md:px-8 md:py-10">
                            <p className="site-kicker">{t("article.search.title")}</p>
                            <h1 className="site-display mt-4 text-[3rem] text-neutral-900 dark:text-white md:text-[4.6rem]">
                                {keyword}
                            </h1>
                            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                Search results across writing titles and summaries.
                            </p>
                            <div className="site-rule mt-8 w-full max-w-xl" />
                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                <SearchStat label={t("article.total$count", { count: feeds?.size || 0 })} value={feeds?.size || 0} />
                                <SearchStat label={t("article.search.title")} value={page} />
                                <SearchStat label={siteConfig.feedLayout} value={siteConfig.feedLayout} />
                            </div>
                        </div>

                        <div className="site-panel rounded-[32px] px-6 py-8 md:px-7 md:py-8">
                            <p className="site-kicker">{t("article.search.title")}</p>
                            <h2 className="site-display mt-3 text-[2.2rem] text-neutral-900 dark:text-white">
                                {t("article.total$count", { count: feeds?.size || 0 })}
                            </h2>
                            <p className="mt-4 text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                Query: <span className="font-medium text-neutral-900 dark:text-white">{keyword}</span>
                            </p>
                        </div>
                    </section>

                    <section className="mt-8">
                        <Waiting for={status === "idle"}>
                            <div className={feedListClass}>
                                {feeds?.data.map(({ id, ...feed }) => (
                                    <FeedCard
                                        key={id}
                                        id={String(id)}
                                        {...feed}
                                        title={feed.title || t("unlisted")}
                                        avatar={feed.avatar || undefined}
                                        createdAt={new Date(feed.createdAt)}
                                        updatedAt={new Date(feed.updatedAt)}
                                        draft={0}
                                        listed={1}
                                        top={0}
                                        variant="editorial"
                                    />
                                ))}
                            </div>
                            <div className="mt-8 flex items-center justify-between gap-4">
                                {page > 1 ? (
                                    <Link href={`?page=${page - 1}&limit=${limit}`} className="site-panel rounded-full px-5 py-3 text-sm font-medium t-primary">
                                        {t("previous")}
                                    </Link>
                                ) : (
                                    <div />
                                )}
                                {feeds?.hasNext ? (
                                    <Link href={`?page=${page + 1}&limit=${limit}`} className="rounded-full bg-theme px-5 py-3 text-sm font-medium text-white shadow-[0_18px_32px_rgba(var(--theme-rgb),0.22)]">
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

function SearchStat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-[22px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white">{value}</p>
        </div>
    );
}
