import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { useSiteConfig } from "../hooks/useSiteConfig";

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
    const total = useMemo(
        () => years.reduce((sum, year) => sum + (feeds?.[+year]?.length || 0), 0),
        [feeds, years],
    );

    return (
        <>
            <Helmet>
                <title>{`${t("timeline")} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteConfig.name} />
                <meta property="og:title" content={t("timeline")} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={feeds}>
                <main className="wauto ani-show pb-14 pt-6 sm:pt-8">
                    <section className="border-b border-black/8 pb-5 dark:border-white/10">
                        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="flex items-start gap-3">
                                <TimelineMark />
                                <div className="min-w-0">
                                    <p className="site-kicker">Timeline</p>
                                <h1 className="site-display text-[1.65rem] font-semibold text-neutral-900 dark:text-white md:text-[2.35rem]">
                                    时间轴
                                </h1>
                                <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                                    按年份整理所有文章，像翻一册干净的归档本。
                                </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <TimelineStat label="文章" value={total} />
                                <TimelineStat label="年份" value={years.length} />
                            </div>
                        </div>
                    </section>

                    <section className="mt-6 space-y-5">
                        {years.map((year) => (
                            <YearGroup
                                key={year}
                                year={year}
                                items={feeds?.[+year] || []}
                                fallbackTitle={t("unlisted")}
                            />
                        ))}
                    </section>
                </main>
            </Waiting>
        </>
    );
}

function TimelineMark() {
    return (
        <div className="relative mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-theme/20 bg-theme/10 text-theme shadow-sm dark:bg-theme/15">
            <span className="absolute left-1/2 top-3 h-6 w-px -translate-x-1/2 rounded-full bg-theme/35" />
            <span className="absolute top-3 h-2 w-2 rounded-full bg-theme shadow-[0_10px_0_rgba(var(--theme-rgb),0.42),0_20px_0_rgba(var(--theme-rgb),0.22)]" />
            <i className="ri-time-line relative z-10 text-[18px]" />
        </div>
    );
}

function TimelineStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="min-w-20 rounded-[16px] border border-black/8 bg-white/55 px-4 py-3 text-right dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className="site-display mt-1 text-2xl text-neutral-900 dark:text-white">{value}</p>
        </div>
    );
}

function YearGroup({ year, items, fallbackTitle }: { year: string; items: FeedItemRecord[]; fallbackTitle: string }) {
    return (
        <div className="site-panel rounded-[22px] px-4 py-5 sm:px-6 sm:py-6 md:px-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="site-kicker">Archive</p>
                    <h2 className="site-display mt-2 text-[2rem] text-neutral-900 dark:text-white md:text-[2.6rem]">
                        {year}
                    </h2>
                </div>
                <span className="rounded-full border border-black/10 bg-white/55 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                    {items.length} 篇
                </span>
            </div>

            <div className="relative mt-5 space-y-3 before:absolute before:bottom-3 before:left-[0.56rem] before:top-3 before:w-px before:bg-black/8 dark:before:bg-white/10">
                {items.map(({ id, title, createdAt }, index) => (
                    <TimelineFeedItem
                        key={id}
                        id={String(id)}
                        title={title || fallbackTitle}
                        createdAt={new Date(createdAt)}
                        first={index === 0}
                    />
                ))}
            </div>
        </div>
    );
}

function TimelineFeedItem({ id, title, createdAt, first }: { id: string; title: string; createdAt: Date; first: boolean }) {
    const formatter = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" });

    return (
        <Link
            href={`/feed/${id}`}
            target="_blank"
            className="group relative grid grid-cols-[1.2rem_76px_1fr] items-center gap-3 rounded-[16px] px-0 py-2 transition sm:grid-cols-[1.2rem_92px_1fr]"
        >
            <span className={`relative z-10 h-3 w-3 rounded-full ${first ? "bg-theme shadow-[0_0_0_7px_rgba(var(--theme-rgb),0.14)]" : "bg-neutral-300 dark:bg-neutral-600"}`} />
            <time className="text-[12px] font-medium tracking-[0.12em] text-neutral-400" title={createdAt.toLocaleString()}>
                {formatter.format(createdAt)}
            </time>
            <span className="rounded-[14px] border border-black/8 bg-white/45 px-4 py-3 text-[15px] font-medium text-neutral-800 transition group-hover:border-theme/30 group-hover:bg-theme/10 group-hover:text-theme dark:border-white/10 dark:bg-white/[0.035] dark:text-neutral-100 dark:group-hover:bg-theme/15">
                {title}
            </span>
        </Link>
    );
}
