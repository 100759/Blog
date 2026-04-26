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
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} title={t("article.title")} selected={location === "/" || location.startsWith("/feed")} href="/" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} title={t("moments.title")} selected={location === "/moments"} href="/moments" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} title="作品" selected={location === "/works" || location.startsWith("/works/")} href="/works" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} title="旗下网站" selected={location === "/sites"} href="/sites" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} title={t("friends.title")} selected={location === "/friends"} href="/friends" />
      <NavItem menu={menu} onClick={onClick} itemClassName={itemClassName} title={t("about.title")} selected={location === "/about"} href="/about" />
    </>
  );
}

function NavItem({
  menu,
  title,
  selected,
  href,
  when = true,
  onClick,
  itemClassName = "",
}: {
  title: string;
  selected: boolean;
  href: string;
  menu?: boolean;
  when?: boolean;
  onClick?: () => void;
  itemClassName?: string;
}) {
  return when ? (
    <Link
      href={href}
      className={`${menu ? "" : "hidden"} md:block cursor-pointer rounded-full px-2 py-3 text-[13px] font-medium transition-colors duration-300 md:px-2.5 md:py-2 ${
        selected
          ? "bg-theme/10 text-theme"
          : "text-neutral-600 hover:text-theme dark:text-neutral-300 dark:hover:text-theme"
      } ${itemClassName}`}
      state={{ animate: true }}
      onClick={onClick}
      onMouseEnter={() => preloadRoute(href)}
      onTouchStart={() => preloadRoute(href)}
    >
      {title}
    </Link>
  ) : null;
}
