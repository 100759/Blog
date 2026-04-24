import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import Loading from "react-loading";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { DateTimeInput, FlatMetaRow, FlatPanel } from "@rin/ui";
import { client } from "../app/runtime";
import { MarkdownEditor } from "../components/markdown_editor";
import { useAlert } from "../components/dialog";
import { Checkbox, Input } from "../components/input";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { Cache } from "../utils/cache";

const AUTO_SAVE_DELAY_MS = 1800;

type SaveState = "idle" | "saving" | "saved" | "error";
type SaveIntent = "continue" | "publish";

function normalizeAlias(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=[\]{};:'",.<>/?\\|]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSummaryFromContent(content: string, fallbackTitle: string) {
  const plain = stripMarkdown(content);
  const source = plain || fallbackTitle.trim();

  if (source.length <= 140) {
    return source;
  }

  return `${source.slice(0, 137).trimEnd()}...`;
}

function computeWordCount(value: string) {
  const latinWords = value.split(/\s+/).filter(Boolean).length;
  const cjkChars = (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) ?? []).length;
  return latinWords + cjkChars;
}

function buildPersistedSnapshot({
  title,
  alias,
  content,
  summary,
  tags,
  draft,
  listed,
  createdAt,
}: {
  title: string;
  alias: string;
  content: string;
  summary: string;
  tags: string[];
  draft: boolean;
  listed: boolean;
  createdAt?: Date;
}) {
  return JSON.stringify({
    title: title.trim(),
    alias: alias.trim(),
    content,
    summary: summary.trim(),
    tags,
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
  const [tags, setTags] = cache.useCache("tags", "");
  const [alias, setAlias] = cache.useCache("alias", "");
  const [draft, setDraft] = useState(id === undefined);
  const [listed, setListed] = useState(true);
  const [content, setContent] = cache.useCache("content", "");
  const [createdAt, setCreatedAt] = useState<Date | undefined>(new Date());
  const [publishing, setPublishing] = useState<SaveIntent | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();
  const [loadingFeed, setLoadingFeed] = useState(Boolean(id));
  const { showAlert, AlertUI } = useAlert();
  const aliasTouchedRef = useRef(Boolean(alias));
  const hydratedRef = useRef(id === undefined);
  const lastPersistedSnapshotRef = useRef(
    id === undefined
      ? buildPersistedSnapshot({
          title,
          alias,
          content,
          summary,
          tags: tags
            .split("#")
            .filter((tag) => tag !== "")
            .map((tag) => tag.trim())
            .filter(Boolean),
          draft: true,
          listed: true,
          createdAt,
        })
      : "",
  );

  const tagList = useMemo(
    () =>
      tags
        .split("#")
        .filter((tag) => tag !== "")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags],
  );

  const persistedSnapshot = useMemo(
    () =>
      buildPersistedSnapshot({
        title,
        alias,
        content,
        summary,
        tags: tagList,
        draft,
        listed,
        createdAt,
      }),
    [alias, content, createdAt, draft, listed, summary, tagList, title],
  );

  const readingTitle = title.trim() || t("writing_editor.untitled");
  const readingDescription = summary.trim() || siteConfig.description || t("content.empty");
  const contentText = useMemo(() => stripMarkdown(content), [content]);
  const plainText = useMemo(() => stripMarkdown(`${title}\n${content}`), [content, title]);
  const wordCount = useMemo(() => computeWordCount(plainText), [plainText]);
  const characterCount = plainText.length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
  const headingOutline = useMemo(
    () =>
      Array.from(content.matchAll(/^(#{1,6})\s+(.+)$/gm)).map((match) => ({
        level: match[1].length,
        text: match[2].trim(),
      })),
    [content],
  );
  const imageCount = useMemo(() => (content.match(/!\[.*?\]\(.*?\)/g) ?? []).length, [content]);
  const publishChecklist = useMemo(
    () => [
      {
        key: "title",
        done: title.trim().length > 0,
        label: t("writing_editor.checklist.title"),
        hint: t("writing_editor.checklist.title_hint"),
      },
      {
        key: "content",
        done: contentText.length >= 120,
        label: t("writing_editor.checklist.content"),
        hint: t("writing_editor.checklist.content_hint", { count: 120 }),
      },
      {
        key: "summary",
        done: summary.trim().length >= 40,
        label: t("writing_editor.checklist.summary"),
        hint: t("writing_editor.checklist.summary_hint", { count: 40 }),
      },
      {
        key: "alias",
        done: alias.trim().length > 0,
        label: t("writing_editor.checklist.alias"),
        hint: t("writing_editor.checklist.alias_hint"),
      },
      {
        key: "tags",
        done: tagList.length > 0,
        label: t("writing_editor.checklist.tags"),
        hint: t("writing_editor.checklist.tags_hint"),
      },
    ],
    [alias, contentText.length, summary, t, tagList.length, title],
  );
  const checklistDone = publishChecklist.filter((item) => item.done).length;
  const isDirty = hydratedRef.current && persistedSnapshot !== lastPersistedSnapshotRef.current;

  const applyFetchedSnapshot = useCallback((data: any) => {
    lastPersistedSnapshotRef.current = buildPersistedSnapshot({
      title: data.title ?? "",
      alias: data.alias ?? "",
      content: data.content ?? "",
      summary: data.summary ?? "",
      tags: (data.hashtags ?? []).map(({ name }: { name: string }) => name),
      draft: data.draft === 1,
      listed: data.listed === 1,
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
      if (tags === "" && data.hashtags) {
        setTags(data.hashtags.map(({ name }: { name: string }) => `#${name}`).join(" "));
      }
      if (alias === "" && (data as any).alias) {
        setAlias((data as any).alias);
        aliasTouchedRef.current = true;
      }
      if (content === "") setContent(data.content);
      if (summary === "") setSummary((data as any).summary || "");
      if (title !== "" || content !== "" || summary !== "" || tags !== "" || alias !== "") {
        aliasTouchedRef.current = alias.trim().length > 0;
      }
      setListed((data as any).listed === 1);
      setDraft((data as any).draft === 1);
      setCreatedAt(new Date(data.createdAt));
      applyFetchedSnapshot(data);
      hydratedRef.current = true;
      setSaveState("idle");
      setLoadingFeed(false);
    });
  }, [alias, applyFetchedSnapshot, content, id, setAlias, setContent, setSummary, setTags, setTitle, summary, tags, title]);

  useEffect(() => {
    if (id !== undefined) return;
    if (aliasTouchedRef.current) return;

    const nextAlias = normalizeAlias(title);
    if (alias !== nextAlias) {
      setAlias(nextAlias);
    }
  }, [alias, id, setAlias, title]);

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
      const trimmedSummary = summary.trim();
      const trimmedAlias = alias.trim();
      const effectiveDraft = forcePublished ? false : draft;

      if (intent === "publish") {
        if (!trimmedTitle) {
          showAlert(t("title_empty"));
          return;
        }

        if (!content.trim()) {
          showAlert(t("content.empty"));
          return;
        }
      } else if (
        id === undefined &&
        !trimmedTitle &&
        !content.trim() &&
        !trimmedSummary &&
        !trimmedAlias &&
        tagList.length === 0
      ) {
        showAlert(t("writing_editor.empty_draft"));
        return;
      }

      setPublishing(intent);
      setSaveState("saving");

      const payload = {
        title: trimmedTitle,
        content,
        summary: trimmedSummary,
        tags: tagList,
        draft: effectiveDraft,
        alias: trimmedAlias || undefined,
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
            alias: trimmedAlias,
            content,
            summary: trimmedSummary,
            tags: tagList,
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
    [alias, content, createdAt, draft, id, listed, publishing, setLocation, showAlert, summary, t, tagList, title],
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
    if (loadingFeed) {
      return t("writing_editor.loading");
    }

    if (saveState === "saving") {
      return t("writing_editor.status.saving");
    }

    if (saveState === "error") {
      return t("writing_editor.status.error");
    }

    if (lastSavedAt && !isDirty) {
      return t("writing_editor.status.saved$time", { time: lastSavedAt.toLocaleString() });
    }

    if (id === undefined) {
      return t("writing_editor.status.local");
    }

    return t("writing_editor.status.unsaved");
  }, [id, isDirty, lastSavedAt, loadingFeed, saveState, t]);

  const syncAliasFromTitle = useCallback(() => {
    aliasTouchedRef.current = true;
    setAlias(normalizeAlias(title));
  }, [setAlias, title]);

  const autofillSummary = useCallback(() => {
    setSummary(buildSummaryFromContent(content, title));
  }, [content, setSummary, title]);

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

  function MetaInput({ className }: { className?: string }) {
    return (
      <FlatPanel className={className}>
        <div className="flex flex-col gap-3 border-b border-black/5 pb-4 dark:border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="site-kicker">{t("writing")}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {t("writing_editor.description")}
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs text-neutral-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-300">
              {saveStatusText}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
          <Input id={id} value={summary} setValue={setSummary} placeholder={t("summary")} variant="flat" />
          <Input
            id={id}
            value={alias}
            setValue={(value) => {
              aliasTouchedRef.current = true;
              setAlias(value);
            }}
            placeholder={t("alias")}
            variant="flat"
          />
          <Input id={id} value={tags} setValue={setTags} placeholder={t("tags")} variant="flat" className="lg:col-span-2" />
        </div>

        <div className="mt-4 grid gap-2 sm:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(16rem,1.2fr)]">
          <FlatMetaRow
            className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3"
            onClick={() => setDraft(!draft)}
          >
            <p>{t("visible.self_only")}</p>
            <Checkbox id="draft" value={draft} setValue={setDraft} placeholder={t("draft")} />
          </FlatMetaRow>
          <FlatMetaRow
            className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3"
            onClick={() => setListed(!listed)}
          >
            <p>{t("listed")}</p>
            <Checkbox id="listed" value={listed} setValue={setListed} placeholder={t("listed")} />
          </FlatMetaRow>
          <FlatMetaRow className="gap-3 rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3 xl:col-span-1">
            <p className="mr-2 whitespace-nowrap">{t("created_at")}</p>
            <DateTimeInput value={createdAt} onChange={setCreatedAt} className="w-full max-w-[16rem]" />
          </FlatMetaRow>
        </div>
      </FlatPanel>
    );
  }

  function WritingInsights() {
    const visibilityLabel = draft ? t("draft") : listed ? t("listed") : t("unlisted");

    return (
      <FlatPanel className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-5">
          <div className="border-b border-black/5 pb-5 dark:border-white/5">
            <p className="site-kicker">{t("writing_editor.snapshot")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[18px] border border-black/10 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">{t("writing_editor.stats.visibility")}</p>
                <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{visibilityLabel}</p>
              </div>
              <div className="rounded-[18px] border border-black/10 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">{t("tags")}</p>
                <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{tagList.length}</p>
              </div>
              <div className="rounded-[18px] border border-black/10 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04] sm:col-span-2 xl:col-span-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">{t("writing_editor.stats.images")}</p>
                <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">{imageCount}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-black/5 pb-5 dark:border-white/5">
            <p className="site-kicker">{t("writing_editor.quick_actions")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={autofillSummary}
                className="rounded-full border border-black/10 px-3 py-2 text-sm text-neutral-700 transition-colors hover:border-black/20 dark:border-white/10 dark:text-neutral-200 dark:hover:border-white/20"
              >
                {t("writing_editor.actions.summary")}
              </button>
              <button
                type="button"
                onClick={syncAliasFromTitle}
                className="rounded-full border border-black/10 px-3 py-2 text-sm text-neutral-700 transition-colors hover:border-black/20 dark:border-white/10 dark:text-neutral-200 dark:hover:border-white/20"
              >
                {t("writing_editor.actions.alias")}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white/60 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="site-kicker">{t("writing_editor.checklist.heading")}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                  {t("writing_editor.checklist.description")}
                </p>
              </div>
              <div className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300">
                {t("writing_editor.checklist.progress", {
                  done: checklistDone,
                  total: publishChecklist.length,
                })}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {publishChecklist.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{item.hint}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      item.done
                        ? "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-300"
                        : "bg-amber-500/12 text-amber-700 dark:bg-amber-500/18 dark:text-amber-300"
                    }`}
                  >
                    {item.done
                      ? t("writing_editor.checklist.complete")
                      : t("writing_editor.checklist.pending")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-black/5 pb-5 dark:border-white/5">
            <p className="site-kicker">{t("writing_editor.overview")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-black/10 bg-white/60 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{t("writing_editor.stats.words")}</p>
                <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">{wordCount}</p>
              </div>
              <div className="rounded-[20px] border border-black/10 bg-white/60 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{t("writing_editor.stats.reading_time")}</p>
                <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">
                  {t("writing_editor.reading_minutes", { count: readingMinutes })}
                </p>
              </div>
              <div className="rounded-[20px] border border-black/10 bg-white/60 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{t("writing_editor.stats.headings")}</p>
                <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">{headingOutline.length}</p>
              </div>
              <div className="rounded-[20px] border border-black/10 bg-white/60 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{t("writing_editor.stats.characters")}</p>
                <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">{characterCount}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="site-kicker">{t("writing_editor.outline")}</p>
            <div className="mt-3 space-y-2">
              {headingOutline.length > 0 ? (
                headingOutline.map((item, index) => (
                  <div
                    key={`${item.text}-${index}`}
                    className="rounded-2xl border border-black/10 bg-white/60 px-3 py-3 text-sm text-neutral-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200"
                    style={{ paddingLeft: `${item.level * 0.85}rem` }}
                  >
                    {item.text}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">{t("writing_editor.outline_empty")}</p>
              )}
            </div>
          </div>
        </div>
      </FlatPanel>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            <MetaInput className="p-4 sm:p-5 md:p-6" />

            <FlatPanel className="overflow-hidden p-0">
              <MarkdownEditor
                content={content}
                setContent={setContent}
                height="clamp(34rem, 72vh, 58rem)"
                onSave={() => {
                  void persistEntry({ intent: "continue" });
                }}
              />
            </FlatPanel>
          </div>

          <div className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
            <WritingInsights />
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
