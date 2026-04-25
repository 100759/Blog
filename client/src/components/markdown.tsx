import "katex/dist/katex.min.css";
import React, { Suspense, cloneElement, isValidElement, lazy, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import remarkMermaid from "../remark/remarkMermaid";
import type { SlideImage } from "yet-another-react-lightbox";
import type { Pluggable } from "unified";
import { drawBlurhashToCanvas } from "../utils/blurhash";
import { useColorMode } from "../utils/darkModeUtils";
import { parseImageUrlMetadata } from "../utils/image-upload";
import { renderMermaidBlocks } from "../utils/mermaid";
import { useImageLoadState } from "../utils/use-image-load-state";

const MarkdownCodeBlock = lazy(() =>
  import("./markdown-code-block").then((module) => ({ default: module.MarkdownCodeBlock })),
);
const MarkdownLightbox = lazy(() =>
  import("./markdown-lightbox").then((module) => ({ default: module.MarkdownLightbox })),
);

const optionalMarkdownPluginCache: {
  remarkAlert: Pluggable | null;
  remarkMath: Pluggable | null;
  rehypeKatex: Pluggable | null;
  rehypeRaw: Pluggable | null;
} = {
  remarkAlert: null,
  remarkMath: null,
  rehypeKatex: null,
  rehypeRaw: null,
};

let remarkAlertPromise: Promise<Pluggable> | null = null;
let mathPluginPromise: Promise<{ remarkMath: Pluggable; rehypeKatex: Pluggable }> | null = null;
let rehypeRawPromise: Promise<Pluggable> | null = null;

function hasMathSyntax(content: string) {
  return /\$\$[\s\S]+?\$\$|\\\(|\\\[|(^|[^\\])\$[^$\n]+\$/m.test(content);
}

function hasRawHtmlSyntax(content: string) {
  return /<([a-z][\w-]*)(\s[^>]*)?>/i.test(content);
}

function hasGithubAlertSyntax(content: string) {
  return /^>\s*\[!/m.test(content);
}


const countNewlinesBeforeNode = (text: string, offset: number) => {
  let newlinesBefore = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === "\n") {
      newlinesBefore++;
    } else {
      break;
    }
  }
  return newlinesBefore;
};

const isMarkdownImageLinkAtEnd = (text: string) => {
  const trimmed = text.trim();

  const match = trimmed.match(/(.*)(!\\[.*?\\]\\(.*?\\))$/s);

  if (match) {
    const [, beforeImage, _] = match;

    return beforeImage.trim().length === 0 || beforeImage.endsWith("\n");
  }

  return false;
};

function MarkdownImage({
  src,
  alt,
  show,
  rounded,
  scale,
  className,
}: {
  src?: string;
  alt?: string;
  show: (src?: string) => void;
  rounded: boolean;
  scale: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { src: cleanSrc, blurhash, width, height } = parseImageUrlMetadata(src);
  const { failed, imageRef, loaded, onError, onLoad } = useImageLoadState(cleanSrc);
  const roundedClass = rounded ? "rounded-xl" : "";
  const aspectRatio = width && height ? `${width} / ${height}` : undefined;

  useEffect(() => {
    if (!blurhash || !canvasRef.current) {
      return;
    }
    try {
      drawBlurhashToCanvas(canvasRef.current, blurhash);
    } catch (error) {
      console.error("Failed to render blurhash", error);
    }
  }, [blurhash]);

  return (
    <span
      className={`relative inline-block max-w-full overflow-hidden ${roundedClass}`}
      style={{ zoom: scale, aspectRatio }}
    >
      {blurhash && !loaded ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full scale-110 blur-sm ${roundedClass}`}
        />
      ) : null}
      <img
        ref={imageRef}
        src={cleanSrc}
        alt={alt}
        width={width}
        height={height}
        onClick={() => {
          show(cleanSrc);
        }}
        onLoad={onLoad}
        onError={onError}
        className={`mx-auto max-w-full cursor-zoom-in transition-opacity ${roundedClass} ${className || ""} ${
          blurhash && (!loaded || failed) ? "opacity-0" : "opacity-100"
        }`}
      />
    </span>
  );
}

type MarkdownVariant = "article" | "moment";

export function Markdown({ content, variant = "article" }: { content: string; variant?: MarkdownVariant }) {
  const colorMode = useColorMode();
  const [index, setIndex] = React.useState(-1);
  const [optionalPlugins, setOptionalPlugins] = React.useState<{
    remarkAlert: Pluggable | null;
    remarkMath: Pluggable | null;
    rehypeKatex: Pluggable | null;
    rehypeRaw: Pluggable | null;
  }>({ ...optionalMarkdownPluginCache });
  const contentRef = useRef<HTMLDivElement>(null);
  const slides = useRef<SlideImage[]>();
  const needsMath = hasMathSyntax(content);
  const needsRawHtml = hasRawHtmlSyntax(content);
  const needsAlert = hasGithubAlertSyntax(content);

  useEffect(() => {
    slides.current = undefined;
  }, [content]);

  useEffect(() => {
    let cancelled = false;
    setOptionalPlugins({ ...optionalMarkdownPluginCache });

    void (async () => {
      const pending: Promise<unknown>[] = [];

      if (needsAlert && !optionalMarkdownPluginCache.remarkAlert) {
        remarkAlertPromise ??= import("remark-github-blockquote-alert").then((module) => {
          optionalMarkdownPluginCache.remarkAlert = module.remarkAlert;
          return module.remarkAlert;
        });
        pending.push(remarkAlertPromise);
      }

      if (needsMath && (!optionalMarkdownPluginCache.remarkMath || !optionalMarkdownPluginCache.rehypeKatex)) {
        mathPluginPromise ??= Promise.all([
          import("remark-math"),
          import("rehype-katex"),
        ]).then(([remarkMathModule, rehypeKatexModule]) => {
          optionalMarkdownPluginCache.remarkMath = remarkMathModule.default;
          optionalMarkdownPluginCache.rehypeKatex = rehypeKatexModule.default;
          return {
            remarkMath: remarkMathModule.default,
            rehypeKatex: rehypeKatexModule.default,
          };
        });
        pending.push(mathPluginPromise);
      }

      if (needsRawHtml && !optionalMarkdownPluginCache.rehypeRaw) {
        rehypeRawPromise ??= import("rehype-raw").then((module) => {
          optionalMarkdownPluginCache.rehypeRaw = module.default;
          return module.default;
        });
        pending.push(rehypeRawPromise);
      }

      if (pending.length > 0) {
        await Promise.all(pending);
      }

      if (!cancelled) {
        setOptionalPlugins({ ...optionalMarkdownPluginCache });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsAlert, needsMath, needsRawHtml]);

  useEffect(() => {
    void renderMermaidBlocks(content, contentRef.current);
  }, [content]);

  const remarkPlugins = useMemo(() => {
    const plugins: Pluggable[] = [gfm, remarkMermaid];
    if (optionalPlugins.remarkMath) {
      plugins.push(optionalPlugins.remarkMath);
    }
    if (optionalPlugins.remarkAlert) {
      plugins.push(optionalPlugins.remarkAlert);
    }
    return plugins;
  }, [optionalPlugins.remarkAlert, optionalPlugins.remarkMath]);

  const rehypePlugins = useMemo(() => {
    const plugins: Pluggable[] = [];
    if (optionalPlugins.rehypeKatex) {
      plugins.push(optionalPlugins.rehypeKatex);
    }
    if (optionalPlugins.rehypeRaw) {
      plugins.push(optionalPlugins.rehypeRaw);
    }
    return plugins;
  }, [optionalPlugins.rehypeKatex, optionalPlugins.rehypeRaw]);



  const Content = useMemo(() => (
    <ReactMarkdown
      className={`toc-content text-neutral-700 dark:text-neutral-300 ${
        variant === "moment"
          ? "moment-markdown text-[14px] leading-[1.68] md:text-[14px]"
          : "text-[16px] leading-[1.95] md:text-[17px]"
      }`}
      remarkPlugins={remarkPlugins}
      children={content}
      rehypePlugins={rehypePlugins}
      components={{
        img({ node, src, ...props }) {
          const offset = node!.position!.start.offset!;
          const previousContent = content.slice(0, offset);
          const newlinesBefore = countNewlinesBeforeNode(
            previousContent,
            offset
          );
          const Image = ({
            rounded,
            scale,
          }: {
            rounded: boolean;
            scale: string;
          }) => (
            <MarkdownImage
              src={src}
              alt={props.alt}
              show={show}
              rounded={rounded}
              scale={scale}
              className={props.className}
            />
          );
          if (
            newlinesBefore >= 1 ||
            previousContent.trim().length === 0 ||
            isMarkdownImageLinkAtEnd(previousContent)
          ) {
            if (variant === "moment") {
              return (
                <span className="moment-image-frame">
                  <Image scale="1" rounded={true} />
                </span>
              );
            }

            return (
              <span className="block w-full text-center my-4">
                <Image scale="0.75" rounded={true} />
              </span>
            );
          } else {
            return (
              <span className={variant === "moment" ? "moment-inline-image" : "inline-block align-middle mx-1 "}>
                <Image scale={variant === "moment" ? "1" : "0.5"} rounded={variant === "moment"} />
              </span>
            );
          }
        },
        code(props) {
          const { children, className, node, ...rest } = props;

          const curContent = content.slice(node?.position?.start.offset || 0);
          const isCodeBlock = curContent.trimStart().startsWith("```");

          const inlineCodeStyle = {
            fontFamily: 'ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: "13px",
            fontVariantLigatures: "normal",
            WebkitFontFeatureSettings: '"liga" 1',
            fontFeatureSettings: '"liga" 1',
          };

          if (isCodeBlock) {
            return (
              <Suspense
                fallback={
                  <pre className="my-6 overflow-x-auto rounded-[18px] border border-black/8 bg-[#f6f4ef] px-4 py-4 text-[14px] leading-7 text-neutral-700 dark:border-white/10 dark:bg-[#18181c] dark:text-neutral-200">
                    <code>{String(children).replace(/\n$/, "")}</code>
                  </pre>
                }
              >
                <MarkdownCodeBlock className={className} colorMode={colorMode}>
                  {children}
                </MarkdownCodeBlock>
              </Suspense>
            );
          } else {
            return (
              <code
                {...rest}
                className={`mx-[2px] rounded-md border border-black/6 bg-[#f1eee8] px-[5px] py-[2px] text-neutral-800 dark:border-white/8 dark:bg-[#3e4352] dark:text-neutral-300 ${className || ""
                  }`}
                style={inlineCodeStyle}
              >
                {children}
              </code>
            );
          }
        },
        blockquote({ children, ...props }) {
          return (
            <blockquote
              className="my-8 rounded-r-[18px] border-l-[3px] border-theme/40 bg-black/[0.025] px-5 py-4 text-[15px] leading-7 text-neutral-600 dark:bg-white/[0.035] dark:text-neutral-300 md:text-[16px]"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        em({ children, ...props }) {
          return (
            <em className="ml-[1px] mr-[4px]" {...props}>
              {children}
            </em>
          );
        },
        strong({ children, ...props }) {
          return (
            <strong className="mx-[1px]" {...props}>
              {children}
            </strong>
          );
        },

        ul({ children, className, ...props }) {
          const listClass = className?.includes("contains-task-list")
            ? "list-none pl-5"
            : "mt-4 list-disc pl-6";
          return (
            <ul className={listClass} {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol className="mt-4 list-decimal pl-6" {...props}>
              {children}
            </ol>
          );
        },
        li({ children, ...props }) {
          return (
            <li className="pl-2 py-1.5 text-[16px] leading-8 text-neutral-700 dark:text-neutral-300 md:text-[17px]" {...props}>
              {children}
            </li>
          );
        },
        a({ children, ...props }) {
          return (
            <a
              className="text-theme underline-offset-4 transition hover:underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        h1({ children, ...props }) {
          return (
            <h1
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} site-display mt-14 text-[2.05rem] font-semibold leading-tight text-neutral-900 dark:text-white md:text-[2.35rem]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h1>
          );
        },
        h2({ children, ...props }) {
          return (
            <h2
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} site-display mt-12 text-[1.75rem] font-semibold leading-tight text-neutral-900 dark:text-white md:text-[2rem]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h2>
          );
        },
        h3({ children, ...props }) {
          return (
            <h3
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-10 text-[1.32rem] font-semibold leading-snug text-neutral-900 dark:text-white md:text-[1.42rem]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h3>
          );
        },
        h4({ children, ...props }) {
          return (
            <h4
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-8 text-[1.08rem] font-semibold text-neutral-900 dark:text-white md:text-[1.14rem]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h4>
          );
        },
        h5({ children, ...props }) {
          return (
            <h5
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-6 text-base font-semibold text-neutral-900 dark:text-white`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h5>
          );
        },
        h6({ children, ...props }) {
          return (
            <h6
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-neutral-700 dark:text-neutral-200`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h6>
          );
        },
        p({ children, node, ...props }) {
          return (
            <p
              className={
                variant === "moment"
                  ? "mt-2 text-[14px] leading-[1.68] text-neutral-700 dark:text-neutral-300"
                  : "mt-4 text-[16px] leading-[1.95] text-neutral-700 dark:text-neutral-300 md:text-[17px]"
              }
              {...props}
            >
              {children}
            </p>
          );
        },
        hr({ children, ...props }) {
          return <hr className="my-10 border-none site-rule opacity-70" {...props} />;
        },
        table: ({ node, ...props }) => <table className="table" {...props} />,
        th: ({ node, ...props }) => (
          <th className="px-4 py-2 border bg-gray-600" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="px-4 py-2 border" {...props} />
        ),
        sup: ({ children, ...props }) => (
          <sup className="text-xs mr-[4px]" {...props}>
            {children}
          </sup>
        ),
        sub: ({ children, ...props }) => (
          <sub className="text-xs mr-[4px]" {...props}>
            {children}
          </sub>
        ),
        section({ children, ...props }) {
          if (props.hasOwnProperty("data-footnotes")) {
            props.className = `${props.className || ""} mt-8`.trim();
          }
          const modifiedChildren = React.Children.map(children, (child) => {
            if (isValidElement(child) && child.props.node.tagName === "ol") {
              return cloneElement(child, {
                ...child.props,
                className: "list-decimal px-10 text-sm text-[#6B7280]",
              } as React.HTMLAttributes<HTMLParagraphElement>);
            }
            return child;
          });
          return <section {...props}>{modifiedChildren}</section>;
        },
        div({ children, node, ...props }) {
          return <div {...props}>{children}</div>;
        },
      }}
    />
    ), [colorMode, content, rehypePlugins, remarkPlugins, variant])



  const show = (src: string | undefined) => {
    let slidesLocal = slides.current;
    if (!slidesLocal) {
      const parent = contentRef.current;
      if (!parent) return;
      const images = parent.querySelectorAll("img");
      slidesLocal = Array.from(images)
        .map((image) => {
          const url = image.getAttribute("src") || "";
          const filename = url.split("/").pop() || "";
          const alt = image.getAttribute("alt") || "";
          return {
            src: url,
            alt: alt,
            imageFit: "contain" as const,
            download: {
              url: url,
              filename: filename,
            },
          };
        })
        .filter((slide) => slide.src !== "");
      slides.current = (slidesLocal);
    }
    const index = slidesLocal?.findIndex((slide) => slide.src === src) ?? -1;
    setIndex(index);
  };

  return (
    <>
      <div ref={contentRef}>{Content}</div>
      {index >= 0 ? (
        <Suspense fallback={null}>
          <MarkdownLightbox
            index={index}
            slides={slides.current}
            open={index >= 0}
            close={() => setIndex(-1)}
          />
        </Suspense>
      ) : null}
    </>
  );
}
