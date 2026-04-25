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
                <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                    <section>
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/8 pb-4 dark:border-white/10">
                            <div>
                                <p className="site-kicker">{t("hashtags")}</p>
                                <h1 className="mt-2 text-[1.1rem] font-semibold text-neutral-900 dark:text-white md:text-[1.25rem]">
                                    {t("total_tags", { count: sortedHashtags.length })}
                                </h1>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <SortToggle active={sortBy === "latest"} label={t("sort_latest")} onClick={() => setSortBy("latest")} />
                                <SortToggle active={sortBy === "popular"} label={t("sort_popular")} onClick={() => setSortBy("popular")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {sortedHashtags.map((hashtag) => (
                                <Link
                                    key={hashtag.id}
                                    href={`/hashtag/${hashtag.name}`}
                                    className="site-panel flex items-center justify-between gap-4 rounded-[10px] px-4 py-4 transition hover:border-theme/30"
                                >
                                    <div className="min-w-0">
                                        <HashTag name={hashtag.name} />
                                        <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                            {new Date(hashtag.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="rounded-[8px] border border-black/10 bg-white/45 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                                        {t("article.total_short$count", { count: hashtag.feeds })}
                                    </div>
                                </Link>
                            ))}
                        </div>
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
            className={`rounded-[8px] border px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                    ? "border-theme/20 bg-theme text-white"
                    : "border-black/10 bg-white/55 text-neutral-700 hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
            }`}
        >
            {label}
        </button>
    );
}
