import Link from "next/link";

const VERSION = "1.1.3"; // TODO: Read from package.json

export default function Footer() {
    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-shrink-0 transition-colors">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 max-w-7xl mx-auto">
                <span className="font-medium">Version {VERSION}</span>
                <Link href="/documentation" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline transition-colors">
                    Runbook
                </Link>
            </div>
        </footer>
    );
}