import fc from 'fast-check';

describe('property-based testing setup', () => {
  test('fast-check runs inside jest', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => Number.isInteger(n)),
      { numRuns: 25 }
    );
  });
});
