import { Helmet } from "react-helmet";
import { siteName } from "../utils/constants";
import { useSiteConfig } from "../hooks/useSiteConfig";

type WorkItem = {
    title: string;
    category: string;
    status: string;
    description: string;
    stack: string[];
    href?: string;
};

const works: WorkItem[] = [
    {
        title: "FuHeng Blog",
        category: "个人博客",
        status: "已上线",
        description: "基于 Rin 二次开发的个人博客，包含文章、动态、标签、友链、后台写作与站点配置。",
        stack: ["React", "Cloudflare Workers", "D1", "R2"],
        href: "https://blog.fuheng.vip",
    },
    {
        title: "网站视觉重整",
        category: "网站设计",
        status: "持续迭代",
        description: "围绕移动端阅读体验、页面结构、导航可用性和个人品牌气质做的整站视觉改造。",
        stack: ["UI Design", "Responsive", "Tailwind CSS"],
    },
    {
        title: "轻量内容系统",
        category: "程序开发",
        status: "维护中",
        description: "面向个人站点的内容发布与管理能力，支持写作、摘要、图片、评论和基础运营面板。",
        stack: ["TypeScript", "Hono", "SQLite"],
    },
];

export function WorksPage() {
    const siteConfig = useSiteConfig();

    return (
        <>
            <Helmet>
                <title>{`作品 - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content="作品" />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <main className="wauto ani-show pb-14 pt-6 md:pt-8">
                <section className="border-b border-black/8 pb-5 dark:border-white/10">
                    <p className="site-kicker">Works</p>
                    <h1 className="site-display mt-2 text-[1.55rem] font-semibold text-neutral-900 dark:text-white md:text-[2rem]">
                        作品
                    </h1>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                        做过的程序、设计过的网站，以及正在长期维护的个人项目。
                    </p>
                </section>

                <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {works.map((work) => (
                        <WorkCard key={work.title} work={work} />
                    ))}
                </section>
            </main>
        </>
    );
}

function WorkCard({ work }: { work: WorkItem }) {
    const content = (
        <article className="site-panel flex h-full min-h-[220px] flex-col rounded-[10px] px-4 py-4 transition hover:border-theme/30 md:px-5 md:py-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="site-kicker">{work.category}</p>
                    <h2 className="mt-3 text-lg font-semibold text-neutral-900 dark:text-white">{work.title}</h2>
                </div>
                <span className="rounded-[8px] border border-black/10 bg-white/45 px-3 py-1.5 text-[11px] font-medium text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                    {work.status}
                </span>
            </div>
            <p className="mt-4 flex-1 text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                {work.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
                {work.stack.map((item) => (
                    <span key={item} className="rounded-[7px] bg-black/[0.035] px-2.5 py-1 text-[11px] text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">
                        {item}
                    </span>
                ))}
            </div>
        </article>
    );

    if (!work.href) {
        return content;
    }

    return (
        <a href={work.href} target="_blank" rel="noreferrer" className="block h-full">
            {content}
        </a>
    );
}
