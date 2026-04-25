import { useTranslation } from "react-i18next";
import { timeago } from "../utils/timeago";
import { Markdown } from "./markdown";

interface Moment {
    id: number;
    content: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    user: {
        id: number;
        username: string;
        avatar: string;
    };
}

export function MomentItem({
    moment,
    onDelete,
    onEdit,
    canManage,
}: {
    moment: Moment;
    onDelete: (id: number) => void;
    onEdit: (moment: Moment) => void;
    canManage: boolean;
}) {
    const { t } = useTranslation();
    const createdAt = new Date(moment.createdAt);
    const updatedAt = new Date(moment.updatedAt);

    return (
        <article className="site-panel moment-card rounded-[16px] px-4 py-4 md:px-5">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <span className="moment-avatar-wrap">
                        <img
                            src={moment.user.avatar}
                            alt={moment.user.username}
                            className="h-10 w-10 rounded-full object-cover md:h-11 md:w-11"
                        />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-neutral-900 dark:text-white">{moment.user.username}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
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
                </div>
                {canManage ? (
                    <div className="moment-actions flex shrink-0 gap-1.5">
                        <button
                            aria-label={t("edit")}
                            onClick={() => onEdit(moment)}
                            className="rounded-full border border-black/8 bg-white/50 px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
                        >
                            {t("edit")}
                        </button>
                        <button
                            aria-label={t("delete.title")}
                            onClick={() => onDelete(moment.id)}
                            className="rounded-full border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-[12px] font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                        >
                            {t("delete.title")}
                        </button>
                    </div>
                ) : null}
            </div>
            <div className="moment-content mt-4 text-[15px] leading-7 text-neutral-800 dark:text-neutral-200">
                <Markdown content={moment.content} variant="moment" />
            </div>
        </article>
    );
}
