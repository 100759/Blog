import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { FeedCard } from "../components/feed_card";
import { HashTag } from "../components/hashtag";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";

type HashtagFeedRecord = {
    hashtags: {
        name: string;
        id: number;
    }[];
    id: number;
    title: string | null;
    summary: string;
    content: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    user: {
        id: number;
        username: string;
        avatar: string | null;
    };
    avatar?: string | null;
};

type HashtagData = {
    name: string;
    id: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    feeds: HashtagFeedRecord[] | undefined;
}

export function HashtagPage({ name }: { name: string }) {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const [status, setStatus] = useState<"loading" | "idle">("idle");
    const [hashtag, setHashtag] = useState<HashtagData>();
    const feedListClass = siteConfig.feedLayout === "masonry" ? "columns-1 gap-5 md:columns-2 [&>*]:mb-5" : "grid gap-5 lg:grid-cols-2";
    const ref = useRef("");

    function fetchFeeds() {
        const nameDecoded = decodeURI(name);
        client.tag.get(nameDecoded).then(({ data }) => {
            if (data) {
                setHashtag(data as any);
                setStatus("idle");
            }
        }).catch(() => {
            setStatus("idle");
        });
    }

    useEffect(() => {
        if (ref.current === name) return;
        setStatus("loading");
        fetchFeeds();
        ref.current = name;
    }, [name]);

    return (
        <>
            <Helmet>
                <title>{`${hashtag?.name} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={hashtag?.name} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={hashtag || status === "idle"}>
                <main className="wauto ani-show pb-14 pt-8">
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
                        <div className="site-panel site-panel-muted rounded-[32px] px-6 py-8 md:px-8 md:py-10">
                            <p className="site-kicker">{t("hashtags")}</p>
                            <h1 className="site-display mt-4 text-[3rem] text-neutral-900 dark:text-white md:text-[4.6rem]">
                                #{hashtag?.name}
                            </h1>
                            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                A filtered view of writing connected to this tag.
                            </p>
                            <div className="site-rule mt-8 w-full max-w-xl" />
                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                <HashtagFeedStat label={t("article.total$count", { count: hashtag?.feeds?.length || 0 })} value={hashtag?.feeds?.length || 0} />
                                <HashtagFeedStat label={t("hashtags")} value={hashtag?.name || ""} />
                                <HashtagFeedStat label={siteConfig.feedLayout} value={siteConfig.feedLayout} />
                            </div>
                        </div>

                        <div className="site-panel rounded-[32px] px-6 py-8 md:px-7 md:py-8">
                            <p className="site-kicker">{t("hashtags")}</p>
                            <div className="mt-4">
                                {hashtag?.name ? <HashTag name={hashtag.name} /> : null}
                            </div>
                            <p className="mt-5 text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                                {t("article.total$count", { count: hashtag?.feeds?.length || 0 })}
                            </p>
                        </div>
                    </section>

                    <section className="mt-8">
                        <Waiting for={status === "idle"}>
                            <div className={feedListClass}>
                                {hashtag?.feeds?.map(({ id, ...feed }) => (
                                    <FeedCard
                                        key={id}
                                        id={String(id)}
                                        {...feed}
                                        avatar={feed.avatar || undefined}
                                        title={feed.title || t("unlisted")}
                                        createdAt={new Date(feed.createdAt)}
                                        updatedAt={new Date(feed.updatedAt)}
                                        draft={0}
                                        listed={1}
                                        top={0}
                                        variant="editorial"
                                    />
                                ))}
                            </div>
                        </Waiting>
                    </section>
                </main>
            </Waiting>
        </>
    );
}

function HashtagFeedStat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-[22px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white">{value}</p>
        </div>
    );
}
