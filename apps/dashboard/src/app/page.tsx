import {
    Info,
    Zap,
    ExternalLink,
    Layers,
    Cpu,
    Monitor
} from "lucide-react";
import Link from "next/link";
import AddMemoryForm from "@/components/dashboard/AddMemoryForm";

export default function DashboardPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            <header>
                <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center">
                    Supermemory Dashboard
                </h1>
                <p className="text-gray-400 text-lg">Your AI second brain command center.</p>
            </header>

            <section className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <BrainCircuit size={120} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-accent mb-4">
                        <Info size={20} />
                        <span className="font-semibold uppercase tracking-wider text-xs">Getting Started</span>
                    </div>

                    <h2 className="text-3xl font-bold mb-6">What is Memory Graph?</h2>

                    <div className="grid lg:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <p className="text-gray-300 leading-relaxed">
                                Memory Graph is an interactive network visualization of your Supermemory documents and memories.
                                It helps you see relationships, similarity, and the overall structure of your knowledge base.
                            </p>

                            <ul className="space-y-3">
                                <li className="flex items-start">
                                    <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3" />
                                    <span><strong className="text-white">Documents</strong> appear as rectangular nodes</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3" />
                                    <span><strong className="text-white">Memories</strong> appear as hexagonal nodes</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="w-2 h-2 rounded-full bg-accent mt-2 mr-3" />
                                    <span><strong className="text-white">Connections</strong> show relationships and similarity</span>
                                </li>
                            </ul>

                            <div className="pt-4">
                                <Link
                                    href="/memory-graph"
                                    className="bg-accent hover:bg-accent/80 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-accent/20 inline-flex items-center group"
                                >
                                    Explore Your Graph
                                    <Zap className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        <div className="bg-black/40 rounded-xl p-6 border border-border/50">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <Monitor className="mr-2 w-4 h-4 text-accent" />
                                Performance First
                            </h3>
                            <p className="text-sm text-gray-400 mb-6 font-medium">
                                Built for scale, the graph handles hundreds of nodes through advanced rendering techniques.
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/30">
                                    <span className="text-sm">Canvas 2D Rendering</span>
                                    <div className="text-xs font-mono text-accent">Smooth 60FPS</div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/30">
                                    <span className="text-sm">Viewport Culling</span>
                                    <div className="text-xs font-mono text-accent">Only Draws Visible</div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/30">
                                    <span className="text-sm">LoD Optimization</span>
                                    <div className="text-xs font-mono text-accent">Adaptive Detail</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid md:grid-cols-3 gap-6">
                <StatCard title="Total Memories" value="1,284" change="+12% this week" />
                <StatCard title="Connected Docs" value="342" change="+5% this week" />
                <StatCard title="Active Agents" value="3" change="Running smoothly" />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <AddMemoryForm />
                </div>

                <div className="lg:col-span-1">
                    <section className="glass-panel p-6 rounded-2xl h-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center">
                            <Layers className="mr-2 w-5 h-5 text-accent" />
                            Use Cases
                        </h3>
                        <div className="space-y-4 text-gray-400">
                            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-border/50 cursor-default">
                                <h4 className="text-white font-medium mb-1 text-sm">Knowledge Graphs</h4>
                                <p className="text-xs leading-relaxed">Show how documents and memories connect Semantically.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-border/50 cursor-default">
                                <h4 className="text-white font-medium mb-1 text-sm">Navigate Spaces</h4>
                                <p className="text-xs leading-relaxed">Filter and browse by workspace or tag using the visual interface.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-border/50 cursor-default">
                                <h4 className="text-white font-medium mb-1 text-sm">Memory Browsers</h4>
                                <p className="text-xs leading-relaxed">Give users a visual bird's-eye view of their stored brain content.</p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-1">
                    <section className="glass-panel p-6 rounded-2xl h-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center">
                            <Cpu className="mr-2 w-5 h-5 text-accent" />
                            Requirements
                        </h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {['Chrome', 'Firefox', 'Safari', 'Edge'].map(browser => (
                                    <div key={browser} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-border/30">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium">{browser}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 rounded-xl border border-dashed border-border/50 bg-accent/5">
                                <p className="text-sm text-gray-300 mb-2">Technical specs:</p>
                                <ul className="text-xs text-gray-500 space-y-1 font-mono">
                                    <li>• Canvas 2D API</li>
                                    <li>• ES2020 JavaScript</li>
                                    <li>• CSS Custom Properties</li>
                                </ul>
                            </div>
                            <a
                                href="https://supermemory.ai/docs/memory-graph"
                                target="_blank"
                                className="text-accent hover:underline text-sm flex items-center group font-medium"
                            >
                                Official Documentation
                                <ExternalLink className="ml-1 w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change }: { title: string, value: string, change: string }) {
    return (
        <div className="glass-panel p-6 rounded-2xl hover:border-accent/50 transition-colors cursor-default">
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <div className="flex items-end space-x-3 mt-2">
                <h4 className="text-3xl font-extrabold">{value}</h4>
                <span className="text-xs text-accent mb-1.5 font-medium">{change}</span>
            </div>
        </div>
    );
}

function BrainCircuit({ size = 24, className = "" }: { size?: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.44 2.5 2.5 0 0 0-1.56 3.28 2.5 2.5 0 0 0 .39 4.82 2.5 2.5 0 0 0 1.41 4.29 2.5 2.5 0 0 0 4.72 0 2.5 2.5 0 0 0 1.41-4.29 2.5 2.5 0 0 0 .39-4.82 2.5 2.5 0 0 0-1.56-3.28A2.5 2.5 0 0 0 12 4.5z" />
            <path d="M12 8v4" />
            <path d="M12 16v0" />
            <path d="M8 11h.01" />
            <path d="M16 11h.01" />
        </svg>
    );
}
