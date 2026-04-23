import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { client } from "../app/runtime";
import { ImageUploadInput } from "../components/image-upload-input";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { ProfileContext } from "../state/profile";

export function ProfilePage() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const profile = useContext(ProfileContext);
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (profile === undefined) {
      return;
    }

    if (profile === null) {
      setLocation("/login");
      return;
    }

    setUsername(profile.name || "");
    setAvatar(profile.avatar || "");
  }, [profile, setLocation]);

  async function handleSubmit() {
    if (!username.trim()) {
      setError(t("profile.error.empty_username"));
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: apiError } = await client.user.updateProfile({
        username: username.trim(),
        avatar: avatar || null,
      });

      if (apiError) {
        setError(t("profile.error.update_failed"));
        return;
      }

      setSuccess(t("profile.success"));
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setError(t("profile.error.network"));
    } finally {
      setIsLoading(false);
    }
  }

  if (profile === undefined) {
    return (
      <main className="wauto ani-show pb-14 pt-8">
        <div className="site-panel flex min-h-[360px] items-center justify-center rounded-[34px] px-6 py-8">
          <div className="flex items-center gap-3 text-sm font-medium text-neutral-500 dark:text-neutral-300">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-theme/25 border-t-theme" />
            <span>{t("profile.saving")}</span>
          </div>
        </div>
      </main>
    );
  }

  if (profile === null) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{`${t("profile.title")} - ${siteConfig.name}`}</title>
      </Helmet>
      <main className="wauto ani-show pb-14 pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)]">
          <section className="site-panel overflow-hidden rounded-[34px] px-6 py-8 md:px-8 md:py-10">
            <p className="site-kicker">{siteConfig.name}</p>
            <h1 className="site-display mt-4 text-[2.5rem] text-neutral-900 dark:text-white md:text-[3.6rem]">
              {t("profile.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
              {siteConfig.description || t("profile.avatar_hint")}
            </p>
            <div className="mt-8 rounded-[28px] border border-black/10 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]">
                  {avatar ? (
                    <img src={avatar} alt={username || t("profile.title")} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-neutral-400">
                      <i className="ri-user-3-line" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="site-kicker">{t("profile.username")}</p>
                  <p className="mt-2 truncate text-xl font-semibold text-neutral-900 dark:text-white">
                    {username || t("profile.username_placeholder")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="site-panel-muted rounded-[34px] px-5 py-5 md:px-6 md:py-6">
            <div className="rounded-[28px] border border-black/10 bg-white/70 px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
              <p className="site-kicker">{t("main_content")}</p>
              <h2 className="site-display mt-3 text-[2rem] text-neutral-900 dark:text-white">
                {t("profile.title")}
              </h2>

              {error ? (
                <div className="mt-5 rounded-[20px] border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mt-5 rounded-[20px] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {success}
                </div>
              ) : null}

              <div className="mt-6 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    {t("profile.avatar")}
                  </label>
                  <ImageUploadInput
                    value={avatar}
                    onChange={(value) => {
                      setError("");
                      setAvatar(value);
                    }}
                    onError={setError}
                    disabled={isLoading}
                    shape="circle"
                    maxFileSize={2 * 1024 * 1024}
                    placeholder={t("upload.image.url_placeholder")}
                  />
                  <p className="mt-3 text-xs leading-6 text-neutral-500 dark:text-neutral-400">
                    {t("profile.avatar_hint")}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    {t("profile.username")}
                  </span>
                  <input
                    type="text"
                    value={username}
                    disabled={isLoading}
                    placeholder={t("profile.username_placeholder")}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-[18px] border border-black/10 bg-white/80 px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-theme/40 focus:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-100 dark:focus:bg-white/[0.08]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center rounded-full bg-theme px-5 py-3 text-sm font-semibold text-white transition hover:bg-theme-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? t("profile.saving") : t("profile.save")}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
