export type WorkType = "design" | "program" | "image";

export type WorkAccess = {
    mode: "open" | "closed";
    label?: string;
    url?: string;
};

export type WorkItem = {
    slug: string;
    title: string;
    type: WorkType;
    status: string;
    date: string;
    summary: string;
    detail: string;
    coverTone: string;
    tools: string[];
    highlights: string[];
    role: string;
    metrics: string[];
    access?: WorkAccess;
    href?: string;
    gallery?: string[];
};

export type Platform = "Cloudflare Workers" | "Cloudflare Pages" | "Vercel" | "自有服务器";

export type SiteItem = {
    name: string;
    url: string;
    description: string;
    platform: Platform;
    role: string;
    status: string;
    color: string;
};

export const WORKS_CONFIG_KEY = "portfolio.works";
export const SITES_CONFIG_KEY = "portfolio.sites";

export const typeMeta: Record<WorkType, { label: string; intro: string; icon: string }> = {
    design: {
        label: "设计作品",
        intro: "品牌、界面、视觉改版和体验整理。",
        icon: "ri-layout-top-line",
    },
    program: {
        label: "程序",
        intro: "能运行、能维护、能持续迭代的小产品。",
        icon: "ri-computer-line",
    },
    image: {
        label: "图片",
        intro: "摄影、插画、视觉素材和灵感收集。",
        icon: "ri-image-line",
    },
};

export const workFilters: Array<{ value: "all" | WorkType; label: string }> = [
    { value: "all", label: "全部" },
    { value: "design", label: "设计作品" },
    { value: "program", label: "程序" },
    { value: "image", label: "图片" },
];

export const platformTone: Record<Platform, string> = {
    "Cloudflare Workers": "border-orange-200 bg-orange-50 text-orange-700",
    "Cloudflare Pages": "border-amber-200 bg-amber-50 text-amber-700",
    Vercel: "border-neutral-900 bg-neutral-950 text-white",
    自有服务器: "border-sky-200 bg-sky-50 text-sky-700",
};

export const DEFAULT_WORKS: WorkItem[] = [
    {
        slug: "fuheng-blog",
        title: "FuHeng Blog",
        type: "program",
        status: "长期维护",
        date: "2026",
        summary: "基于 Rin 二开的个人博客系统，覆盖文章、动态、作品、友链、富文本写作和图片上传。",
        detail: "这个项目是主站的核心。目标不是堆功能，而是把写作、动态发布、作品展示和站点管理整合成一个普通人也能顺手使用的个人内容系统。",
        coverTone: "from-teal-100 via-cyan-50 to-stone-50",
        tools: ["React", "Cloudflare Workers", "D1", "R2", "TypeScript"],
        highlights: ["富文本写作", "R2 图片上传", "动态与文章分流", "移动端优先"],
        role: "全栈二开 / 产品整理 / 视觉重构",
        metrics: ["主站系统", "长期维护", "移动端优先"],
        access: {
            mode: "open",
            label: "GitHub 开源地址",
            url: "https://github.com/100759/Blog",
        },
        href: "https://blog.fuheng.vip",
    },
    {
        slug: "mobile-visual-redesign",
        title: "移动端视觉重整",
        type: "design",
        status: "已落地",
        date: "2026",
        summary: "围绕手机阅读体验重新整理字号、留白、导航层级和内容卡片，让页面更像个人站而不是模板站。",
        detail: "这次设计重整的重点是去掉过重的框感和过大的文字，减少 AI 味儿，让移动端更轻、更安静，也更适合长时间浏览。",
        coverTone: "from-amber-100 via-stone-50 to-sky-100",
        tools: ["UI Design", "Responsive", "Tailwind CSS"],
        highlights: ["降低大字号压迫感", "弱化版块边界", "修正顶部安全区", "优化内容首屏"],
        role: "界面重整 / 移动端体验",
        metrics: ["手机端", "阅读体验", "已落地"],
        access: {
            mode: "closed",
        },
    },
    {
        slug: "moment-publisher",
        title: "动态发布器",
        type: "program",
        status: "迭代中",
        date: "2026",
        summary: "给动态板块做的轻量发布工具，支持文字、图片上传和可选地址，尽量接近朋友圈式发布体验。",
        detail: "动态不应该像写文章那么重，所以发布器会保留最少字段：一句话、几张图、一个可选位置。图片展示也按九宫格和紧凑间距处理，方便手机端观看。",
        coverTone: "from-emerald-100 via-white to-lime-50",
        tools: ["React", "R2", "Geolocation", "UX"],
        highlights: ["文字图片混排", "可选定位", "紧凑图片网格", "移动端优先"],
        role: "功能设计 / 发布流程",
        metrics: ["轻发布", "图片上传", "位置可选"],
        access: {
            mode: "closed",
        },
    },
    {
        slug: "portrait-assets",
        title: "头像与站点视觉素材",
        type: "image",
        status: "使用中",
        date: "2026",
        summary: "用于主站头像、卡片占位、社交展示的一组轻量黑白视觉素材。",
        detail: "这组图片素材承担站点识别的作用，不追求复杂，而是保持清晰、亲切、容易记住。后续可以继续扩展成文章封面和动态贴纸体系。",
        coverTone: "from-zinc-100 via-white to-neutral-200",
        tools: ["Illustration", "Avatar", "Brand Asset"],
        highlights: ["黑白线条", "高识别度", "适合小尺寸", "可继续扩展"],
        role: "视觉素材整理",
        metrics: ["品牌识别", "多场景", "轻量素材"],
        access: {
            mode: "open",
            label: "下载素材",
            url: "/avatar.png",
        },
        gallery: ["头像", "文章封面", "卡片占位", "社交分享"],
    },
    {
        slug: "site-index",
        title: "旗下网站索引",
        type: "program",
        status: "已上线",
        date: "2026",
        summary: "把所有长期维护的网站入口集中展示，方便访客从一个地方找到主站、备用地址和后续新项目。",
        detail: "这是一个面向访问者的导航页，也是一份自己的线上资产清单。后续每增加一个站点，都可以在这里作为入口和说明页展示。",
        coverTone: "from-sky-100 via-white to-teal-100",
        tools: ["Information Architecture", "Web", "Navigation"],
        highlights: ["集中入口", "状态标记", "外链直达", "后续可扩展"],
        role: "信息架构 / 页面设计",
        metrics: ["站点索引", "线上入口", "持续扩展"],
        access: {
            mode: "closed",
        },
        href: "/sites",
    },
];

export const DEFAULT_SITES: SiteItem[] = [
    {
        name: "FuHeng Blog",
        url: "https://blog.fuheng.vip",
        description: "主站入口，放文章、动态、作品、友链和个人资料。这里是所有内容的起点。",
        platform: "Cloudflare Workers",
        role: "主站",
        status: "运行中",
        color: "bg-teal-600",
    },
    {
        name: "Worker 备用入口",
        url: "https://rin-blog-100759.100759.workers.dev",
        description: "Cloudflare Workers 默认域名，主域名异常时可以作为备用访问入口。",
        platform: "Cloudflare Workers",
        role: "备用",
        status: "运行中",
        color: "bg-orange-500",
    },
];

export function parseWorksConfig(value: unknown): WorkItem[] {
    return parseConfigArray<WorkItem>(value, DEFAULT_WORKS).map(normalizeWork);
}

export function parseSitesConfig(value: unknown): SiteItem[] {
    return parseConfigArray<SiteItem>(value, DEFAULT_SITES).map(normalizeSite);
}

function parseConfigArray<T>(value: unknown, fallback: T[]): T[] {
    if (Array.isArray(value)) {
        return value as T[];
    }

    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed as T[];
            }
        } catch {
            return fallback;
        }
    }

    return fallback;
}

function normalizeWork(work: WorkItem): WorkItem {
    return {
        ...work,
        tools: Array.isArray(work.tools) ? work.tools : [],
        highlights: Array.isArray(work.highlights) ? work.highlights : [],
        metrics: Array.isArray(work.metrics) ? work.metrics : [],
        gallery: Array.isArray(work.gallery) ? work.gallery : [],
        access: work.access || { mode: "closed" },
    };
}

function normalizeSite(site: SiteItem): SiteItem {
    return {
        ...site,
        platform: site.platform || "Cloudflare Workers",
        color: site.color || "bg-teal-600",
    };
}
