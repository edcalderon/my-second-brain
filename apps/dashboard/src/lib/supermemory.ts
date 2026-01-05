import { Supermemory } from "supermemory";

const apiKey = process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY || "dummy-key-for-build";

let supermemoryInstance: Supermemory | null = null;

export function getSupermemory() {
    if (!supermemoryInstance) {
        if (!process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY) {
            throw new Error("NEXT_PUBLIC_SUPERMEMORY_API_KEY is not defined in environment variables");
        }
        supermemoryInstance = new Supermemory({
            apiKey: process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY,
        });
    }
    return supermemoryInstance;
}

// For backward compatibility
export const supermemory = {
    memories: {
        add: async (data: any) => {
            return getSupermemory().memories.add(data);
        },
    },
};
