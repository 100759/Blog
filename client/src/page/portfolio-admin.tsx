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

type AdminTab = "works" | "sites";
type WorkFilter = "all" | WorkType;
type AiPublishTarget = "work" | "site";

const platforms: Platform[] = ["Cloudflare Workers", "Cloudflare Pages", "Vercel", "自有服务器"];
const workTypes: WorkFilter[] = ["all", "program", "design", "image"];
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
    const [activeTab, setActiveTab] = useState<AdminTab>("works");
    const [workFilter, setWorkFilter] = useState<WorkFilter>("all");
    const [query, setQuery] = useState("");
    const [selectedWork, setSelectedWork] = useState(0);
    const [selectedSite, setSelectedSite] = useState(0);
    const [aiTarget, setAiTarget] = useState<AiPublishTarget>("work");
    const [aiInput, setAiInput] = useState("");
    const [aiRunning, setAiRunning] = useState(false);
    const [saving, setSaving] = useState(false);

    const summary = useMemo(() => ({
        works: works.length,
        sites: sites.length,
        open: works.filter((work) => work.access?.mode === "open").length,
        running: sites.filter((site) => site.status.includes("运行")).length,
    }), [sites, works]);

    const filteredWorks = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return works
            .map((work, index) => ({ work, index }))
            .filter(({ work }) => workFilter === "all" || work.type === workFilter)
            .filter(({ work }) => {
                if (!keyword) return true;
                return [work.title, work.slug, work.summary, work.status, work.role].some((value) => value?.toLowerCase().includes(keyword));
            });
    }, [query, workFilter, works]);

    const filteredSites = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return sites
            .map((site, index) => ({ site, index }))
            .filter(({ site }) => {
                if (!keyword) return true;
                return [site.name, site.url, site.description, site.platform, site.role, site.status].some((value) => value?.toLowerCase().includes(keyword));
            });
    }, [query, sites]);

    const currentWork = works[selectedWork] || works[0];
    const currentSite = sites[selectedSite] || sites[0];

    async function save(nextWorks = works, nextSites = sites) {
        setSaving(true);
        const response = await client.config.update("client", {
            [WORKS_CONFIG_KEY]: JSON.stringify(nextWorks),
            [SITES_CONFIG_KEY]: JSON.stringify(nextSites),
        });
        setSaving(false);

        if (response.error) {
            showAlert(response.error.value || "保存失败，请稍后再试。");
            return;
        }

        showAlert("已保存。前台刷新后会显示最新内容。");
    }

    async function publishWithAI() {
        const raw = aiInput.trim();
        if (!raw) {
            showAlert("先粘贴一段作品或网站介绍，我再帮你解析。");
            return;
        }

        setAiRunning(true);
        const response = await client.config.testAI({
            testPrompt: buildAIPrompt(aiTarget, raw),
        });
        setAiRunning(false);

        if (response.error) {
            showAlert(response.error.value || "AI 解析失败，请检查 AI 配置。");
            return;
        }

        if (!response.data?.success || !response.data.response) {
            showAlert(response.data?.error || "AI 没有返回可用内容。");
            return;
        }

        try {
            const parsed = extractJSON(response.data.response);
            if (aiTarget === "work") {
                const nextWork = normalizeAIWork(parsed);
                const nextWorks = [nextWork, ...works];
                setWorks(nextWorks);
                setSelectedWork(0);
                setActiveTab("works");
                await save(nextWorks, sites);
                setAiInput("");
                showAlert("作品已由 AI 解析并发布。");
                return;
            }

            const nextSite = normalizeAISite(parsed);
            const nextSites = [nextSite, ...sites];
            setSites(nextSites);
            setSelectedSite(0);
            setActiveTab("sites");
            await save(works, nextSites);
            setAiInput("");
            showAlert("网站已由 AI 解析并发布。");
        } catch (error) {
            showAlert(error instanceof Error ? error.message : "AI 返回内容解析失败。");
        }
    }

    function addWork() {
        const next = createWork();
        setWorks((items) => [next, ...items]);
        setSelectedWork(0);
        setActiveTab("works");
    }

    function addSite() {
        const next = createSite();
        setSites((items) => [next, ...items]);
        setSelectedSite(0);
        setActiveTab("sites");
    }

    function removeWork(index: number) {
        setWorks((items) => items.filter((_, itemIndex) => itemIndex !== index));
        setSelectedWork(0);
    }

    function removeSite(index: number) {
        setSites((items) => items.filter((_, itemIndex) => itemIndex !== index));
        setSelectedSite(0);
    }

    return (
        <>
            <Helmet>
                <title>作品与网站管理</title>
            </Helmet>
            <AlertUI />
            <div className="space-y-4">
                <section className="rounded-[24px] border border-black/8 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <p className="site-kicker">Portfolio Desk</p>
                            <h2 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-white">内容管理台</h2>
                            <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-300">
                                先在左边选中条目，再在右边编辑。页面不会一次展开所有表单，后面内容多了也不乱。
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 xl:min-w-[430px]">
                            <MiniStat label="作品" value={summary.works} />
                            <MiniStat label="开源" value={summary.open} />
                            <MiniStat label="网站" value={summary.sites} />
                            <MiniStat label="运行" value={summary.running} />
                        </div>
                    </div>
                </section>

                <section className="rounded-[24px] border border-theme/15 bg-theme/[0.06] p-4 dark:border-theme/20 dark:bg-theme/[0.08]">
                    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_auto] xl:items-end">
                        <div>
                            <p className="site-kicker">AI Publish</p>
                            <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">AI 自动解析一键发布</h2>
                            <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-300">
                                粘贴项目介绍、域名、开源地址等，AI 会整理成前台需要的字段。
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)]">
                            <SelectField
                                label="发布到"
                                value={aiTarget}
                                onChange={(value) => setAiTarget(value as AiPublishTarget)}
                                options={["work", "site"]}
                                optionLabel={(value) => value === "work" ? "作品" : "旗下网站"}
                            />
                            <Field
                                textarea
                                label="待解析内容"
                                value={aiInput}
                                onChange={setAiInput}
                                placeholder="例如：我做了一个个人导航站，部署在 Cloudflare Workers，地址是 https://xxx.com，闭源，主要用于展示所有项目..."
                            />
                        </div>
                        <button
                            type="button"
                            disabled={aiRunning}
                            onClick={publishWithAI}
                            className="rounded-full bg-theme px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {aiRunning ? "AI 解析中..." : "AI 解析并发布"}
                        </button>
                    </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <aside className="rounded-[24px] border border-black/8 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.04] xl:sticky xl:top-5 xl:self-start">
                        <div className="grid grid-cols-2 gap-2 rounded-[18px] bg-black/[0.035] p-1 dark:bg-white/[0.04]">
                            <TabButton active={activeTab === "works"} onClick={() => setActiveTab("works")}>
                                作品 {works.length}
                            </TabButton>
                            <TabButton active={activeTab === "sites"} onClick={() => setActiveTab("sites")}>
                                网站 {sites.length}
                            </TabButton>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={activeTab === "works" ? "搜索作品标题、状态、角色" : "搜索网站名称、域名、平台"}
                                className="min-w-0 flex-1 rounded-[16px] border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-theme/40 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100"
                            />
                            <button
                                type="button"
                                onClick={activeTab === "works" ? addWork : addSite}
                                className="shrink-0 rounded-[16px] bg-theme px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                            >
                                新增
                            </button>
                        </div>

                        {activeTab === "works" ? (
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                {workTypes.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setWorkFilter(type)}
                                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                                            workFilter === type
                                                ? "border-theme bg-theme text-white"
                                                : "border-black/10 bg-white/70 text-neutral-500 hover:border-theme/30 hover:text-theme dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300"
                                        }`}
                                    >
                                        {type === "all" ? "全部" : typeMeta[type].label}
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                            {activeTab === "works" ? (
                                filteredWorks.length ? filteredWorks.map(({ work, index }) => (
                                    <WorkListItem
                                        key={`${work.slug}-${index}`}
                                        work={work}
                                        active={selectedWork === index}
                                        onClick={() => setSelectedWork(index)}
                                    />
                                )) : <EmptyList text="没有找到作品" />
                            ) : (
                                filteredSites.length ? filteredSites.map(({ site, index }) => (
                                    <SiteListItem
                                        key={`${site.url}-${index}`}
                                        site={site}
                                        active={selectedSite === index}
                                        onClick={() => setSelectedSite(index)}
                                    />
                                )) : <EmptyList text="没有找到网站" />
                            )}
                        </div>
                    </aside>

                    <main className="min-w-0 rounded-[24px] border border-black/8 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                        {activeTab === "works" ? (
                            currentWork ? (
                                <WorkEditor
                                    work={currentWork}
                                    onChange={(next) => setWorks((items) => updateAt(items, selectedWork, next))}
                                    onDelete={() => removeWork(selectedWork)}
                                    onDuplicate={() => {
                                        const next = duplicateWork(currentWork);
                                        setWorks((items) => [next, ...items]);
                                        setSelectedWork(0);
                                    }}
                                />
                            ) : <EmptyEditor title="还没有作品" action="新增作品" onClick={addWork} />
                        ) : (
                            currentSite ? (
                                <SiteEditor
                                    site={currentSite}
                                    onChange={(next) => setSites((items) => updateAt(items, selectedSite, next))}
                                    onDelete={() => removeSite(selectedSite)}
                                    onDuplicate={() => {
                                        const next = duplicateSite(currentSite);
                                        setSites((items) => [next, ...items]);
                                        setSelectedSite(0);
                                    }}
                                />
                            ) : <EmptyEditor title="还没有网站" action="新增网站" onClick={addSite} />
                        )}
                    </main>
                </section>

                <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-[22px] border border-black/8 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-950/90 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-neutral-500 dark:text-neutral-300">
                        改动会先保存在当前页面，点保存后才写入站点配置。
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <a href="/works" target="_blank" rel="noreferrer" className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200">
                            预览作品
                        </a>
                        <a href="/sites" target="_blank" rel="noreferrer" className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200">
                            预览网站
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                setWorks(DEFAULT_WORKS);
                                setSites(DEFAULT_SITES);
                                setSelectedWork(0);
                                setSelectedSite(0);
                            }}
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200"
                        >
                            恢复默认
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => save()}
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
    onChange,
    onDelete,
    onDuplicate,
}: {
    work: WorkItem;
    onChange: (work: WorkItem) => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const meta = typeMeta[work.type];
    const accessMode = work.access?.mode || "closed";

    return (
        <div className="space-y-4">
            <EditorHeader
                kicker={meta.label}
                title={work.title || "未命名作品"}
                subtitle={`/works/${work.slug || "new-work"}`}
                previewHref={work.slug ? `/works/${work.slug}` : undefined}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
            />

            <Panel title="基础信息" note="前台列表和详情页最常用的信息。">
                <div className="grid gap-3 lg:grid-cols-2">
                    <Field label="标题" value={work.title} onChange={(title) => onChange({ ...work, title })} />
                    <Field label="唯一别名" value={work.slug} onChange={(slug) => onChange({ ...work, slug: slugify(slug) })} hint="英文、数字和短横线，用于详情页地址。" />
                    <SelectField label="类型" value={work.type} onChange={(type) => onChange({ ...work, type: type as WorkType })} options={["program", "design", "image"]} optionLabel={(value) => typeMeta[value as WorkType].label} />
                    <Field label="状态" value={work.status} onChange={(status) => onChange({ ...work, status })} placeholder="例如：长期维护、已上线、整理中" />
                    <Field label="时间" value={work.date} onChange={(date) => onChange({ ...work, date })} />
                    <Field label="作品入口（可选）" value={work.href || ""} onChange={(href) => onChange({ ...work, href })} placeholder="https:// 或 /sites" />
                    <SelectField label="封面色调" value={work.coverTone} onChange={(coverTone) => onChange({ ...work, coverTone })} options={tones} optionLabel={(value) => value.replace("from-", "")} />
                    <Field label="你的角色" value={work.role} onChange={(role) => onChange({ ...work, role })} />
                </div>
            </Panel>

            <Panel title="内容说明" note="这里决定作品看起来是否清楚，尽量写给访客看。">
                <div className="grid gap-3">
                    <Field textarea label="一句话介绍" value={work.summary} onChange={(summary) => onChange({ ...work, summary })} />
                    <Field textarea label="详情说明" value={work.detail} onChange={(detail) => onChange({ ...work, detail })} />
                </div>
            </Panel>

            <Panel title="标签与亮点" note="每行一个，前台会自动排版。">
                <div className="grid gap-3 lg:grid-cols-2">
                    <Field textarea label="工具" value={formatList(work.tools)} onChange={(value) => onChange({ ...work, tools: parseList(value) })} />
                    <Field textarea label="亮点" value={formatList(work.highlights)} onChange={(value) => onChange({ ...work, highlights: parseList(value) })} />
                    <Field textarea label="指标" value={formatList(work.metrics)} onChange={(value) => onChange({ ...work, metrics: parseList(value) })} />
                    <Field textarea label="图片分类/画廊" value={formatList(work.gallery || [])} onChange={(value) => onChange({ ...work, gallery: parseList(value) })} />
                </div>
            </Panel>

            <Panel title="开源 / 下载" note="程序填 GitHub；设计、图片填下载地址。闭源时前台只展示说明。">
                <div className="grid gap-3 lg:grid-cols-3">
                    <SelectField label="公开方式" value={accessMode} onChange={(mode) => onChange({ ...work, access: { ...work.access, mode: mode as "open" | "closed" } })} options={["closed", "open"]} optionLabel={(value) => value === "open" ? "开源 / 可下载" : "闭源"} />
                    <Field label="按钮文字" value={work.access?.label || ""} onChange={(label) => onChange({ ...work, access: { ...work.access, mode: accessMode, label } })} />
                    <Field label={work.type === "program" ? "GitHub 地址" : "下载地址"} value={work.access?.url || ""} onChange={(url) => onChange({ ...work, access: { ...work.access, mode: accessMode, url } })} />
                </div>
            </Panel>
        </div>
    );
}

function SiteEditor({
    site,
    onChange,
    onDelete,
    onDuplicate,
}: {
    site: SiteItem;
    onChange: (site: SiteItem) => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    return (
        <div className="space-y-4">
            <EditorHeader
                kicker={site.platform}
                title={site.name || "未命名网站"}
                subtitle={site.url}
                previewHref={site.url?.startsWith("http") ? site.url : undefined}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
            />

            <Panel title="网站信息" note="只保留对访客有用的内容，不做域名检测，页面会更轻。">
                <div className="grid gap-3 lg:grid-cols-2">
                    <Field label="网站名称" value={site.name} onChange={(name) => onChange({ ...site, name })} />
                    <Field label="访问地址" value={site.url} onChange={(url) => onChange({ ...site, url })} placeholder="https://" />
                    <SelectField label="部署平台" value={site.platform} onChange={(platform) => onChange({ ...site, platform: platform as Platform })} options={platforms} />
                    <Field label="角色" value={site.role} onChange={(role) => onChange({ ...site, role })} placeholder="主站、备用、项目..." />
                    <Field label="状态" value={site.status} onChange={(status) => onChange({ ...site, status })} placeholder="运行中、维护中..." />
                    <SelectField label="标识颜色" value={site.color} onChange={(color) => onChange({ ...site, color })} options={siteColors} />
                    <Field textarea label="描述" value={site.description} onChange={(description) => onChange({ ...site, description })} />
                </div>
            </Panel>
        </div>
    );
}

function EditorHeader({
    kicker,
    title,
    subtitle,
    previewHref,
    onDelete,
    onDuplicate,
}: {
    kicker: string;
    title: string;
    subtitle?: string;
    previewHref?: string;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    return (
        <div className="rounded-[22px] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <p className="site-kicker">{kicker}</p>
                    <h3 className="mt-1 truncate text-xl font-semibold text-neutral-900 dark:text-white">{title}</h3>
                    {subtitle ? <p className="mt-1 truncate text-sm text-neutral-400">{subtitle}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    {previewHref ? (
                        <a href={previewHref} target="_blank" rel="noreferrer" className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:border-theme/30 hover:text-theme dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200">
                            预览
                        </a>
                    ) : null}
                    <button type="button" onClick={onDuplicate} className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200">
                        复制一份
                    </button>
                    <button type="button" onClick={onDelete} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100">
                        删除
                    </button>
                </div>
            </div>
        </div>
    );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
    return (
        <section className="rounded-[22px] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
                {note ? <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-300">{note}</p> : null}
            </div>
            {children}
        </section>
    );
}

function WorkListItem({ work, active, onClick }: { work: WorkItem; active: boolean; onClick: () => void }) {
    const meta = typeMeta[work.type];

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-[18px] border p-3 text-left transition ${
                active
                    ? "border-theme/30 bg-theme/10"
                    : "border-black/8 bg-white/60 hover:border-theme/25 dark:border-white/10 dark:bg-white/[0.04]"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{work.title || "未命名作品"}</p>
                    <p className="mt-1 truncate text-xs text-neutral-400">{work.slug}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/75 px-2 py-1 text-[11px] text-theme dark:bg-white/[0.06]">{meta.label}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-300">
                <span>{work.status || "未设置状态"}</span>
                <span className="size-1 rounded-full bg-neutral-300" />
                <span>{work.access?.mode === "open" ? "开源" : "闭源"}</span>
            </div>
        </button>
    );
}

function SiteListItem({ site, active, onClick }: { site: SiteItem; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-[18px] border p-3 text-left transition ${
                active
                    ? "border-theme/30 bg-theme/10"
                    : "border-black/8 bg-white/60 hover:border-theme/25 dark:border-white/10 dark:bg-white/[0.04]"
            }`}
        >
            <div className="flex items-start gap-3">
                <span className={`mt-0.5 size-8 shrink-0 rounded-[12px] ${site.color}`} />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{site.name || "未命名网站"}</p>
                    <p className="mt-1 truncate text-xs text-neutral-400">{cleanUrl(site.url)}</p>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-300">
                <span>{site.platform}</span>
                <span className="size-1 rounded-full bg-neutral-300" />
                <span>{site.status}</span>
            </div>
        </button>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[18px] border border-black/8 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-white">{value}</p>
        </div>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-[15px] px-3 py-2 text-sm font-medium transition ${
                active ? "bg-white text-theme shadow-sm dark:bg-white/[0.08]" : "text-neutral-500 hover:text-theme dark:text-neutral-300"
            }`}
        >
            {children}
        </button>
    );
}

function EmptyList({ text }: { text: string }) {
    return (
        <div className="rounded-[18px] border border-dashed border-black/10 bg-white/45 px-4 py-8 text-center text-sm text-neutral-400 dark:border-white/10 dark:bg-white/[0.03]">
            {text}
        </div>
    );
}

function EmptyEditor({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
    return (
        <div className="rounded-[22px] border border-dashed border-black/10 bg-white/55 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
            <button type="button" onClick={onClick} className="mt-4 rounded-full bg-theme px-5 py-2 text-sm font-medium text-white">
                {action}
            </button>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    textarea,
    hint,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    textarea?: boolean;
    hint?: string;
    placeholder?: string;
}) {
    const baseClass = "mt-1 w-full rounded-[14px] border border-black/10 bg-white/80 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-theme/40 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-100";

    return (
        <label className={textarea ? "lg:col-span-2" : ""}>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-300">{label}</span>
            {textarea ? (
                <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={placeholder} className={`${baseClass} resize-y`} />
            ) : (
                <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={baseClass} />
            )}
            {hint ? <span className="mt-1 block text-[11px] text-neutral-400">{hint}</span> : null}
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

function cleanUrl(url: string) {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function duplicateWork(work: WorkItem): WorkItem {
    return {
        ...work,
        slug: `${work.slug || "work"}-copy-${Date.now()}`,
        title: `${work.title || "作品"} 副本`,
    };
}

function duplicateSite(site: SiteItem): SiteItem {
    return {
        ...site,
        name: `${site.name || "网站"} 副本`,
        url: site.url || "https://",
    };
}

function buildAIPrompt(target: AiPublishTarget, input: string) {
    const schema = target === "work"
        ? `{
  "title": "作品标题",
  "slug": "english-kebab-case",
  "type": "program | design | image",
  "status": "状态",
  "date": "年份或日期",
  "summary": "一句话介绍，80字内",
  "detail": "详细说明，150到260字",
  "coverTone": "从可选项里选一个",
  "tools": ["工具或技术"],
  "highlights": ["亮点"],
  "role": "我负责的内容",
  "metrics": ["展示指标"],
  "access": { "mode": "open | closed", "label": "按钮文字", "url": "GitHub或下载地址" },
  "href": "作品入口，可为空",
  "gallery": ["图片分类，可为空"]
}`
        : `{
  "name": "网站名称",
  "url": "https://example.com",
  "description": "网站说明，80到160字",
  "platform": "Cloudflare Workers | Cloudflare Pages | Vercel | 自有服务器",
  "role": "主站/备用/项目等",
  "status": "运行中/维护中等",
  "color": "从可选项里选一个"
}`;

    return [
        "你是一个中文个人站内容管理员。请把用户输入解析成严格 JSON。",
        "只输出 JSON，不要 Markdown，不要解释，不要代码块。",
        `目标类型：${target === "work" ? "作品" : "旗下网站"}`,
        `可选封面色调：${tones.join(", ")}`,
        `可选网站颜色：${siteColors.join(", ")}`,
        `JSON 结构：${schema}`,
        "规则：缺失字段请合理补全；slug 必须是英文小写、数字、短横线；type 只能是 program/design/image；开源、GitHub、下载、源码等表达算 open，否则 closed。",
        `用户输入：\n${input}`,
    ].join("\n\n");
}

function extractJSON(text: string): Record<string, any> {
    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
        throw new Error("AI 没有返回 JSON，请换一种描述再试。");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeAIWork(value: Record<string, any>): WorkItem {
    const type = value.type === "design" || value.type === "image" || value.type === "program" ? value.type : "program";
    const title = toText(value.title) || "AI 解析作品";
    const accessMode = value.access?.mode === "open" ? "open" : "closed";

    return {
        slug: slugify(toText(value.slug) || title) || `work-${Date.now()}`,
        title,
        type,
        status: toText(value.status) || "整理中",
        date: toText(value.date) || String(new Date().getFullYear()),
        summary: toText(value.summary) || "这是一项由 AI 辅助整理的作品。",
        detail: toText(value.detail) || toText(value.summary) || "补充作品背景、负责内容和展示说明。",
        coverTone: tones.includes(value.coverTone) ? value.coverTone : tones[0],
        tools: toList(value.tools),
        highlights: toList(value.highlights),
        role: toText(value.role) || "项目整理",
        metrics: toList(value.metrics),
        access: {
            mode: accessMode,
            label: toText(value.access?.label) || (type === "program" ? "GitHub 地址" : "下载"),
            url: toText(value.access?.url),
        },
        href: toText(value.href),
        gallery: toList(value.gallery),
    };
}

function normalizeAISite(value: Record<string, any>): SiteItem {
    const platform = platforms.includes(value.platform) ? value.platform : "Cloudflare Workers";

    return {
        name: toText(value.name) || "AI 解析网站",
        url: toText(value.url) || "https://",
        description: toText(value.description) || "这是一个由 AI 辅助整理的网站入口。",
        platform,
        role: toText(value.role) || "项目",
        status: toText(value.status) || "运行中",
        color: siteColors.includes(value.color) ? value.color : "bg-teal-600",
    };
}

function toText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function toList(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        return parseList(value);
    }

    return [];
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
