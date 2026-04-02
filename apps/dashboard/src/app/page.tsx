import Link from "next/link";
import type { ReactNode } from "react";
import { Brain, BookOpen, Layers, ExternalLink, Globe, Package } from "lucide-react";
import { dashboardPath, publicSiteUrl } from "@/lib/public-site";

const packageLinks = [
    {
        name: "versioning",
        href: "https://github.com/edcalderon/my-second-brain/tree/main/packages/versioning",
        description: "Release automation, README sync, and repo guardrails",
    },
    {
        name: "auth",
        href: "https://github.com/edcalderon/my-second-brain/tree/main/packages/auth",
        description: "Auth utilities, provisioning docs, and client helpers",
    },
    {
        name: "gcp-functions",
        href: "https://github.com/edcalderon/my-second-brain/tree/main/packages/gcp-functions",
        description: "Cloud Functions for sync, status, and screenshot automation",
    },
];

export default function OverviewPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-16">
            <header className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {dashboardPath("/")}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                        A-Quant now lives at /a-quant
                    </span>
                </div>
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400 transition-colors">
                        Knowledge Workspace
                    </p>
                    <h1 className="text-4xl font-semibold text-gray-900 dark:text-white transition-colors">
                        Second Brain Dashboard
                    </h1>
                    <p className="max-w-3xl text-gray-600 dark:text-gray-400 transition-colors">
                        A focused workspace for notes, memory graphs, documents, and agents. The second brain now keeps the A-Quant workspace inside the app shell at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">{dashboardPath("/a-quant")}</code>.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <InlineLink href="/knowledge" icon={<BookOpen className="h-4 w-4" />} label="Open Knowledge Base" />
                    <InlineLink href="/memory-graph" icon={<Brain className="h-4 w-4" />} label="View Memory Graph" />
                    <InlineLink href="/documentation" icon={<Layers className="h-4 w-4" />} label="Read Documentation" />
                    <InlineLink href={publicSiteUrl("/")} icon={<Globe className="h-4 w-4" />} label="Project Directory" />
                </div>
            </header>

            <section className="grid gap-4 lg:grid-cols-2">
                <Card
                    title="Second Brain Workspace"
                    icon={<Brain className="h-5 w-5" />}
                >
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                        <p>
                            Keep the knowledge system centered on notes, documents, and the memory graph. This is the canonical surface for the personal brain.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ActionLink
                                href="/knowledge"
                                icon={<BookOpen className="h-4 w-4" />}
                                title="Knowledge Base"
                                description="Browse captured notes and summaries"
                            />
                            <ActionLink
                                href="/memory-graph"
                                icon={<Brain className="h-4 w-4" />}
                                title="Memory Graph"
                                description="Inspect linked ideas and context"
                            />
                            <ActionLink
                                href="/documentation"
                                icon={<Layers className="h-4 w-4" />}
                                title="Docs"
                                description="Read the live runbook and docs"
                            />
                            <ActionLink
                                href="/agents"
                                icon={<ExternalLink className="h-4 w-4" />}
                                title="Agents"
                                description="Open the execution and helper tools"
                            />
                        </div>
                    </div>
                </Card>

                <Card
                    title="Project Registry"
                    icon={<Globe className="h-5 w-5" />}
                >
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                        <p>
                            The root site is a directory, not an application shell. Use it to navigate between the published projects and package surfaces.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ActionLink
                                href={publicSiteUrl("/")}
                                icon={<Globe className="h-4 w-4" />}
                                title="Directory Root"
                                description="Portal for all public project surfaces"
                            />
                            <ActionLink
                                href="/a-quant"
                                icon={<Package className="h-4 w-4" />}
                                title="A-Quant Workspace"
                                description="Dedicated trading and infra entrypoint inside the app shell"
                            />
                            {packageLinks.map((pkg) => (
                                <ActionLink
                                    key={pkg.name}
                                    href={pkg.href}
                                    icon={<ExternalLink className="h-4 w-4" />}
                                    title={`Package: ${pkg.name}`}
                                    description={pkg.description}
                                    external
                                />
                            ))}
                        </div>
                    </div>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <StatCard title="Primary Path" value="Knowledge first" detail="Second Brain stays focused on context and recall" />
                <StatCard title="Project Split" value="Cleanly separated" detail="A-Quant moves to its own portal and domain" />
                <StatCard title="Packages" value="3 core workspaces" detail="Versioning, auth, and GCP functions" />
            </section>
        </div>
    );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className="glass-panel rounded-3xl p-6 transition-colors">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{title}</h2>
                <div className="text-emerald-700 dark:text-emerald-400 transition-colors">{icon}</div>
            </div>
            <div className="mt-4">{children}</div>
        </div>
    );
}

function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
    return (
        <div className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 shadow-sm transition-colors">
            <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors">{title}</div>
            <div className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white transition-colors">{value}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 transition-colors">{detail}</div>
        </div>
    );
}

interface ActionLinkProps {
    href: string;
    icon: ReactNode;
    title: string;
    description: string;
    external?: boolean;
}

function ActionLink({ href, icon, title, description, external = false }: ActionLinkProps) {
    return (
        <Link
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer noopener" : undefined}
            className="block min-w-0 overflow-hidden"
        >
            <div className="group w-full rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer">
                <div className="flex items-center gap-3 w-full border-box">
                    <div className="text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-900 dark:group-hover:text-emerald-300 transition-colors flex-shrink-0">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white transition-colors truncate">{title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors">{description}</p>
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors flex-shrink-0">
                        →
                    </div>
                </div>
            </div>
        </Link>
    );
}

function InlineLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}
