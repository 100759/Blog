type MermaidAPI = typeof import("mermaid").default;

declare global {
  interface Window {
    mermaid?: MermaidAPI;
  }
}

const MERMAID_SCRIPT_ID = "rin-mermaid-runtime";
const MERMAID_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/mermaid@10.9.5/dist/mermaid.min.js";

let mermaidPromise: Promise<MermaidAPI | null> | null = null;

export function hasMermaidBlocks(content: string) {
  return /```mermaid\b/.test(content);
}

export function loadMermaid() {
  if (typeof window === "undefined") {
    return Promise.resolve<MermaidAPI | null>(null);
  }

  if (window.mermaid) {
    return Promise.resolve(window.mermaid);
  }

  if (mermaidPromise) {
    return mermaidPromise;
  }

  mermaidPromise = new Promise<MermaidAPI | null>((resolve) => {
    const existingScript = document.getElementById(MERMAID_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.mermaid ?? null), { once: true });
      existingScript.addEventListener("error", () => resolve(null), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = MERMAID_SCRIPT_ID;
    script.src = MERMAID_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(window.mermaid ?? null), { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    document.head.appendChild(script);
  });

  return mermaidPromise;
}

export async function renderMermaidBlocks(content: string, root?: ParentNode | null) {
  if (!hasMermaidBlocks(content) || !root) {
    return;
  }

  const mermaid = await loadMermaid();
  if (!mermaid) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
  });

  await mermaid.run({
    suppressErrors: true,
    nodes: root.querySelectorAll("pre.mermaid_default"),
  });

  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
  });

  await mermaid.run({
    suppressErrors: true,
    nodes: root.querySelectorAll("pre.mermaid_dark"),
  });
}
