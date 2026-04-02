import { BalanceChartSkeleton } from "@/components/portfolio/BalanceChart";

export function PortfolioLoading() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            <section className="glass-panel animate-pulse rounded-[32px] p-6 lg:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="h-4 w-32 rounded-full bg-slate-200/80 dark:bg-slate-700/70" />
                        <div className="h-10 w-[min(100%,28rem)] rounded-2xl bg-slate-200/80 dark:bg-slate-700/70" />
                        <div className="h-4 w-[min(100%,40rem)] rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="h-9 w-32 rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-9 w-32 rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-9 w-32 rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-9 w-32 rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                    </div>
                </div>
            </section>

            <BalanceChartSkeleton />

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="glass-panel animate-pulse rounded-[32px] p-6 lg:p-7 space-y-4">
                    <div className="h-6 w-52 rounded-full bg-slate-200/80 dark:bg-slate-700/70" />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={`snapshot-skeleton-${index}`} className="h-14 rounded-2xl bg-slate-200/70 dark:bg-slate-700/60" />
                        ))}
                    </div>
                    <div className="h-44 rounded-[24px] bg-slate-200/70 dark:bg-slate-700/60" />
                </div>

                <div className="glass-panel animate-pulse rounded-[32px] p-6 lg:p-7 space-y-4">
                    <div className="h-6 w-44 rounded-full bg-slate-200/80 dark:bg-slate-700/70" />
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={`position-skeleton-${index}`} className="h-20 rounded-[24px] bg-slate-200/70 dark:bg-slate-700/60" />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
