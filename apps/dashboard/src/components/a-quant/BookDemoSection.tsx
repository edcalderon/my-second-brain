"use client";

import { useState } from "react";
import { CalendarCheck, Mail, Send } from "lucide-react";

const CONTACT_EMAIL = "edward@a-quant.xyz";

export default function BookDemoSection() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    function buildMailto() {
        const subject = `Demo request from ${name || "a-quant.xyz visitor"}`;
        const body = [
            message || "I'd like to book a demo of A-Quant.",
            "",
            `Name: ${name || "(not provided)"}`,
            `Reply-to: ${email || "(not provided)"}`,
        ].join("\n");
        return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        window.location.href = buildMailto();
    }

    return (
        <section className="@container rounded-xl border border-border bg-white/95 p-6 shadow-sm sm:p-8">
            <div className="grid gap-8 @2xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                        <CalendarCheck className="h-4 w-4" />
                        Book a demo
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Want to see A-Quant in action?</h2>
                    <p className="max-w-md text-sm leading-7 text-gray-600">
                        Send a quick note about what you'd like to see, and we'll get back to you to set up a time.
                        Prefer email directly? Reach us at{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-emerald-700 underline underline-offset-2">
                            {CONTACT_EMAIL}
                        </a>
                        .
                    </p>
                    <a
                        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Demo request")}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                        <Mail className="h-4 w-4" />
                        Email us directly
                    </a>
                </div>

                <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border bg-gray-50/60 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-gray-600">
                            Name
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none"
                                placeholder="Your name"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-gray-600">
                            Email
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none"
                                placeholder="you@example.com"
                            />
                        </label>
                    </div>
                    <label className="block text-xs font-semibold text-gray-600">
                        What would you like to see?
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none"
                            placeholder="Live position monitoring, the backtesting engine, the notification system..."
                        />
                    </label>
                    <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:border-emerald-600 hover:bg-emerald-600 sm:w-auto"
                    >
                        <Send className="h-4 w-4" />
                        Send request
                    </button>
                    <p className="text-[11px] text-gray-400">
                        Opens your email client with this pre-filled -- no data is sent from this page directly.
                    </p>
                </form>
            </div>
        </section>
    );
}
