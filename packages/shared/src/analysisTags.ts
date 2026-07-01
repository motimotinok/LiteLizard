import type { ReadingAgentTagDefinition, ReadingAgentTagValueDefinition } from './types.js';

const TAG_ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const NEUTRAL_TAG_COLOR = '#7a746b';

export const SYSTEM_READING_AGENT_TAG_DEFINITIONS: readonly ReadingAgentTagDefinition[] = [
  {
    id: 'emotion',
    label: '感情',
    system: true,
    values: [
      { id: 'interest', label: '興味', color: '#4f7c96' },
      { id: 'anxiety', label: '不安', color: '#9a6a6a' },
      { id: 'relief', label: '安心', color: '#6d8b6d' },
      { id: 'confusion', label: '混乱', color: '#8a7a9c' },
      { id: 'tension', label: '緊張', color: '#9a7a4d' },
    ],
  },
  {
    id: 'issue',
    label: '問題の種類',
    system: true,
    values: [
      { id: 'unclear', label: '意味が取りにくい', color: '#8a7a9c' },
      { id: 'redundant', label: '重複', color: '#8f7954' },
      { id: 'jump', label: '論理の飛躍', color: '#9a6a6a' },
      { id: 'strong', label: '強み', color: '#6d8b6d' },
      { id: 'keep', label: '残すべき箇所', color: '#4f7c96' },
    ],
  },
] as const;

function normalizeId(input: unknown): string {
  return typeof input === 'string' ? input.trim().toLowerCase() : '';
}

function normalizeLabel(input: unknown, fallback: string): string {
  const label = typeof input === 'string' ? input.trim() : '';
  return label || fallback;
}

function normalizeColor(input: unknown): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }
  const color = input.trim();
  return COLOR_PATTERN.test(color) ? color : undefined;
}

export function normalizeReadingAgentTagDefinitions(
  input: unknown,
): ReadingAgentTagDefinition[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seenTagIds = new Set<string>();
  const definitions: ReadingAgentTagDefinition[] = [];

  for (const rawDefinition of input) {
    if (!rawDefinition || typeof rawDefinition !== 'object' || Array.isArray(rawDefinition)) {
      continue;
    }
    const definition = rawDefinition as Partial<ReadingAgentTagDefinition>;
    const id = normalizeId(definition.id);
    if (!TAG_ID_PATTERN.test(id) || seenTagIds.has(id)) {
      continue;
    }

    const seenValueIds = new Set<string>();
    const values: ReadingAgentTagValueDefinition[] = [];
    for (const rawValue of Array.isArray(definition.values) ? definition.values : []) {
      if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        continue;
      }
      const value = rawValue as Partial<ReadingAgentTagValueDefinition>;
      const valueId = normalizeId(value.id);
      if (!TAG_ID_PATTERN.test(valueId) || seenValueIds.has(valueId)) {
        continue;
      }
      seenValueIds.add(valueId);
      values.push({
        id: valueId,
        label: normalizeLabel(value.label, valueId),
        color: normalizeColor(value.color),
      });
    }

    if (values.length === 0) {
      continue;
    }

    seenTagIds.add(id);
    definitions.push({
      id,
      label: normalizeLabel(definition.label, id),
      values,
      system: definition.system === true,
    });
  }

  return definitions.slice(0, 12);
}

export function getSystemReadingAgentTagDefinition(
  id: string,
): ReadingAgentTagDefinition | null {
  const normalizedId = normalizeId(id);
  const definition = SYSTEM_READING_AGENT_TAG_DEFINITIONS.find((entry) => entry.id === normalizedId);
  return definition ? structuredClone(definition) : null;
}

export function filterTagsByDefinitions(
  tags: Record<string, string[]>,
  definitions: readonly ReadingAgentTagDefinition[],
): Record<string, string[]> {
  const normalizedDefinitions = normalizeReadingAgentTagDefinitions(definitions);
  if (normalizedDefinitions.length === 0) {
    return {};
  }

  const next: Record<string, string[]> = {};
  for (const definition of normalizedDefinitions) {
    const allowed = new Set(definition.values.map((value) => value.id));
    const values = tags[definition.id]
      ?.map((value) => value.trim().toLowerCase())
      .filter((value, index, array) => allowed.has(value) && array.indexOf(value) === index)
      .slice(0, 16);
    if (values && values.length > 0) {
      next[definition.id] = values;
    }
  }
  return next;
}

