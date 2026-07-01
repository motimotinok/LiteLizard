import type { LiteLizardDocument, ParagraphAnalysisPattern } from '@litelizard/shared';
import { describe, expect, it } from 'vitest';
import {
  appendPatternToHistories,
  getVisiblePatternIndices,
  projectAnalysisHistoriesToDocument,
  resolveDisplayedPatternIndex,
} from './analysisHistory.ts';

function createDocument(): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc_1',
    title: 'draft',
    personaMode: 'general-reader',
    createdAt: '2026-04-11T00:00:00.000Z',
    updatedAt: '2026-04-11T00:00:00.000Z',
    source: { format: 'lzl-v1', originPath: '/tmp/draft.lzl' },
    chapters: [{ id: 'c1', order: 1, title: '章1' }],
    paragraphs: [
      {
        id: 'p1',
        chapterId: 'c1',
        order: 1,
        light: { text: '本文A', charCount: 3 },
        lizard: { status: 'stale' },
      },
    ],
  };
}

function makePattern(
  analyzedAt: string,
  sourceText: string,
  deepMeaning: string,
): ParagraphAnalysisPattern {
  return {
    analyzedAt,
    result: {
      sourceText,
      deepMeaning,
      emotion: ['安心'],
      theme: ['構成'],
      confidence: 0.8,
      model: 'mock-model',
    },
  };
}

describe('analysisHistory helpers', () => {
  it('sourceText が一致する pattern だけを表示対象にする', () => {
    const history = [
      makePattern('2026-04-11T00:00:00.000Z', '古い本文', 'old'),
      makePattern('2026-04-12T00:00:00.000Z', '本文A', 'latest'),
    ];

    expect(getVisiblePatternIndices(history, '本文A')).toEqual([1]);
    expect(resolveDisplayedPatternIndex(history, '本文A')).toBe(1);
  });

  it('選択 index が有効ならその pattern を表示する', () => {
    const document = createDocument();
    const history = [
      makePattern('2026-04-11T00:00:00.000Z', '本文A', 'first'),
      makePattern('2026-04-12T00:00:00.000Z', '本文A', 'second'),
    ];

    const projected = projectAnalysisHistoriesToDocument(
      document,
      { p1: history },
      { p1: 0 },
    );

    expect(projected.paragraphs[0].lizard.deepMeaning).toBe('first');
    expect(projected.paragraphs[0].lizard.analyzedAt).toBe('2026-04-11T00:00:00.000Z');
  });

  it('同一 pattern は履歴へ二重追加しない', () => {
    const pattern = makePattern('2026-04-12T00:00:00.000Z', '本文A', 'same');
    const first = appendPatternToHistories({}, 'p1', pattern);
    const second = appendPatternToHistories(first, 'p1', pattern);
    const explicitRerun = appendPatternToHistories(
      second,
      'p1',
      makePattern('2026-04-12T00:01:00.000Z', '本文A', 'same'),
    );

    expect(second.p1).toHaveLength(1);
    expect(explicitRerun.p1).toHaveLength(2);
  });
});
