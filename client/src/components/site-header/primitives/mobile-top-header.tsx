import type { Profile } from "../../../state/profile";
import { BrandLink } from "./brand-link";
import { HeaderActions } from "./action-buttons";
import { Menu } from "./menu";
import { NavBar } from "./nav-bar";
import type { SiteHeaderConfig } from "../shared";

export function MobileTopHeader({
  children,
  profile,
  siteConfig,
  isAtTop,
  showDescription = false,
  showInlineNav = false,
  avatarClassName,
}: {
  children?: React.ReactNode;
  profile?: Profile | null;
  siteConfig: SiteHeaderConfig;
  isAtTop: boolean;
  showDescription?: boolean;
  showInlineNav?: boolean;
  avatarClassName?: string;
}) {
  return (
    <div className="lg:hidden">
      <div
        className={`site-panel flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-1.5 ${
          isAtTop ? "bg-white/58 shadow-none dark:bg-[rgba(20,18,19,0.62)]" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <BrandLink
            siteConfig={siteConfig}
            compact
            showDescription={showDescription}
            className="min-w-0 flex flex-row items-center"
            avatarClassName={avatarClassName}
          />
          {showInlineNav ? (
            <div className="hidden min-w-0 flex-1 items-center sm:flex">
              <div className="flex min-w-max items-center overflow-x-auto">
                <NavBar menu={false} itemClassName="px-0 py-1 pr-2 text-[12px]" />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {children ? <div className="flex items-center text-sm t-primary">{children}</div> : null}
          <div className="hidden md:flex lg:hidden">
            <HeaderActions profile={profile} plain className="flex flex-row items-center gap-1" />
          </div>
          <Menu profile={profile} />
        </div>
      </div>
    </div>
  );
}
