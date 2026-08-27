"use client";

import { useEffect, useId, useState } from "react";
import Script from "next/script";

declare global {
    interface Window {
        TradingView?: { widget: new (config: Record<string, unknown>) => unknown };
    }
}

// TradingView's official embeddable widget, pointed at Bybit's own feed
// (BYBIT:BTCUSDT.P) -- genuinely real-time crypto data (unlike some equity
// feeds, TradingView doesn't delay major crypto pairs), no API key, no
// WebSocket/candlestick renderer to build and maintain ourselves. Trade-off:
// it's TradingView's composite price for that symbol, not byte-identical to
// the USDC-settled BTCPERP contract the actual position is on -- BTC/USD
// price action is effectively the same instrument either way, just a
// different settlement currency, so this is a correct reference chart, not
// the exact tradable ticker.
export function TradingViewChart({ symbol = "BYBIT:BTCUSDT.P", height = 420 }: { symbol?: string; height?: number }) {
    const containerId = `tv-chart-${useId().replace(/:/g, "")}`;
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const check = () => document.documentElement.classList.contains("dark");
        setIsDark(check());
        const obs = new MutationObserver(() => setIsDark(check()));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !window.TradingView) return;
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = ""; // idempotent re-init (React strict-mode double-effect in dev)

        new window.TradingView.widget({
            autosize: true,
            symbol,
            interval: "5",
            timezone: "Etc/UTC",
            theme: isDark ? "dark" : "light",
            style: "1",
            locale: "en",
            toolbar_bg: isDark ? "#0d1117" : "#f7f4ee",
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            container_id: containerId,
        });
    }, [scriptLoaded, containerId, symbol, isDark]);

    return (
        <div className="glass-panel rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">BTC live chart</h2>
                    <p className="text-xs text-gray-500">{symbol} via TradingView — real-time.</p>
                </div>
            </div>
            <Script src="https://s3.tradingview.com/tv.js" strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
            <div id={containerId} style={{ height }} />
        </div>
    );
}
