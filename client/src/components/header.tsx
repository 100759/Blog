import { useContext, useEffect, useRef, useState } from "react";
import { ProfileContext } from "../state/profile";
import { Padding } from "./padding";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { getHeaderLayoutDefinition } from "./site-header/layout-registry";
import { normalizeHeaderBehavior, normalizeHeaderLayout } from "./site-header/layout-options";

export function Header({ children }: { children?: React.ReactNode }) {
  const profile = useContext(ProfileContext);
  const siteConfig = useSiteConfig();
  const headerLayout = normalizeHeaderLayout(siteConfig.headerLayout);
  const headerBehavior = normalizeHeaderBehavior(siteConfig.headerBehavior);
  const layoutDefinition = getHeaderLayoutDefinition(headerLayout);
  const [isRevealed, setIsRevealed] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const revealedRef = useRef(true);
  const atTopRef = useRef(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const nearTop = currentScrollY <= 24;
        const nextRevealed = headerBehavior !== "reveal" || nearTop || currentScrollY < lastScrollY;

        if (atTopRef.current !== nearTop) {
          atTopRef.current = nearTop;
          setIsAtTop(nearTop);
        }

        if (revealedRef.current !== nextRevealed) {
          revealedRef.current = nextRevealed;
          setIsRevealed(nextRevealed);
        }

        lastScrollY = currentScrollY;
        frameRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("scroll", onScroll);
    };
  }, [headerBehavior]);

  useEffect(() => {
    const root = document.documentElement;
    const setHeaderScrollOffset = () => {
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const nextHeaderHeight = Math.ceil(headerHeight);
      setHeaderHeight(nextHeaderHeight);
      root.style.setProperty("--header-scroll-offset", `${nextHeaderHeight + 16}px`);
    };

    setHeaderScrollOffset();

    const resizeObserver = new ResizeObserver(() => {
      setHeaderScrollOffset();
    });

    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    window.addEventListener("resize", setHeaderScrollOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", setHeaderScrollOffset);
    };
  }, [headerBehavior, headerLayout]);

  const useTopHeader = layoutDefinition.kind === "top";
  const headerPaddingClassName = headerLayout === "compact" ? "mx-0 mt-0" : "mx-4 mt-4";
  const containerClassName =
    !useTopHeader || headerBehavior === "static"
      ? "relative z-40"
      : `fixed inset-x-0 top-0 z-40 transition-transform duration-300 ${
          headerBehavior === "reveal" && !isRevealed ? "-translate-y-full" : "translate-y-0"
        }`;
  const spacerStyle =
    !useTopHeader || headerBehavior === "static"
      ? undefined
      : { height: `${headerHeight + 16}px` };

  return (
    <>
      {headerLayout === "compact" ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-theme/15 to-white/0 dark:from-theme/20 dark:to-transparent" />
      ) : null}
      <div ref={headerRef} className={containerClassName}>
        <div className="w-screen">
          {headerLayout === "compact" ? (
            <div className="w-full">
              {layoutDefinition.renderMobile({ children, profile, siteConfig, behavior: headerBehavior, isAtTop })}
              {layoutDefinition.renderDesktop({ children, profile, siteConfig, behavior: headerBehavior, isAtTop })}
            </div>
          ) : (
            <Padding className={headerPaddingClassName}>
              <div className="w-full">
                {layoutDefinition.renderMobile({ children, profile, siteConfig, behavior: headerBehavior, isAtTop })}
                {layoutDefinition.renderDesktop({ children, profile, siteConfig, behavior: headerBehavior, isAtTop })}
              </div>
            </Padding>
          )}
        </div>
      </div>
      <div style={spacerStyle} />
    </>
  );
}
