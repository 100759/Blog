import { useContext, useEffect, useMemo, useRef, useState } from "react";
import Popup from "reactjs-popup";
import { useLocation } from "wouter";
import { ClientConfigContext } from "../state/config";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { buildLoginPath, HIDDEN_LOGIN_REDIRECT } from "../utils/auth-redirect";

type ThemeMode = "light" | "dark" | "system";

function Footer() {
    const { t } = useTranslation();
    const [, setLocation] = useLocation();
    const [modeState, setModeState] = useState<ThemeMode>("system");
    const config = useContext(ClientConfigContext);
    const footerHtml = config.get<string>("footer");
    const safeFooterHtml = useMemo(() => sanitizeFooterHtml(footerHtml || ""), [footerHtml]);
    const footerHtmlRef = useRef<HTMLDivElement | null>(null);
    const loginEnabled = config.getBoolean("login.enabled");
    const siteTitle = config.get<string>("site.name") || "Rin";
    const siteDescription = config.get<string>("site.description") || "A lightweight personal blogging system";
    const [doubleClickTimes, setDoubleClickTimes] = useState(0);

    useEffect(() => {
        const mode = localStorage.getItem("theme") as ThemeMode || "system";
        setModeState(mode);
        setMode(mode);
    }, []);

    useEffect(() => {
        const container = footerHtmlRef.current;
        if (!container) {
            return;
        }

        container.replaceChildren();

        if (!safeFooterHtml) {
            return;
        }

        const template = document.createElement("template");
        template.innerHTML = safeFooterHtml;

        container.appendChild(template.content.cloneNode(true));
    }, [safeFooterHtml]);

    const setMode = (mode: ThemeMode) => {
        setModeState(mode);
        localStorage.setItem("theme", mode);

        if (mode !== "system" || (!("theme" in localStorage) && window.matchMedia(`(prefers-color-scheme: ${mode})`).matches)) {
            document.documentElement.setAttribute("data-color-mode", mode);
        } else {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            if (mediaQuery.matches) {
                document.documentElement.setAttribute("data-color-mode", "dark");
            } else {
                document.documentElement.setAttribute("data-color-mode", "light");
            }
        }
        window.dispatchEvent(new Event("colorSchemeChange"));
    };

    return (
        <footer className="wauto pb-10 pt-6">
            <Helmet>
                <link rel="alternate" type="application/rss+xml" title={siteTitle} href="/rss.xml" />
                <link rel="alternate" type="application/atom+xml" title={siteTitle} href="/atom.xml" />
                <link rel="alternate" type="application/json" title={siteTitle} href="/rss.json" />
            </Helmet>

            <div className="border-t border-black/8 pt-6 dark:border-white/10">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1.3fr)_auto]">
                    <div>
                        <p className="site-kicker">{siteTitle}</p>
                        <h2 className="site-display mt-2 text-[1.45rem] font-semibold text-neutral-900 dark:text-white md:text-[1.75rem]">
                            {siteTitle}
                        </h2>
                        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                            {siteDescription}
                        </p>
                        <div className="mt-5 text-sm text-neutral-500 dark:text-neutral-400" ref={footerHtmlRef} />
                    </div>

                    <div className="flex flex-col items-start gap-4 md:items-end">
                        <div className="inline-flex rounded-[8px] border border-black/10 bg-white/40 p-[3px] dark:border-white/10 dark:bg-white/[0.04]">
                            <ThemeButton mode="light" current={modeState} label="Toggle light mode" icon="ri-sun-line" onClick={setMode} />
                            <ThemeButton mode="system" current={modeState} label="Toggle system mode" icon="ri-computer-line" onClick={setMode} />
                            <ThemeButton mode="dark" current={modeState} label="Toggle dark mode" icon="ri-moon-line" onClick={setMode} />
                        </div>

                        {config.getBoolean("rss") ? (
                            <Popup
                                trigger={
                                    <button className="rounded-[8px] border border-black/10 bg-white/55 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15" type="button">
                                        RSS
                                    </button>
                                }
                                position="top center"
                                arrow={false}
                                closeOnDocumentClick
                            >
                                <div className="site-panel flex flex-col gap-2 rounded-[10px] p-4 text-sm t-primary">
                                    <p className="site-kicker">{t("footer.rss")}</p>
                                    <div className="flex flex-wrap gap-3">
                                        <a href="/rss.xml">RSS</a>
                                        <a href="/atom.xml">Atom</a>
                                        <a href="/rss.json">JSON</a>
                                    </div>
                                </div>
                            </Popup>
                        ) : null}
                    </div>
                </div>

                <div className="mt-6 border-t border-black/5 py-4 dark:border-white/10">
                    <div className="flex flex-col gap-3 text-sm text-neutral-500 dark:text-neutral-400 md:flex-row md:items-center md:justify-between">
                        <p
                            onDoubleClick={() => {
                                if (doubleClickTimes >= 2) {
                                    setDoubleClickTimes(0);
                                    if (!loginEnabled) {
                                        setLocation(buildLoginPath(HIDDEN_LOGIN_REDIRECT));
                                    }
                                } else {
                                    setDoubleClickTimes(doubleClickTimes + 1);
                                }
                            }}
                            className="cursor-default"
                        >
                            Copyright {new Date().getFullYear()} Powered by{" "}
                            <span>FuHeng</span>
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                            {modeState}
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function ThemeButton({ current, mode, label, icon, onClick }: { current: ThemeMode; label: string; mode: ThemeMode; icon: string; onClick: (mode: ThemeMode) => void }) {
    return (
        <button
            aria-label={label}
            type="button"
            onClick={() => onClick(mode)}
            className={`inline-flex h-[34px] w-[34px] items-center justify-center rounded-[6px] border-0 transition-colors ${
                current === mode
                    ? "bg-theme text-white"
                    : "text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100"
            }`}
        >
            <i className={icon} />
        </button>
    );
}

function sanitizeFooterHtml(html: string) {
    if (!html.trim() || typeof document === "undefined") {
        return "";
    }

    const template = document.createElement("template");
    template.innerHTML = html;

    template.content.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());
    template.content.querySelectorAll("*").forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (name.startsWith("on") || value.startsWith("javascript:")) {
                element.removeAttribute(attribute.name);
            }
        });
    });

    return template.innerHTML;
}

export default Footer;
