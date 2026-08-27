"use client";

// Floating "+" button centered at the top of the sidebar footer. When
// clicked, expands to show action options (Open Trade, Analyze Setup, Trade
// Journal). The button itself is positioned absolutely so it floats over the
// section border, centered horizontally.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FloatingSidebarActions() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const actions = [
        {
            label: "Open Trade",
            Icon: <Plus className="h-3.5 w-3.5 text-emerald-500" />,
            onClick: () => { setIsOpen(false); router.push("/command-center"); },
        },
        {
            label: "Analyze Setup",
            Icon: <Sparkles className="h-3.5 w-3.5 text-amber-500" />,
            onClick: () => { setIsOpen(false); router.push("/strategy"); },
        },
        {
            label: "Trade Journal",
            Icon: <BookMarked className="h-3.5 w-3.5 text-blue-500" />,
            onClick: () => { setIsOpen(false); router.push("/journal"); },
        },
    ];

    return (
        <div className="relative flex justify-center">
            <Button
                onClick={() => setIsOpen((o) => !o)}
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 dark:bg-[#0d1117]/90 hover:bg-white dark:hover:bg-[#111827] shadow-[0_0_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_16px_rgba(0,0,0,0.4)] border border-gray-200/60 dark:border-white/10 z-10"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut", type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </motion.div>
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 6, filter: "blur(8px)" }}
                        transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-20"
                    >
                        <div className="flex flex-col items-center gap-1.5 min-w-[150px]">
                            {actions.map((option, index) => (
                                <motion.div
                                    key={option.label}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{ duration: 0.25, delay: index * 0.05 }}
                                >
                                    <Button
                                        onClick={option.onClick}
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start gap-2 bg-white/95 dark:bg-[#0d1117]/95 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] shadow-sm backdrop-blur-sm rounded-lg text-xs h-7 px-2.5 border border-gray-200/50 dark:border-white/10"
                                    >
                                        <span className="shrink-0">{option.Icon}</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                            {option.label}
                                        </span>
                                    </Button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
