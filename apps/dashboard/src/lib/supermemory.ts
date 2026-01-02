import { Supermemory } from "supermemory";

const apiKey = process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY;

if (!apiKey) {
    throw new Error("NEXT_PUBLIC_SUPERMEMORY_API_KEY is not defined in environment variables");
}

export const supermemory = new Supermemory({
    apiKey,
});
