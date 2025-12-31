import { Supermemory } from "supermemory";

if (!process.env.SUPERMEMORY_API_KEY) {
    throw new Error("SUPERMEMORY_API_KEY is not defined in environment variables");
}

export const supermemory = new Supermemory({
    apiKey: process.env.SUPERMEMORY_API_KEY,
});
