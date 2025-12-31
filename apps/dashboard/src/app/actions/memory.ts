"use server";

import { supermemory } from "@/lib/supermemory";
import { revalidatePath } from "next/cache";

export async function addMemory(content: string, tags: string[] = []) {
    try {
        const memory = await supermemory.memories.add({
            content,
            containerTags: tags,
        });

        // In a real app, we might want to trigger a refresh of the graph or stats
        revalidatePath("/");

        return { success: true, data: memory };
    } catch (error) {
        console.error("Failed to add memory:", error);
        return { success: false, error: "Failed to store memory" };
    }
}

export async function searchMemories(query: string, tags: string[] = []) {
    try {
        const searching = await supermemory.search.execute({
            q: query,
            containerTags: tags,
        });

        const results = searching.results.map((item: any) => ({
            content: item.chunks.map((chunk: any) => chunk.content).join(" "),
            metadata: item.metadata,
        }));

        return { success: true, data: results };
    } catch (error) {
        console.error("Search failed:", error);
        return { success: false, error: "Search failed" };
    }
}
