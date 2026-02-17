import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                card: "var(--card)",
                "card-foreground": "var(--card-foreground)",
                popover: "var(--card)",
                "popover-foreground": "var(--card-foreground)",
                primary: "var(--accent)",
                "primary-foreground": "var(--accent-foreground)",
                secondary: "var(--muted-foreground)",
                "secondary-foreground": "var(--foreground)",
                muted: "var(--muted-foreground)",
                "muted-foreground": "var(--muted-foreground)",
                accent: "var(--accent)",
                "accent-foreground": "var(--accent-foreground)",
                destructive: "var(--destructive, #ef4444)",
                "destructive-foreground": "var(--destructive-foreground, #ffffff)",
                border: "var(--border)",
                input: "var(--border)",
                ring: "var(--accent)",
                sidebar: "var(--sidebar)",
            },
        },
    },
    plugins: [],
};
export default config;
