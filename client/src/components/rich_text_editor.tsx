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

const MAX_IMAGE_SIZE_MB = Math.floor(DEFAULT_IMAGE_MAX_FILE_SIZE / 1024 / 1024);

function closestElement(node: Node | null) {
  if (!node) return null;
  return node instanceof Element ? node : node.parentElement;
}

export function RichTextEditor({
  content,
  setContent,
  placeholder = "开始写正文...",
  height = "400px",
  onSave,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const selectedDividerRef = useRef<HTMLElement | null>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectionVersion, setSelectionVersion] = useState(0);
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

  const clearSelectedDivider = () => {
    if (selectedDividerRef.current) {
      selectedDividerRef.current.classList.remove("is-selected");
      selectedDividerRef.current = null;
    }
  };

  const clearSelectedImage = () => {
    if (selectedImageRef.current) {
      selectedImageRef.current.classList.remove("is-selected");
      selectedImageRef.current = null;
    }
    setSelectionVersion((value) => value + 1);
  };

  const clearSelectionMarkers = () => {
    clearSelectedDivider();
    clearSelectedImage();
  };

  const selectDivider = (divider: HTMLElement | null) => {
    if (!divider) return;
    clearSelectionMarkers();
    divider.classList.add("is-selected");
    selectedDividerRef.current = divider;
    focusEditor();
  };

  const selectImage = (image: HTMLImageElement | null) => {
    if (!image) return;
    clearSelectionMarkers();
    image.classList.add("is-selected");
    selectedImageRef.current = image;
    setSelectionVersion((value) => value + 1);
    focusEditor();
  };

  const removeDivider = (divider: HTMLElement | null) => {
    if (!divider) return;
    const next = divider.nextElementSibling;
    divider.remove();
    if (next instanceof HTMLElement && !next.textContent?.trim() && next.tagName === "P") {
      next.remove();
    }
    clearSelectedDivider();
    syncFromDom();
    focusEditor();
  };

  const applyImageSize = (size: "compact" | "default" | "wide") => {
    const image = selectedImageRef.current;
    if (!image) return;
    image.classList.remove("image-size-compact", "image-size-default", "image-size-wide");
    image.classList.add(`image-size-${size}`);
    syncFromDom();
    focusEditor();
    setSelectionVersion((value) => value + 1);
  };

  const removeImage = () => {
    const image = selectedImageRef.current;
    if (!image) return;

    const block = image.closest("p, figure, div");
    if (block instanceof HTMLElement) {
      const blockText = block.textContent?.replace(/\u200B/g, "").trim() || "";
      if (blockText === "" && block.querySelectorAll("img").length === 1) {
        block.remove();
      } else {
        image.remove();
      }
    } else {
      image.remove();
    }

    clearSelectedImage();
    syncFromDom();
    focusEditor();
  };

  const exec = (command: string, value?: string) => {
    clearSelectionMarkers();
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
    clearSelectionMarkers();
    document.execCommand(
      "insertHTML",
      false,
      '<div class="rich-divider" data-rich-divider="true"><hr /></div><p><br></p>',
    );
    syncFromDom();
    focusEditor();
  };

  const insertImageHtml = (html: string) => {
    clearSelectionMarkers();
    document.execCommand("insertHTML", false, html);
    syncFromDom();
    focusEditor();
  };

  const buildImageHtml = (fileName: string, src: string) =>
    `<p><img class="image-size-default" src="${src.replace(/"/g, "&quot;")}" alt="${fileName.replace(/"/g, "&quot;")}" /></p><p><br></p>`;

  const uploadAndInsertImages = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > DEFAULT_IMAGE_MAX_FILE_SIZE) {
          showAlert(`图片不能超过 ${MAX_IMAGE_SIZE_MB}MB`);
          continue;
        }

        const result = await uploadImageFile(file);
        const src = attachImageMetadataToUrl(result.url, {
          blurhash: result.blurhash,
          width: result.width,
          height: result.height,
        });

        insertImageHtml(buildImageHtml(file.name, src));
      }
    } catch (error) {
      console.error(error);
      showAlert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
      setDragging(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (replaceImageInputRef.current) replaceImageInputRef.current.value = "";
    }
  };

  const replaceSelectedImage = async (file: File | null) => {
    const image = selectedImageRef.current;
    if (!image || !file) return;

    if (file.size > DEFAULT_IMAGE_MAX_FILE_SIZE) {
      showAlert(`图片不能超过 ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadImageFile(file);
      const src = attachImageMetadataToUrl(result.url, {
        blurhash: result.blurhash,
        width: result.width,
        height: result.height,
      });

      image.src = src;
      image.alt = file.name;
      syncFromDom();
      focusEditor();
      setSelectionVersion((value) => value + 1);
    } catch (error) {
      console.error(error);
      showAlert(error instanceof Error ? error.message : "图片替换失败");
    } finally {
      setUploading(false);
      if (replaceImageInputRef.current) replaceImageInputRef.current.value = "";
    }
  };

  const tryRemoveAdjacentDivider = (direction: "previousElementSibling" | "nextElementSibling") => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !selection.isCollapsed || !editor) return false;

    const anchor = closestElement(selection.anchorNode);
    if (!anchor) return false;

    const block = anchor.closest("p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, div");
    if (!(block instanceof HTMLElement) || !editor.contains(block)) {
      return false;
    }

    const sibling = block[direction];
    if (sibling instanceof HTMLElement && sibling.classList.contains("rich-divider")) {
      const blockText = block.textContent?.replace(/\u200B/g, "").trim() || "";
      if (blockText === "" && block.querySelector("img, hr") === null) {
        removeDivider(sibling);
        return true;
      }
    }

    return false;
  };

  const buttons = useMemo<ToolbarButton[]>(
    () => [
      { key: "undo", icon: "ri-arrow-go-back-line", label: "撤销", onClick: () => exec("undo") },
      { key: "redo", icon: "ri-arrow-go-forward-line", label: "重做", onClick: () => exec("redo") },
      { key: "bold", icon: "ri-bold", label: "加粗", onClick: () => exec("bold") },
      { key: "italic", icon: "ri-italic", label: "斜体", onClick: () => exec("italic") },
      { key: "underline", icon: "ri-underline", label: "下划线", onClick: () => exec("underline") },
      { key: "h2", icon: "ri-h-2", label: "标题", onClick: () => applyBlock("H2") },
      { key: "h3", icon: "ri-h-3", label: "小标题", onClick: () => applyBlock("H3") },
      { key: "quote", icon: "ri-double-quotes-l", label: "引用", onClick: () => applyBlock("BLOCKQUOTE") },
      { key: "ul", icon: "ri-list-unordered", label: "列表", onClick: () => exec("insertUnorderedList") },
      { key: "ol", icon: "ri-list-ordered-2", label: "编号", onClick: () => exec("insertOrderedList") },
      { key: "clear", icon: "ri-eraser-line", label: "清除格式", onClick: () => exec("removeFormat") },
      { key: "link", icon: "ri-link", label: "链接", onClick: insertLink },
      { key: "divider", icon: "ri-separator", label: "分割线", onClick: insertDivider },
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
      <div className={`rich-editor-shell ${dragging ? "is-dragging" : ""}`}>
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
            aria-label="上传图片"
            title="上传图片"
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
            className="rich-editor-tool rich-editor-tool-primary"
            aria-label="保存"
            title="保存"
          >
            <i className="ri-save-line" />
            <span>保存</span>
          </button>
        </div>

        {selectedImageRef.current ? (
          <div key={selectionVersion} className="rich-editor-image-tools">
            <span className="rich-editor-image-tools-label">图片</span>
            <button type="button" onClick={() => applyImageSize("compact")} className="rich-editor-image-tool">
              小图
            </button>
            <button type="button" onClick={() => applyImageSize("default")} className="rich-editor-image-tool">
              常规
            </button>
            <button type="button" onClick={() => applyImageSize("wide")} className="rich-editor-image-tool">
              宽图
            </button>
            <button
              type="button"
              onClick={() => replaceImageInputRef.current?.click()}
              className="rich-editor-image-tool"
            >
              替换
            </button>
            <button type="button" onClick={removeImage} className="rich-editor-image-tool is-danger">
              删除
            </button>
          </div>
        ) : null}

        <div
          className="rich-editor-frame"
          onDragEnter={(event) => {
            if (Array.from(event.dataTransfer?.types || []).includes("Files")) {
              setDragging(true);
            }
          }}
          onDragOver={(event) => {
            if (Array.from(event.dataTransfer?.types || []).includes("Files")) {
              event.preventDefault();
              setDragging(true);
            }
          }}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
            void uploadAndInsertImages(files);
          }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="rich-editor-surface"
            style={{ minHeight: height }}
            data-placeholder={placeholder}
            onInput={() => {
              clearSelectedDivider();
              syncFromDom();
            }}
            onBlur={syncFromDom}
            onMouseDown={(event) => {
              const target = event.target as HTMLElement;
              const divider = target.closest(".rich-divider");
              const image = target.closest("img");

              if (divider instanceof HTMLElement) {
                event.preventDefault();
                selectDivider(divider);
                return;
              }

              if (image instanceof HTMLImageElement) {
                event.preventDefault();
                selectImage(image);
                return;
              }

              clearSelectionMarkers();
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                onSave?.();
                return;
              }

              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
                event.preventDefault();
                exec(event.shiftKey ? "redo" : "undo");
                return;
              }

              if ((event.key === "Backspace" || event.key === "Delete") && selectedDividerRef.current) {
                event.preventDefault();
                removeDivider(selectedDividerRef.current);
                return;
              }

              if ((event.key === "Backspace" || event.key === "Delete") && selectedImageRef.current) {
                event.preventDefault();
                removeImage();
                return;
              }

              if (event.key === "Backspace" && tryRemoveAdjacentDivider("previousElementSibling")) {
                event.preventDefault();
                return;
              }

              if (event.key === "Delete" && tryRemoveAdjacentDivider("nextElementSibling")) {
                event.preventDefault();
                return;
              }

              if (event.key === "Tab") {
                event.preventDefault();
                document.execCommand(event.shiftKey ? "outdent" : "indent");
                syncFromDom();
              }
            }}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
              if (files.length > 0) {
                event.preventDefault();
                void uploadAndInsertImages(files);
                return;
              }

              const html = event.clipboardData.getData("text/html");
              if (html) {
                event.preventDefault();
                document.execCommand("insertHTML", false, normalizeRichHtml(html));
                syncFromDom();
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

          {dragging ? (
            <div className="rich-editor-dropzone">
              <i className="ri-upload-cloud-2-line" />
              <p>松手即可上传图片</p>
              <span>支持拖拽、粘贴或点击工具栏上传</span>
            </div>
          ) : null}

          <p className="rich-editor-hint">
            支持拖拽上传、粘贴图片、撤销重做。分割线和图片点一下就能选中后删除。
          </p>

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
            void uploadAndInsertImages(Array.from(event.currentTarget.files || []));
          }}
        />

        <input
          ref={replaceImageInputRef}
          type="file"
          accept="image/gif,image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            void replaceSelectedImage(event.currentTarget.files?.[0] || null);
          }}
        />
      </div>
      <AlertUI />
    </>
  );
}
