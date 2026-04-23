import type { AdjacentFeed, AdjacentFeedResponse } from "@rin/api";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { client } from "../app/runtime";
import { timeago } from "../utils/timeago.ts";

export function AdjacentSection({ id, setError }: { id: string; setError: (error: string) => void }) {
    const [adjacentFeeds, setAdjacentFeeds] = useState<AdjacentFeedResponse>();

    useEffect(() => {
        client.feed.adjacent(id).then(({ data, error }) => {
            if (error) {
                setError(error.value as string);
            } else if (data && typeof data !== "string") {
                setAdjacentFeeds(data);
            }
        });
    }, [id, setError]);

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdjacentCard data={adjacentFeeds?.previousFeed} type="previous" />
            <AdjacentCard data={adjacentFeeds?.nextFeed} type="next" />
        </div>
    );
}

export function AdjacentCard({ data, type }: { data: AdjacentFeed | null | undefined; type: "previous" | "next" }) {
    const direction = type === "previous" ? "items-start text-left" : "items-end text-right";
    const { t } = useTranslation();

    if (!data) {
        return (
            <div className={`site-panel flex min-h-[180px] flex-col justify-between rounded-[28px] px-6 py-6 ${direction}`}>
                <p className="site-kicker">{type === "previous" ? "Previous" : "Next"}</p>
                <div>
                    <h3 className="site-display mt-4 text-[2rem] text-neutral-900 dark:text-white">{t("no_more")}</h3>
                </div>
            </div>
        );
    }

    const createdAt = new Date(data.createdAt);
    const updatedAt = new Date(data.updatedAt);

    return (
        <Link
            href={`/feed/${data.id}`}
            target="_blank"
            className={`site-panel flex min-h-[180px] flex-col justify-between rounded-[28px] px-6 py-6 transition hover:-translate-y-1 ${direction}`}
        >
            <p className="site-kicker">{type === "previous" ? "Previous" : "Next"}</p>
            <div>
                <h3 className="site-display mt-4 text-[2rem] text-neutral-900 dark:text-white">{data.title}</h3>
                <p className="mt-4 flex flex-wrap gap-3 text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                    <span title={createdAt.toLocaleString()}>
                        {createdAt.getTime() === updatedAt.getTime()
                            ? timeago(createdAt)
                            : t("feed_card.published$time", { time: timeago(createdAt) })}
                    </span>
                    {createdAt.getTime() !== updatedAt.getTime() ? (
                        <span title={updatedAt.toLocaleString()}>
                            {t("feed_card.updated$time", { time: timeago(updatedAt) })}
                        </span>
                    ) : null}
                </p>
            </div>
        </Link>
    );
}
