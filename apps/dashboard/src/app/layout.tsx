import { ReactNode } from "react";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
        <html lang="en">
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            try {
                                const theme = localStorage.getItem("theme");
                                const isDark = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
                                if (isDark) {
                                    document.documentElement.classList.add("dark");
                                }
                            } catch (e) {}
                        `,
                    }}
                />
            </head>
            <body className={`${spaceGrotesk.variable} ${plexMono.variable} bg-background text-foreground antialiased transition-colors duration-300`}>
                <ThemeProvider>
                    <AuthProvider>
                        <AppShell>{children}</AppShell>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
