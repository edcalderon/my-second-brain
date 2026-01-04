"use client";

import { useEffect, useState } from "react";
import { Book, Calendar, Tag, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { apiCall } from "@/lib/api-config";

export default function KnowledgePage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{
        type: 'success' | 'error' | 'info' | null;
        message: string;
    }>({ type: null, message: '' });
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    });
    const [source, setSource] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [status, setStatus] = useState<any>(null);

    const fetchEntries = async (page = 1, pageSize = 10, currentSource = '') => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString()
            });
            
            if (currentSource) {
                params.append('source', currentSource);
            }

            const response = await fetch(`/my-second-brain/api/knowledge?${params}`);
            const data = await response.json();

            if (response.ok) {
                setEntries(data.entries);
                setPagination(data.pagination);
            } else {
                console.error("Error fetching knowledge base:", data.error);
            }
        } catch (error) {
            console.error("Error fetching knowledge base:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            setSyncStatus({ type: 'info', message: 'Starting sync...' });
            
            const response = await fetch('/my-second-brain/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: 'rocketbook' })
            });

            const result = await response.json();
            
            if (response.ok) {
                setSyncStatus({ 
                    type: 'success', 
                    message: `Sync completed: ${result.processed} items processed` 
                });
                await fetchEntries(pagination.page, pagination.pageSize, source);
                
                setTimeout(() => setSyncStatus({ type: null, message: '' }), 5000);
            } else {
                setSyncStatus({ 
                    type: 'error', 
                    message: `Sync failed: ${result.error}` 
                });
                setTimeout(() => setSyncStatus({ type: null, message: '' }), 5000);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setSyncStatus({ 
                type: 'error', 
                message: `Sync error: ${errorMessage}` 
            });
            setTimeout(() => setSyncStatus({ type: null, message: '' }), 5000);
        } finally {
            setSyncing(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchEntries(newPage, pagination.pageSize, source);
        }
    };

    const handleSourceChange = (newSource: string) => {
        setSource(newSource);
        fetchEntries(1, pagination.pageSize, newSource);
    };

    const fetchStatus = async () => {
        try {
            const response = await fetch('/my-second-brain/api/status');
            const statusData = await response.json();
            
            if (response.ok) {
                setStatus(statusData);
            }
        } catch (error) {
            console.error('Status fetch error:', error);
        }
    };

    useEffect(() => {
        fetchEntries(1, 10, source);
        fetchStatus();
        
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
                <header>
                    <div className="flex items-center space-x-3 mb-2">
                        <Book className="text-accent w-8 h-8" />
                        <h1 className="text-4xl font-extrabold tracking-tight">
                            Knowledge Base
                        </h1>
                    </div>
                    <p className="text-gray-400 text-lg">Loading...</p>
                </header>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
                <header>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <Book className="text-accent w-8 h-8" />
                            <h1 className="text-4xl font-extrabold tracking-tight">
                                Knowledge Base
                            </h1>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-border/30 hover:bg-white/5 transition-all"
                            >
                                <Filter size={16} />
                                <span>Filters</span>
                            </button>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                                <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 text-lg">AI-structured insights from your Rocketbook scans.</p>
                        {status && (
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        status.status === 'healthy' ? 'bg-green-500' : 
                                        status.status === 'unavailable' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} />
                                    <span className="text-gray-400">
                                        {status.knowledgeBase?.totalEntries || 0} total entries
                                    </span>
                                </div>
                                {status.knowledgeBase?.entriesLast24h > 0 && (
                                    <span className="text-green-400">
                                        +{status.knowledgeBase.entriesLast24h} in last 24h
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {syncStatus.type && (
                        <div className={`mt-4 p-4 rounded-lg border ${
                            syncStatus.type === 'success' 
                                ? 'bg-green-900/20 border-green-500/30 text-green-300'
                                : syncStatus.type === 'error'
                                ? 'bg-red-900/20 border-red-500/30 text-red-300'
                                : 'bg-blue-900/20 border-blue-500/30 text-blue-300'
                        }`}>
                            <p className="text-sm">{syncStatus.message}</p>
                        </div>
                    )}
                    
                    {showFilters && (
                        <div className="mt-4 p-4 rounded-lg border border-border/30 bg-black/40">
                            <div className="flex items-center space-x-4">
                                <label className="text-sm text-gray-300">Source:</label>
                                <select
                                    value={source}
                                    onChange={(e) => handleSourceChange(e.target.value)}
                                    className="px-3 py-1 rounded border border-border/50 bg-black/40 text-white"
                                >
                                    <option value="">All Sources</option>
                                    <option value="rocketbook_imap">Rocketbook</option>
                                </select>
                            </div>
                        </div>
                    )}
                </header>

            <div className="space-y-6">
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>
                        Showing {entries.length} of {pagination.totalCount} entries
                        {source && ` from ${source}`}
                    </span>
                    <div className="flex items-center space-x-2">
                        <select
                            value={pagination.pageSize}
                            onChange={(e) => fetchEntries(1, parseInt(e.target.value), source)}
                            className="px-2 py-1 rounded border border-border/50 bg-black/40 text-white"
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-6">
                    {entries.length === 0 ? (
                        <div className="glass-panel p-12 rounded-2xl text-center">
                            <p className="text-gray-500">No knowledge entries found. Try syncing your Rocketbook scans.</p>
                        </div>
                    ) : (
                        entries.map((entry) => (
                        <div key={entry.id} className="glass-panel p-6 rounded-2xl hover:border-accent/40 transition-colors group">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                                        <Calendar size={14} />
                                        <span>{new Date(entry.metadata?.received_at).toLocaleDateString()}</span>
                                        <span className="text-gray-600">•</span>
                                        <span className="font-mono text-accent/80">{entry.id}</span>
                                    </div>

                                    <h2 className="text-2xl font-bold group-hover:text-accent transition-colors">
                                        {entry.content?.title}
                                    </h2>

                                    <p className="text-gray-300 leading-relaxed max-w-3xl">
                                        {entry.content?.summary}
                                    </p>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {entry.content?.tags?.map((tag: string) => (
                                            <span key={tag} className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                                                <Tag size={10} />
                                                <span>{tag}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <div className="p-4 rounded-xl bg-black/40 border border-border/50">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Action Items</h4>
                                        <ul className="space-y-2">
                                            {entry.content?.action_items?.slice(0, 3).map((item: string, idx: number) => (
                                                <li key={idx} className="text-xs text-gray-400 flex items-start">
                                                    <span className="text-accent mr-2">•</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                            {(!entry.content?.action_items || entry.content.action_items.length === 0) && (
                                                <li className="text-xs text-gray-600 italic">No actions identified.</li>
                                            )}
                                        </ul>
                                    </div>

                                    <a
                                        href={entry.raw_storage_path?.replace("gs://", "https://storage.googleapis.com/")}
                                        target="_blank"
                                        className="text-xs text-gray-500 hover:text-white flex items-center justify-center p-2 rounded-lg border border-border/30 hover:bg-white/5 transition-all"
                                    >
                                        View Raw Source <ExternalLink size={12} className="ml-2" />
                                    </a>
                                </div>
                            </div>
                        </div>
                        ))
                    )}
                </div>

                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-4 mt-8">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrevPage}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-border/30 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center space-x-2">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                const pageNum = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-10 h-10 rounded-lg border transition-all ${
                                            pageNum === pagination.page
                                                ? 'bg-accent text-white border-accent'
                                                : 'border-border/30 hover:bg-white/5'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={!pagination.hasNextPage}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-border/30 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Next</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
