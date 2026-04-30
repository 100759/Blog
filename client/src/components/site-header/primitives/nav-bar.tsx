import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { preloadRoute } from "../../../app/routes";

export function NavBar({
  menu,
  onClick,
  itemClassName = "",
}: {
  menu: boolean;
  onClick?: () => void;
  itemClassName?: string;
}) {
  const [location] = useLocation();
  const { t } = useTranslation();

  return (
    <>
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} icon="ri-file-list-3-line" title={t("article.title")} selected={location === "/" || location.startsWith("/feed")} href="/" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} icon="ri-quill-pen-line" title={t("moments.title")} selected={location === "/moments"} href="/moments" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} icon="ri-rocket-line" title="项目" selected={location === "/projects"} href="/projects" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} icon="ri-dashboard-line" title="作品" selected={location === "/works" || location.startsWith("/works/")} href="/works" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} icon="ri-computer-line" title="旗下网站" selected={location === "/sites"} href="/sites" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} icon="ri-user-received-line" title={t("friends.title")} selected={location === "/friends"} href="/friends" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} icon="ri-user-3-line" title={t("about.title")} selected={location === "/about"} href="/about" />
    </>
  );
}

function NavItem({
  menu,
  title,
  selected,
  href,
  icon,
  when = true,
  onClick,
  itemClassName = "",
}: {
  title: string;
  selected: boolean;
  href: string;
  icon?: string;
  menu?: boolean;
  when?: boolean;
  onClick?: () => void;
  itemClassName?: string;
}) {
  return when ? (
    <Link
      href={href}
      className={
        menu
          ? `group flex min-h-11 cursor-pointer items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium tracking-[-0.01em] transition-all duration-200 ${
              selected
                ? "bg-theme/10 text-theme shadow-[inset_0_0_0_1px_rgb(var(--theme-rgb)/0.14)]"
                : "text-neutral-700 hover:bg-black/[0.035] hover:text-neutral-950 dark:text-neutral-200 dark:hover:bg-white/[0.06] dark:hover:text-white"
            } ${itemClassName}`
          : `hidden cursor-pointer rounded-full px-2 py-3 text-[13px] font-medium transition-colors duration-300 md:block md:px-2.5 md:py-2 ${
              selected
                ? "bg-theme/10 text-theme"
                : "text-neutral-600 hover:text-theme dark:text-neutral-300 dark:hover:text-theme"
            } ${itemClassName}`
      }
      state={{ animate: true }}
      onClick={onClick}
      onMouseEnter={() => preloadRoute(href)}
      onTouchStart={() => preloadRoute(href)}
    >
      {menu && icon ? (
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] text-base transition-colors ${
            selected
              ? "bg-white/75 text-theme shadow-sm shadow-black/5 dark:bg-white/10"
              : "bg-black/[0.035] text-neutral-500 group-hover:text-theme dark:bg-white/[0.06] dark:text-neutral-400"
          }`}
        >
          <i className={icon} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">{title}</span>
      {menu ? (
        <span className={`h-1.5 w-1.5 rounded-full transition-opacity ${selected ? "bg-theme opacity-100" : "bg-neutral-300 opacity-0 group-hover:opacity-100 dark:bg-neutral-600"}`} />
      ) : null}
    </Link>
  ) : null;
}
