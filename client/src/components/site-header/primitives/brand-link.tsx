import { Link } from "wouter";
import type { SiteHeaderConfig } from "../shared";

export function BrandLink({
  siteConfig,
  className = "",
  avatarClassName,
  compact = false,
  showAvatar = true,
  showDescription = true,
  titleClassName = "",
  descriptionClassName = "",
}: {
  siteConfig: SiteHeaderConfig;
  className?: string;
  avatarClassName?: string;
  compact?: boolean;
  showAvatar?: boolean;
  showDescription?: boolean;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <Link aria-label="home" href="/" className={className}>
      {showAvatar && siteConfig.avatar ? (
        <img
          src={siteConfig.avatar}
          alt="Avatar"
          className={
            avatarClassName ||
            (compact
              ? "h-10 w-10 rounded-[14px] border border-black/10 object-cover shadow-[0_10px_24px_rgba(25,18,14,0.12)] dark:border-white/10 dark:shadow-black/20"
              : "h-12 w-12 rounded-[18px] border border-black/10 object-cover shadow-[0_12px_28px_rgba(25,18,14,0.12)] dark:border-white/10 dark:shadow-black/20")
          }
        />
      ) : null}
      <div className={`${showAvatar ? (compact ? "mx-2" : "mx-4") : ""} flex flex-col justify-center items-start`}>
        <p
          className={`${compact ? "text-sm font-bold t-primary" : "text-xl font-bold dark:text-white"} site-display ${titleClassName}`}
        >
          {siteConfig.name}
        </p>
        {showDescription ? <p className={`text-xs text-neutral-500 ${descriptionClassName}`}>{siteConfig.description}</p> : null}
      </div>
    </Link>
  );
}
