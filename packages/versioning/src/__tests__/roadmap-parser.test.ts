import { parseRoadmapMilestones, ROADMAP_ITEM_REGEX } from '../extensions/reentry-status/roadmap-parser';

describe('roadmap parser', () => {
  test('regex matches - [id] title', () => {
    expect(ROADMAP_ITEM_REGEX.test('- [now-01] Ship stable integration')).toBe(true);
  });

  test('extracts items with id + title and section', () => {
    const md = [
      '# Project Roadmap – Test',
      '',
      '## Now (1–2 weeks)',
      '',
      '- [now-01] Ship stable Uniswap v4 hook integration',
      '- [now-02] Add observability',
      '',
      '## Later',
      '',
      '- [later-01] Consider refactor'
    ].join('\n');

    const result = parseRoadmapMilestones(md);
    expect(result.warnings).toEqual([]);
    expect(result.items).toHaveLength(3);

    expect(result.items[0]).toMatchObject({ id: 'now-01', title: 'Ship stable Uniswap v4 hook integration' });
    expect(result.items[0].section).toBe('Now (1–2 weeks)');
    expect(result.items[2].section).toBe('Later');
  });
});
