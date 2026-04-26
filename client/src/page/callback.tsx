import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { DEFAULT_LOGIN_REDIRECT } from "../utils/auth-redirect";
import { setAuthToken } from "../utils/auth";

export function CallbackPage() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      setAuthToken(token);
    }

    window.location.replace(DEFAULT_LOGIN_REDIRECT);
  }, []);

  return (
    <>
      <Helmet>
        <title>{`${t("callback.title")} - ${siteConfig.name}`}</title>
      </Helmet>
      <main className="wauto ani-show pb-14 pt-8">
        <section className="site-panel flex min-h-[420px] flex-col items-center justify-center rounded-[34px] px-6 py-8 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-theme/25 border-t-theme" />
          <p className="site-kicker mt-6">{siteConfig.name}</p>
          <h1 className="site-display mt-4 text-[2.4rem] text-neutral-900 dark:text-white md:text-[3.2rem]">
            {t("callback.title")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
            {t("callback.desc")}
          </p>
        </section>
      </main>
    </>
  );
}
