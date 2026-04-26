import type { ComponentType, ReactNode } from "react";
import { lazy, Suspense, useContext, useEffect } from "react";
import type { DefaultParams, PathPattern } from "wouter";
import { Route, Switch } from "wouter";
import { AdminLayout } from "../components/admin-layout";
import Footer from "../components/footer";
import { Header } from "../components/header";
import { Padding } from "../components/padding";
import { getHeaderLayoutDefinition } from "../components/site-header/layout-registry";
import { Tips, TipsPage } from "../components/tips";
import useTableOfContents from "../hooks/useTableOfContents";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { ErrorPage } from "../page/error";
import { ProfileContext } from "../state/profile";
import { tryInt } from "../utils/int";
import { useTranslation } from "react-i18next";

const FeedsPage = lazyNamed(() => import("../page/feeds"), "FeedsPage");
const TimelinePage = lazyNamed(() => import("../page/timeline"), "TimelinePage");
const MomentsPage = lazyNamed(() => import("../page/moments"), "MomentsPage");
const FriendsPage = lazyNamed(() => import("../page/friends"), "FriendsPage");
const WorksPage = lazyNamed(() => import("../page/works"), "WorksPage");
const WorkDetailPage = lazyNamed(() => import("../page/works"), "WorkDetailPage") as ComponentType<{ slug: string }>;
const SitesPage = lazyNamed(() => import("../page/sites"), "SitesPage");
const SearchPage = lazyNamed(() => import("../page/search"), "SearchPage");
const Settings = lazyNamed(() => import("../page/settings"), "Settings");
const HealthPage = lazyNamed(() => import("../page/health"), "HealthPage");
const QueueStatusPage = lazyNamed(() => import("../page/queue-status"), "QueueStatusPage");
const CompatTasksPage = lazyNamed(() => import("../page/compat-tasks"), "CompatTasksPage");
const WritingPage = lazyNamed(() => import("../page/writing"), "WritingPage");
const CallbackPage = lazyNamed(() => import("../page/callback"), "CallbackPage");
const LoginPage = lazyNamed(() => import("../page/login"), "LoginPage");
const ProfilePage = lazyNamed(() => import("../page/profile"), "ProfilePage");
const FeedPage = lazyNamed(() => import("../page/feed"), "FeedPage");
const TOCHeader = lazyNamed(() => import("../page/feed"), "TOCHeader");

const DYNAMIC_IMPORT_RELOAD_KEY = "rin:dynamic-import-reload";
const preloadedRoutes = new Set<string>();
const routePreloaders = {
  "/timeline": () => import("../page/timeline"),
  "/moments": () => import("../page/moments"),
  "/friends": () => import("../page/friends"),
  "/works": () => import("../page/works"),
  "/sites": () => import("../page/sites"),
  "/search": () => import("../page/search"),
  "/feed": () => import("../page/feed"),
} satisfies Record<string, () => Promise<unknown>>;

function isDynamicImportError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Failed to fetch dynamically imported module|Importing a module script failed/i.test(error.message);
}

function lazyNamed<T extends Record<string, ComponentType<any>>>(
  loader: () => Promise<T>,
  key: keyof T,
) {
  return lazy(async () => {
    try {
      const module = await loader();

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_KEY);
      }

      return { default: module[key] };
    } catch (error) {
      if (typeof window !== "undefined" && isDynamicImportError(error)) {
        const reloaded = window.sessionStorage.getItem(DYNAMIC_IMPORT_RELOAD_KEY);

        if (!reloaded) {
          window.sessionStorage.setItem(DYNAMIC_IMPORT_RELOAD_KEY, "1");
          window.location.reload();
          return new Promise<never>(() => {});
        }

        window.sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_KEY);
      }

      throw error;
    }
  });
}

function RoutePending() {
  return (
    <div className="wauto py-10">
      <div className="site-panel rounded-[28px] px-6 py-10 text-center text-sm text-neutral-500 dark:text-neutral-300">
        Loading...
      </div>
    </div>
  );
}

export function preloadRoute(pathname: string) {
  const matchedEntry = Object.entries(routePreloaders).find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!matchedEntry) {
    return;
  }

  const [prefix, preload] = matchedEntry;
  if (preloadedRoutes.has(prefix)) {
    return;
  }

  preloadedRoutes.add(prefix);
  void preload().catch(() => {
    preloadedRoutes.delete(prefix);
  });
}

export function AppRoutes() {
  const { t } = useTranslation();

  useEffect(() => {
    const preloadCommonRoutes = () => {
      preloadRoute("/timeline");
      preloadRoute("/moments");
      preloadRoute("/friends");
      preloadRoute("/works");
      preloadRoute("/sites");
    };

    if (typeof window === "undefined") {
      return;
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        preloadCommonRoutes();
      }, { timeout: 1500 });

      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = globalThis.setTimeout(preloadCommonRoutes, 800);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, []);

  return (
    <Switch>
      <AppRoute path="/">
        <FeedsPage />
      </AppRoute>

      <AppRoute path="/timeline">
        <TimelinePage />
      </AppRoute>

      <AppRoute path="/moments">
        <MomentsPage />
      </AppRoute>

      <AppRoute path="/friends">
        <FriendsPage />
      </AppRoute>

      <AppRoute path="/works/:slug">
        {(params) => <WorkDetailPage slug={params.slug || ""} />}
      </AppRoute>

      <AppRoute path="/works">
        <WorksPage />
      </AppRoute>

      <AppRoute path="/sites">
        <SitesPage />
      </AppRoute>

      <AppRoute path="/search/:keyword">
        {(params) => <SearchPage keyword={params.keyword || ""} />}
      </AppRoute>

      <AdminRoute path="/admin/settings" requirePermission title={t("settings.title")} description={t("admin.settings_description")}>
        <Settings />
      </AdminRoute>

      <AdminRoute path="/admin/health" requirePermission title={t("health.title")} description={t("admin.health_description")}>
        <HealthPage />
      </AdminRoute>

      <AdminRoute path="/admin/queue-status" requirePermission title={t("queue_status.title")} description={t("admin.queue_status_description")}>
        <QueueStatusPage />
      </AdminRoute>

      <AdminRoute path="/admin/compat-tasks" requirePermission title={t("compat_tasks.title")} description={t("admin.compat_tasks_description")}>
        <CompatTasksPage />
      </AdminRoute>

      <AdminRoute path="/admin/writing" requirePermission title={t("writing")} description={t("admin.writing_description")} compact>
        <WritingPage />
      </AdminRoute>

      <AdminRoute path="/admin/writing/:id" requirePermission title={t("writing")} description={t("admin.writing_description")} compact>
        {({ id }) => <WritingPage id={tryInt(0, id)} />}
      </AdminRoute>

      <AppRoute path="/callback">
        <CallbackPage />
      </AppRoute>

      <AppRoute path="/login">
        <LoginPage />
      </AppRoute>

      <AppRoute path="/profile">
        <ProfilePage />
      </AppRoute>

      <TocRoute path="/feed/:id">
        {(params, toc, cleanup) => <FeedPage id={params.id || ""} TOC={toc} clean={cleanup} />}
      </TocRoute>

      <TocRoute path="/:alias">
        {(params, toc, cleanup) => <FeedPage id={params.alias || ""} TOC={toc} clean={cleanup} />}
      </TocRoute>

      <AppRoute path="/user/github">
        <TipsPage>
          <Tips value={t("error.api_url")} type="error" />
        </TipsPage>
      </AppRoute>

      <AppRoute path="/*/user/github">
        <TipsPage>
          <Tips value={t("error.api_url_slash")} type="error" />
        </TipsPage>
      </AppRoute>

      <AppRoute path="/user/github/callback">
        <TipsPage>
          <Tips value={t("error.github_callback")} type="error" />
        </TipsPage>
      </AppRoute>

      <AppRoute>
        <ErrorPage error={t("error.not_found")} />
      </AppRoute>
    </Switch>
  );
}

function AppRoute({
  path,
  children,
  headerComponent,
  paddingClassName,
  requirePermission,
}: {
  path?: PathPattern;
  children: ReactNode | ((params: DefaultParams) => ReactNode);
  headerComponent?: ReactNode;
  paddingClassName?: string;
  requirePermission?: boolean;
}) {
  const profile = useContext(ProfileContext);
  const siteConfig = useSiteConfig();
  const { t } = useTranslation();

  const content =
    requirePermission && !profile?.permission ? <ErrorPage error={t("error.permission_denied")} /> : children;

  return (
    <Route path={path}>
      {(params) => {
        const resolvedContent = typeof content === "function" ? content(params) : content;
        const layoutDefinition = getHeaderLayoutDefinition(siteConfig.headerLayout);

        return (
          <div className="site-shell">
            {layoutDefinition.renderRouteShell({
              header: (
                <Suspense fallback={<Header />}>
                  <Header>{headerComponent}</Header>
                </Suspense>
              ),
              content: (
                <Padding className={paddingClassName}>
                  <Suspense fallback={<RoutePending />}>{resolvedContent}</Suspense>
                </Padding>
              ),
              footer: <Footer />,
              paddingClassName,
            })}
          </div>
        );
      }}
    </Route>
  );
}

function AdminRoute({
  path,
  children,
  requirePermission,
  title,
  description,
  compact,
}: {
  path: PathPattern;
  children: ReactNode | ((params: DefaultParams) => ReactNode);
  requirePermission?: boolean;
  title: string;
  description: string;
  compact?: boolean;
}) {
  const profile = useContext(ProfileContext);
  const { t } = useTranslation();
  const content =
    requirePermission && !profile?.permission ? <ErrorPage error={t("error.permission_denied")} /> : children;

  return (
    <Route path={path}>
      {(params) => (
        <AdminLayout title={title} description={description} compact={compact}>
          <Suspense fallback={<RoutePending />}>
            {typeof content === "function" ? content(params) : content}
          </Suspense>
        </AdminLayout>
      )}
    </Route>
  );
}

function TocRoute({
  path,
  children,
}: {
  path: PathPattern;
  children: (params: DefaultParams, toc: () => JSX.Element, cleanup: (id: string) => void) => ReactNode;
}) {
  const { TOC, cleanup } = useTableOfContents(".toc-content");

  return (
    <AppRoute path={path} headerComponent={<TOCHeader TOC={TOC} />} paddingClassName="mx-4">
      {(params) => children(params, TOC, cleanup)}
    </AppRoute>
  );
}
