import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { client, oauth_url } from "../app/runtime";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { setAuthToken } from "../utils/auth";
import { getLoginRedirectPath } from "../utils/auth-redirect";

export function LoginPage() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authStatus, setAuthStatus] = useState<{ github: boolean; password: boolean }>({ github: false, password: false });
  const [authReady, setAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    client.auth.status()
      .then(({ data }) => {
        if (data) {
          setAuthStatus(data);
        }
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  async function handleLogin() {
    if (!username || !password) {
      setError(t("login.error.empty"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error: apiError } = await client.auth.login({ username, password });

      if (apiError) {
        setError(t("login.error.invalid"));
        return;
      }

      if (data?.success) {
        if (data.token) {
          setAuthToken(data.token);
        }

        setLocation(getLoginRedirectPath(window.location.search));
        window.location.reload();
        return;
      }

      setError(t("login.error.failed"));
    } catch {
      setError(t("login.error.network"));
    } finally {
      setIsLoading(false);
    }
  }

  const hasAnyMethod = authStatus.github || authStatus.password;

  return (
    <>
      <Helmet>
        <title>{`${t("login.title")} - ${siteConfig.name}`}</title>
      </Helmet>
      <main className="wauto ani-show pb-14 pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,380px)]">
          <section className="site-panel relative overflow-hidden rounded-[34px] px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-theme/40 to-transparent" />
            <p className="site-kicker">{siteConfig.name}</p>
            <h1 className="site-display mt-4 text-[2.6rem] text-neutral-900 dark:text-white md:text-[4rem]">
              {t("login.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg">
              {siteConfig.description || t("login.required")}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="site-kicker">{t("login.username.placeholder")}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {t("login.required")}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="site-kicker">{t("login.password.label")}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {authStatus.password ? t("login.method.enabled") : t("login.method.disabled")}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="site-kicker">{t("login.github.label")}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {authStatus.github ? t("login.method.enabled") : t("login.method.disabled")}
                </p>
              </div>
            </div>
          </section>

          <section className="site-panel-muted rounded-[34px] px-5 py-5 md:px-6 md:py-6">
            <div className="rounded-[28px] border border-black/10 bg-white/70 px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
              <p className="site-kicker">{t("main_content")}</p>
              <h2 className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white">
                {t("login.title")}
              </h2>

              {error ? (
                <div className="mt-5 rounded-[20px] border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              {authStatus.password ? (
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {t("profile.username")}
                    </span>
                    <input
                      type="text"
                      value={username}
                      autoFocus
                      disabled={isLoading}
                      placeholder={t("login.username.placeholder")}
                      onChange={(event) => setUsername(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleLogin();
                        }
                      }}
                      className="w-full rounded-[18px] border border-black/10 bg-white/80 px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-theme/40 focus:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-100 dark:focus:bg-white/[0.08]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {t("login.password.placeholder")}
                    </span>
                    <input
                      type="password"
                      value={password}
                      disabled={isLoading}
                      placeholder={t("login.password.placeholder")}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleLogin();
                        }
                      }}
                      className="w-full rounded-[18px] border border-black/10 bg-white/80 px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-theme/40 focus:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-100 dark:focus:bg-white/[0.08]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogin();
                    }}
                    disabled={isLoading}
                    className="inline-flex w-full items-center justify-center rounded-full bg-theme px-5 py-3 text-sm font-semibold text-white transition hover:bg-theme-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? t("login.loading") : t("login.title")}
                  </button>
                </div>
              ) : null}

              {authStatus.github ? (
                <div className={`${authStatus.password ? "mt-6 border-t border-black/5 pt-6 dark:border-white/10" : "mt-6"}`}>
                  {authStatus.password ? (
                    <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                      {t("login.or")}
                    </p>
                  ) : (
                    <p className="mb-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{t("login.oauth_only")}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = oauth_url;
                    }}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:bg-white/[0.08]"
                  >
                    <i className="ri-github-line text-lg" aria-hidden="true" />
                    <span>{t("github_login")}</span>
                  </button>
                </div>
              ) : null}

              {authReady && !hasAnyMethod ? (
                <div className="mt-6 rounded-[20px] border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                  {t("login.no_methods")}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
