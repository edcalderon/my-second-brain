type Handler<T> = (payload: T) => void | Promise<void>;

import type { PlatformEvent, PlatformEventPayloadMap, PlatformEventType } from './events.js';

export class InMemoryEventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<unknown>>>();

  subscribe<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const current = this.handlers.get(event) ?? new Set<Handler<unknown>>();
    current.add(handler as Handler<unknown>);
    this.handlers.set(event, current);

    return () => {
      const handlers = this.handlers.get(event);
      handlers?.delete(handler as Handler<unknown>);
    };
  }

  async publish<K extends keyof Events>(event: K, payload: Events[K]): Promise<void> {
    const current = this.handlers.get(event);
    if (!current || current.size === 0) return;

    for (const handler of current) {
      try {
        await handler(payload);
      } catch (error) {
        console.error('event handler error', { event, error });
      }
    }
  }
}

export class PlatformEventBus extends InMemoryEventBus<PlatformEventPayloadMap> {
  async publishEvent<K extends PlatformEventType>(type: K, payload: PlatformEventPayloadMap[K], correlationId?: string): Promise<PlatformEvent<K>> {
    const event: PlatformEvent<K> = {
      type,
      payload,
      correlationId: correlationId ?? crypto.randomUUID(),
      timestamp: Date.now(),
    };

    await this.publish(type, payload);
    return event;
  }
}
