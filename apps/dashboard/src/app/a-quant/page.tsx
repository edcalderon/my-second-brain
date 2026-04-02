import Link from "next/link";
import {
    ArrowUpRight,
    CandlestickChart,
    ExternalLink,
    Gauge,
    ShieldCheck,
    Sparkles,
    Wallet,
} from "lucide-react";
import { dashboardPath, dashboardHref, publicSiteUrl } from "@/lib/public-site";
import { getHummingbotApiBase } from "@/lib/hummingbot-config";

const API_BASE = getHummingbotApiBase();

const walletAddress = "0x7544a933706abe1e2a3664b6e0b09ed16743743d";

const quickLinks = [
    {
        href: "/portfolio",
        title: "Portfolio Tracker",
        description: "Inspect the live Hyperliquid account, the Supabase snapshot trail, and the Aave health factor.",
        icon: Wallet,
    },
    {
        href: "/market?trading_pair=ETH-USD&interval=1h&limit=120",
        title: "Market Feed",
        description: "Review candles and strategy context before any paper execution.",
        icon: CandlestickChart,
    },
    {
        href: "/strategy",
        title: "Strategy Desk",
        description: "Preview signals and candidate entries without touching capital.",
        icon: Sparkles,
    },
    {
        href: "/risk",
        title: "Risk View",
        description: "Check portfolio concentration, drawdown posture, and leverage exposure.",
        icon: ShieldCheck,
    },
    {
        href: "/execution",
        title: "Execution",
        description: "Open or close paper trades against the official Hummingbot API backend.",
        icon: Gauge,
    },
];

const apiLinks = [
    {
        href: `${API_BASE}/trading/status`,
        title: "Trading status",
        description: "Connector inventory, wallet, and portfolio summary.",
    },
    {
        href: `${API_BASE}/trading/portfolio`,
        title: "Portfolio tracker",
        description: "Full tracker payload with positions, Aave status, and snapshot summary.",
    },
    {
        href: `${API_BASE}/trading/market?trading_pair=ETH-USD&interval=1h&limit=120`,
        title: "Market feed",
        description: "Candles plus signal preview for the default ETH-USD pair.",
    },
    {
        href: `${API_BASE}/trading/positions`,
        title: "Open positions",
        description: "Current paper-trading exposure for the Hyperliquid account.",
    },
];

const checklist = [
    "Open the portfolio tracker first and confirm the wallet and account match the live main account.",
    "Use the market feed to validate the current price context before you test an entry.",
    "Preview the strategy signal, then run a paper open or close from the execution page.",
];

export default function AQuantPortalPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            <section className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-[0_30px_120px_rgba(15,23,42,0.45)] sm:p-8 lg:p-10">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em]">
                        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-200">/a-quant/</span>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                            App shell enabled
                        </span>
                        <Link
                            href={dashboardHref("/")}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                        >
                            Dashboard home
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href={publicSiteUrl("/")}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                        >
                            Project directory
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                                    A-Quant Trading Portal
                                </h1>
                                <p className="max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                                    Dedicated control surface for the main Hyperliquid account. Use this page to test paper trading, inspect the
                                    portfolio tracker, and keep the market, strategy, risk, and execution flows inside the dashboard shell.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/portfolio"
                                    className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                                >
                                    Open portfolio tracker
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    href="/market?trading_pair=ETH-USD&interval=1h&limit=120"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
                                >
                                    Check market feed
                                    <CandlestickChart className="h-4 w-4" />
                                </Link>
                                <a
                                    href={API_BASE}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
                                >
                                    Live API
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <InfoTile label="Main account" value={walletAddress} mono />
                            <InfoTile label="App route" value={dashboardPath("/a-quant")} mono />
                            <InfoTile label="API base" value={API_BASE} mono />
                            <InfoTile label="Paper mode" value="Enabled for testing" />
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {quickLinks.map((item) => (
                        <Link
                            key={item.title}
                            href={item.href}
                            className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"
                        >
                            <div className="flex h-full flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <item.icon className="h-5 w-5 text-cyan-200 transition group-hover:text-cyan-100" />
                                    <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:text-cyan-200" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-base font-semibold text-white">{item.title}</h2>
                                    <p className="text-sm leading-6 text-slate-300">{item.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Testing workflow</p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">Start paper testing from here</h2>
                            </div>
                            <Wallet className="h-5 w-5 text-cyan-200" />
                        </div>

                        <div className="mt-6 space-y-3">
                            {checklist.map((item, index) => (
                                <div
                                    key={item}
                                    className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-100">
                                        {index + 1}
                                    </div>
                                    <p className="text-sm leading-7 text-slate-300">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">API surface</p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">Direct endpoints for testing</h2>
                            </div>
                            <ShieldCheck className="h-5 w-5 text-emerald-200" />
                        </div>

                        <div className="mt-6 space-y-3">
                            {apiLinks.map((item) => (
                                <a
                                    key={item.title}
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="group block rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.08]"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-white">{item.title}</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                                        </div>
                                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-emerald-200" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
            </section>
        </div>
    );
}

function InfoTile({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className={`mt-2 text-sm font-medium text-white ${mono ? "break-all font-mono text-xs leading-6" : "leading-6"}`}>
                {value}
            </p>
        </div>
    );
}
