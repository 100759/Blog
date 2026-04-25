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
        <article className="site-panel overflow-hidden rounded-[10px] px-4 py-4 md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img
                        src={moment.user.avatar}
                        alt={moment.user.username}
                        className="h-10 w-10 rounded-[8px] object-cover md:h-11 md:w-11"
                    />
                    <div>
                        <p className="text-base font-semibold text-neutral-900 dark:text-white">{moment.user.username}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
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
                    <div className="flex gap-2">
                        <button
                            aria-label={t("edit")}
                            onClick={() => onEdit(moment)}
                            className="rounded-[8px] border border-black/10 bg-white/55 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
                        >
                            {t("edit")}
                        </button>
                        <button
                            aria-label={t("delete.title")}
                            onClick={() => onDelete(moment.id)}
                            className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                        >
                            {t("delete.title")}
                        </button>
                    </div>
                ) : null}
            </div>
            <div className="mt-4 text-[15px] leading-7 text-neutral-800 dark:text-neutral-200">
                <Markdown content={moment.content} />
            </div>
        </article>
    );
}
