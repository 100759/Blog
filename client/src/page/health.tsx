import { SettingsBadge, SettingsCard, SettingsCardBody, SettingsCardHeader } from "@rin/ui";
import type { ConfigHealthItem } from "../api/client";
import { client } from "../app/runtime";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import ReactLoading from "react-loading";
import { useSiteConfig } from "../hooks/useSiteConfig";

function renderHealthText(
  t: ReturnType<typeof useTranslation>["t"],
  text: ConfigHealthItem["title"],
) {
  return t(text.key, text.values);
}

function HealthCard({ item }: { item: ConfigHealthItem }) {
  const { t } = useTranslation();
  const tone = item.status;
  const badgeTone = item.status === "success" ? "success" : item.status === "warning" ? "warning" : "neutral";
  const badgeLabel =
    item.status === "success"
      ? t("health.status.success")
      : item.status === "warning"
        ? t("health.status.warning")
        : t("health.status.danger");

  return (
    <SettingsCard tone={tone}>
      <SettingsCardHeader
        title={renderHealthText(t, item.title)}
        description={renderHealthText(t, item.summary)}
        badge={<SettingsBadge tone={badgeTone}>{badgeLabel}</SettingsBadge>}
      />
      <SettingsCardBody>
        <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
          <p>{renderHealthText(t, item.impact)}</p>
          {item.suggestion ? <p className="text-neutral-500 dark:text-neutral-400">{renderHealthText(t, item.suggestion)}</p> : null}
          {item.details?.length ? (
            <ul className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              {item.details.map((detail) => (
                <li key={`${detail.key}-${JSON.stringify(detail.values ?? {})}`}>{renderHealthText(t, detail)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </SettingsCardBody>
    </SettingsCard>
  );
}

export function HealthPage() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ConfigHealthItem[]>([]);
  const [summary, setSummary] = useState<Record<"success" | "warning" | "danger", number>>({ success: 0, warning: 0, danger: 0 });
  const [generatedAt, setGeneratedAt] = useState<string>("");

  useEffect(() => {
    client.config
      .getHealth()
      .then(({ data, error }) => {
        if (error) {
          setError(error.value);
          return;
        }
        if (data) {
          setItems(data.items);
          setSummary(data.summary);
          setGeneratedAt(data.generatedAt);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const orderedItems = useMemo(() => {
    const score = { danger: 0, warning: 1, success: 2 } as const;
    return [...items].sort((left, right) => score[left.status] - score[right.status]);
  }, [items]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Helmet>
        <title>{`${t("health.title")} - ${siteConfig.name}`}</title>
      </Helmet>

      <section className="site-panel rounded-[30px] px-5 py-5 md:px-6 md:py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <p className="site-kicker">{t("health.title")}</p>
            <h2 className="site-display mt-3 text-[2.2rem] text-neutral-900 dark:text-white md:text-[3rem]">
              {siteConfig.name}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
              {generatedAt
                ? t("health.generated_at", { date: new Date(generatedAt).toLocaleString() })
                : t("health.loading")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-emerald-200/60 bg-emerald-50/70 px-4 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="site-kicker">{t("health.summary.success")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-emerald-700 dark:text-emerald-300">{summary.success}</p>
            </div>
            <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/70 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="site-kicker">{t("health.summary.warning")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-amber-700 dark:text-amber-300">{summary.warning}</p>
            </div>
            <div className="rounded-[24px] border border-rose-200/60 bg-rose-50/70 px-4 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="site-kicker">{t("health.summary.danger")}</p>
              <p className="mt-3 text-[2rem] font-semibold text-rose-700 dark:text-rose-300">{summary.danger}</p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="site-panel-muted flex items-center gap-3 rounded-[26px] px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400">
          <ReactLoading width="1.25em" height="1.25em" type="spin" color="#FC466B" />
          <span>{t("health.loading")}</span>
        </div>
      ) : null}

      {error ? (
        <SettingsCard tone="danger">
          <SettingsCardHeader title={t("health.load_failed")} description={error} />
        </SettingsCard>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {orderedItems.map((item) => (
            <HealthCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
