import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import Loading from "react-loading";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { DateTimeInput, FlatPanel } from "@rin/ui";
import { client } from "../app/runtime";
import { RichTextEditor } from "../components/rich_text_editor";
import { useAlert } from "../components/dialog";
import { Input } from "../components/input";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { Cache } from "../utils/cache";
import { convertStoredContentToEditorHtml, hasMeaningfulContent, stripContentToPlainText } from "../utils/rich-content";

const AUTO_SAVE_DELAY_MS = 1800;

type SaveState = "idle" | "saving" | "saved" | "error";
type SaveIntent = "continue" | "publish";

function computeWordCount(value: string) {
  const latinWords = value.split(/\s+/).filter(Boolean).length;
  const cjkChars = (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) ?? []).length;
  return latinWords + cjkChars;
}

function buildSuggestedSummary(value: string) {
  const plain = stripContentToPlainText(value).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  return plain.length > 96 ? `${plain.slice(0, 96)}...` : plain;
}

function buildPersistedSnapshot({
  title,
  content,
  summary,
  draft,
  listed,
  createdAt,
}: {
  title: string;
  content: string;
  summary: string;
  draft: boolean;
  listed: boolean;
  createdAt?: Date;
}) {
  return JSON.stringify({
    title: title.trim(),
    content,
    summary: summary.trim(),
    draft,
    listed,
    createdAt: createdAt?.toISOString() ?? null,
  });
}

export function WritingPage({ id }: { id?: number }) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const [, setLocation] = useLocation();
  const cache = Cache.with(id);
  const [title, setTitle] = cache.useCache("title", "");
  const [summary, setSummary] = cache.useCache("summary", "");
  const [draft, setDraft] = useState(id === undefined);
  const listed = true;
  const [cachedContent, setContent] = cache.useCache("content", "");
  const [createdAt, setCreatedAt] = useState<Date | undefined>(new Date());
  const [publishing, setPublishing] = useState<SaveIntent | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();
  const [loadingFeed, setLoadingFeed] = useState(Boolean(id));
  const { showAlert, AlertUI } = useAlert();
  const hydratedRef = useRef(id === undefined);
  const lastPersistedSnapshotRef = useRef(
    id === undefined
      ? buildPersistedSnapshot({
          title,
          content: convertStoredContentToEditorHtml(cachedContent),
          summary,
          draft: true,
          listed: true,
          createdAt,
        })
      : "",
  );

  const content = useMemo(() => convertStoredContentToEditorHtml(cachedContent), [cachedContent]);

  const persistedSnapshot = useMemo(
    () =>
      buildPersistedSnapshot({
        title,
        content,
        summary,
        draft,
        listed,
        createdAt,
      }),
    [content, createdAt, draft, listed, summary, title],
  );

  const readingTitle = title.trim() || t("writing_editor.untitled");
  const readingDescription = summary.trim() || siteConfig.description || t("content.empty");
  const plainText = useMemo(() => stripContentToPlainText(content), [content]);
  const suggestedSummary = useMemo(() => buildSuggestedSummary(content), [content]);
  const wordCount = useMemo(() => computeWordCount(plainText), [plainText]);
  const readingMinutes = Math.max(1, Math.ceil(Math.max(wordCount, 1) / 320));
  const isDirty = hydratedRef.current && persistedSnapshot !== lastPersistedSnapshotRef.current;

  const applyFetchedSnapshot = useCallback((data: any) => {
    lastPersistedSnapshotRef.current = buildPersistedSnapshot({
      title: data.title ?? "",
      content: convertStoredContentToEditorHtml(data.content ?? ""),
      summary: data.summary ?? "",
      draft: data.draft === 1,
      listed: true,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    });
    setLastSavedAt(data.updatedAt ? new Date(data.updatedAt) : data.createdAt ? new Date(data.createdAt) : undefined);
  }, []);

  useEffect(() => {
    if (!id) return;

    setLoadingFeed(true);
    client.feed.get(id).then(({ data }) => {
      if (!data) {
        setLoadingFeed(false);
        return;
      }

      if (title === "" && data.title) setTitle(data.title);
      if (cachedContent === "") setContent(convertStoredContentToEditorHtml(data.content));
      if (summary === "") setSummary((data as any).summary || "");
      setDraft((data as any).draft === 1);
      setCreatedAt(new Date(data.createdAt));
      applyFetchedSnapshot(data);
      hydratedRef.current = true;
      setSaveState("idle");
      setLoadingFeed(false);
    });
  }, [applyFetchedSnapshot, cachedContent, id, setContent, setSummary, setTitle, summary, title]);

  useEffect(() => {
    if (cachedContent === content) return;
    setContent(content);
  }, [cachedContent, content, setContent]);

  useEffect(() => {
    if (saveState === "saved" && isDirty) {
      setSaveState("idle");
    }
  }, [isDirty, saveState]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const persistEntry = useCallback(
    async ({
      intent,
      silent = false,
      forcePublished = false,
    }: {
      intent: SaveIntent;
      silent?: boolean;
      forcePublished?: boolean;
    }) => {
      if (publishing) return;

      const trimmedTitle = title.trim();
      const trimmedSummary = summary.trim() || buildSuggestedSummary(content);
      const effectiveDraft = forcePublished ? false : draft;

      if (intent === "publish") {
        if (!trimmedTitle) {
          showAlert(t("title_empty"));
          return;
        }

        if (!hasMeaningfulContent(content)) {
          showAlert(t("content.empty"));
          return;
        }
      } else if (id === undefined && !trimmedTitle && !hasMeaningfulContent(content) && !trimmedSummary) {
        showAlert(t("writing_editor.empty_draft"));
        return;
      }

      setPublishing(intent);
      setSaveState("saving");

      const payload = {
        title: trimmedTitle,
        content,
        summary: trimmedSummary,
        tags: [],
        draft: effectiveDraft,
        alias: undefined,
        listed,
        createdAt: createdAt?.toISOString(),
      };

      try {
        if (id !== undefined) {
          const { error } = await client.feed.update(id, payload);

          if (error) {
            setSaveState("error");
            if (!silent) showAlert(error.value as string);
            return;
          }

          Cache.with(id).clear();
          lastPersistedSnapshotRef.current = buildPersistedSnapshot({
            title: trimmedTitle,
            content,
            summary: trimmedSummary,
            draft: effectiveDraft,
            listed,
            createdAt,
          });
          setLastSavedAt(new Date());
          setSaveState("saved");

          if (intent === "publish") {
            showAlert(t("update.success"), () => {
              Cache.with(id).clear();
              setLocation(`/feed/${id}`);
            });
          }

          return;
        }

        const { data, error } = await client.feed.create(payload);

        if (error) {
          setSaveState("error");
          if (!silent) showAlert(error.value as string);
          return;
        }

        if (!data) {
          setSaveState("error");
          if (!silent) showAlert(t("update.failed$message", { message: "Empty response" }));
          return;
        }

        Cache.with().clear();
        setLastSavedAt(new Date());
        setSaveState("saved");

        if (intent === "publish") {
          showAlert(t("publish.success"), () => {
            Cache.with().clear();
            setLocation(`/feed/${data.insertedId}`);
          });
          return;
        }

        setLocation(`/admin/writing/${data.insertedId}`);
      } finally {
        setPublishing(null);
      }
    },
    [content, createdAt, draft, id, listed, publishing, setLocation, showAlert, summary, t, title],
  );

  useEffect(() => {
    if (id === undefined || !hydratedRef.current || !isDirty || publishing !== null) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistEntry({ intent: "continue", silent: true });
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [id, isDirty, persistEntry, publishing, persistedSnapshot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persistEntry({ intent: "continue" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [persistEntry]);

  const saveStatusText = useMemo(() => {
    if (loadingFeed) return t("writing_editor.loading");
    if (saveState === "saving") return t("writing_editor.status.saving");
    if (saveState === "error") return t("writing_editor.status.error");
    if (lastSavedAt && !isDirty) return t("writing_editor.status.saved$time", { time: lastSavedAt.toLocaleString() });
    if (id === undefined) return t("writing_editor.status.local");
    return t("writing_editor.status.unsaved");
  }, [id, isDirty, lastSavedAt, loadingFeed, saveState, t]);

  function ActionButton({
    onClick,
    loading,
    variant = "secondary",
    children,
    className,
  }: {
    onClick: () => void;
    loading?: boolean;
    variant?: "primary" | "secondary";
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          variant === "primary"
            ? "bg-theme text-white hover:bg-theme-hover active:bg-theme-active"
            : "border border-black/10 bg-white/80 text-neutral-900 hover:border-black/20 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:border-white/20"
        } ${className ?? ""}`}
        disabled={publishing !== null}
      >
        {loading ? <Loading type="spin" height={16} width={16} /> : null}
        <span>{children}</span>
      </button>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${t("writing")} - ${siteConfig.name}`}</title>
        <meta property="og:site_name" content={siteConfig.name} />
        <meta property="og:title" content={t("writing")} />
        <meta property="og:image" content={siteConfig.avatar} />
        <meta property="og:type" content={draft ? "draft" : "article"} />
        <meta property="og:url" content={document.URL} />
      </Helmet>
      <div className="flex flex-col gap-6 t-primary">
        <section className="site-panel rounded-[30px] px-5 py-5 md:px-6 md:py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="site-kicker">{t("writing")}</p>
              <h1 className="mt-2 truncate text-[1.6rem] font-semibold text-neutral-900 dark:text-white md:text-[2rem]">
                {readingTitle}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {readingDescription}
              </p>
            </div>
            <div className="flex flex-col gap-3 xl:min-w-[29rem]">
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-[20px] border border-black/10 bg-white/55 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04] sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">{t("writing_editor.status.title")}</p>
                  <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{saveStatusText}</p>
                </div>
                <div className="rounded-[20px] border border-black/10 bg-white/55 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">{t("writing_editor.stats.words")}</p>
                  <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{wordCount}</p>
                </div>
                <div className="rounded-[20px] border border-black/10 bg-white/55 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">{t("writing_editor.stats.reading_time")}</p>
                  <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">
                    {t("writing_editor.reading_minutes", { count: readingMinutes })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => void persistEntry({ intent: "continue" })} loading={publishing === "continue"}>
                  {t("writing_editor.save_continue")}
                </ActionButton>
                <ActionButton
                  onClick={() => void persistEntry({ intent: "publish", forcePublished: true })}
                  loading={publishing === "publish"}
                  variant="primary"
                >
                  {t("writing_editor.publish_article")}
                </ActionButton>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <FlatPanel className="p-4 sm:p-5 md:p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <Input
                    id={id}
                    value={title}
                    setValue={setTitle}
                    placeholder={t("title")}
                    variant="flat"
                    className="text-base"
                  />
                </div>

                <div className="lg:col-span-2">
                  <div className="rounded-[18px] border border-black/10 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="site-kicker">{t("summary")}</p>
                        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">可留空，发布时会自动从正文提炼摘要。</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSummary(suggestedSummary)}
                        className="inline-flex items-center rounded-full border border-black/10 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-theme/15"
                      >
                        一键生成摘要
                      </button>
                    </div>
                    <div className="mt-3">
                      <Input id={id} value={summary} setValue={setSummary} placeholder={t("summary")} variant="flat" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-black/10 bg-white/40 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="site-kicker">{t("created_at")}</p>
                    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">需要的话可以调整文章发布时间。</p>
                  </div>
                  <DateTimeInput value={createdAt} onChange={setCreatedAt} className="w-full max-w-[16rem]" />
                </div>
              </div>
            </FlatPanel>

            <FlatPanel className="overflow-hidden p-0">
              <RichTextEditor
                content={content}
                setContent={setContent}
                height="clamp(34rem, 72vh, 58rem)"
                placeholder="直接输入正文，选中文字就可以加粗、加标题、插图。"
                onSave={() => {
                  void persistEntry({ intent: "continue" });
                }}
              />
            </FlatPanel>
          </div>
        </div>

        <div className="sticky bottom-3 z-20 xl:hidden">
          <div className="mx-auto flex max-w-[720px] items-center gap-3 rounded-[24px] border border-black/10 bg-white/92 px-4 py-3 shadow-[0_18px_36px_rgba(20,18,19,0.12)] backdrop-blur dark:border-white/10 dark:bg-[#161619]/92">
            <div className="min-w-0 flex-1">
              <p className="site-kicker">{t("writing_editor.status.title")}</p>
              <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{saveStatusText}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ActionButton
                onClick={() => void persistEntry({ intent: "continue" })}
                loading={publishing === "continue"}
                className="px-4 py-2.5"
              >
                {t("writing_editor.save_continue")}
              </ActionButton>
              <ActionButton
                onClick={() => void persistEntry({ intent: "publish", forcePublished: true })}
                loading={publishing === "publish"}
                variant="primary"
                className="px-4 py-2.5"
              >
                {t("publish.title")}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
      <AlertUI />
    </>
  );
}
