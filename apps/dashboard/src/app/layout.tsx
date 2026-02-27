import { ReactNode } from "react";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SupabaseProvider } from "@/components/supabase/SupabaseProvider";
import AppShell from "@/components/layout/AppShell";
import "@/styles/globals.css";

export const metadata = {
    title: "A-Quant Ops Dashboard",
    description: "Operational visibility into the A-Quant trading stack",
};

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    variable: "--font-mono",
});

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const theme = localStorage.getItem("theme");
                                    const isDark = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
                                    
                                    // Apply dark class to html element BEFORE CSS is loaded
                                    if (isDark) {
                                        document.documentElement.classList.add("dark");
                                        document.documentElement.style.colorScheme = "dark";
                                    } else {
                                        document.documentElement.classList.remove("dark");
                                        document.documentElement.style.colorScheme = "light";
                                    }
                                } catch (e) {
                                    console.error("Theme init error:", e);
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body className={`${spaceGrotesk.variable} ${plexMono.variable} bg-white dark:bg-gray-950 text-gray-900 dark:text-white antialiased transition-colors duration-300`}>
                <ThemeProvider>
                    <AuthProvider>
                        <SupabaseProvider>
                            <AppShell>{children}</AppShell>
                        </SupabaseProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
