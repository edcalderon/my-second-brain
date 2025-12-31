"use client";

import dynamic from "next/dynamic";
import { Info, Maximize2, RefreshCw } from "lucide-react";
import { useState } from "react";

const MemoryGraph = dynamic(
    () => import("@supermemory/memory-graph").then((mod) => mod.MemoryGraph),
    { ssr: false }
);

// Mock data using the correct DocumentWithMemories structure
const mockData = [
    {
        id: "doc-1",
        title: "Supermemory Documentation",
        url: "https://supermemory.ai/docs",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "done" as const,
        orgId: "org-1",
        userId: "user-1",
        contentHash: "hash-1",
        memoryEntries: [
            {
                id: "mem-1",
                documentId: "doc-1",
                content: "Memory Graph Intro: Interactive network visualization.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: "mem-2",
                documentId: "doc-1",
                content: "Performance: Canvas-based rendering for 100+ nodes.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    },
    {
        id: "doc-2",
        title: "Browser Support",
        url: "https://supermemory.ai/docs/browsers",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "done" as const,
        orgId: "org-1",
        userId: "user-1",
        contentHash: "hash-2",
        memoryEntries: [
            {
                id: "mem-3",
                documentId: "doc-2",
                content: "Supported: Chrome, Firefox, Safari, Edge.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    },
];

export default function MemoryGraphPage() {
    const [documents] = useState(mockData);

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center">
                        <BrainCircuit className="mr-2 text-accent" />
                        Memory Graph Explorer
                    </h1>
                    <p className="text-sm text-gray-400">Visualize semantical relationships in real-time</p>
                </div>

                <div className="flex items-center space-x-2">
                    <button className="p-2 bg-white/5 border border-border rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                        <RefreshCw size={18} />
                    </button>
                    <button className="p-2 bg-white/5 border border-border rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 glass-panel rounded-2xl overflow-hidden relative border-accent/20">
                <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
                    <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-border text-xs space-y-3">
                        <div className="font-bold text-gray-300 uppercase tracking-widest text-[10px] mb-1">Legend</div>
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-accent rounded-sm" />
                            <span>Documents</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full" />
                            <span>Memories</span>
                        </div>
                    </div>
                </div>

                <div className="w-full h-full bg-black/20">
                    <MemoryGraph
                        documents={documents}
                        className="w-full h-full"
                    />
                </div>

                <div className="absolute bottom-4 left-4 z-10">
                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-border flex items-center space-x-2 text-xs text-gray-400">
                        <Info size={14} className="text-accent" />
                        <span>Pan to move • Scroll to zoom • Drag to organize</span>
                    </div>
                </div>
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
