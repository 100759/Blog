import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Link, useSearch } from "wouter";
import { FeedCard } from "../components/feed_card";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { tryInt } from "../utils/int";

type SearchFeedRecord = {
    id: number;
    title: string | null;
    category?: string;
    summary: string;
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
    const hasResults = (feeds?.data?.length || 0) > 0;

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
                <meta property="og:site_name" content={siteConfig.name} />
                <meta property="og:title" content={title} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={status === "idle"}>
                <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                    <section className="border-b border-black/8 pb-5 dark:border-white/10">
                        <div>
                            <p className="site-kicker">{t("article.search.title")}</p>
                            <h1 className="site-display mt-2 text-[1.55rem] font-semibold leading-tight text-neutral-900 dark:text-white md:text-[2rem]">
                                {keyword}
                            </h1>
                            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                                {t("article.search.summary")}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                                <span>{t("article.total$count", { count: feeds?.size || 0 })}</span>
                                <span>{t("article.search.page", { page })}</span>
                                <span>{siteConfig.feedLayout}</span>
                            </div>
                        </div>
                    </section>

                    <section className="mt-6 md:mt-7">
                        <Waiting for={status === "idle"}>
                            {hasResults ? (
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
                            ) : (
                                <div className="site-panel rounded-[10px] px-5 py-8 text-center md:px-8">
                                    <p className="site-kicker">{t("article.search.title")}</p>
                                    <h2 className="site-display mt-3 text-[1.35rem] font-semibold text-neutral-900 dark:text-white">
                                        {t("article.search.empty_title")}
                                    </h2>
                                    <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                        {t("article.search.empty_description")}
                                    </p>
                                </div>
                            )}
                            <div className="mt-8 flex items-center justify-between gap-4">
                                {page > 1 ? (
                                    <Link href={`?page=${page - 1}&limit=${limit}`} className="site-panel rounded-full px-5 py-3 text-sm font-medium t-primary">
                                        {t("previous")}
                                    </Link>
                                ) : (
                                    <div />
                                )}
                                {feeds?.hasNext ? (
                                    <Link href={`?page=${page + 1}&limit=${limit}`} className="rounded-[8px] bg-theme px-5 py-3 text-sm font-medium text-white">
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
