"use client";

// Floating "+" button for the collapsed sidebar. Positioned with `fixed`
// coordinates so it escapes the sidebar's overflow-y clipping. Sits at the
// bottom of the 80px collapsed sidebar where the footer section lives.
// The menu opens to the RIGHT (not upward) to avoid going off-screen.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";

const SIDEBAR_W = 80; // w-20 collapsed sidebar width

export default function FloatingSidebarActionsCollapsed() {
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
        <>
            {/* "+" button — fixed at bottom-center of collapsed sidebar */}
            <button
                onClick={() => setIsOpen((o) => !o)}
                className="fixed z-50 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-[#0d1117]/90 hover:bg-white dark:hover:bg-[#111827] border border-gray-200/60 dark:border-white/10 shadow-[0_0_12px_rgba(0,0,0,0.08)] dark:shadow-[0_0_12px_rgba(0,0,0,0.4)] transition-transform hover:scale-105"
                style={{ left: (SIDEBAR_W / 2 - 14), bottom: 24 }}
                title="Quick Actions"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut", type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Plus className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </motion.div>
            </button>

            {/* Menu — opens to the RIGHT side of the button */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -8, filter: "blur(8px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: -8, filter: "blur(8px)" }}
                        transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                        className="fixed z-[60]"
                        style={{ left: SIDEBAR_W + 8, bottom: 22 }}
                    >
                        <div className="flex flex-col items-start gap-1.5 min-w-[150px]">
                            {actions.map((option, index) => (
                                <motion.div
                                    key={option.label}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -6 }}
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
        </>
    );
}
