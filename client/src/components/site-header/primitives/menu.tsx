import { useEffect, useRef, useState } from "react";
import Popup from "reactjs-popup";
import { useLocation } from "wouter";
import type { Profile } from "../../../state/profile";
import { LanguageSwitch, UserAvatar } from "./action-buttons";
import { NavBar } from "./nav-bar";

export function Menu({ profile, siteName = "FuHeng Blog" }: { profile?: Profile | null; siteName?: string }) {
  const [isOpen, setOpen] = useState(false);
  const [location] = useLocation();
  const previousOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
        previousOverflowRef.current = null;
      }
      return;
    }

    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousOverflowRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  function onClose() {
    setOpen(false);
  }

  return (
    <div className="visible md:hidden flex flex-row items-center">
      <Popup
        arrow={false}
        trigger={
          <div>
            <button
              aria-label="打开导航菜单"
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 flex-row items-center justify-center rounded-full border border-black/8 bg-white/65 text-neutral-600 shadow-sm shadow-black/5 transition-colors hover:border-theme/25 hover:text-theme dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:text-theme"
            >
              <i className="ri-menu-2-line ri-lg" />
            </button>
          </div>
        }
        position="bottom right"
        open={isOpen}
        nested
        onClose={onClose}
        closeOnDocumentClick
        closeOnEscape
        overlayStyle={{ background: "rgba(12, 16, 18, 0.18)", backdropFilter: "blur(5px)" }}
      >
        <div className="mt-3 flex w-[min(88vw,330px)] flex-col overflow-hidden rounded-[24px] border border-black/8 bg-[rgba(255,255,255,0.92)] p-2.5 shadow-2xl shadow-black/14 backdrop-blur-2xl dark:border-white/10 dark:bg-[rgba(24,24,27,0.92)] dark:shadow-black/35">
          <div className="mb-2 flex items-center justify-between gap-3 px-1.5 pt-1">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-theme/80">Menu</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">{siteName}</p>
            </div>
            <div className="flex shrink-0 flex-row items-center gap-1.5">
              <LanguageSwitch />
              <UserAvatar profile={profile} />
              <button
                aria-label="关闭导航菜单"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/65 text-neutral-500 transition-colors hover:text-neutral-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:text-white"
              >
                <i className="ri-close-line" />
              </button>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />
          <nav className="mt-2 grid gap-1">
            <NavBar menu={true} onClick={onClose} />
          </nav>
        </div>
      </Popup>
    </div>
  );
}
