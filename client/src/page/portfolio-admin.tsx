import { useContext, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { client } from "../app/runtime";
import { useAlert } from "../components/dialog";
import { ClientConfigContext } from "../state/config";
import {
    DEFAULT_SITES,
    DEFAULT_WORKS,
    parseSitesConfig,
    parseWorksConfig,
    SITES_CONFIG_KEY,
    typeMeta,
    WORKS_CONFIG_KEY,
    type Platform,
    type SiteItem,
    type WorkItem,
    type WorkType,
} from "./portfolio-data";

const platforms: Platform[] = ["Cloudflare Workers", "Cloudflare Pages", "Vercel", "自有服务器"];
const siteColors = ["bg-teal-600", "bg-orange-500", "bg-sky-600", "bg-neutral-900", "bg-emerald-600", "bg-rose-500"];
const tones = [
    "from-teal-100 via-cyan-50 to-stone-50",
    "from-amber-100 via-stone-50 to-sky-100",
    "from-emerald-100 via-white to-lime-50",
    "from-zinc-100 via-white to-neutral-200",
    "from-sky-100 via-white to-teal-100",
    "from-rose-100 via-white to-orange-50",
];

export function PortfolioAdminPage() {
    const config = useContext(ClientConfigContext);
    const { showAlert, AlertUI } = useAlert();
    const [works, setWorks] = useState(() => parseWorksConfig(config.get(WORKS_CONFIG_KEY)));
    const [sites, setSites] = useState(() => parseSitesConfig(config.get(SITES_CONFIG_KEY)));
    const [saving, setSaving] = useState(false);
    const summary = useMemo(() => ({
        works: works.length,
        sites: sites.length,
        open: works.filter((work) => work.access?.mode === "open").length,
    }), [sites.length, works]);

    async function save() {
        setSaving(true);
        const response = await client.config.update("client", {
            [WORKS_CONFIG_KEY]: JSON.stringify(works),
            [SITES_CONFIG_KEY]: JSON.stringify(sites),
        });
        setSaving(false);

        if (response.error) {
            showAlert(response.error.value || "保存失败，请稍后再试。");
            return;
        }

        showAlert("已保存，刷新前台页面后即可看到更新。");
    }

    return (
        <>
            <Helmet>
                <title>作品与网站管理</title>
            </Helmet>
            <AlertUI />
            <div className="space-y-4">
                <section className="grid gap-3 md:grid-cols-3">
                    <StatCard label="作品" value={summary.works} />
                    <StatCard label="开源 / 可下载" value={summary.open} />
                    <StatCard label="旗下网站" value={summary.sites} />
                </section>

                <section className="rounded-[22px] border border-black/8 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="site-kicker">Works</p>
                            <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">作品管理</h2>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-300">程序可填 GitHub，设计和图片可填下载地址；闭源则不显示入口。</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWorks((items) => [createWork(), ...items])}
                            className="rounded-full border border-theme/20 bg-theme/10 px-4 py-2 text-sm font-medium text-theme transition hover:bg-theme hover:text-white"
                        >
                            新增作品
                        </button>
                    </div>
                    <div className="mt-4 space-y-3">
                        {works.map((work, index) => (
                            <WorkEditor
                                key={`${work.slug}-${index}`}
                                index={index}
                                work={work}
                                onChange={(next) => setWorks((items) => updateAt(items, index, next))}
                                onDelete={() => setWorks((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                            />
                        ))}
                    </div>
                </section>

                <section className="rounded-[22px] border border-black/8 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="site-kicker">Sites</p>
                            <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">旗下网站管理</h2>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-300">维护网站名称、入口、平台、角色和状态，不再做耗性能的域名检测。</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSites((items) => [createSite(), ...items])}
                            className="rounded-full border border-theme/20 bg-theme/10 px-4 py-2 text-sm font-medium text-theme transition hover:bg-theme hover:text-white"
                        >
                            新增网站
                        </button>
                    </div>
                    <div className="mt-4 space-y-3">
                        {sites.map((site, index) => (
                            <SiteEditor
                                key={`${site.url}-${index}`}
                                index={index}
                                site={site}
                                onChange={(next) => setSites((items) => updateAt(items, index, next))}
                                onDelete={() => setSites((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                            />
                        ))}
                    </div>
                </section>

                <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-[22px] border border-black/8 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-950/90 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-neutral-500 dark:text-neutral-300">
                        修改后点击保存，会写入站点配置。
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setWorks(DEFAULT_WORKS);
                                setSites(DEFAULT_SITES);
                            }}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200"
                        >
                            恢复默认
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={save}
                            className="rounded-full bg-theme px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? "保存中..." : "保存"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

function WorkEditor({
    work,
    index,
    onChange,
    onDelete,
}: {
    work: WorkItem;
    index: number;
    onChange: (work: WorkItem) => void;
    onDelete: () => void;
}) {
    const meta = typeMeta[work.type];
    const accessMode = work.access?.mode || "closed";

    return (
        <details open={index === 0} className="rounded-[20px] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-theme">{meta.label}</p>
                        <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{work.title || "未命名作品"}</h3>
                    </div>
                    <button type="button" onClick={(event) => { event.preventDefault(); onDelete(); }} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600">
                        删除
                    </button>
                </div>
            </summary>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <Field label="标题" value={work.title} onChange={(title) => onChange({ ...work, title })} />
                <Field label="唯一别名（用于详情页地址）" value={work.slug} onChange={(slug) => onChange({ ...work, slug: slugify(slug) })} />
                <SelectField label="类型" value={work.type} onChange={(type) => onChange({ ...work, type: type as WorkType })} options={["design", "program", "image"]} optionLabel={(value) => typeMeta[value as WorkType].label} />
                <Field label="状态" value={work.status} onChange={(status) => onChange({ ...work, status })} />
                <Field label="时间" value={work.date} onChange={(date) => onChange({ ...work, date })} />
                <Field label="作品入口（可选）" value={work.href || ""} onChange={(href) => onChange({ ...work, href })} />
                <SelectField label="封面色调" value={work.coverTone} onChange={(coverTone) => onChange({ ...work, coverTone })} options={tones} optionLabel={(value) => value.replace("from-", "")} />
                <Field label="你的角色" value={work.role} onChange={(role) => onChange({ ...work, role })} />
                <Field textarea label="一句话介绍" value={work.summary} onChange={(summary) => onChange({ ...work, summary })} />
                <Field textarea label="详情说明" value={work.detail} onChange={(detail) => onChange({ ...work, detail })} />
                <Field textarea label="工具（每行一个）" value={formatList(work.tools)} onChange={(value) => onChange({ ...work, tools: parseList(value) })} />
                <Field textarea label="亮点（每行一个）" value={formatList(work.highlights)} onChange={(value) => onChange({ ...work, highlights: parseList(value) })} />
                <Field textarea label="指标（每行一个）" value={formatList(work.metrics)} onChange={(value) => onChange({ ...work, metrics: parseList(value) })} />
                <Field textarea label="图片分类/画廊（每行一个）" value={formatList(work.gallery || [])} onChange={(value) => onChange({ ...work, gallery: parseList(value) })} />
            </div>

            <div className="mt-4 rounded-[18px] border border-black/8 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="site-kicker">开源 / 下载</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <SelectField label="公开方式" value={accessMode} onChange={(mode) => onChange({ ...work, access: { ...work.access, mode: mode as "open" | "closed" } })} options={["closed", "open"]} optionLabel={(value) => value === "open" ? "开源 / 可下载" : "闭源"} />
                    <Field label="按钮文字" value={work.access?.label || ""} onChange={(label) => onChange({ ...work, access: { ...work.access, mode: accessMode, label } })} />
                    <Field label={work.type === "program" ? "GitHub 地址" : "下载地址"} value={work.access?.url || ""} onChange={(url) => onChange({ ...work, access: { ...work.access, mode: accessMode, url } })} />
                </div>
            </div>
        </details>
    );
}

function SiteEditor({
    site,
    index,
    onChange,
    onDelete,
}: {
    site: SiteItem;
    index: number;
    onChange: (site: SiteItem) => void;
    onDelete: () => void;
}) {
    return (
        <details open={index === 0} className="rounded-[20px] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-theme">{site.platform}</p>
                        <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{site.name || "未命名网站"}</h3>
                    </div>
                    <button type="button" onClick={(event) => { event.preventDefault(); onDelete(); }} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600">
                        删除
                    </button>
                </div>
            </summary>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <Field label="网站名称" value={site.name} onChange={(name) => onChange({ ...site, name })} />
                <Field label="访问地址" value={site.url} onChange={(url) => onChange({ ...site, url })} />
                <SelectField label="部署平台" value={site.platform} onChange={(platform) => onChange({ ...site, platform: platform as Platform })} options={platforms} />
                <Field label="角色" value={site.role} onChange={(role) => onChange({ ...site, role })} />
                <Field label="状态" value={site.status} onChange={(status) => onChange({ ...site, status })} />
                <SelectField label="标识颜色" value={site.color} onChange={(color) => onChange({ ...site, color })} options={siteColors} />
                <Field textarea label="描述" value={site.description} onChange={(description) => onChange({ ...site, description })} />
            </div>
        </details>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[20px] border border-black/8 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="site-kicker">{label}</p>
            <p className="site-display mt-2 text-3xl font-semibold text-neutral-900 dark:text-white">{value}</p>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    textarea,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    textarea?: boolean;
}) {
    const baseClass = "mt-1 w-full rounded-[14px] border border-black/10 bg-white/80 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-theme/40 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100";

    return (
        <label className={textarea ? "lg:col-span-2" : ""}>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-300">{label}</span>
            {textarea ? (
                <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={`${baseClass} resize-y`} />
            ) : (
                <input value={value} onChange={(event) => onChange(event.target.value)} className={baseClass} />
            )}
        </label>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
    optionLabel,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    optionLabel?: (value: string) => string;
}) {
    return (
        <label>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-300">{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-[14px] border border-black/10 bg-white/80 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-theme/40 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100">
                {options.map((option) => (
                    <option key={option} value={option}>
                        {optionLabel ? optionLabel(option) : option}
                    </option>
                ))}
            </select>
        </label>
    );
}

function updateAt<T>(items: T[], index: number, next: T) {
    return items.map((item, itemIndex) => itemIndex === index ? next : item);
}

function parseList(value: string) {
    return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function formatList(value: string[]) {
    return value.join("\n");
}

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function createWork(): WorkItem {
    return {
        slug: `work-${Date.now()}`,
        title: "新作品",
        type: "program",
        status: "整理中",
        date: String(new Date().getFullYear()),
        summary: "写一句简单介绍。",
        detail: "补充作品背景、你负责的内容，以及这个作品解决了什么问题。",
        coverTone: tones[0],
        tools: [],
        highlights: [],
        role: "",
        metrics: [],
        access: { mode: "closed" },
        href: "",
        gallery: [],
    };
}

function createSite(): SiteItem {
    return {
        name: "新网站",
        url: "https://",
        description: "写一下这个网站的用途。",
        platform: "Cloudflare Workers",
        role: "项目",
        status: "运行中",
        color: "bg-teal-600",
    };
}
