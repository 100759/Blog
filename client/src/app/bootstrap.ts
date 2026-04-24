import i18n from "i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { readBootstrappedClientConfig } from "./bootstrap-config";
import { listenSystemMode } from "../utils/darkModeUtils";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;
export const CLIENT_CONFIG_READY_EVENT = "rin:client-config-ready";

function emitClientConfigReady() {
  if (typeof window === "undefined" || !readBootstrappedClientConfig()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(CLIENT_CONFIG_READY_EVENT));
}

function ensureClientConfig() {
  if (
    typeof window === "undefined" ||
    readBootstrappedClientConfig()
  ) {
    emitClientConfigReady();
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[data-rin-client-config="true"]',
  );

  if (existingScript) {
    return new Promise<void>((resolve) => {
      existingScript.addEventListener("load", () => {
        emitClientConfigReady();
        resolve();
      }, { once: true });
      existingScript.addEventListener("error", () => resolve(), { once: true });
    });
  }

  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "/api/config/client/bootstrap.js";
    script.async = false;
    script.dataset.cfasync = "false";
    script.dataset.rinClientConfig = "true";
    script.addEventListener("load", () => {
      emitClientConfigReady();
      resolve();
    }, { once: true });
    script.addEventListener("error", () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

export function bootstrapApp() {
  if (bootstrapped) {
    return Promise.resolve();
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    listenSystemMode();

    const configPromise = ensureClientConfig();

    await i18n
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        backend: {
          loadPath: "/locales/{{lng}}/{{ns}}.json",
        },
        fallbackLng: "en",
        interpolation: {
          escapeValue: false,
        },
      });

    await configPromise;
    bootstrapped = true;
  })();

  return bootstrapPromise;
}
