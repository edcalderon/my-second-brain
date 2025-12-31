"use client";

import { useState } from "react";
import { Brain, Send, Loader2, Plus, X } from "lucide-react";
import { addMemory } from "@/app/actions/memory";
import { cn } from "@/lib/utils";

export default function AddMemoryForm() {
    const [content, setContent] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsPending(true);
        setMessage(null);

        const result = await addMemory(content, tags);

        if (result.success) {
            setContent("");
            setTags([]);
            setMessage({ type: "success", text: "Memory successfully added to your second brain!" });
        } else {
            setMessage({ type: "error", text: "Failed to store memory. Please try again." });
        }
        setIsPending(false);
    };

    return (
        <section className="glass-panel p-6 rounded-2xl flex flex-col h-full">
            <div className="flex items-center space-x-2 text-accent mb-6">
                <Brain size={20} />
                <span className="font-semibold uppercase tracking-wider text-xs">Capture Moment</span>
            </div>

            <h3 className="text-xl font-bold mb-4">Add new memory</h3>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                <div className="flex-1">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind? Capture an idea, link, or snippet..."
                        className="w-full h-40 bg-white/5 border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all hover:bg-white/10 resize-none"
                        disabled={isPending}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-medium">Tags (Press Enter to add)</label>
                    <div className="flex flex-wrap gap-2 p-2 bg-white/5 border border-border rounded-xl min-h-[44px]">
                        {tags.map(tag => (
                            <span key={tag} className="flex items-center bg-accent/20 text-accent text-xs px-2 py-1 rounded-md border border-accent/30 group">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="ml-1.5 hover:text-white transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            className="flex-1 bg-transparent border-none text-sm focus:outline-none min-w-[120px]"
                            placeholder={tags.length === 0 ? "Add tags like #project, #idea..." : ""}
                            disabled={isPending}
                        />
                    </div>
                </div>

                {message && (
                    <div className={cn(
                        "text-sm p-3 rounded-lg border",
                        message.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                    )}>
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending || !content.trim()}
                    className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-accent/20 flex items-center justify-center space-x-2 group mt-auto"
                >
                    {isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <span>Store in Memory</span>
                            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </section>
    );
}
