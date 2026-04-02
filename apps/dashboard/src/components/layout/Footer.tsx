import Link from "next/link";
import { dashboardHref, dashboardPath, publicSiteUrl } from "@/lib/public-site";

export default function Footer() {
    // Both versions will be supplied via Next.js env parsing at build time
    const secondBrainVersion = process.env.NEXT_PUBLIC_EDWARD_VERSION || "1.0.0";

    return (
        <footer className="bg-background border-t border-border px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground flex-shrink-0 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 max-w-7xl mx-auto">
                <span className="font-medium">Edward v{secondBrainVersion}</span>
                <span className="hidden sm:inline-block text-gray-300 dark:text-gray-700">|</span>
                <Link href={publicSiteUrl("/")} className="hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline transition-colors">
                    Project Directory
                </Link>
                <span className="hidden sm:inline-block text-gray-300 dark:text-gray-700">|</span>
                <Link href={dashboardHref("/a-quant")} className="hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline transition-colors">
                    A-Quant
                </Link>
                <span className="hidden sm:inline-block text-gray-300 dark:text-gray-700">|</span>
                <Link href="/documentation" className="hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline transition-colors">
                    Runbook
                </Link>
            </div>
        </footer>
    );
}
