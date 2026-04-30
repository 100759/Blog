import type { Feed } from "@rin/api";
import { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import ReactModal from "react-modal";
import Popup from "reactjs-popup";
import { Link, useLocation } from "wouter";
import { Button } from "../components/button";
import { useAlert, useConfirm } from "../components/dialog";
import { Waiting } from "../components/loading";
import { Tips } from "../components/tips";
import { client } from "../app/runtime";
import { AdjacentSection } from "../components/adjacent_feed.tsx";
import { ClientConfigContext } from "../state/config";
import { ProfileContext } from "../state/profile";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { stripImageUrlMetadata } from "../utils/image-upload";
import { extractFirstContentImageUrl, isHtmlContent, normalizeRichHtml, stripContentToPlainText } from "../utils/rich-content";
import { timeago } from "../utils/timeago";

const Markdown = lazy(() => import("../components/markdown").then((module) => ({ default: module.Markdown })));

function buildArticleExcerpt(content: string, fallback?: string | null) {
  const trimmed = fallback?.trim() || stripContentToPlainText(content);
  if (!trimmed) return "";
  return trimmed.length > 220 ? `${trimmed.slice(0, 220)}...` : trimmed;
}

export function FeedPage({ id, TOC, clean }: { id: string; TOC: () => JSX.Element; clean: (id: string) => void }) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const profile = useContext(ProfileContext);
  const [feed, setFeed] = useState<Feed>();
  const [error, setError] = useState<string>();
  const [headImage, setHeadImage] = useState<string>();
  const ref = useRef("");
  const [, setLocation] = useLocation();
  const { showAlert, AlertUI } = useAlert();
  const { showConfirm, ConfirmUI } = useConfirm();
  const [top, setTop] = useState<number>(0);
  const config = useContext(ClientConfigContext);
  const counterEnabled = config.getBoolean("counter.enabled");
  const hasAISummary = Boolean(feed?.ai_summary?.trim());
  const showAISummaryState =
    feed?.ai_summary_status === "pending" ||
    feed?.ai_summary_status === "processing" ||
    feed?.ai_summary_status === "failed";

  function deleteFeed() {
    showConfirm(t("article.delete.title"), t("article.delete.confirm"), () => {
      if (!feed) return;
      client.feed.delete(feed.id).then(({ error: nextError }) => {
        if (nextError) {
          showAlert(nextError.value as string);
        } else {
          showAlert(t("delete.success"));
          setLocation("/");
        }
      });
    });
  }

  function topFeed() {
    const willTop = !(top > 0);
    const nextTop = willTop ? 1 : 0;
    showConfirm(
      willTop ? t("article.top.title") : t("article.untop.title"),
      willTop ? t("article.top.confirm") : t("article.untop.confirm"),
      () => {
        if (!feed) return;
        client.feed.setTop(feed.id, nextTop).then(({ error: nextError }) => {
          if (nextError) {
            showAlert(nextError.value as string);
          } else {
            showAlert(willTop ? t("article.top.success") : t("article.untop.success"));
            setTop(nextTop);
          }
        });
      },
    );
  }

  useEffect(() => {
    if (ref.current === id) return;
    setFeed(undefined);
    setError(undefined);
    setHeadImage(undefined);
    client.feed.get(id).then(({ data, error: nextError }) => {
      if (nextError) {
        setError(nextError.value as string);
      } else if (data && typeof data !== "string") {
        setTimeout(() => {
          setFeed(data as any);
          setTop(data.top || 0);
          const headImageUrl = extractFirstContentImageUrl(data.content);
          if (headImageUrl) {
            setHeadImage(headImageUrl);
          }
          clean(id);
        }, 0);
      }
    });
    ref.current = id;
  }, [clean, id]);

  const excerpt = feed ? buildArticleExcerpt(feed.content) : "";
  const renderedContent = useMemo(() => {
    if (!feed) return "";
    return isHtmlContent(feed.content) ? normalizeRichHtml(feed.content) : feed.content;
  }, [feed]);
  const createdAt = feed ? new Date(feed.createdAt) : undefined;
  const updatedAt = feed ? new Date(feed.updatedAt) : undefined;
  const showHeroImage = headImage;

  return (
    <Waiting for={feed || error}>
      {feed ? (
        <Helmet>
          <title>{`${feed.title ?? "Unnamed"} - ${siteConfig.name}`}</title>
          <meta property="og:site_name" content={siteConfig.name} />
          <meta property="og:title" content={feed.title ?? ""} />
          <meta property="og:image" content={headImage ?? siteConfig.avatar} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={document.URL} />
          <meta name="og:description" content={excerpt} />
          <meta name="author" content={feed.user.username} />
          <meta name="description" content={excerpt} />
        </Helmet>
      ) : null}

      {error ? (
        <div className="wauto ani-show py-10">
          <div className="site-panel flex flex-col items-center justify-center rounded-[32px] px-8 py-14 text-center">
            <p className="site-kicker">错误</p>
            <h1 className="site-display mt-5 text-[3rem] text-neutral-900 dark:text-white">{error}</h1>
            {error === "Not found" && id === "about" ? <Tips value={t("about.notfound")} /> : null}
            <div className="mt-8">
              <Button title={t("index.back")} onClick={() => (window.location.href = "/")} />
            </div>
          </div>
        </div>
      ) : null}

      {feed && !error ? (
        <div className="wauto ani-show py-6 md:py-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_232px] 2xl:grid-cols-[minmax(0,1fr)_248px]">
            <div className="min-w-0">
              <article className="site-panel overflow-hidden rounded-[10px]" aria-label={feed.title ?? "Unnamed"}>
                <div className="border-b border-black/5 px-4 py-5 dark:border-white/10 md:px-7 md:py-7">
                  <div className="flex max-w-2xl flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                    {top > 0 ? <span className="rounded-[6px] bg-theme/10 px-2.5 py-1 text-theme">{t("article.top.title")}</span> : null}
                    {feed.category ? <span className="rounded-[6px] bg-black/[0.04] px-2.5 py-1 text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">{feed.category}</span> : null}
                  </div>

                  <h1 className="site-display mt-3 max-w-3xl break-words text-[1.55rem] font-semibold leading-tight text-neutral-900 dark:text-white sm:text-[2rem] md:text-[2.35rem]">
                    {feed.title}
                  </h1>

                  <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                    {createdAt ? (
                      <span title={createdAt.toLocaleString()}>
                        {createdAt.getTime() === updatedAt?.getTime()
                          ? timeago(createdAt)
                          : t("feed_card.published$time", { time: timeago(createdAt) })}
                      </span>
                    ) : null}
                    {createdAt && updatedAt && createdAt.getTime() !== updatedAt.getTime() ? (
                      <span title={updatedAt.toLocaleString()}>{t("feed_card.updated$time", { time: timeago(updatedAt) })}</span>
                    ) : null}
                    {counterEnabled ? (
                      <>
                        <span>{t("count.pv")} {feed.pv}</span>
                        <span>{t("count.uv")} {feed.uv}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {profile?.permission ? (
                      <>
                        <button
                          aria-label={top > 0 ? t("untop.title") : t("top.title")}
                          onClick={topFeed}
                          className={`min-h-10 rounded-[8px] px-4 py-2 text-sm font-medium transition ${
                            top > 0
                              ? "bg-theme text-white"
                              : "border border-black/10 bg-white/55 text-neutral-700 hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
                          }`}
                        >
                          {top > 0 ? t("article.untop.title") : t("article.top.title")}
                        </button>
                        <Link
                          aria-label={t("edit")}
                          href={`/admin/writing/${feed.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-[8px] border border-black/10 bg-white/55 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
                        >
                          {t("edit")}
                        </Link>
                        <button
                          aria-label={t("delete.title")}
                          onClick={deleteFeed}
                          className="min-h-10 rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                        >
                          {t("delete.title")}
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    {showHeroImage ? (
                      <img
                        src={stripImageUrlMetadata(showHeroImage)}
                        alt=""
                        className="h-[180px] w-full rounded-[8px] object-cover md:h-[220px] md:max-w-3xl"
                      />
                    ) : null}
                  </div>
                </div>

                {showAISummaryState || hasAISummary ? (
                  <div className="border-t border-black/5 px-5 py-5 dark:border-white/10 md:px-7 md:py-5">
                    <div className="max-w-[760px] rounded-r-[18px] border-l-[3px] border-theme/35 bg-black/[0.02] px-4 py-4 dark:bg-white/[0.03] md:px-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <i className="ri-file-list-3-line text-theme" />
                          <span className="site-kicker">{t("ai_summary.title")}</span>
                        </div>
                        {showAISummaryState ? (
                          <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-200">
                            {t(`ai_summary.status.${feed.ai_summary_status}`)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 max-w-3xl whitespace-pre-wrap text-[14px] leading-7 text-neutral-700 dark:text-neutral-300">
                        {hasAISummary ? feed.ai_summary : t(`ai_summary.message.${feed.ai_summary_status}`)}
                      </p>
                      {feed.ai_summary_status === "failed" && feed.ai_summary_error ? (
                        <p className="mt-3 text-sm text-rose-600 dark:text-rose-300 whitespace-pre-wrap">{feed.ai_summary_error}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="px-4 py-7 md:px-7 md:py-8">
                  <div className="mx-auto min-w-0 w-full max-w-[720px] text-[16px] leading-8 text-neutral-700 dark:text-neutral-300">
                    {isHtmlContent(feed.content) ? (
                      <RichArticleContent content={renderedContent} />
                    ) : (
                      <Suspense fallback={<div className="text-sm text-neutral-400">正文加载中...</div>}>
                        <Markdown content={renderedContent} />
                      </Suspense>
                    )}
                  </div>
                </div>

                <div className="border-t border-black/5 px-4 py-5 dark:border-white/10 md:px-7 md:py-6">
                  <div className="flex flex-wrap items-center gap-4">
                    {feed.user.avatar ? (
                      <img src={feed.user.avatar} className="h-11 w-11 rounded-[8px] object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-black/10 bg-white/55 dark:border-white/10 dark:bg-white/[0.04]">
                        <i className="ri-user-line text-neutral-500 dark:text-neutral-300" />
                      </div>
                    )}
                    <div>
                      <p className="site-kicker">{t("profile.title")}</p>
                      <p className="mt-2 text-lg font-medium text-neutral-900 dark:text-white">{feed.user.username}</p>
                    </div>
                  </div>
                </div>
              </article>

              <div className="mt-8">
                <AdjacentSection id={id} setError={setError} />
              </div>

              <div className="mt-8">
                <Comments id={`${feed.id}`} />
              </div>
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-[6rem]">
                <div className="site-panel overflow-hidden rounded-[22px] border-black/6 bg-white/55 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
                  <TOC />
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
      <AlertUI />
      <ConfirmUI />
    </Waiting>
  );
}

function RichArticleContent({ content }: { content: string }) {
  return (
    <div
      className="rich-article-content toc-content text-[16px] leading-[1.95] text-neutral-700 dark:text-neutral-300 md:text-[17px]"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export function TOCHeader({ TOC }: { TOC: () => JSX.Element }) {
  const [isOpened, setIsOpened] = useState(false);

  return (
    <div className="shrink-0 lg:hidden">
      <button
        onClick={() => setIsOpened(true)}
        className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 text-sm font-medium text-neutral-700 transition hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
      >
        <i className="ri-menu-2-line" />
        <span>目录</span>
      </button>
      <ReactModal
        isOpen={isOpened}
        style={{
          content: {
            top: "auto",
            left: "50%",
            right: "auto",
            bottom: "1rem",
            marginRight: "-50%",
            transform: "translateX(-50%)",
            padding: "0",
            border: "none",
            borderRadius: "22px",
            background: "transparent",
            maxWidth: "90vw",
            width: "min(420px, 90vw)",
          },
          overlay: {
            backgroundColor: "rgba(11, 10, 10, 0.55)",
            zIndex: 1000,
          },
        }}
        onRequestClose={() => setIsOpened(false)}
      >
        <div className="site-panel max-h-[75vh] overflow-auto rounded-[22px] p-4 t-primary">
          <TOC />
        </div>
      </ReactModal>
    </div>
  );
}

function CommentInput({ id, onRefresh }: { id: string; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const { showAlert, AlertUI } = useAlert();
  const profile = useContext(ProfileContext);
  const [, setLocation] = useLocation();

  function errorHumanize(nextError: string) {
    if (nextError === "Unauthorized") return t("login.required");
    if (nextError === "Content is required") return t("comment.empty");
    return nextError;
  }

  function submit() {
    if (!profile) {
      setLocation("/login");
      return;
    }
    client.comment.create(parseInt(id), { content }).then(({ error: nextError }) => {
      if (nextError) {
        setError(errorHumanize(nextError.value as string));
      } else {
        setContent("");
        setError("");
        showAlert(t("comment.success"), () => {
          onRefresh();
        });
      }
    });
  }

  return (
    <div className="site-panel rounded-[10px] px-4 py-5 md:px-7 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="site-kicker">{t("comment.title")}</p>
          <h3 className="site-display mt-2 text-[1.25rem] font-semibold text-neutral-900 dark:text-white md:text-[1.5rem]">{t("comment.title")}</h3>
        </div>
      </div>
      {profile ? (
        <>
          <textarea
            id="comment"
            placeholder={t("comment.placeholder.title")}
            className="mt-5 min-h-32 w-full rounded-[8px] border border-black/10 bg-white/50 px-4 py-4 text-base text-neutral-800 outline-none transition focus:border-theme/40 focus:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-100 dark:focus:bg-white/[0.06] md:px-5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mt-5 flex justify-end">
            <button className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-theme px-5 py-3 text-sm font-medium text-white" onClick={submit}>
              {t("comment.submit")}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 flex justify-center py-10">
          <button className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-theme px-5 py-3 text-sm font-medium text-white" onClick={() => setLocation("/login")}>
            {t("login.required")}
          </button>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      <AlertUI />
    </div>
  );
}

type Comment = {
  id: number;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  user: {
    id: number;
    username: string;
    avatar: string | null;
    permission: number | null;
  };
};

function Comments({ id }: { id: string }) {
  const config = useContext(ClientConfigContext);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>();
  const ref = useRef("");
  const { t } = useTranslation();

  function loadComments() {
    client.comment.list(parseInt(id)).then(({ data, error: nextError }) => {
      if (nextError) {
        setError(nextError.value as string);
      } else if (data && Array.isArray(data)) {
        setComments(data as any);
      }
    });
  }

  useEffect(() => {
    if (ref.current === id) return;
    loadComments();
    ref.current = id;
  }, [id]);

  if (!config.getBoolean("comment.enabled")) {
    return null;
  }

  return (
    <section>
      <CommentInput id={id} onRefresh={loadComments} />
      {error ? (
        <div className="site-panel mt-4 flex flex-col items-center justify-center rounded-[10px] px-6 py-10 text-center">
          <h1 className="text-xl font-semibold t-primary">{error}</h1>
          <button className="mt-4 rounded-[8px] bg-theme px-4 py-2 text-white" onClick={loadComments}>
            {t("reload")}
          </button>
        </div>
      ) : null}
      {comments.length > 0 ? (
        <div className="mt-4 space-y-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onRefresh={loadComments} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CommentItem({ comment, onRefresh }: { comment: Comment; onRefresh: () => void }) {
  const { showConfirm, ConfirmUI } = useConfirm();
  const { showAlert, AlertUI } = useAlert();
  const { t } = useTranslation();
  const profile = useContext(ProfileContext);
  const createdAt = new Date(comment.createdAt);

  function deleteComment() {
    showConfirm(t("delete.comment.title"), t("delete.comment.confirm"), async () => {
      client.comment.delete(comment.id).then(({ error: nextError }) => {
        if (nextError) {
          showAlert(nextError.value as string);
        } else {
          showAlert(t("delete.success"), () => {
            onRefresh();
          });
        }
      });
    });
  }

  return (
    <div className="site-panel rounded-[10px] px-4 py-4 md:px-5 md:py-5">
      <div className="flex items-start gap-4">
        {comment.user.avatar ? (
          <img src={comment.user.avatar} className="mt-1 h-10 w-10 rounded-[8px] object-cover" />
        ) : (
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-[8px] border border-black/10 bg-white/55 dark:border-white/10 dark:bg-white/[0.04]">
            <i className="ri-user-line text-neutral-500 dark:text-neutral-300" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-semibold text-neutral-900 dark:text-white">{comment.user.username}</span>
            <span title={createdAt.toLocaleString()} className="text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              {timeago(createdAt)}
            </span>
          </div>
          <p className="mt-3 break-words text-[15px] leading-7 text-neutral-700 dark:text-neutral-300">{comment.content}</p>
        </div>
        {(profile?.permission || profile?.id === comment.user.id) ? (
          <Popup
            arrow={false}
            trigger={
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/55 text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                <i className="ri-more-fill" />
              </button>
            }
            position="left center"
          >
            <div className="site-panel rounded-full p-1">
              <button onClick={deleteComment} aria-label={t("delete.comment.title")} className="flex h-10 w-10 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">
                <i className="ri-delete-bin-2-line" />
              </button>
            </div>
          </Popup>
        ) : null}
      </div>
      <ConfirmUI />
      <AlertUI />
    </div>
  );
}
