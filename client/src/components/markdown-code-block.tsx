import { useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  base16AteliersulphurpoolLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import markdownLanguage from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("diff", diff);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("markdown", markdownLanguage);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("yaml", yaml);

const CODE_LANGUAGE_ALIASES: Record<string, string> = {
  html: "markup",
  js: "javascript",
  md: "markdown",
  shell: "bash",
  sh: "bash",
  svg: "markup",
  ts: "typescript",
  xml: "markup",
  yml: "yaml",
  zsh: "bash",
};

const REGISTERED_CODE_LANGUAGES = new Set([
  "bash",
  "css",
  "diff",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "markup",
  "python",
  "sql",
  "tsx",
  "typescript",
  "yaml",
]);

function normalizeCodeLanguage(language: string) {
  const normalized = CODE_LANGUAGE_ALIASES[language.toLowerCase()] || language.toLowerCase();
  return REGISTERED_CODE_LANGUAGES.has(normalized) ? normalized : "";
}

const CODE_BLOCK_STYLE = {
  fontFamily: 'ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontSize: "14px",
  fontVariantLigatures: "normal",
  WebkitFontFeatureSettings: '"liga" 1',
  fontFeatureSettings: '"liga" 1',
};

export function MarkdownCodeBlock({
  children,
  className,
  colorMode,
}: {
  children: React.ReactNode;
  className?: string;
  colorMode: string;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? normalizeCodeLanguage(match[1]) : "";
  const content = String(children).replace(/\n$/, "");

  return (
    <div className="group relative my-6 overflow-hidden rounded-[18px] border border-black/8 bg-[#f6f4ef] dark:border-white/10 dark:bg-[#18181c]">
      <SyntaxHighlighter
        PreTag="div"
        className="!m-0 !rounded-none"
        language={language}
        style={colorMode === "dark" ? vscDarkPlus : base16AteliersulphurpoolLight}
        wrapLongLines={true}
        codeTagProps={{ style: CODE_BLOCK_STYLE }}
      >
        {content}
      </SyntaxHighlighter>
      <button
        className="absolute right-3 top-3 rounded-full border border-black/8 bg-white/80 px-2.5 py-1 text-xs font-medium text-neutral-700 select-none invisible group-hover:visible dark:border-white/10 dark:bg-white/[0.07] dark:text-neutral-200"
        onClick={() => {
          navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
