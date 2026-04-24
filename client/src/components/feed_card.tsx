import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { timeago } from "../utils/timeago";
import { HashTag } from "./hashtag";
import { useEffect, useRef } from "react";
import { drawBlurhashToCanvas } from "../utils/blurhash";
import { parseImageUrlMetadata } from "../utils/image-upload";
import { useImageLoadState } from "../utils/use-image-load-state";
import { type FeedCardVariant, normalizeFeedCardVariant } from "./feed-card-options";
import { useSiteConfig } from "../hooks/useSiteConfig";

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
        card: "group my-3 inline-block w-full break-inside-avoid overflow-hidden rounded-[20px] border border-black/8 bg-[rgba(255,252,248,0.76)] p-4 shadow-[0_6px_18px_rgba(38,24,18,0.04)] transition-colors hover:border-black/12 hover:bg-[rgba(255,252,248,0.9)] dark:border-white/10 dark:bg-[rgba(20,18,19,0.72)] dark:hover:bg-[rgba(20,18,19,0.84)]",
        imageWrap: "",
        meta: "text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400",
        summary: "line-clamp-3 text-pretty overflow-hidden text-[15px] leading-7 text-neutral-600 dark:text-neutral-300",
        title: "site-display text-[1.45rem] sm:text-[1.58rem] font-semibold text-neutral-900 dark:text-white text-pretty overflow-hidden",
    },
    editorial: {
        card: "group my-3 inline-block w-full break-inside-avoid overflow-hidden rounded-[22px] border border-black/8 bg-[rgba(255,252,248,0.82)] p-3 shadow-[0_8px_22px_rgba(38,24,18,0.05)] transition-colors hover:border-black/12 hover:bg-[rgba(255,252,248,0.94)] dark:border-white/10 dark:bg-[rgba(20,18,19,0.76)] dark:hover:bg-[rgba(20,18,19,0.88)]",
        imageWrap: "mb-3 overflow-hidden rounded-[18px] border border-black/5 dark:border-white/10",
        meta: "text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400",
        summary: "line-clamp-4 text-pretty text-[15px] leading-7 text-neutral-600 dark:text-neutral-300",
        title: "site-display text-[1.55rem] sm:text-[1.72rem] font-semibold tracking-[-0.015em] text-neutral-900 dark:text-white text-pretty overflow-hidden",
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
    hashtags: { id: number, name: string }[];
    createdAt: Date;
    updatedAt: Date;
    preview?: boolean;
    variant?: FeedCardVariant;
};

export function FeedCard({ id, title, avatar, draft, listed, top, summary, hashtags, createdAt, updatedAt, preview = false, variant }: FeedCardProps) {
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
                {hashtags.length > 0 &&
                    <div className={`flex flex-row flex-wrap justify-start gap-1.5 ${activeVariant === "editorial" ? "mt-3" : "mt-3"}`}>
                        {hashtags.map(({ name }, index) => (
                            <HashTag key={index} name={name} />
                        ))}
                    </div>
                }
            </div>
        </div>
    );

    return preview ? body : <Link href={`/feed/${id}`} target="_blank" className="block w-full">{body}</Link>;
}
