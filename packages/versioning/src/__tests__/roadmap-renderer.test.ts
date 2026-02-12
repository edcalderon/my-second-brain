import { RoadmapRenderer, ROADMAP_MANAGED_START, ROADMAP_MANAGED_END } from '../extensions/reentry-status/roadmap-renderer';

describe('roadmap renderer managed block', () => {
  test('init template includes managed markers', () => {
    const template = RoadmapRenderer.renderTemplate({ projectTitle: 'Demo' }, { milestone: null, roadmapFile: '.versioning/ROADMAP.md' });
    expect(template).toContain(ROADMAP_MANAGED_START);
    expect(template).toContain(ROADMAP_MANAGED_END);
  });

  test('upsertManagedBlock does not overwrite user content outside block', () => {
    const original = [
      '# Project Roadmap – Demo',
      '',
      '<!-- roadmap:managed:start -->',
      '> old managed',
      '<!-- roadmap:managed:end -->',
      '',
      '## North Star',
      '',
      'USER CUSTOM LINE',
      ''
    ].join('\n');

    const next = RoadmapRenderer.upsertManagedBlock(original, {
      milestone: { id: 'now-01', title: 'Ship X' },
      roadmapFile: '.versioning/ROADMAP.md'
    });

    expect(next.content).toContain('USER CUSTOM LINE');
    expect(next.content).toContain('Active milestone: Ship X (id: now-01)');
  });
});
