import { db } from "@/lib/firebase-admin";
import { Book, Calendar, Tag, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
    let entries: any[] = [];

    try {
        const snapshot = await db.collection("knowledge_base").orderBy("created_at", "desc").limit(20).get();
        entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching knowledge base:", error);
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            <header>
                <div className="flex items-center space-x-3 mb-2">
                    <Book className="text-accent w-8 h-8" />
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Knowledge Base
                    </h1>
                </div>
                <p className="text-gray-400 text-lg">AI-structured insights from your Rocketbook scans.</p>
            </header>

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
                                        <span>{new Date(entry.metadata.received_at).toLocaleDateString()}</span>
                                        <span className="text-gray-600">•</span>
                                        <span className="font-mono text-accent/80">{entry.id}</span>
                                    </div>

                                    <h2 className="text-2xl font-bold group-hover:text-accent transition-colors">
                                        {entry.content.title}
                                    </h2>

                                    <p className="text-gray-300 leading-relaxed max-w-3xl">
                                        {entry.content.summary}
                                    </p>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {entry.content.tags?.map((tag: string) => (
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
                                            {entry.content.action_items?.slice(0, 3).map((item: string, idx: number) => (
                                                <li key={idx} className="text-xs text-gray-400 flex items-start">
                                                    <span className="text-accent mr-2">•</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                            {(!entry.content.action_items || entry.content.action_items.length === 0) && (
                                                <li className="text-xs text-gray-600 italic">No actions identified.</li>
                                            )}
                                        </ul>
                                    </div>

                                    <a
                                        href={entry.raw_storage_path.replace("gs://", "https://storage.googleapis.com/")}
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
        </div>
    );
}
