import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface TableOfContent {
    index: number
    text: string
    marginLeft: number
    level: number
    element: HTMLElement
}

const getHeaderScrollOffset = () => {
    const rawValue = getComputedStyle(document.documentElement)
        .getPropertyValue('--header-scroll-offset')
        .trim()
    const offset = Number.parseFloat(rawValue)
    return Number.isFinite(offset) ? offset : 0
}

const useTableOfContents = (selector: string) => {
    const intersectingListRef = useRef<boolean[]>([]) // isIntersecting array
    const [tableOfContents, setTableOfContents] = useState<TableOfContent[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const { t } = useTranslation()
    const io = useRef<IntersectionObserver | null>(null);
    const [ref, setRef] = useState("-1")
    const lastRef = useRef("")

    useEffect(() => {
        if (lastRef.current === ref) return
        const content = document.querySelector(selector)
        if (!content) return
        const intersectingList = intersectingListRef.current
        const headers = content.querySelectorAll<HTMLElement>(
            'h1, h2, h3, h4, h5, h6'
        ) // all headers

        // set TableOfContents
        const tocData = Array.from(headers).map<TableOfContent>((header, i) => ({
            index: i,
            text: header.textContent || '',
            marginLeft: (Number(header.tagName.charAt(1)) - 1) * 10,
            level: Number(header.tagName.charAt(1)),
            element: header, // have to down little bit
        }))
        setTableOfContents(tocData)

        // create IntersectionObserver
        if (io.current) io.current.disconnect()
        io.current = new IntersectionObserver(
            (entries) => {
                // save isIntersecting info to array using data-id
                entries.forEach(({ target, isIntersecting }) => {
                    const idx = Number((target as HTMLElement).dataset.id || 0)
                    intersectingList[idx] = isIntersecting
                })
                // get activeIndex
                const currentIndex = intersectingList.findIndex((item) => item)
                let activeIndex = currentIndex - 1
                if (currentIndex === -1) {
                    activeIndex = intersectingList.length - 1
                } else if (currentIndex === 0) {
                    activeIndex = 0
                }
                setActiveIndex(activeIndex)
            },
            { rootMargin: "-20% 0px 10000px 0px", threshold: 0 }
        )
        intersectingList.length = 0 // reset array
        headers.forEach((header, i) => {
            if (header.getAttribute('data-id') !== null) return
            header.setAttribute('data-id', i.toString()) // set data-id
            intersectingList.push(false) // increase array length
            io.current!.observe(header) // register to observe
        })
        lastRef.current = ref
        return () => {
            if (io.current) io.current.disconnect()
        }
    }, [ref])

    const cleanup = (newId: string) => {
        if (lastRef.current === newId) return
        setRef(newId)
        if (io.current) io.current.disconnect()
    }

    return {
        TOC: () => (<div className="t-primary">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="site-kicker">Outline</p>
                    <h2 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">{t("index.title")}</h2>
                </div>
                <span className="rounded-full border border-black/8 bg-white/60 px-2.5 py-1 text-[11px] text-neutral-400 dark:border-white/10 dark:bg-white/[0.05]">
                    {tableOfContents.length || 0} 节
                </span>
            </div>
            <ul className="max-h-[calc(100vh-12rem)] overflow-auto pr-1" style={{ scrollbarWidth: "none" }}>
                {tableOfContents.length === 0 && (
                    <li className="rounded-[16px] border border-dashed border-black/8 bg-white/50 px-4 py-5 text-center text-sm text-neutral-400 dark:border-white/10 dark:bg-white/[0.04]">
                        {t("index.empty.title")}
                    </li>
                )}
                {tableOfContents.map((item) => (
                    <li
                        key={`toc$${item.index}`}
                        className="relative"
                    >
                        <button
                            type="button"
                            className={`group relative flex w-full items-start gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-sm leading-5 transition ${
                                activeIndex === item.index
                                    ? "bg-theme/10 text-theme"
                                    : "text-neutral-500 hover:bg-black/[0.035] hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                            }`}
                            style={{ paddingLeft: 10 + Math.max(item.level - 2, 0) * 14 }}
                            onClick={() => {
                                const top = item.element.getBoundingClientRect().top + window.scrollY - getHeaderScrollOffset()
                                window.scrollTo({
                                    top: Math.max(top, 0),
                                    behavior: 'smooth'
                                })
                            }}
                        >
                            <span className={`mt-2 size-1.5 shrink-0 rounded-full transition ${
                                activeIndex === item.index ? "bg-theme" : "bg-neutral-300 group-hover:bg-theme/60 dark:bg-neutral-600"
                            }`} />
                            <span className="line-clamp-2">{item.text}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>), cleanup
    }
}

export default useTableOfContents
