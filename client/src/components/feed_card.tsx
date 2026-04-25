import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { timeago } from "../utils/timeago";
import { useEffect, useRef } from "react";
import { drawBlurhashToCanvas } from "../utils/blurhash";
import { parseImageUrlMetadata } from "../utils/image-upload";
import { useImageLoadState } from "../utils/use-image-load-state";
import { type FeedCardVariant, normalizeFeedCardVariant } from "./feed-card-options";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { preloadRoute } from "../app/routes";

function FeedCardImage({ src, variant }: { src: string; variant: FeedCardVariant }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { src: cleanSrc, blurhash, width, height } = parseImageUrlMetadata(src);
    const { failed, imageRef, loaded, onError, onLoad } = useImageLoadState(cleanSrc);
    const aspectRatio = width && height ? `${width} / ${height}` : undefined;
    const imageFrameClass =
        variant === "editorial"
            ? "relative flex max-h-72 w-full flex-row items-center overflow-hidden rounded-[18px]"
            : "relative mb-2 flex max-h-72 w-full flex-row items-center overflow-hidden rounded-[16px]";

    useEffect(() => {
        if (!blurhash || !canvasRef.current) {
            return;
        }
        try {
            drawBlurhashToCanvas(canvasRef.current, blurhash);
        } catch (error) {
            console.error("Failed to render blurhash", error);
        }
    }, [blurhash]);

    return (
        <div
            className={imageFrameClass}
            style={{ aspectRatio }}
        >
            {blurhash && !loaded ? (
                <canvas
                    ref={canvasRef}
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm"
                />
            ) : null}
            <img
                ref={imageRef}
                src={cleanSrc}
                alt=""
                width={width}
                height={height}
                loading="lazy"
                decoding="async"
                onLoad={onLoad}
                onError={onError}
                className={`absolute inset-0 h-full w-full object-cover object-center transition duration-300 ${blurhash && (!loaded || failed) ? "opacity-0" : "opacity-100"
                    }`}
            />
        </div>
    );
}

const FEED_CARD_STYLES: Record<
    FeedCardVariant,
    {
        card: string;
        imageWrap: string;
        meta: string;
        summary: string;
        title: string;
    }
> = {
    default: {
        card: "group my-2 inline-block w-full break-inside-avoid overflow-hidden rounded-[10px] border border-black/7 bg-white/45 p-3.5 transition-colors hover:border-black/12 hover:bg-white/65 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.055] sm:p-4",
        imageWrap: "",
        meta: "text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400",
        summary: "line-clamp-3 text-pretty overflow-hidden text-[14px] leading-6 text-neutral-600 dark:text-neutral-300 sm:text-[15px] sm:leading-7",
        title: "site-display text-[1.14rem] sm:text-[1.34rem] font-semibold text-neutral-900 dark:text-white text-pretty overflow-hidden",
    },
    editorial: {
        card: "group my-2 inline-block w-full break-inside-avoid overflow-hidden rounded-[10px] border border-black/7 bg-white/48 p-3 transition-colors hover:border-black/12 hover:bg-white/68 dark:border-white/10 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]",
        imageWrap: "mb-3 overflow-hidden rounded-[8px] border border-black/5 dark:border-white/10",
        meta: "text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400",
        summary: "line-clamp-4 text-pretty text-[14px] leading-6 text-neutral-600 dark:text-neutral-300 sm:text-[15px] sm:leading-7",
        title: "site-display text-[1.18rem] sm:text-[1.42rem] font-semibold text-neutral-900 dark:text-white text-pretty overflow-hidden",
    },
};

export type FeedCardProps = {
    id: string;
    avatar?: string;
    draft?: number;
    listed?: number;
    top?: number;
    title: string;
    summary: string;
    createdAt: Date;
    updatedAt: Date;
    preview?: boolean;
    variant?: FeedCardVariant;
};

export function FeedCard({ id, title, avatar, draft, listed, top, summary, createdAt, updatedAt, preview = false, variant }: FeedCardProps) {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const activeVariant = normalizeFeedCardVariant(variant ?? siteConfig.feedCardVariant);
    const styles = FEED_CARD_STYLES[activeVariant];
    const createdAtDate = new Date(createdAt);
    const updatedAtDate = new Date(updatedAt);
    const body = (
        <div className={styles.card}>
            {avatar ? (
                <div className={styles.imageWrap}>
                    <FeedCardImage src={avatar} variant={activeVariant} />
                </div>
            ) : null}
            <div className={activeVariant === "editorial" ? "px-1 pb-1" : ""}>
                <div className={`mb-3 flex flex-wrap items-center gap-2 ${styles.meta}`}>
                    {top === 1 ? (
                        <span className="rounded-full bg-theme/10 px-2 py-1 text-theme">
                            {t('article.top.title')}
                        </span>
                    ) : null}
                    {draft === 1 ? <span>{t("draft")}</span> : null}
                    {listed === 0 ? <span>{t("unlisted")}</span> : null}
                </div>
                <h1 className={styles.title}>{title}</h1>
                <p className={`space-x-2 ${styles.meta}`}>
                    <span title={createdAtDate.toLocaleString()}>
                        {createdAtDate.getTime() === updatedAtDate.getTime() ? timeago(createdAtDate) : t('feed_card.published$time', { time: timeago(createdAtDate) })}
                    </span>
                    {createdAtDate.getTime() !== updatedAtDate.getTime() &&
                        <span title={updatedAtDate.toLocaleString()}>
                            {t('feed_card.updated$time', { time: timeago(updatedAtDate) })}
                        </span>
                    }
                </p>
                <p className={`${styles.summary} ${activeVariant === "editorial" ? "mt-3 max-w-2xl" : "mt-3"}`}>{summary}</p>
            </div>
        </div>
    );

    return preview ? body : (
        <Link
            href={`/feed/${id}`}
            target="_blank"
            className="block w-full"
            onMouseEnter={() => preloadRoute("/feed")}
            onTouchStart={() => preloadRoute("/feed")}
        >
            {body}
        </Link>
    );
}
