import i18n from "i18next";
import _ from "lodash";
import mermaid from "mermaid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import Loading from "react-loading";
import { useTranslation } from "react-i18next";
import { DateTimeInput, FlatMetaRow, FlatPanel } from "@rin/ui";
import { client } from "../app/runtime";
import { MarkdownEditor } from "../components/markdown_editor";
import { ShowAlertType, useAlert } from "../components/dialog";
import { Checkbox, Input } from "../components/input";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { Cache } from "../utils/cache";

async function publish({
  title,
  alias,
  listed,
  content,
  summary,
  tags,
  draft,
  createdAt,
  onCompleted,
  showAlert,
}: {
  title: string;
  listed: boolean;
  content: string;
  summary: string;
  tags: string[];
  draft: boolean;
  alias?: string;
  createdAt?: Date;
  onCompleted?: () => void;
  showAlert: ShowAlertType;
}) {
  const t = i18n.t;
  const { data, error } = await client.feed.create({
    title,
    alias,
    content,
    summary,
    tags,
    listed,
    draft,
    createdAt: createdAt?.toISOString(),
  });

  if (onCompleted) {
    onCompleted();
  }

  if (error) {
    showAlert(error.value as string);
  }

  if (data) {
    showAlert(t("publish.success"), () => {
      Cache.with().clear();
      window.location.href = `/feed/${data.insertedId}`;
    });
  }
}

async function update({
  id,
  title,
  alias,
  content,
  summary,
  tags,
  listed,
  draft,
  createdAt,
  onCompleted,
  showAlert,
}: {
  id: number;
  listed: boolean;
  title?: string;
  alias?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  draft?: boolean;
  createdAt?: Date;
  onCompleted?: () => void;
  showAlert: ShowAlertType;
}) {
  const t = i18n.t;
  const { error } = await client.feed.update(id, {
    title,
    alias,
    content,
    summary,
    tags,
    listed,
    draft,
    createdAt: createdAt?.toISOString(),
  });

  if (onCompleted) {
    onCompleted();
  }

  if (error) {
    showAlert(error.value as string);
  } else {
    showAlert(t("update.success"), () => {
      Cache.with(id).clear();
      window.location.href = `/feed/${id}`;
    });
  }
}

export function WritingPage({ id }: { id?: number }) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const cache = Cache.with(id);
  const [title, setTitle] = cache.useCache("title", "");
  const [summary, setSummary] = cache.useCache("summary", "");
  const [tags, setTags] = cache.useCache("tags", "");
  const [alias, setAlias] = cache.useCache("alias", "");
  const [draft, setDraft] = useState(false);
  const [listed, setListed] = useState(true);
  const [content, setContent] = cache.useCache("content", "");
  const [createdAt, setCreatedAt] = useState<Date | undefined>(new Date());
  const [publishing, setPublishing] = useState(false);
  const { showAlert, AlertUI } = useAlert();

  const tagList = useMemo(
    () =>
      tags
        .split("#")
        .filter((tag) => tag !== "")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags],
  );

  const readingTitle = title.trim() || (id !== undefined ? t("update.title") : t("publish.title"));
  const readingDescription = summary.trim() || siteConfig.description || t("content.empty");

  async function publishButton() {
    if (publishing) return;

    if (id !== undefined) {
      setPublishing(true);
      update({
        id,
        title,
        content,
        summary,
        alias,
        tags: tagList,
        draft,
        listed,
        createdAt,
        onCompleted: () => {
          setPublishing(false);
        },
        showAlert,
      });
      return;
    }

    if (!title) {
      showAlert(t("title_empty"));
      return;
    }

    if (!content) {
      showAlert(t("content.empty"));
      return;
    }

    setPublishing(true);
    publish({
      title,
      content,
      summary,
      tags: tagList,
      draft,
      alias,
      listed,
      createdAt,
      onCompleted: () => {
        setPublishing(false);
      },
      showAlert,
    });
  }

  useEffect(() => {
    if (!id) return;

    client.feed.get(id).then(({ data }) => {
      if (data) {
        if (title === "" && data.title) setTitle(data.title);
        if (tags === "" && data.hashtags) {
          setTags(data.hashtags.map(({ name }: { name: string }) => `#${name}`).join(" "));
        }
        if (alias === "" && (data as any).alias) setAlias((data as any).alias);
        if (content === "") setContent(data.content);
        if (summary === "") setSummary((data as any).summary || "");
        setListed((data as any).listed === 1);
        setDraft((data as any).draft === 1);
        setCreatedAt(new Date(data.createdAt));
      }
    });
  }, [alias, content, id, setAlias, setContent, setSummary, setTags, setTitle, summary, tags, title]);

  const debouncedUpdate = useCallback(
    _.debounce(() => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
      });
      mermaid.run({
        suppressErrors: true,
        nodes: document.querySelectorAll("pre.mermaid_default"),
      }).then(() => {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
        });
        mermaid.run({
          suppressErrors: true,
          nodes: document.querySelectorAll("pre.mermaid_dark"),
        });
      });
    }, 100),
    [],
  );

  useEffect(() => {
    debouncedUpdate();
  }, [content, debouncedUpdate]);

  function PublishButton({ className }: { className?: string }) {
    return (
      <button
        onClick={() => {
          void publishButton();
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-theme px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-theme-hover active:bg-theme-active disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
        disabled={publishing}
      >
        {publishing ? <Loading type="spin" height={16} width={16} /> : null}
        <span>{id !== undefined ? t("update.title") : t("publish.title")}</span>
      </button>
    );
  }

  function MetaInput({ className }: { className?: string }) {
    return (
      <FlatPanel className={className}>
        <div className="flex flex-col gap-4 border-b border-black/5 pb-5 dark:border-white/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="site-kicker">{t("writing")}</p>
              <h2 className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white">
                {readingTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {id !== undefined ? t("update.title") : t("publish.title")}
              </p>
            </div>
            <PublishButton className="w-full md:w-auto" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Input id={id} value={title} setValue={setTitle} placeholder={t("title")} variant="flat" className="text-base" />
          </div>
          <Input id={id} value={summary} setValue={setSummary} placeholder={t("summary")} variant="flat" />
          <Input id={id} value={alias} setValue={setAlias} placeholder={t("alias")} variant="flat" />
          <Input id={id} value={tags} setValue={setTags} placeholder={t("tags")} variant="flat" className="lg:col-span-2" />
        </div>

        <div className="mt-5 grid gap-2 sm:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,2fr)]">
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

  return (
    <>
      <Helmet>
        <title>{`${t("writing")} - ${siteConfig.name}`}</title>
        <meta property="og:site_name" content={siteConfig.name} />
        <meta property="og:title" content={t("writing")} />
        <meta property="og:image" content={siteConfig.avatar} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={document.URL} />
      </Helmet>
      <div className="flex flex-col gap-6 t-primary">
        <section className="site-panel rounded-[30px] px-5 py-5 md:px-6 md:py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div>
              <p className="site-kicker">{t("writing")}</p>
              <h1 className="site-display mt-3 text-[2.4rem] text-neutral-900 dark:text-white md:text-[3.2rem]">
                {readingTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
                {readingDescription}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="site-kicker">{id !== undefined ? t("update.title") : t("publish.title")}</p>
                <p className="mt-3 text-lg font-semibold text-neutral-900 dark:text-white">
                  {draft ? t("draft") : t("listed")}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="site-kicker">{t("tags")}</p>
                <p className="mt-3 text-lg font-semibold text-neutral-900 dark:text-white">
                  {tagList.length}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="site-kicker">{t("created_at")}</p>
                <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
                  {createdAt ? createdAt.toLocaleString() : "--"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="xl:sticky xl:top-6 xl:self-start">
            {MetaInput({ className: "p-4 sm:p-5 md:p-6" })}
          </div>

          <FlatPanel className="overflow-hidden p-0">
            <MarkdownEditor content={content} setContent={setContent} height="760px" />
          </FlatPanel>
        </div>
      </div>
      <AlertUI />
    </>
  );
}
