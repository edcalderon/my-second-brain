import Link from "next/link";

const VERSION = "1.1.3"; // TODO: Read from package.json

export default function Footer() {
    return (
        <footer className="bg-white/60 border-t border-border p-4 text-center text-xs text-gray-600">
            <div className="flex justify-center items-center space-x-4">
                <span>Version {VERSION}</span>
                <Link href="/documentation" className="text-emerald-700 hover:underline">
                    Runbook
                </Link>
            </div>
        </footer>
    );
}