import { SettingsBadge, SettingsCard, SettingsCardBody, SettingsCardHeader } from "@rin/ui";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import ReactLoading from "react-loading";
import type { QueueStatusItem } from "../api/client";
import { client } from "../app/runtime";
import { Button } from "../components/button";
import { useAlert, useConfirm } from "../components/dialog";
import { useSiteConfig } from "../hooks/useSiteConfig";

function getQueueTone(status: QueueStatusItem["aiSummaryStatus"]) {
  if (status === "failed") return "danger";
  if (status === "completed") return "success";
  if (status === "pending" || status === "processing") return "warning";
  return "default";
}

function QueueStatusEntry({
  item,
  loadingAction,
  onRetry,
  onDelete,
}: {
  item: QueueStatusItem;
  loadingAction?: "retry" | "delete";
  onRetry: (item: QueueStatusItem) => void;
  onDelete: (item: QueueStatusItem) => void;
}) {
  const { t } = useTranslation();
  const canRetry = item.aiSummaryStatus === "failed";
  const canDelete = item.aiSummaryStatus === "failed" || item.aiSummaryStatus === "completed";

  return (
    <SettingsCard tone={getQueueTone(item.aiSummaryStatus)}>
      <SettingsCardHeader
        title={item.title || t("queue_status.untitled")}
        description={t(`queue_status.status.${item.aiSummaryStatus}`)}
        badge={<SettingsBadge tone={item.aiSummaryStatus === "completed" ? "success" : item.aiSummaryStatus === "failed" ? "neutral" : "warning"}>{t(`queue_status.status.${item.aiSummaryStatus}`)}</SettingsBadge>}
      />
      <SettingsCardBody>
        <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
          <p>{t("queue_status.feed_id", { id: item.id })}</p>
          <p>{t("queue_status.updated_at", { date: new Date(item.updatedAt).toLocaleString() })}</p>
          {item.aiSummaryError ? (
            <p className="whitespace-pre-wrap text-rose-600 dark:text-rose-300">{item.aiSummaryError}</p>
          ) : null}
          {canRetry || canDelete ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {canRetry ? (
                <Button
                  title={loadingAction === "retry" ? t("queue_status.retrying") : t("queue_status.retry")}
                  disabled={loadingAction !== undefined}
                  onClick={() => onRetry(item)}
                />
              ) : null}
              {canDelete ? (
                <Button
                  secondary
                  title={loadingAction === "delete" ? t("queue_status.deleting") : t("queue_status.delete")}
                  disabled={loadingAction !== undefined}
                  onClick={() => onDelete(item)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </SettingsCardBody>
    </SettingsCard>
  );
}

export function QueueStatusPage() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueConfigured, setQueueConfigured] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [summary, setSummary] = useState<Record<"idle" | "pending" | "processing" | "completed" | "failed", number>>({
    idle: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [items, setItems] = useState<QueueStatusItem[]>([]);
  const [actingId, setActingId] = useState<number | null>(null);
  const [actingType, setActingType] = useState<"retry" | "delete" | null>(null);
  const { showAlert, AlertUI } = useAlert();
  const { showConfirm, ConfirmUI } = useConfirm();

  const loadQueueStatus = () => {
    setLoading(true);
    setError(null);
    client.config
      .getQueueStatus()
      .then(({ data, error }) => {
        if (error) {
          setError(error.value);
          return;
        }

        if (data) {
          setQueueConfigured(data.queueConfigured);
          setGeneratedAt(data.generatedAt);
          setSummary(data.summary);
          setItems(data.items);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueueStatus();
  }, []);

  const orderedItems = useMemo(() => {
    const score = { failed: 0, processing: 1, pending: 2, completed: 3, idle: 4 } as const;
    return [...items].sort((left, right) => score[left.aiSummaryStatus] - score[right.aiSummaryStatus]);
  }, [items]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Helmet>
        <title>{`${t("queue_status.title")} - ${siteConfig.name}`}</title>
      </Helmet>

      <AlertUI />
      <ConfirmUI />

      <section className="site-panel rounded-[30px] px-5 py-5 md:px-6 md:py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div>
            <p className="site-kicker">{t("queue_status.title")}</p>
            <h2 className="site-display mt-3 text-[2.2rem] text-neutral-900 dark:text-white md:text-[3rem]">
              {queueConfigured ? t("queue_status.configured") : t("queue_status.not_configured")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
              {generatedAt
                ? t("queue_status.generated_at", { date: new Date(generatedAt).toLocaleString() })
                : t("queue_status.loading")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className={`rounded-[24px] border px-4 py-4 ${queueConfigured ? "border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10" : "border-rose-200/60 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10"}`}>
              <p className="site-kicker">{t("queue_status.binding")}</p>
              <p className={`mt-3 text-lg font-semibold ${queueConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {queueConfigured ? t("queue_status.configured") : t("queue_status.not_configured")}
              </p>
            </div>
            <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/70 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="site-kicker">{t("queue_status.summary.pending")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-amber-700 dark:text-amber-300">{summary.pending}</p>
            </div>
            <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/70 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="site-kicker">{t("queue_status.summary.processing")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-amber-700 dark:text-amber-300">{summary.processing}</p>
            </div>
            <div className="rounded-[24px] border border-emerald-200/60 bg-emerald-50/70 px-4 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="site-kicker">{t("queue_status.summary.completed")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-emerald-700 dark:text-emerald-300">{summary.completed}</p>
            </div>
            <div className="rounded-[24px] border border-rose-200/60 bg-rose-50/70 px-4 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="site-kicker">{t("queue_status.summary.failed")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-rose-700 dark:text-rose-300">{summary.failed}</p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="site-panel-muted flex items-center gap-3 rounded-[26px] px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400">
          <ReactLoading width="1.25em" height="1.25em" type="spin" color="#FC466B" />
          <span>{t("queue_status.loading")}</span>
        </div>
      ) : null}

      {error ? (
        <SettingsCard tone="danger">
          <SettingsCardHeader title={t("queue_status.load_failed")} description={error} />
        </SettingsCard>
      ) : null}

      {!loading && !error && orderedItems.length === 0 ? (
        <SettingsCard>
          <SettingsCardHeader title={t("queue_status.empty_title")} description={t("queue_status.empty_description")} />
        </SettingsCard>
      ) : null}

      {!loading && !error && orderedItems.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {orderedItems.map((item) => (
            <QueueStatusEntry
              key={`${item.id}-${item.updatedAt}`}
              item={item}
              loadingAction={actingId === item.id ? actingType ?? undefined : undefined}
              onRetry={(entry) => {
                setActingId(entry.id);
                setActingType("retry");
                client.config.retryQueueTask(entry.id).then(({ error }) => {
                  if (error) {
                    showAlert(error.value);
                    return;
                  }
                  showAlert(t("queue_status.retry_success"));
                  loadQueueStatus();
                }).finally(() => {
                  setActingId(null);
                  setActingType(null);
                });
              }}
              onDelete={(entry) => {
                showConfirm(
                  t("queue_status.delete_confirm_title"),
                  t("queue_status.delete_confirm_description", { id: entry.id }),
                  async () => {
                    setActingId(entry.id);
                    setActingType("delete");
                    try {
                      const { error } = await client.config.deleteQueueTask(entry.id);
                      if (error) {
                        showAlert(error.value);
                        return;
                      }
                      showAlert(t("queue_status.delete_success"));
                      loadQueueStatus();
                    } finally {
                      setActingId(null);
                      setActingType(null);
                    }
                  },
                );
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
