import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useSiteConfig } from "../hooks/useSiteConfig";

function AdminNavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-medium transition-all ${
        active
          ? "border-theme/30 bg-theme/10 text-theme shadow-[0_12px_28px_rgba(var(--theme-rgb),0.16)]"
          : "border-black/5 bg-white/45 t-primary hover:border-black/10 hover:bg-white/75 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
      }`}
    >
      <i className={`${icon} text-base`} />
      <span>{label}</span>
    </Link>
  );
}

export function AdminLayout({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();

  return (
    <div className="site-shell min-h-screen">
      <div className={`mx-auto flex w-full max-w-[1460px] flex-col gap-6 px-4 py-6 lg:grid lg:px-6 ${compact ? "lg:grid-cols-[248px_minmax(0,1fr)]" : "lg:grid-cols-[280px_minmax(0,1fr)]"}`}>
        <aside className={`w-full shrink-0 lg:sticky lg:self-start ${compact ? "lg:top-4 lg:w-[248px]" : "lg:top-6 lg:w-72"}`}>
          <div className={`site-panel ${compact ? "rounded-[28px] p-4" : "rounded-[30px] p-5"}`}>
            <Link href="/" className="flex items-center gap-4 rounded-[22px] px-2 py-2 transition-colors hover:bg-white/60 dark:hover:bg-white/[0.05]">
              {siteConfig.avatar ? (
                <img src={siteConfig.avatar} alt="Avatar" className="h-12 w-12 rounded-[18px] border border-black/10 dark:border-white/10" />
              ) : null}
              <div className="min-w-0">
                <p className="site-kicker">{t("admin.title")}</p>
                <p className="site-display truncate text-[1.35rem] text-neutral-900 dark:text-white">{siteConfig.name}</p>
              </div>
            </Link>

            <div className={`rounded-[22px] border border-black/5 bg-white/45 dark:border-white/10 dark:bg-white/[0.03] ${compact ? "mt-4 px-4 py-3" : "mt-5 px-4 py-4"}`}>
              <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                {description}
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-medium t-primary transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.08]"
              >
                <i className="ri-arrow-left-line" />
                <span>{t("admin.back_to_site")}</span>
              </Link>
            </div>

            <div className={compact ? "mt-5" : "mt-6"}>
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                {t("admin.title")}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <AdminNavItem href="/admin/writing" icon="ri-quill-pen-line" label={t("writing")} />
                <AdminNavItem href="/admin/settings" icon="ri-settings-3-line" label={t("settings.title")} />
                <AdminNavItem href="/admin/health" icon="ri-heart-pulse-line" label={t("health.title")} />
                <AdminNavItem href="/admin/queue-status" icon="ri-todo-line" label={t("queue_status.title")} />
                <AdminNavItem href="/admin/compat-tasks" icon="ri-history-line" label={t("compat_tasks.title")} />
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className={`site-panel ${compact ? "rounded-[30px] p-4 md:p-5" : "rounded-[34px] p-5 md:p-6"}`}>
            <div className={`border-b border-black/5 dark:border-white/5 ${compact ? "pb-4" : "pb-5"}`}>
              <p className="site-kicker">{t("admin.title")}</p>
              <h1 className={`${compact ? "mt-2 text-[1.6rem] font-semibold md:text-[2rem]" : "site-display mt-3 text-[2.5rem] md:text-[3.4rem]"} text-neutral-900 dark:text-white`}>{title}</h1>
              <p className={`${compact ? "mt-2 text-sm leading-6" : "mt-3 text-base leading-7"} max-w-3xl text-neutral-600 dark:text-neutral-300`}>{description}</p>
            </div>
            <div className={compact ? "mt-4" : "mt-6"}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
