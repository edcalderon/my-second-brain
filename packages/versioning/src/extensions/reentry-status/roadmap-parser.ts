export interface RoadmapMilestoneItem {
  id: string;
  title: string;
  section?: string;
  line: number;
}

export const ROADMAP_ITEM_REGEX = /^\s*-\s*\[(.+?)\]\s*(.+)$/;

export interface ParseRoadmapResult {
  items: RoadmapMilestoneItem[];
  warnings: string[];
}

export function parseRoadmapMilestones(markdown: string): ParseRoadmapResult {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const items: RoadmapMilestoneItem[] = [];
  const warnings: string[] = [];

  let currentSection: string | undefined;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) {
      currentSection = h2[1];
      continue;
    }

    const match = ROADMAP_ITEM_REGEX.exec(line);
    if (!match) continue;

    const id = match[1].trim();
    const title = match[2].trim();

    if (!id || !title) {
      warnings.push(`Invalid roadmap item at line ${i + 1}`);
      continue;
    }

    items.push({ id, title, section: currentSection, line: i + 1 });
  }

  return { items, warnings };
}
