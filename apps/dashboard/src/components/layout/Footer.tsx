import Link from "next/link";

export default function Footer() {
    // Both versions will be supplied via Next.js env parsing at build time
    const secondBrainVersion = process.env.NEXT_PUBLIC_EDWARD_VERSION || "1.0.0";
    const aQuantVersion = process.env.NEXT_PUBLIC_A_QUANT_VERSION || "0.1.0";

    return (
        <footer className="bg-background border-t border-border px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground flex-shrink-0 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 max-w-7xl mx-auto">
                <span className="font-medium">Edward v{secondBrainVersion}</span>
                <span className="hidden sm:inline-block text-gray-300 dark:text-gray-700">|</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">A-Quant Engine v{aQuantVersion}</span>
                <span className="hidden sm:inline-block text-gray-300 dark:text-gray-700">|</span>
                <Link href="/documentation" className="hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline transition-colors">
                    Runbook
                </Link>
            </div>
        </footer>
    );
}