import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useSiteConfig } from "../hooks/useSiteConfig";

const PROJECTS_ENDPOINT = "https://studio.fuheng.vip/api/public/projects";

type StudioProject = {
    id: number;
    name: string;
    description: string;
    type: "opensource" | "self" | string;
    icon?: string | null;
    logo_url?: string | null;
    image_url?: string | null;
    status?: string | null;
    github_url?: string | null;
    deploy_url?: string | null;
    domain?: string | null;
    tech_stack?: string[];
    tags?: string[];
    updated_at?: string;
    created_at?: string;
};

type ProjectsResponse = {
    ok: boolean;
    count: number;
    projects: StudioProject[];
};

export function ProjectsPage() {
    const siteConfig = useSiteConfig();
    const [projects, setProjects] = useState<StudioProject[]>([]);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        fetch(PROJECTS_ENDPOINT, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`项目接口返回 ${response.status}`);
                }
                return response.json() as Promise<ProjectsResponse>;
            })
            .then((data) => {
                if (!data.ok || !Array.isArray(data.projects)) {
                    throw new Error("项目数据格式不正确");
                }
                setProjects(data.projects);
                setStatus("ready");
            })
            .catch((nextError) => {
                if (nextError instanceof DOMException && nextError.name === "AbortError") {
                    return;
                }
                setError(nextError instanceof Error ? nextError.message : "项目加载失败");
                setStatus("error");
            });

        return () => controller.abort();
    }, []);

    const featuredProject = projects[0];
    const otherProjects = featuredProject ? projects.slice(1) : projects;
    const openSourceCount = useMemo(
        () => projects.filter((project) => project.type === "opensource" || Boolean(project.github_url)).length,
        [projects],
    );

    return (
        <>
            <Helmet>
                <title>{`项目 - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteConfig.name} />
                <meta property="og:title" content="项目" />
                <meta property="og:description" content="我的项目、程序和网站入口。" />
                <meta property="og:image" content={featuredProject?.image_url || siteConfig.avatar} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={document.URL} />
                <meta name="description" content="我的项目、程序和网站入口。" />
            </Helmet>

            <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                <section className="border-b border-black/8 pb-6 dark:border-white/10">
                    <p className="site-kicker">Projects</p>
                    <h1 className="site-display mt-2 text-[1.65rem] font-semibold text-neutral-900 dark:text-white md:text-[2.35rem]">
                        项目
                    </h1>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                        从 Studio 自动同步的项目和网站。这里更偏“正在做什么”，可以直接打开站点、查看源码或了解技术栈。
                    </p>
                    <p className="mt-2 text-[12px] text-neutral-400 dark:text-neutral-500">
                        共 {projects.length} 个项目 · {openSourceCount} 个可查看源码
                    </p>
                </section>

                {status === "loading" ? (
                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <ProjectSkeleton />
                        <ProjectSkeleton />
                    </div>
                ) : null}

                {status === "error" ? (
                    <div className="mt-6 rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
                        {error || "项目加载失败"}
                    </div>
                ) : null}

                {status === "ready" && featuredProject ? (
                    <section className="mt-6">
                        <ProjectCard project={featuredProject} featured />
                    </section>
                ) : null}

                {status === "ready" && otherProjects.length > 0 ? (
                    <section className="mt-4 grid gap-4 md:grid-cols-2">
                        {otherProjects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </section>
                ) : null}

                {status === "ready" && projects.length === 0 ? (
                    <div className="mt-6 rounded-[20px] border border-dashed border-black/10 bg-white/45 px-5 py-10 text-center text-sm text-neutral-400 dark:border-white/10 dark:bg-white/[0.04]">
                        暂时还没有公开项目。
                    </div>
                ) : null}
            </main>
        </>
    );
}

function ProjectCard({ project, featured = false }: { project: StudioProject; featured?: boolean }) {
    const updatedAt = project.updated_at ? new Date(project.updated_at) : null;

    return (
        <article className={`site-panel group overflow-hidden rounded-[22px] transition hover:-translate-y-0.5 hover:border-theme/30 ${featured ? "md:grid md:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]" : ""}`}>
            <div className="px-4 py-5 md:px-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="site-kicker">{project.type === "opensource" ? "Open Source" : "Project"}</p>
                        <h2 className={`${featured ? "text-[1.6rem] md:text-[2rem]" : "text-[1.25rem]"} mt-2 font-semibold leading-tight text-neutral-900 dark:text-white`}>
                            {project.name}
                        </h2>
                    </div>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-theme/10 text-xl">
                        {project.logo_url ? <img src={project.logo_url} alt="" className="h-7 w-7 rounded-[10px] object-cover" /> : project.icon || "•"}
                    </span>
                </div>

                <p className="mt-3 text-[14px] leading-7 text-neutral-600 dark:text-neutral-300">
                    {project.description || "这个项目暂时还没有说明。"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {project.domain ? <Badge>{project.domain}</Badge> : null}
                    {project.status ? <Badge>{statusLabel(project.status)}</Badge> : null}
                    {updatedAt ? <Badge>{updatedAt.toLocaleDateString("zh-CN")} 更新</Badge> : null}
                </div>

                {project.tech_stack?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {project.tech_stack.map((tech) => (
                            <span key={tech} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-300">
                                {tech}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                    {project.deploy_url ? (
                        <a
                            href={project.deploy_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-theme px-4 text-sm font-medium text-white transition hover:opacity-90"
                        >
                            打开网站
                            <i className="ri-arrow-right-up-line" />
                        </a>
                    ) : null}
                    {project.github_url ? (
                        <a
                            href={project.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-black/10 bg-white/55 px-4 text-sm font-medium text-neutral-700 transition hover:border-theme/30 hover:bg-theme/10 hover:text-theme dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200 dark:hover:bg-theme/15"
                        >
                            GitHub
                            <i className="ri-github-line" />
                        </a>
                    ) : null}
                </div>
            </div>

            <div className={`${featured ? "md:border-l md:border-t-0" : ""} border-t border-black/5 bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.03),rgba(255,255,255,0.1))] p-3 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(var(--theme-rgb),0.05),rgba(255,255,255,0.02))]`}>
                {project.image_url ? (
                    <img
                        src={project.image_url}
                        alt={project.name}
                        loading={featured ? "eager" : "lazy"}
                        decoding="async"
                        className={`${featured ? "min-h-[230px]" : "min-h-[180px]"} h-full w-full rounded-[14px] object-cover shadow-sm`}
                    />
                ) : (
                    <div className={`${featured ? "min-h-[230px]" : "min-h-[180px]"} flex h-full items-end rounded-[14px] border border-dashed border-black/10 bg-white/45 p-4 dark:border-white/10 dark:bg-white/[0.04]`}>
                        <div>
                            <p className="site-kicker">Project</p>
                            <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">{project.name}</p>
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

function Badge({ children }: { children: ReactNode }) {
    return (
        <span className="rounded-full border border-black/8 bg-white/55 px-2.5 py-1 text-[11px] text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
            {children}
        </span>
    );
}

function ProjectSkeleton() {
    return (
        <div className="site-panel animate-pulse rounded-[22px] p-4">
            <div className="h-5 w-28 rounded-full bg-black/5 dark:bg-white/10" />
            <div className="mt-4 h-8 w-2/3 rounded-full bg-black/5 dark:bg-white/10" />
            <div className="mt-4 h-4 w-full rounded-full bg-black/5 dark:bg-white/10" />
            <div className="mt-2 h-4 w-4/5 rounded-full bg-black/5 dark:bg-white/10" />
            <div className="mt-5 h-44 rounded-[16px] bg-black/5 dark:bg-white/10" />
        </div>
    );
}

function statusLabel(status: string) {
    const labels: Record<string, string> = {
        in_progress: "维护中",
        online: "已上线",
        archived: "已归档",
        planned: "计划中",
    };

    return labels[status] || status;
}
