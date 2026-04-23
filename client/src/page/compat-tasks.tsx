import { SettingsBadge, SettingsCard, SettingsCardBody, SettingsCardHeader } from "@rin/ui";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import ReactLoading from "react-loading";
import { client } from "../app/runtime";
import { Button } from "../components/button";
import { useAlert } from "../components/dialog";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { enrichMarkdownImageMetadata } from "../utils/image-upload";

export function CompatTasksPage() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState("");
  const [status, setStatus] = useState<{
    aiSummary: { enabled: boolean; queueConfigured: boolean; eligible: number; forceEligible: number };
    blurhash: { eligible: number };
  }>({
    aiSummary: { enabled: false, queueConfigured: false, eligible: 0, forceEligible: 0 },
    blurhash: { eligible: 0 },
  });
  const [runningTask, setRunningTask] = useState<"ai-summary" | "blurhash" | null>(null);
  const [blurhashProgress, setBlurhashProgress] = useState({ total: 0, processed: 0, updated: 0, failed: 0 });
  const { showAlert, AlertUI } = useAlert();

  const loadStatus = () => {
    setLoading(true);
    client.config.getCompatTasks().then(({ data, error }) => {
      if (error) {
        showAlert(error.value);
        return;
      }
      if (data) {
        setGeneratedAt(data.generatedAt);
        setStatus(data);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const runAISummaryBackfill = async (force = false) => {
    setRunningTask("ai-summary");
    try {
      const { data, error } = await client.config.runCompatAISummary(force);
      if (error) {
        showAlert(error.value);
        return;
      }
      if (data) {
        showAlert(t(
          data.forced ? "compat_tasks.ai_summary.result_force" : "compat_tasks.ai_summary.result",
          { queued: data.queued, skipped: data.skipped },
        ));
        loadStatus();
      }
    } finally {
      setRunningTask(null);
    }
  };

  const runBlurhashBackfill = async () => {
    setRunningTask("blurhash");
    setBlurhashProgress({ total: 0, processed: 0, updated: 0, failed: 0 });

    try {
      const { data, error } = await client.config.getCompatBlurhashCandidates();
      if (error) {
        showAlert(error.value);
        return;
      }

      const items = data?.items || [];
      setBlurhashProgress({ total: items.length, processed: 0, updated: 0, failed: 0 });

      let processed = 0;
      let updated = 0;
      let failed = 0;

      for (const item of items) {
        try {
          const result = await enrichMarkdownImageMetadata(item.content);
          if (result.updated > 0 && result.content !== item.content) {
            const response = await client.config.applyCompatBlurhash(item.id, result.content);
            if (response.error) {
              failed += 1;
            } else {
              updated += 1;
            }
          }
          failed += result.failed > 0 ? 1 : 0;
        } catch {
          failed += 1;
        } finally {
          processed += 1;
          setBlurhashProgress({ total: items.length, processed, updated, failed });
        }
      }

      showAlert(t("compat_tasks.blurhash.result", { updated, failed, total: items.length }));
      loadStatus();
    } finally {
      setRunningTask(null);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Helmet>
        <title>{`${t("compat_tasks.title")} - ${siteConfig.name}`}</title>
      </Helmet>

      <AlertUI />

      <section className="site-panel rounded-[30px] px-5 py-5 md:px-6 md:py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div>
            <p className="site-kicker">{t("compat_tasks.title")}</p>
            <h2 className="site-display mt-3 text-[2.2rem] text-neutral-900 dark:text-white md:text-[3rem]">
              {siteConfig.name}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
              {generatedAt
                ? t("compat_tasks.generated_at", { date: new Date(generatedAt).toLocaleString() })
                : t("compat_tasks.loading")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/70 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="site-kicker">{t("compat_tasks.ai_summary.title")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-amber-700 dark:text-amber-300">{status.aiSummary.eligible}</p>
            </div>
            <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/70 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="site-kicker">{t("compat_tasks.ai_summary.run_force")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-amber-700 dark:text-amber-300">{status.aiSummary.forceEligible}</p>
            </div>
            <div className="rounded-[24px] border border-emerald-200/60 bg-emerald-50/70 px-4 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="site-kicker">{t("compat_tasks.blurhash.title")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-emerald-700 dark:text-emerald-300">{status.blurhash.eligible}</p>
            </div>
            <div className={`rounded-[24px] border px-4 py-4 ${status.aiSummary.queueConfigured ? "border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10" : "border-rose-200/60 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10"}`}>
              <p className="site-kicker">{t("queue_status.binding")}</p>
              <p className={`mt-3 text-lg font-semibold ${status.aiSummary.queueConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {status.aiSummary.queueConfigured ? t("compat_tasks.yes") : t("compat_tasks.no")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="site-panel-muted flex items-center gap-3 rounded-[26px] px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400">
          <ReactLoading width="1.25em" height="1.25em" type="spin" color="#FC466B" />
          <span>{t("compat_tasks.loading")}</span>
        </div>
      ) : null}

      {!loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SettingsCard tone={status.aiSummary.eligible > 0 ? "warning" : "success"}>
            <SettingsCardHeader
              title={t("compat_tasks.ai_summary.title")}
              description={t("compat_tasks.ai_summary.description")}
              badge={
                <SettingsBadge tone={status.aiSummary.eligible > 0 ? "warning" : "success"}>
                  {t("compat_tasks.ai_summary.eligible", { count: status.aiSummary.eligible })}
                </SettingsBadge>
              }
            />
            <SettingsCardBody>
              <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                <p>{t("compat_tasks.ai_summary.enabled", { value: status.aiSummary.enabled ? t("compat_tasks.yes") : t("compat_tasks.no") })}</p>
                <p>{t("compat_tasks.ai_summary.queue_configured", { value: status.aiSummary.queueConfigured ? t("compat_tasks.yes") : t("compat_tasks.no") })}</p>
                <p>{t("compat_tasks.ai_summary.force_eligible", { count: status.aiSummary.forceEligible })}</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    title={runningTask === "ai-summary" ? t("compat_tasks.running") : t("compat_tasks.ai_summary.run")}
                    disabled={runningTask !== null || status.aiSummary.eligible === 0}
                    onClick={() => runAISummaryBackfill(false)}
                  />
                  <Button
                    title={runningTask === "ai-summary" ? t("compat_tasks.running") : t("compat_tasks.ai_summary.run_force")}
                    disabled={runningTask !== null || status.aiSummary.forceEligible === 0}
                    onClick={() => runAISummaryBackfill(true)}
                  />
                </div>
              </div>
            </SettingsCardBody>
          </SettingsCard>

          <SettingsCard tone={status.blurhash.eligible > 0 ? "warning" : "success"}>
            <SettingsCardHeader
              title={t("compat_tasks.blurhash.title")}
              description={t("compat_tasks.blurhash.description")}
              badge={
                <SettingsBadge tone={status.blurhash.eligible > 0 ? "warning" : "success"}>
                  {t("compat_tasks.blurhash.eligible", { count: status.blurhash.eligible })}
                </SettingsBadge>
              }
            />
            <SettingsCardBody>
              <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                <p>{t("compat_tasks.blurhash.note")}</p>
                {runningTask === "blurhash" ? (
                  <p>
                    {t("compat_tasks.blurhash.progress", {
                      processed: blurhashProgress.processed,
                      total: blurhashProgress.total,
                      updated: blurhashProgress.updated,
                      failed: blurhashProgress.failed,
                    })}
                  </p>
                ) : null}
                <Button
                  title={runningTask === "blurhash" ? t("compat_tasks.running") : t("compat_tasks.blurhash.run")}
                  disabled={runningTask !== null || status.blurhash.eligible === 0}
                  onClick={runBlurhashBackfill}
                />
              </div>
            </SettingsCardBody>
          </SettingsCard>
        </div>
      ) : null}
    </div>
  );
}
