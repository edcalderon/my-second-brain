"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";

interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Only run on client side after hydration
        setMounted(true);

        // Check localStorage or system preference
        const savedTheme = localStorage.getItem("theme");
        const isDarkMode =
            savedTheme === "dark" ||
            (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

        setIsDark(isDarkMode);
        applyTheme(isDarkMode);

        // Listen for system preference changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem("theme")) {
                setIsDark(e.matches);
                applyTheme(e.matches);
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const applyTheme = (dark: boolean) => {
        const html = document.documentElement;
        if (dark) {
            html.classList.add("dark");
        } else {
            html.classList.remove("dark");
        }
    };

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        applyTheme(newDark);
        localStorage.setItem("theme", newDark ? "dark" : "light");
    };

    // Avoid hydration mismatch
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
};
