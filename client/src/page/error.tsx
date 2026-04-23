import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "../hooks/useSiteConfig";

export function ErrorPage({ error }: { error?: string }) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const message = error || t("error.not_found");

  return (
    <>
      <Helmet>
        <title>{`${t("error.title")} - ${siteConfig.name}`}</title>
        <meta property="og:site_name" content={siteConfig.name} />
        <meta property="og:title" content={t("error.title")} />
        <meta property="og:image" content={siteConfig.avatar} />
      </Helmet>
      <main className="wauto ani-show pb-14 pt-8">
        <section className="site-panel flex min-h-[420px] flex-col justify-between rounded-[34px] px-6 py-8 md:px-10 md:py-10">
          <div>
            <p className="site-kicker">{t("error.title")}</p>
            <h1 className="site-display mt-4 text-[2.8rem] text-neutral-900 dark:text-white md:text-[4.4rem]">
              {message}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg">
              {siteConfig.description || t("index.back")}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="inline-flex items-center justify-center rounded-full bg-theme px-5 py-3 text-sm font-semibold text-white transition hover:bg-theme-hover"
            >
              {t("index.back")}
            </button>
            <div className="rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
              {siteConfig.name}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
