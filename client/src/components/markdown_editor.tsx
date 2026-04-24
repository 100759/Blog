import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Loading from 'react-loading';
import { FlatInset, FlatTabButton } from "@rin/ui";
import { useAlert } from "./dialog";
import { useColorMode } from "../utils/darkModeUtils";
import { buildMarkdownImage, uploadImageFile } from "../utils/image-upload";
import { Markdown } from "./markdown";

interface MarkdownEditorProps {
  content: string;
  setContent: (content: string) => void;
  placeholder?: string;
  height?: string;
  onSave?: () => void;
}

type EditorAction = {
  key: string;
  label: string;
  icon: string;
  apply: (selectedText: string) => string;
};

function prefixLines(value: string, fallback: string, prefixer: (line: string, index: number) => string) {
  const lines = (value.trim() || fallback)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => prefixer(line, index)).join("\n");
}

export function MarkdownEditor({
  content,
  setContent,
  placeholder,
  height = "400px",
  onSave,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const colorMode = useColorMode();
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const isComposingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const [preview, setPreview] = useState<'edit' | 'preview' | 'comparison'>('edit');
  const [uploading, setUploading] = useState(false);
  const { showAlert, AlertUI } = useAlert();
  const previewPlaceholder = placeholder ?? t("writing_editor.placeholder");

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const quickActions: EditorAction[] = [
    {
      key: "bold",
      label: t("writing_editor.toolbar.bold"),
      icon: "ri-bold",
      apply: (selectedText) => `**${selectedText.trim() || t("writing_editor.toolbar.bold_placeholder")}**`,
    },
    {
      key: "heading",
      label: t("writing_editor.toolbar.heading"),
      icon: "ri-h-2",
      apply: (selectedText) => `## ${selectedText.trim() || t("writing_editor.toolbar.heading_placeholder")}`,
    },
    {
      key: "list",
      label: t("writing_editor.toolbar.list"),
      icon: "ri-list-unordered",
      apply: (selectedText) =>
        prefixLines(selectedText, t("writing_editor.toolbar.list_placeholder"), (line) => `- ${line}`),
    },
    {
      key: "numbered",
      label: t("writing_editor.toolbar.numbered"),
      icon: "ri-list-ordered-2",
      apply: (selectedText) =>
        prefixLines(
          selectedText,
          t("writing_editor.toolbar.numbered_placeholder"),
          (line, index) => `${index + 1}. ${line}`,
        ),
    },
    {
      key: "quote",
      label: t("writing_editor.toolbar.quote"),
      icon: "ri-double-quotes-l",
      apply: (selectedText) =>
        prefixLines(selectedText, t("writing_editor.toolbar.quote_placeholder"), (line) => `> ${line}`),
    },
    {
      key: "link",
      label: t("writing_editor.toolbar.link"),
      icon: "ri-link",
      apply: (selectedText) => {
        const value = selectedText.trim() || t("writing_editor.toolbar.link_placeholder");
        return `[${value}](https://)`;
      },
    },
    {
      key: "divider",
      label: t("writing_editor.toolbar.divider"),
      icon: "ri-separator",
      apply: () => "\n---\n",
    },
  ];

  const advancedActions: EditorAction[] = [
    {
      key: "outline",
      label: t("writing_editor.toolbar.outline"),
      icon: "ri-layout-top-line",
      apply: () =>
        [
          `## ${t("writing_editor.toolbar.outline_sections.opening")}`,
          "",
          `## ${t("writing_editor.toolbar.outline_sections.points")}`,
          "",
          `## ${t("writing_editor.toolbar.outline_sections.examples")}`,
          "",
          `## ${t("writing_editor.toolbar.outline_sections.closing")}`,
          "",
        ].join("\n"),
    },
    {
      key: "code",
      label: t("writing_editor.toolbar.code"),
      icon: "ri-code-s-slash-line",
      apply: (selectedText) => `\`\`\`text\n${selectedText.trim() || t("writing_editor.toolbar.code_placeholder")}\n\`\`\``,
    },
    {
      key: "mermaid",
      label: t("writing_editor.toolbar.mermaid"),
      icon: "ri-git-branch-line",
      apply: () =>
        [
          "```mermaid",
          "graph TD",
          "  A[Start] --> B[Key point]",
          "  B --> C[Example]",
          "  C --> D[Conclusion]",
          "```",
        ].join("\n"),
    },
  ];

  function insertSnippet(buildText: (selectedText: string) => string) {
    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    const selection = editorInstance.getSelection();
    const model = editorInstance.getModel();
    if (!selection || !model) return;

    const selectedText = model.getValueInRange(selection);
    const text = buildText(selectedText);

    editorInstance.executeEdits("markdown-snippet", [{ range: selection, text }]);
    editorInstance.focus();
    setContent(editorInstance.getValue());
  }

  async function insertImage(
    file: File,
    range: NonNullable<ReturnType<editor.IStandaloneCodeEditor["getSelection"]>>,
    showAlertMessage: (msg: string) => void,
  ) {
    try {
      const result = await uploadImageFile(file);
      const editorInstance = editorRef.current;
      if (!editorInstance) return;
      editorInstance.executeEdits(undefined, [{
        range,
        text: buildMarkdownImage(file.name, result.url, {
          blurhash: result.blurhash,
          width: result.width,
          height: result.height,
        }),
      }]);
    } catch (error) {
      console.error(error);
      showAlertMessage(error instanceof Error ? error.message : t("upload.failed"));
    }
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = event.clipboardData;
    if (clipboardData.files.length === 1) {
      const editorInstance = editorRef.current;
      if (!editorInstance) return;
      editorInstance.trigger(undefined, "undo", undefined);
      setUploading(true);
      const file = clipboardData.files[0] as File;
      const selection = editorInstance.getSelection();
      if (!selection) {
        setUploading(false);
        return;
      }
      void insertImage(file, selection, showAlert).finally(() => {
        setUploading(false);
      });
    }
  };

  function UploadImageButton() {
    const uploadRef = useRef<HTMLInputElement>(null);

    const upChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024000) {
          showAlert(t("upload.failed$size", { size: 5 }));
          if (uploadRef.current) {
            uploadRef.current.value = "";
          }
        } else {
          const editorInstance = editorRef.current;
          if (!editorInstance) return;
          const selection = editorInstance.getSelection();
          if (!selection) return;
          setUploading(true);
          void insertImage(file, selection, showAlert).finally(() => {
            setUploading(false);
          });
        }
      }
    };

    return (
      <button
        type="button"
        onClick={() => uploadRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-w px-3 py-1.5 text-sm t-primary transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
      >
        <input
          ref={uploadRef}
          onChange={upChange}
          className="hidden"
          type="file"
          accept="image/gif,image/jpeg,image/jpg,image/png"
        />
        <i className="ri-image-add-line" />
        <span>{t("writing_editor.toolbar.image")}</span>
      </button>
    );
  }

  const handleEditorMount = (
    editorInstance: editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
  ) => {
    editorRef.current = editorInstance;

    if (onSaveRef.current) {
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSaveRef.current?.();
      });
    }

    editorInstance.onDidCompositionStart(() => {
      isComposingRef.current = true;
    });

    editorInstance.onDidCompositionEnd(() => {
      isComposingRef.current = false;
      setContent(editorInstance.getValue());
    });

    editorInstance.onDidChangeModelContent(() => {
      if (!isComposingRef.current) {
        setContent(editorInstance.getValue());
      }
    });

    editorInstance.onDidBlurEditorText(() => {
      setContent(editorInstance.getValue());
    });
  };

  useEffect(() => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const editorValue = model.getValue();

    if (editorValue !== content) {
      editorInstance.setValue(content);
    }
  }, [content]);

  return (
    <div className="flex flex-col gap-0 sm:gap-3">
      <FlatInset className="flex flex-col gap-3 border-0 border-b border-black/10 rounded-none bg-transparent p-3 sm:p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <FlatTabButton active={preview === 'edit'} onClick={() => setPreview('edit')}>{t("edit")}</FlatTabButton>
          <FlatTabButton active={preview === 'preview'} onClick={() => setPreview('preview')}>{t("preview")}</FlatTabButton>
          <FlatTabButton active={preview === 'comparison'} onClick={() => setPreview('comparison')}>{t("comparison")}</FlatTabButton>
          <div className="flex-grow" />
          {onSave ? (
            <span className="hidden text-xs uppercase tracking-[0.18em] text-neutral-400 xl:inline">
              {t("writing_editor.save_shortcut")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-neutral-400">{t("writing_editor.toolbar.common")}</span>
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => insertSnippet(action.apply)}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-w px-3 py-1.5 text-sm t-primary transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
              title={action.label}
              aria-label={action.label}
            >
              <i className={action.icon} />
              <span className="hidden md:inline">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-neutral-400">{t("writing_editor.toolbar.advanced")}</span>
          {advancedActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => insertSnippet(action.apply)}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-w px-3 py-1.5 text-sm t-primary transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
              title={action.label}
              aria-label={action.label}
            >
              <i className={action.icon} />
              <span className="hidden md:inline">{action.label}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <UploadImageButton />
            {uploading ? (
              <div className="flex flex-row items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm text-neutral-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-300">
                <Loading type="spin" color="#FC466B" height={14} width={14} />
                <span>{t('uploading')}</span>
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
          {t("writing_editor.toolbar.help")}
        </p>
      </FlatInset>
      <div className={`grid grid-cols-1 gap-0 sm:gap-4 ${preview === 'comparison' ? "lg:grid-cols-2" : ""}`}>
        <div className={"flex min-w-0 flex-col " + (preview === 'preview' ? "hidden" : "")}>
          <div className="border-b border-black/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-neutral-400 dark:border-white/10">
            {t("edit")}
          </div>
          <div
            className={"relative min-h-0 overflow-hidden rounded-none border-0 bg-w"}
            onDrop={(event) => {
              event.preventDefault();
              const editorInstance = editorRef.current;
              if (!editorInstance) return;
              for (let i = 0; i < event.dataTransfer.files.length; i++) {
                const selection = editorInstance.getSelection();
                if (!selection) return;
                const file = event.dataTransfer.files[i];
                setUploading(true);
                void insertImage(file, selection, showAlert).finally(() => {
                  setUploading(false);
                });
              }
            }}
            onPaste={handlePaste}
          >
            <Editor
              onMount={handleEditorMount}
              height={height}
              defaultLanguage="markdown"
              defaultValue={content}
              theme={colorMode === "dark" ? "vs-dark" : "light"}
              options={{
                wordWrap: "on",
                fontFamily: "Sarasa Mono SC, JetBrains Mono, monospace",
                fontLigatures: false,
                letterSpacing: 0,
                fontSize: 14,
                lineNumbers: "off",
                accessibilitySupport: "off",
                unicodeHighlight: { ambiguousCharacters: false },
                renderWhitespace: "none",
                renderControlCharacters: false,
                smoothScrolling: false,
                dragAndDrop: true,
                pasteAs: { enabled: false },
              }}
            />
          </div>
        </div>
        <div
          className={"min-h-0 overflow-y-auto rounded-none border-0 bg-w " + (preview === 'edit' ? "hidden" : "")}
          style={{ height: height }}
        >
          <div className="border-b border-black/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-neutral-400 dark:border-white/10">
            {t("preview")}
          </div>
          <div className="px-4 py-4">
            <Markdown content={content ? content : previewPlaceholder} />
          </div>
        </div>
      </div>
      <AlertUI />
    </div>
  );
}
