import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { HashTag } from "../components/hashtag";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";

type HashtagRecord = {
    id: number;
    name: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    feeds: number;
}

export function HashtagsPage() {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const [hashtags, setHashtags] = useState<HashtagRecord[]>();
    const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
    const ref = useRef(false);

    useEffect(() => {
        if (ref.current) return;
        client.tag.list().then(({ data }) => {
            if (data) {
                setHashtags(data as any);
            }
        });
        ref.current = true;
    }, []);

    const sortedHashtags = useMemo(
        () =>
            hashtags
                ?.filter(({ feeds }) => feeds > 0)
                .sort((a, b) => {
                    if (sortBy === "popular") {
                        if (b.feeds !== a.feeds) {
                            return b.feeds - a.feeds;
                        }
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    }
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }) || [],
        [hashtags, sortBy],
    );

    return (
        <>
            <Helmet>
                <title>{`${t("hashtags")} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={t("hashtags")} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={hashtags}>
                <main className="wauto ani-show pb-14 pt-8">
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
                        <div className="site-panel site-panel-muted rounded-[32px] px-6 py-8 md:px-8 md:py-10">
                            <p className="site-kicker">{t("hashtags")}</p>
                            <h1 className="site-display mt-4 text-[3rem] text-neutral-900 dark:text-white md:text-[4.6rem]">
                                {t("hashtags")}
                            </h1>
                            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                Topic clusters for browsing the archive by theme instead of chronology.
                            </p>
                            <div className="site-rule mt-8 w-full max-w-xl" />
                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                <HashtagStat label={t("total_tags", { count: sortedHashtags.length })} value={sortedHashtags.length} />
                                <HashtagStat label={t("sort_latest")} value={sortBy === "latest" ? "On" : "Off"} />
                                <HashtagStat label={t("sort_popular")} value={sortBy === "popular" ? "On" : "Off"} />
                            </div>
                        </div>

                        <div className="site-panel rounded-[32px] px-6 py-8 md:px-7 md:py-8">
                            <p className="site-kicker">{t("hashtags")}</p>
                            <h2 className="site-display mt-3 text-[2.2rem] text-neutral-900 dark:text-white">
                                {t("total_tags", { count: sortedHashtags.length })}
                            </h2>
                            <p className="mt-4 text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                Switch between latest-first and most-used tags.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2">
                                <SortToggle active={sortBy === "latest"} label={t("sort_latest")} onClick={() => setSortBy("latest")} />
                                <SortToggle active={sortBy === "popular"} label={t("sort_popular")} onClick={() => setSortBy("popular")} />
                            </div>
                        </div>
                    </section>

                    <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {sortedHashtags.map((hashtag) => (
                            <Link
                                key={hashtag.id}
                                href={`/hashtag/${hashtag.name}`}
                                className="site-panel flex items-center justify-between gap-4 rounded-[28px] px-5 py-5 transition hover:-translate-y-1"
                            >
                                <div className="min-w-0">
                                    <HashTag name={hashtag.name} />
                                    <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                        {new Date(hashtag.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="rounded-full border border-black/10 bg-white/55 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                                    {t("article.total_short$count", { count: hashtag.feeds })}
                                </div>
                            </Link>
                        ))}
                    </section>
                </main>
            </Waiting>
        </>
    );
}

function SortToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                    ? "border-theme/20 bg-theme text-white shadow-[0_16px_28px_rgba(var(--theme-rgb),0.18)]"
                    : "border-black/10 bg-white/55 text-neutral-700 hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
            }`}
        >
            {label}
        </button>
    );
}

function HashtagStat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-[22px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white">{value}</p>
        </div>
    );
}
