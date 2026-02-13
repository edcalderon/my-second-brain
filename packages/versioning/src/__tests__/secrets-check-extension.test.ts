import { checkContentForSecrets } from '../extensions/secrets-check/index';

describe('Secrets Check Extension - checkContentForSecrets', () => {
    const patterns = [
        /PRIVATE_KEY=[a-f0-9]+/,
        /API_TOKEN=[a-z0-9]+/
    ];

    const allowlist = [
        "SAFE_PRIVATE_KEY",
        "EXAMPLE_API_TOKEN"
    ];

    test('should detect secrets matching patterns', () => {
        const content = `
      const x = 1;
      const key = "PRIVATE_KEY=abc12345";
      const y = 2;
    `;
        const results = checkContentForSecrets(content, patterns, [], 'test.ts');
        expect(results).toHaveLength(1);
        expect(results[0].line).toBe(3);
        expect(results[0].content).toContain('PRIVATE_KEY=abc12345');
    });

    test('should respect allowlist', () => {
        const content = `
      // This is a safe key: SAFE_PRIVATE_KEY
      const key = "PRIVATE_KEY=abc12345";
    `;
        // Add patterns that match both lines
        const testPatterns = [/PRIVATE_KEY/];

        // First check without allowlist
        const results1 = checkContentForSecrets(content, testPatterns, [], 'test.ts');
        expect(results1).toHaveLength(2); // Matches both lines

        // Check with allowlist
        const results2 = checkContentForSecrets(content, testPatterns, allowlist, 'test.ts');
        expect(results2).toHaveLength(1); // Should only match the second line
        expect(results2[0].content).toContain('const key');
    });

    test('should find multiple secrets', () => {
        const content = `
      PRIVATE_KEY=123
      API_TOKEN=xyz
    `;
        const results = checkContentForSecrets(content, patterns, [], 'env.local');
        expect(results).toHaveLength(2);
    });

    test('should return empty list if no secrets found', () => {
        const content = `const x = 1;`;
        const results = checkContentForSecrets(content, patterns, [], 'safe.ts');
        expect(results).toHaveLength(0);
    });
});
