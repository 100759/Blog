import { useEffect, useMemo, useRef, useState } from "react";
import Loading from "react-loading";
import { useAlert } from "./dialog";
import { attachImageMetadataToUrl, DEFAULT_IMAGE_MAX_FILE_SIZE, uploadImageFile } from "../utils/image-upload";
import { normalizeRichHtml } from "../utils/rich-content";

interface RichTextEditorProps {
  content: string;
  setContent: (content: string) => void;
  placeholder?: string;
  height?: string;
  onSave?: () => void;
}

type ToolbarButton = {
  key: string;
  icon: string;
  label: string;
  onClick: () => void;
};

export function RichTextEditor({
  content,
  setContent,
  placeholder = "开始写内容...",
  height = "400px",
  onSave,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { showAlert, AlertUI } = useAlert();

  const syncFromDom = () => {
    const editor = editorRef.current;
    if (!editor) return;
    setContent(normalizeRichHtml(editor.innerHTML));
  };

  const focusEditor = () => {
    window.setTimeout(() => {
      editorRef.current?.focus();
    }, 0);
  };

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    syncFromDom();
    focusEditor();
  };

  const applyBlock = (tagName: "P" | "H2" | "H3" | "BLOCKQUOTE") => {
    exec("formatBlock", tagName);
  };

  const insertLink = () => {
    const url = window.prompt("输入链接地址");
    if (!url) return;
    exec("createLink", url.trim());
  };

  const insertDivider = () => {
    exec("insertHorizontalRule");
  };

  const insertImageHtml = (html: string) => {
    document.execCommand("insertHTML", false, html);
    syncFromDom();
    focusEditor();
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > DEFAULT_IMAGE_MAX_FILE_SIZE) {
          showAlert(`图片不能超过 ${Math.floor(DEFAULT_IMAGE_MAX_FILE_SIZE / 1024 / 1024)}MB`);
          continue;
        }

        const result = await uploadImageFile(file);
        const src = attachImageMetadataToUrl(result.url, {
          blurhash: result.blurhash,
          width: result.width,
          height: result.height,
        });

        insertImageHtml(
          `<p><img src="${src.replace(/"/g, "&quot;")}" alt="${file.name.replace(/"/g, "&quot;")}" /></p><p><br></p>`,
        );
      }
    } catch (error) {
      console.error(error);
      showAlert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const buttons = useMemo<ToolbarButton[]>(
    () => [
      { key: "bold", icon: "ri-bold", label: "加粗", onClick: () => exec("bold") },
      { key: "italic", icon: "ri-italic", label: "斜体", onClick: () => exec("italic") },
      { key: "underline", icon: "ri-underline", label: "下划线", onClick: () => exec("underline") },
      { key: "h2", icon: "ri-h-2", label: "标题", onClick: () => applyBlock("H2") },
      { key: "h3", icon: "ri-h-3", label: "小标题", onClick: () => applyBlock("H3") },
      { key: "quote", icon: "ri-double-quotes-l", label: "引用", onClick: () => applyBlock("BLOCKQUOTE") },
      { key: "ul", icon: "ri-list-unordered", label: "列表", onClick: () => exec("insertUnorderedList") },
      { key: "ol", icon: "ri-list-ordered-2", label: "编号", onClick: () => exec("insertOrderedList") },
      { key: "link", icon: "ri-link", label: "链接", onClick: insertLink },
      { key: "divider", icon: "ri-separator", label: "分隔线", onClick: insertDivider },
    ],
    [],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextHtml = normalizeRichHtml(content);
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [content]);

  return (
    <>
      <div className="rich-editor-shell">
        <div className="rich-editor-toolbar">
          {buttons.map((button) => (
            <button
              key={button.key}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={button.onClick}
              className="rich-editor-tool"
              aria-label={button.label}
              title={button.label}
            >
              <i className={button.icon} />
              <span>{button.label}</span>
            </button>
          ))}

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => imageInputRef.current?.click()}
            className="rich-editor-tool"
            aria-label="插入图片"
            title="插入图片"
          >
            <i className="ri-image-add-line" />
            <span>图片</span>
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyBlock("P")}
            className="rich-editor-tool"
            aria-label="正文"
            title="正文"
          >
            <i className="ri-text" />
            <span>正文</span>
          </button>

          <div className="rich-editor-toolbar-spacer" />

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onSave}
            className="rich-editor-tool"
            aria-label="保存"
            title="保存"
          >
            <i className="ri-save-line" />
            <span>保存</span>
          </button>
        </div>

        <div className="rich-editor-frame">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="rich-editor-surface"
            style={{ minHeight: height }}
            data-placeholder={placeholder}
            onInput={syncFromDom}
            onBlur={syncFromDom}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                onSave?.();
              }
            }}
            onPaste={(event) => {
              const files = event.clipboardData.files;
              if (files.length > 0) {
                event.preventDefault();
                void handleImageFiles(files);
                return;
              }

              const text = event.clipboardData.getData("text/plain");
              if (text) {
                event.preventDefault();
                document.execCommand("insertText", false, text);
                syncFromDom();
              }
            }}
          />

          {uploading ? (
            <div className="rich-editor-uploading">
              <Loading type="spin" height={18} width={18} />
              <span>图片上传中...</span>
            </div>
          ) : null}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/gif,image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          multiple
          onChange={(event) => {
            void handleImageFiles(event.currentTarget.files);
          }}
        />
      </div>
      <AlertUI />
    </>
  );
}
