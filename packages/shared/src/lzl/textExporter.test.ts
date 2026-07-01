import type { LiteLizardDocument } from '../types.js';
import { describe, expect, it } from 'vitest';
import { exportDocumentToPlainText } from './textExporter.js';

function makeDocument(overrides: Partial<LiteLizardDocument> = {}): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'd_export0001',
    title: '外へ出す原稿',
    personaMode: 'general-reader',
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
    source: { format: 'lzl-v1', originPath: '/project/export.lzl' },
    chapters: [
      { id: 'c_second', order: 2, title: '第二章' },
      { id: 'c_first', order: 1, title: '第一章' },
    ],
    paragraphs: [
      {
        id: 'p_second_2',
        chapterId: 'c_second',
        order: 2,
        light: { text: '第二章の二段落目', charCount: 8 },
        lizard: { status: 'complete', deepMeaning: '内部分析', analyzedAt: '2026-05-12T00:00:00.000Z' },
      },
      {
        id: 'p_first_1',
        chapterId: 'c_first',
        order: 1,
        light: { text: '第一章の一段落目', charCount: 8 },
        lizard: { status: 'stale' },
      },
      {
        id: 'p_second_1',
        chapterId: 'c_second',
        order: 1,
        light: { text: '第二章の一段落目', charCount: 8 },
        lizard: { status: 'stale' },
      },
    ],
    ...overrides,
  };
}

describe('exportDocumentToPlainText', () => {
  it('文書タイトル、章タイトル、段落本文を表示順でプレーンテキスト化する', () => {
    expect(exportDocumentToPlainText(makeDocument())).toBe(
      [
        '外へ出す原稿',
        '',
        '第一章',
        '',
        '第一章の一段落目',
        '',
        '第二章',
        '',
        '第二章の一段落目',
        '',
        '第二章の二段落目',
        '',
      ].join('\n'),
    );
  });

  it('内部 ID や analysis 情報を出力しない', () => {
    const text = exportDocumentToPlainText(makeDocument());

    expect(text).not.toContain('d_export0001');
    expect(text).not.toContain('c_first');
    expect(text).not.toContain('p_first_1');
    expect(text).not.toContain('deepMeaning');
    expect(text).not.toContain('内部分析');
    expect(text).not.toContain('analyzedAt');
  });

  it('章や段落がない文書でもクラッシュせずタイトルだけを返す', () => {
    expect(exportDocumentToPlainText(makeDocument({ chapters: [], paragraphs: [] }))).toBe('外へ出す原稿\n');
  });
});
