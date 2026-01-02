import Link from "next/link";

const VERSION = "1.1.1"; // TODO: Read from package.json

export default function Footer() {
    return (
        <footer className="bg-gray-100 dark:bg-gray-800 p-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-center items-center space-x-4">
                <span>Version {VERSION}</span>
                <Link href="/documentation" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Documentation
                </Link>
            </div>
        </footer>
    );
}