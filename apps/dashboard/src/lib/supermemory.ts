import { Supermemory } from "supermemory";

const apiKey = process.env.SUPERMEMORY_API_KEY;

if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not defined in environment variables");
}

export const supermemory = new Supermemory({
    apiKey,
});
