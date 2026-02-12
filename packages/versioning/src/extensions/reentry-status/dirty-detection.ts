import { createHash } from 'crypto';

export function normalizeBody(body: string): string {
  // Normalize EOL and ensure a trailing newline for stable comparisons.
  const normalized = body.replace(/\r\n/g, '\n');
  return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
}

export function bodiesEqual(a: string, b: string): boolean {
  return normalizeBody(a) === normalizeBody(b);
}

export function sha256(text: string): string {
  return createHash('sha256').update(normalizeBody(text), 'utf8').digest('hex');
}
