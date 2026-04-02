import { BalanceChartSkeleton } from "@/components/portfolio/BalanceChart";

export function PortfolioLoading() {
    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-16">
            <section className="animate-pulse border border-border bg-white/90 p-5 lg:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="h-4 w-32 bg-slate-200/80 dark:bg-slate-700/70" />
                        <div className="h-10 w-[min(100%,28rem)] bg-slate-200/80 dark:bg-slate-700/70" />
                        <div className="h-4 w-[min(100%,40rem)] bg-slate-200/70 dark:bg-slate-700/60" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="h-9 w-32 bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-9 w-32 bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-9 w-32 bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-9 w-32 bg-slate-200/70 dark:bg-slate-700/60" />
                    </div>
                </div>
            </section>

            <BalanceChartSkeleton />

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="animate-pulse border border-border bg-white/90 p-5 lg:p-6 space-y-4">
                    <div className="h-6 w-52 bg-slate-200/80 dark:bg-slate-700/70" />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={`snapshot-skeleton-${index}`} className="h-14 bg-slate-200/70 dark:bg-slate-700/60" />
                        ))}
                    </div>
                    <div className="h-44 bg-slate-200/70 dark:bg-slate-700/60" />
                </div>

                <div className="animate-pulse border border-border bg-white/90 p-5 lg:p-6 space-y-4">
                    <div className="h-6 w-44 bg-slate-200/80 dark:bg-slate-700/70" />
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={`position-skeleton-${index}`} className="h-20 bg-slate-200/70 dark:bg-slate-700/60" />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
