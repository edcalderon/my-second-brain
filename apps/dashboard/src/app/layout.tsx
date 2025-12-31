import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import "@/styles/globals.css";

export const metadata = {
    title: "Supermemory Agent Dashboard",
    description: "Manage your AI agents and memory graph",
};

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <html lang="en">
            <body className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-6 bg-background">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
