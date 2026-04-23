import { useLocation } from "wouter"

export function HashTag({ name }: { name: string }) {
    const [_, setLocation] = useLocation()
    return (
        <button onClick={(e) => { e.preventDefault(); setLocation(`/hashtag/${name}`) }}
            className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-pretty overflow-hidden transition-colors hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-theme/15" >
            <div className="flex gap-0.5 text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-300">
                <div className="opacity-70 italic">#</div>
                <div className="opacity-80">
                    {name}
                </div>
            </div>
        </button >
    )
}
