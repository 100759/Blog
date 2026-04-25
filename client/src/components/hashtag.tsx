import { useLocation } from "wouter"

export function HashTag({ name }: { name: string }) {
    const [_, setLocation] = useLocation()
    return (
        <button onClick={(e) => { e.preventDefault(); setLocation(`/hashtag/${name}`) }}
            className="inline-flex items-center rounded-full border border-black/8 bg-black/[0.025] px-2.5 py-1 text-pretty overflow-hidden transition-colors hover:border-theme/20 hover:bg-theme/8 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-theme/12" >
            <div className="flex gap-0.5 text-[10px] font-medium tracking-[0.06em] text-neutral-600 dark:text-neutral-300 sm:text-[11px] sm:tracking-[0.08em]">
                <div className="opacity-60 italic">#</div>
                <div className="opacity-75">
                    {name}
                </div>
            </div>
        </button >
    )
}
