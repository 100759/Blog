import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import Modal from "react-modal";
import { useSearch } from "wouter";
import { client } from "../app/runtime";
import { MomentItem } from "../components/moment_item";
import { Waiting } from "../components/loading";
import { useAlert, useConfirm } from "../components/dialog";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { ProfileContext } from "../state/profile";
import { siteName } from "../utils/constants";
import { buildMarkdownImage, uploadImageFile } from "../utils/image-upload";
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

type ComposerImage = {
    id: string;
    name: string;
    url: string;
    markdown: string;
};

function parseMomentDraft(content: string) {
    const images: ComposerImage[] = [];
    const imagePattern = /!\[(.*?)\]\((\S+?)(?:\s+"[^"]*")?\)/g;
    let text = content.replace(imagePattern, (match, alt: string, url: string) => {
        images.push({
            id: `${url}-${images.length}`,
            name: alt || "image",
            url,
            markdown: match.endsWith("\n") ? match : `${match}\n`,
        });
        return "";
    });
    const locationMatch = text.match(/^\s*>?\s*📍\s*(.+?)\s*$/m);
    const location = locationMatch?.[1]?.trim() || "";

    if (locationMatch) {
        text = text.replace(locationMatch[0], "");
    }

    return {
        text: text.trim(),
        images,
        location,
        useLocation: Boolean(location),
    };
}

export function MomentsPage() {
    const [moments, setMoments] = useState<Moment[]>([]);
    const [length, setLength] = useState(0);
    const [draftText, setDraftText] = useState("");
    const [draftImages, setDraftImages] = useState<ComposerImage[]>([]);
    const [draftLocation, setDraftLocation] = useState("");
    const [useLocation, setUseLocation] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [locating, setLocating] = useState(false);
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

    function buildMomentContent() {
        return [
            draftText.trim(),
            draftImages.map((image) => image.markdown.trim()).join("\n"),
            useLocation && draftLocation.trim() ? `> 📍 ${draftLocation.trim()}` : "",
        ]
            .filter(Boolean)
            .join("\n\n");
    }

    function resetComposer() {
        setDraftText("");
        setDraftImages([]);
        setDraftLocation("");
        setUseLocation(false);
    }

    async function handleImageUpload(files: FileList | null) {
        if (!files || files.length === 0) return;

        setUploadingImages(true);
        try {
            const uploaded = await Promise.all(Array.from(files).map(async (file) => {
                const result = await uploadImageFile(file);
                return {
                    id: `${result.url}-${Date.now()}-${Math.random()}`,
                    name: file.name,
                    url: result.url,
                    markdown: buildMarkdownImage(file.name, result.url, {
                        blurhash: result.blurhash,
                        width: result.width,
                        height: result.height,
                    }),
                };
            }));
            setDraftImages((prev) => [...prev, ...uploaded]);
        } catch (error) {
            showAlert(error instanceof Error ? error.message : t("upload.failed"));
        } finally {
            setUploadingImages(false);
        }
    }

    async function handleLocate() {
        if (!navigator.geolocation) {
            showAlert("当前浏览器不支持定位");
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
                    );
                    const data = await response.json() as { display_name?: string };
                    setDraftLocation(data.display_name || fallback);
                } catch {
                    setDraftLocation(fallback);
                } finally {
                    setUseLocation(true);
                    setLocating(false);
                }
            },
            () => {
                setLocating(false);
                showAlert("定位失败，可以手动填写地址");
            },
            {
                enableHighAccuracy: false,
                maximumAge: 5 * 60 * 1000,
                timeout: 10000,
            },
        );
    }

    function handleSubmit() {
        const nextContent = buildMomentContent();
        if (!nextContent.trim()) return;

        setLoading(true);

        if (editingMoment) {
            client.moments
                .update(editingMoment.id, { content: nextContent })
                .then(({ error }) => {
                    if (error) {
                        showAlert(t("update.failed$message", { message: error.value }));
                    } else {
                        resetComposer();
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
                .create({ content: nextContent })
                .then(({ error }) => {
                    if (error) {
                        showAlert(t("publish.failed$message", { message: error.value }));
                    } else {
                        resetComposer();
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
        const draft = parseMomentDraft(moment.content);
        setEditingMoment(moment);
        setDraftText(draft.text);
        setDraftImages(draft.images);
        setDraftLocation(draft.location);
        setUseLocation(draft.useLocation);
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
        resetComposer();
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
                <div className="moment-composer site-panel w-full rounded-[18px] p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="site-kicker">Moment</p>
                            <h2 className="site-display mt-1 text-[1.35rem] font-semibold text-neutral-900 dark:text-white md:text-[1.55rem]">
                                {editingMoment ? "编辑动态" : "发一条动态"}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-full border border-black/10 bg-white/50 px-3 py-1.5 text-[12px] font-medium text-neutral-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200"
                        >
                            {t("cancel")}
                        </button>
                    </div>

                    <div className="mt-4">
                        <textarea
                            value={draftText}
                            onChange={(event) => setDraftText(event.target.value)}
                            placeholder="这一刻想说点什么..."
                            className="moment-composer-textarea"
                            rows={5}
                        />
                    </div>

                    {draftImages.length > 0 ? (
                        <div className="moment-composer-grid mt-3">
                            {draftImages.map((image) => (
                                <div key={image.id} className="moment-composer-image">
                                    <img src={image.url} alt={image.name} />
                                    <button
                                        type="button"
                                        onClick={() => setDraftImages((prev) => prev.filter((item) => item.id !== image.id))}
                                        aria-label="remove image"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="moment-composer-tool">
                            <input
                                type="file"
                                accept="image/gif,image/jpeg,image/jpg,image/png,image/webp"
                                multiple
                                className="hidden"
                                onChange={(event) => {
                                    void handleImageUpload(event.currentTarget.files);
                                    event.currentTarget.value = "";
                                }}
                            />
                            <i className="ri-image-add-line" />
                            <span>{uploadingImages ? "上传中..." : "图片"}</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                if (draftLocation) {
                                    setUseLocation((value) => !value);
                                } else {
                                    void handleLocate();
                                }
                            }}
                            className={`moment-composer-tool ${useLocation ? "is-active" : ""}`}
                        >
                            <i className="ri-map-pin-line" />
                            <span>{locating ? "定位中..." : useLocation ? "已使用地址" : "添加地址"}</span>
                        </button>
                        {draftLocation ? (
                            <input
                                value={draftLocation}
                                onChange={(event) => setDraftLocation(event.target.value)}
                                className="moment-location-input"
                                placeholder="填写地址"
                            />
                        ) : null}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-[8px] border border-black/10 bg-white/55 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || uploadingImages || locating || !buildMomentContent().trim()}
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
