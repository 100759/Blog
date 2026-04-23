import Editor from '@monaco-editor/react';
import { editor, KeyCode, KeyMod } from 'monaco-editor';
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

type SnippetAction = {
  key: string;
  label: string;
  icon: string;
  insert: (selectedText: string) => string;
};

export function MarkdownEditor({ content, setContent, placeholder = "> Write your content here...", height = "400px", onSave }: MarkdownEditorProps) {
  const { t } = useTranslation();
  const colorMode = useColorMode();
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const isComposingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const [preview, setPreview] = useState<'edit' | 'preview' | 'comparison'>('edit');
  const [uploading, setUploading] = useState(false);
  const { showAlert, AlertUI } = useAlert();

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const snippetActions: SnippetAction[] = [
    {
      key: "heading",
      label: t("writing_editor.snippets.heading"),
      icon: "ri-h-2",
      insert: (selectedText) => `## ${selectedText.trim() || t("writing_editor.snippets.heading_placeholder")}`,
    },
    {
      key: "quote",
      label: t("writing_editor.snippets.quote"),
      icon: "ri-double-quotes-l",
      insert: (selectedText) => {
        const value = selectedText.trim() || t("writing_editor.snippets.quote_placeholder");
        return value
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      },
    },
    {
      key: "list",
      label: t("writing_editor.snippets.list"),
      icon: "ri-list-unordered",
      insert: (selectedText) => {
        const value = selectedText.trim() || t("writing_editor.snippets.list_placeholder");
        return value
          .split("\n")
          .map((line) => `- ${line}`)
          .join("\n");
      },
    },
    {
      key: "code",
      label: t("writing_editor.snippets.code"),
      icon: "ri-code-s-slash-line",
      insert: (selectedText) => `\`\`\`ts\n${selectedText.trim() || t("writing_editor.snippets.code_placeholder")}\n\`\`\``,
    },
    {
      key: "mermaid",
      label: t("writing_editor.snippets.mermaid"),
      icon: "ri-git-branch-line",
      insert: () => "```mermaid\ngraph TD\n  A[Start] --> B[Next step]\n```",
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
    showAlert: (msg: string) => void,
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
      showAlert(error instanceof Error ? error.message : t("upload.failed"));
    }
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = event.clipboardData;
    if (clipboardData.files.length === 1) {
      const editor = editorRef.current;
      if (!editor) return;
      editor.trigger(undefined, "undo", undefined);
      setUploading(true);
      const myfile = clipboardData.files[0] as File;
      const selection = editor.getSelection();
      if (!selection) {
        setUploading(false);
        return;
      }
      void insertImage(myfile, selection, showAlert).finally(() => {
        setUploading(false);
      });
    }
  };

  function UploadImageButton() {
    const uploadRef = useRef<HTMLInputElement>(null);
    
    const upChange = (event: any) => {
      for (let i = 0; i < event.currentTarget.files.length; i++) {
        const file = event.currentTarget.files[i];
        if (file.size > 5 * 1024000) {
          showAlert(t("upload.failed$size", { size: 5 }));
          uploadRef.current!.value = "";
        } else {
          const editor = editorRef.current;
          if (!editor) return;
          const selection = editor.getSelection();
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
        className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-w px-3 py-2 text-sm t-primary transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
      >
        <input
          ref={uploadRef}
          onChange={upChange}
          className="hidden"
          type="file"
          accept="image/gif,image/jpeg,image/jpg,image/png"
        />
        <i className="ri-image-add-line" />
        <span>Image</span>
      </button>
    );
  }

  /* ---------------- Monaco Mount & IME Optimization ---------------- */

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    if (onSaveRef.current) {
      editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
        onSaveRef.current?.();
      });
    }

    editor.onDidCompositionStart(() => {
      isComposingRef.current = true;
    });

    editor.onDidCompositionEnd(() => {
      isComposingRef.current = false;
      setContent(editor.getValue());
    });

    editor.onDidChangeModelContent(() => {
      if (!isComposingRef.current) {
        setContent(editor.getValue());
      }
    });

    editor.onDidBlurEditorText(() => {
      setContent(editor.getValue());
    });
  };

  /* ---------------- synchronization ---------------- */

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const editorValue = model.getValue();

    // Avoid infinite loops & prevent overwriting content being edited
    if (editorValue !== content) {
      editor.setValue(content);
    }
  }, [content]);

  /* ---------------- UI ---------------- */

  return (
    <div className="flex flex-col gap-0 sm:gap-3">
      <FlatInset className="flex flex-wrap items-center gap-2 border-0 border-b border-black/10 rounded-none bg-transparent p-3 dark:border-white/10">
        <FlatTabButton active={preview === 'edit'} onClick={() => setPreview('edit')}> {t("edit")} </FlatTabButton>
        <FlatTabButton active={preview === 'preview'} onClick={() => setPreview('preview')}> {t("preview")} </FlatTabButton>
        <FlatTabButton active={preview === 'comparison'} onClick={() => setPreview('comparison')}> {t("comparison")} </FlatTabButton>
        <div className="hidden h-5 w-px bg-black/10 dark:bg-white/10 lg:block" />
        <div className="flex flex-wrap items-center gap-2">
          {snippetActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => insertSnippet(action.insert)}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-w px-3 py-2 text-sm t-primary transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
              title={action.label}
              aria-label={action.label}
            >
              <i className={action.icon} />
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>
        <div className="flex-grow" />
        {onSave ? (
          <span className="hidden text-xs uppercase tracking-[0.2em] text-neutral-400 lg:inline">
            {t("writing_editor.save_shortcut")}
          </span>
        ) : null}
        <UploadImageButton />
        {uploading &&
          <div className="flex flex-row items-center space-x-2">
            <Loading type="spin" color="#FC466B" height={16} width={16} />
            <span className="text-sm text-neutral-500">{t('uploading')}</span>
          </div>
        }
      </FlatInset>
      <div className={`grid grid-cols-1 gap-0 sm:gap-4 ${preview === 'comparison' ? "lg:grid-cols-2" : ""}`}>
        <div className={"flex min-w-0 flex-col " + (preview === 'preview' ? "hidden" : "")}>
          <div
            className={"relative min-h-0 overflow-hidden rounded-none border-0 bg-w"}
            onDrop={(e) => {
              e.preventDefault();
              const editor = editorRef.current;
              if (!editor) return;
              for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const selection = editor.getSelection();
                if (!selection) return;
                const file = e.dataTransfer.files[i];
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

                // Chinese IME stability key
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
          className={"min-h-0 overflow-y-auto rounded-none border-0 bg-w px-4 py-4 border-t sm:border-none " + (preview === 'edit' ? "hidden" : "")}
          style={{ height: height }}
        >
          <Markdown content={content ? content : placeholder} />
        </div>
      </div>
      <AlertUI />
    </div>
  );
}
