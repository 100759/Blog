import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";

interface FeedItemRecord {
    id: number;
    createdAt: Date | string;
    title: string | null;
}

export function TimelinePage() {
    const [feeds, setFeeds] = useState<Partial<Record<number, FeedItemRecord[]>>>();
    const ref = useRef(false);
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();

    function fetchFeeds() {
        client.feed.timeline()
            .then(({ data }) => {
                if (data) {
                    const arr = Array.isArray(data) ? data : [];
                    const groups = (Object.groupBy
                        ? Object.groupBy(arr, ({ createdAt }) => new Date(createdAt).getFullYear())
                        : arr.reduce<Record<number, FeedItemRecord[]>>((acc, item) => {
                            const key = new Date(item.createdAt).getFullYear();
                            (acc[key] ||= []).push(item as FeedItemRecord);
                            return acc;
                        }, {}));

                    setFeeds(groups as any);
                }
            })
            .catch((err) => {
                console.error("fetchFeeds error:", err);
            });
    }

    useEffect(() => {
        if (ref.current) return;
        fetchFeeds();
        ref.current = true;
    }, []);

    const years = useMemo(
        () => (feeds ? Object.keys(feeds).sort((a, b) => parseInt(b, 10) - parseInt(a, 10)) : []),
        [feeds],
    );

    return (
        <>
            <Helmet>
                <title>{`${t("timeline")} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={t("timeline")} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={feeds}>
                <main className="wauto ani-show pb-14 pt-8">
                    <section className="space-y-6">
                        {years.map((year) => (
                            <div key={year} className="site-panel rounded-[32px] px-6 py-7 md:px-8">
                                <div className="flex flex-wrap items-end justify-between gap-4">
                                    <div>
                                        <p className="site-kicker">{t("timeline")}</p>
                                        <h2 className="site-display mt-3 text-[2.6rem] text-neutral-900 dark:text-white">
                                            {t("year$year", { year })}
                                        </h2>
                                    </div>
                                    <div className="rounded-full border border-black/10 bg-white/55 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                                        {t("article.total_short$count", { count: feeds?.[+year]?.length || 0 })}
                                    </div>
                                </div>
                                <div className="mt-6 space-y-3">
                                    {feeds?.[+year]?.map(({ id, title, createdAt }) => (
                                        <TimelineFeedItem
                                            key={id}
                                            id={String(id)}
                                            title={title || t("unlisted")}
                                            createdAt={new Date(createdAt)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                </main>
            </Waiting>
        </>
    );
}

function TimelineFeedItem({ id, title, createdAt }: { id: string; title: string; createdAt: Date }) {
    const formatter = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" });
    return (
        <Link
            href={`/feed/${id}`}
            target="_blank"
            className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 transition hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-theme/15"
        >
            <div className="mt-1 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-theme shadow-[0_0_0_6px_rgba(var(--theme-rgb),0.12)]" />
                <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400" title={createdAt.toLocaleString()}>
                    {formatter.format(createdAt)}
                </span>
            </div>
            <h3 className="site-display text-[1.8rem] text-neutral-900 dark:text-white">{title}</h3>
        </Link>
    );
}
