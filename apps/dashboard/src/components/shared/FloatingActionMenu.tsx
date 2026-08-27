"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type FloatingActionMenuProps = {
    options: {
        label: string;
        onClick: () => void;
        Icon?: React.ReactNode;
    }[];
    className?: string;
};

const FloatingActionMenu = ({ options, className }: FloatingActionMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={cn("relative", className)}>
            <Button
                onClick={toggleMenu}
                size="icon"
                className="h-8 w-8 rounded-full bg-black/8 dark:bg-white/8 hover:bg-black/12 dark:hover:bg-white/12 shadow-[0_0_12px_rgba(0,0,0,0.08)] dark:shadow-[0_0_12px_rgba(0,0,0,0.3)]"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                    }}
                >
                    <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </motion.div>
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 8, filter: "blur(8px)" }}
                        transition={{
                            duration: 0.4,
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                            delay: 0.05,
                        }}
                        className="absolute bottom-full left-0 mb-2"
                    >
                        <div className="flex flex-col items-start gap-1.5 min-w-[140px]">
                            {options.map((option, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{
                                        duration: 0.25,
                                        delay: index * 0.05,
                                    }}
                                >
                                    <Button
                                        onClick={option.onClick}
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start gap-2 bg-white/90 dark:bg-[#0d1117]/90 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] shadow-sm backdrop-blur-sm rounded-lg text-xs h-7 px-2.5 border border-gray-200/50 dark:border-white/10"
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
};

export default FloatingActionMenu;
