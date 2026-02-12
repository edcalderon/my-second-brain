import { bodiesEqual, normalizeBody, sha256 } from '../extensions/reentry-status/dirty-detection';

describe('dirty detection / diff-based publishing', () => {
  test('normalizes CRLF and trailing newline', () => {
    expect(normalizeBody('a\r\n')).toBe('a\n');
    expect(normalizeBody('a')).toBe('a\n');
  });

  test('bodiesEqual ignores only EOL style + missing trailing newline', () => {
    expect(bodiesEqual('hello\n', 'hello')).toBe(true);
    expect(bodiesEqual('hello\r\n', 'hello\n')).toBe(true);
    expect(bodiesEqual('hello\n', 'hello!\n')).toBe(false);
  });

  test('sha256 is stable across normalized bodies', () => {
    expect(sha256('x')).toBe(sha256('x\n'));
    expect(sha256('x\r\n')).toBe(sha256('x\n'));
  });
});
