import { Brain, Zap, Settings, Plus } from "lucide-react";

const agents = [
    {
        id: 1,
        name: "Learning Assistant",
        description: "Helps organize and summarize your learning materials",
        status: "active",
        lastActive: "2 hours ago",
    },
    {
        id: 2,
        name: "Documents Analyzer",
        description: "Analyzes and extracts insights from your documents",
        status: "active",
        lastActive: "30 minutes ago",
    },
    {
        id: 3,
        name: "Memory Graph Builder",
        description: "Builds and maintains your knowledge graph connections",
        status: "idle",
        lastActive: "1 hour ago",
    },
];

export default function AgentsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Agents
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage your AI agents and automations
                    </p>
                </div>
                <button className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors font-medium">
                    <Plus className="w-4 h-4 mr-2" />
                    New Agent
                </button>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                    <div
                        key={agent.id}
                        className="rounded-xl border border-border bg-white dark:bg-gray-800/50 p-6 backdrop-blur-sm hover:border-accent/40 transition-colors cursor-pointer group"
                    >
                        {/* Agent Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-2 bg-accent/10 dark:bg-accent/20 rounded-lg group-hover:bg-accent/20 transition-colors">
                                <Brain className="w-5 h-5 text-accent" />
                            </div>
                            <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                                agent.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                            }`}>
                                {agent.status}
                            </div>
                        </div>

                        {/* Agent Info */}
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {agent.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {agent.description}
                        </p>

                        {/* Last Active */}
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            Last active: {agent.lastActive}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-border dark:border-gray-700">
                            <button className="flex-1 px-2 py-1 text-xs rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300">
                                Configure
                            </button>
                            <button className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors">
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Documentation */}
            <div className="rounded-xl border border-border bg-white dark:bg-gray-800/50 p-8 backdrop-blur-sm text-center">
                <Zap className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Build Custom Agents
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Create AI agents tailored to your workflow using our agent builder
                </p>
            </div>
        </div>
    );
}
