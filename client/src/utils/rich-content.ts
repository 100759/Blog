import { stripImageUrlMetadata } from "./image-upload";

const htmlTagPattern = /<\/?[a-z][\s\S]*>/i;
const markdownImagePattern = /!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/g;
const markdownLinkPattern = /\[([^\]]+)\]\((\S+?)(?:\s+"[^"]*")?\)/g;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifyHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function applyInlineMarkdown(value: string) {
  const placeholders: string[] = [];
  let next = escapeHtml(value);

  next = next.replace(/`([^`]+)`/g, (_, code: string) => {
    const placeholder = `__INLINE_CODE_${placeholders.length}__`;
    placeholders.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  next = next.replace(markdownImagePattern, (_, alt: string, url: string) => {
    const safeUrl = escapeHtml(url);
    const safeAlt = escapeHtml(alt || "");
    return `<img src="${safeUrl}" alt="${safeAlt}" />`;
  });

  next = next.replace(markdownLinkPattern, (_, text: string, url: string) => {
    const safeUrl = escapeHtml(url);
    const safeText = text.trim() || url;
    return `<a href="${safeUrl}" target="_blank" rel="noreferrer">${escapeHtml(safeText)}</a>`;
  });

  next = next.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  next = next.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  next = next.replace(/(^|[\s(])\*([^*]+)\*(?=$|[\s).,!?:;])/g, "$1<em>$2</em>");
  next = next.replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,!?:;])/g, "$1<em>$2</em>");
  next = next.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return placeholders.reduce(
    (result, html, index) => result.replace(`__INLINE_CODE_${index}__`, html),
    next,
  );
}

function renderParagraph(lines: string[]) {
  const text = lines.join("<br />");
  return `<p>${applyInlineMarkdown(text)}</p>`;
}

function renderMarkdownToHtml(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const paragraphLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let quoteLines: string[] = [];
  let codeFence = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    html.push(renderParagraph(paragraphLines));
    paragraphLines.length = 0;
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    html.push(`<${listType}>${listItems.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushQuote = () => {
    if (quoteLines.length === 0) return;
    html.push(`<blockquote>${renderParagraph(quoteLines)}</blockquote>`);
    quoteLines = [];
  };

  const flushCode = () => {
    if (!codeFence) return;
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeFence = false;
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^```/.test(line)) {
      if (codeFence) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        flushQuote();
        codeFence = true;
      }
      continue;
    }

    if (codeFence) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = heading[1].length;
      html.push(`<h${level}>${applyInlineMarkdown(heading[2].trim())}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushQuote();
      html.push("<hr />");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote[1]);
      continue;
    }
    flushQuote();

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(ordered[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushCode();

  return html.join("");
}

export function isHtmlContent(content: string) {
  return htmlTagPattern.test(content);
}

export function convertStoredContentToEditorHtml(content: string) {
  if (!content.trim()) {
    return "";
  }

  return isHtmlContent(content) ? content : renderMarkdownToHtml(content);
}

export function extractFirstContentImageUrl(content: string) {
  if (!content.trim()) {
    return undefined;
  }

  if (isHtmlContent(content)) {
    const doc = new DOMParser().parseFromString(content, "text/html");
    const image = doc.querySelector("img");
    return image?.getAttribute("src") ? stripImageUrlMetadata(image.getAttribute("src")) : undefined;
  }

  const match = /!\[.*?\]\((\S+?)(?:\s+"[^"]*")?\)/.exec(content);
  return match ? stripImageUrlMetadata(match[1]) : undefined;
}

export function stripContentToPlainText(content: string) {
  if (!content.trim()) {
    return "";
  }

  if (isHtmlContent(content)) {
    const doc = new DOMParser().parseFromString(content, "text/html");
    return doc.body.textContent?.replace(/\s+/g, " ").trim() || "";
  }

  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMeaningfulContent(content: string) {
  if (!content.trim()) {
    return false;
  }

  if (isHtmlContent(content)) {
    const doc = new DOMParser().parseFromString(content, "text/html");
    if (doc.querySelector("img, video, iframe, table, pre, blockquote, ul, ol")) {
      return true;
    }
    return Boolean(doc.body.textContent?.replace(/\s+/g, "").trim());
  }

  return Boolean(stripContentToPlainText(content));
}

export function normalizeRichHtml(content: string) {
  if (!content.trim()) {
    return "";
  }

  const doc = new DOMParser().parseFromString(content, "text/html");

  doc.querySelectorAll("script, style").forEach((node) => node.remove());
  doc.querySelectorAll<HTMLElement>("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || value.startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  doc.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    if (!heading.id) {
      const slug = slugifyHeading(heading.textContent || "");
      if (slug) {
        heading.id = slug;
      }
    }
  });

  doc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
  });

  doc.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.loading = "lazy";
    image.decoding = "async";
    if (
      !image.classList.contains("image-size-compact") &&
      !image.classList.contains("image-size-default") &&
      !image.classList.contains("image-size-wide")
    ) {
      image.classList.add("image-size-default");
    }
  });

  doc.querySelectorAll("hr").forEach((rule) => {
    const parent = rule.parentElement;
    if (parent?.classList.contains("rich-divider")) {
      return;
    }

    const wrapper = doc.createElement("div");
    wrapper.className = "rich-divider";
    wrapper.setAttribute("data-rich-divider", "true");
    rule.replaceWith(wrapper);
    wrapper.appendChild(rule);
  });

  return doc.body.innerHTML.trim();
}
