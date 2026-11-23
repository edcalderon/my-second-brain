/**
 * Hand-rolled reconnecting WebSocket client for the trading API's /ws/live route
 * No new npm dependency, matching this repo's existing
 * preference for vanilla implementations over wrapper libraries --
 * TradingViewChart.tsx does the same for its widget.
 *
 * Auth matches the server's expectation exactly: a browser can't set a
 * custom Authorization header on a WS handshake, so the first frame sent
 * after the socket opens is {"type":"auth","token":...}. The token is
 * re-fetched (not cached here) on every connect/reconnect -- Firebase ID
 * tokens expire hourly, and authClient.getSessionToken() already caches
 * internally and only actually refreshes when stale, so re-calling it here
 * is cheap.
 */

import { authClient } from "@/components/auth/AuthProvider";

export type LiveMessage = { type: string; [key: string]: unknown };
type Handler = (message: LiveMessage) => void;

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

export class LiveClient {
    private ws: WebSocket | null = null;
    private handlers = new Map<string, Set<Handler>>();
    private reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;

    constructor(private readonly wsUrl: string) {}

    connect(): void {
        this.stopped = false;
        this.open();
    }

    disconnect(): void {
        this.stopped = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
    }

    on(type: string, handler: Handler): () => void {
        if (!this.handlers.has(type)) this.handlers.set(type, new Set());
        this.handlers.get(type)!.add(handler);
        return () => this.handlers.get(type)?.delete(handler);
    }

    private open(): void {
        if (this.stopped) return;

        const ws = new WebSocket(this.wsUrl);
        this.ws = ws;

        ws.onopen = async () => {
            // Re-fetched here, not passed in from the constructor -- a
            // reconnect hours later must use a fresh token, not whatever
            // was current when this client was first built.
            const token = await authClient.getSessionToken();
            if (ws !== this.ws) return; // superseded by a newer socket while awaiting the token
            ws.send(JSON.stringify({ type: "auth", token }));
        };

        ws.onmessage = (event) => {
            let message: LiveMessage;
            try {
                message = JSON.parse(event.data);
            } catch {
                return;
            }
            this.reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS; // a real message means the server accepted us
            this.handlers.get(message.type)?.forEach((handler) => handler(message));
        };

        ws.onclose = () => {
            if (this.ws !== ws) return; // an intentional disconnect() already replaced/cleared this socket
            this.ws = null;
            this.scheduleReconnect();
        };

        ws.onerror = () => {
            // onclose always follows onerror for a WebSocket -- reconnect
            // logic lives there only, so it isn't scheduled twice.
        };
    }

    private scheduleReconnect(): void {
        if (this.stopped) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.open();
        }, this.reconnectDelayMs);
        this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
    }
}
