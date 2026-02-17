import Link from "next/link";

const VERSION = "1.1.3"; // TODO: Read from package.json

export default function Footer() {
    return (
        <footer className="bg-white/60 border-t border-border px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center text-xs sm:text-sm text-gray-600 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 max-w-7xl mx-auto">
                <span className="font-medium">Version {VERSION}</span>
                <Link href="/documentation" className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors">
                    Runbook
                </Link>
            </div>
        </footer>
    );
}