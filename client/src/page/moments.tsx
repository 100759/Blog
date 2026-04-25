import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import Modal from "react-modal";
import { useSearch } from "wouter";
import { client } from "../app/runtime";
import { MarkdownEditor } from "../components/markdown_editor";
import { MomentItem } from "../components/moment_item";
import { Waiting } from "../components/loading";
import { useAlert, useConfirm } from "../components/dialog";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { ProfileContext } from "../state/profile";
import { siteName } from "../utils/constants";
import { tryInt } from "../utils/int";

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

export function MomentsPage() {
    const [moments, setMoments] = useState<Moment[]>([]);
    const [length, setLength] = useState(0);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
    const query = new URLSearchParams(useSearch());
    const ref = useRef("");
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const profile = useContext(ProfileContext);
    const { showAlert, AlertUI } = useAlert();
    const { showConfirm, ConfirmUI } = useConfirm();

    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const limit = tryInt(siteConfig.pageSize, query.get("limit"));

    function fetchMoments(page = 1, append = false) {
        if (loadingMore) return;

        const isInitialLoad = page === 1 && !append;
        if (isInitialLoad) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        client.moments
            .list({
                page,
                limit,
            })
            .then(({ data }) => {
                if (data) {
                    setLength(data.data.length);
                    setHasNextPage(data.hasNext);

                    if (append) {
                        setMoments((prev) => [...prev, ...(data.data as any)]);
                    } else {
                        setMoments(data.data as any);
                    }

                    setCurrentPage(page);
                }
            })
            .finally(() => {
                if (isInitialLoad) {
                    setLoading(false);
                } else {
                    setLoadingMore(false);
                }
            });
    }

    function loadMore() {
        if (hasNextPage && !loadingMore) {
            fetchMoments(currentPage + 1, true);
        }
    }

    function handleSubmit() {
        if (!content.trim()) return;

        setLoading(true);

        if (editingMoment) {
            client.moments
                .update(editingMoment.id, { content })
                .then(({ error }) => {
                    if (error) {
                        showAlert(t("update.failed$message", { message: error.value }));
                    } else {
                        setContent("");
                        setEditingMoment(null);
                        setIsModalOpen(false);
                        fetchMoments(1, false);
                        showAlert(t("update.success"));
                    }
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            client.moments
                .create({ content })
                .then(({ error }) => {
                    if (error) {
                        showAlert(t("publish.failed$message", { message: error.value }));
                    } else {
                        setContent("");
                        setIsModalOpen(false);
                        fetchMoments(1, false);
                        showAlert(t("publish.success"));
                    }
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }

    function handleEdit(moment: Moment) {
        setEditingMoment(moment);
        setContent(moment.content);
        setIsModalOpen(true);
    }

    function handleDelete(id: number) {
        showConfirm(t("delete.title"), t("delete.confirm"), () => {
            client.moments.delete(id).then(({ error }) => {
                if (error) {
                    showAlert(t("delete.failed$message", { message: error.value }));
                } else {
                    fetchMoments(1, false);
                    showAlert(t("delete.success"));
                }
            });
        });
    }

    function openCreateModal() {
        setEditingMoment(null);
        setContent("");
        setIsModalOpen(true);
    }

    useEffect(() => {
        const key = `${limit}`;
        if (ref.current === key) return;
        fetchMoments(1, false);
        ref.current = key;
    }, [limit]);

    return (
        <>
            <Helmet>
                <title>{`${t("moments.title")} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={t("moments.title")} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={!loading}>
                <main className="wauto ani-show pb-12 pt-3 md:pt-5">
                    <section className="moments-page">
                        <div className="moment-hero mb-4 flex flex-col gap-3 rounded-[16px] px-4 py-4 sm:flex-row sm:items-end sm:justify-between md:px-5 md:py-4">
                            <div className="max-w-[34rem]">
                                <p className="site-kicker">{t("moments.title")}</p>
                                <h1 className="site-display mt-1.5 text-[1.55rem] font-semibold text-neutral-950 dark:text-white md:text-[1.85rem]">
                                    随手记
                                </h1>
                                <p className="mt-1.5 text-[13px] leading-6 text-neutral-600 dark:text-neutral-300 md:text-[14px]">
                                    碎片、现场、灵感和一些没有被整理成文章的日常。
                                </p>
                                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                                    <span className="moment-pill">{t("moments.total$count", { count: length })}</span>
                                    <span className="moment-pill">轻量更新</span>
                                    <span className="moment-pill">图片已优化展示</span>
                                </div>
                            </div>
                            {profile?.permission ? (
                                <button
                                    onClick={openCreateModal}
                                    className="moment-publish-button rounded-full bg-theme px-4 py-2.5 text-[13px] font-semibold text-white"
                                >
                                    写一条动态
                                </button>
                            ) : null}
                        </div>

                        <div className="moment-stream">
                            {moments.length > 0 ? (
                                moments.map((moment) => (
                                    <MomentItem
                                        key={moment.id}
                                        moment={moment}
                                        onDelete={handleDelete}
                                        onEdit={handleEdit}
                                        canManage={profile?.permission || false}
                                    />
                                ))
                            ) : (
                                <div className="moment-empty site-panel rounded-[18px] px-5 py-10 text-center">
                                    <p className="site-kicker">Empty</p>
                                    <p className="site-display mt-3 text-[1.5rem] font-semibold text-neutral-900 dark:text-white">
                                        还没有动态
                                    </p>
                                    <p className="mx-auto mt-3 max-w-[24rem] text-sm leading-7 text-neutral-500 dark:text-neutral-400">
                                        后续的碎片记录会出现在这里，像一条更轻松的时间线。
                                    </p>
                                </div>
                            )}
                        </div>

                        <Waiting for={!loadingMore}>
                            <div className="mt-8 flex justify-center">
                                {!hasNextPage && moments.length > 0 ? (
                                    <div className="text-sm uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{t("no_more")}</div>
                                ) : hasNextPage ? (
                                    <button
                                        onClick={loadMore}
                                        className="rounded-[8px] bg-theme px-5 py-3 text-sm font-medium text-white"
                                    >
                                        {t("load_more")}
                                    </button>
                                ) : null}
                            </div>
                        </Waiting>
                    </section>
                </main>
            </Waiting>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                style={{
                    content: {
                        top: "50%",
                        left: "50%",
                        right: "auto",
                        bottom: "auto",
                        marginRight: "-50%",
                        transform: "translate(-50%, -50%)",
                        padding: "0",
                        border: "none",
                        borderRadius: "24px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "transparent",
                        maxWidth: "90%",
                        width: "860px",
                    },
                    overlay: {
                        backgroundColor: "rgba(0, 0, 0, 0.55)",
                        zIndex: 1000,
                    },
                }}
            >
                <div className="site-panel w-full rounded-[10px] p-4 md:p-5">
                    <h2 className="site-display text-[1.5rem] font-semibold text-neutral-900 dark:text-white md:text-[1.75rem]">
                        {editingMoment ? t("moments.edit") : t("moments.publish")}
                    </h2>

                    <div className="mt-5 rounded-[8px] border border-black/10 bg-white/50 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                        <MarkdownEditor content={content} setContent={setContent} height="300px" />
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-[8px] border border-black/10 bg-white/55 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !content.trim()}
                            className="rounded-[8px] bg-theme px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                            {loading ? t("saving") : editingMoment ? t("update.title") : t("publish.title")}
                        </button>
                    </div>
                </div>
            </Modal>

            <AlertUI />
            <ConfirmUI />
        </>
    );
}
