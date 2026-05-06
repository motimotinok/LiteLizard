import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import type { GenerationalAnalysisFile, LiteLizardAnalysisFile, ParagraphAnalysisPattern } from '@litelizard/shared';
import {
  listGenerations,
  loadLatestAnalysis,
  loadAnalysis,
  saveAnalysis,
  appendParagraphPattern,
  createGeneration,
  migrateFromV1,
} from './analysisStore.js';

const DOC_ID = 'd_abc1234567';

async function withTempProject(run: (projectRoot: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'litelizard-analysis-store-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeAnalysisFile(projectRoot: string, file: GenerationalAnalysisFile) {
  const analysisDir = path.join(projectRoot, '.litelizard', 'analysis');
  await fs.mkdir(analysisDir, { recursive: true });
  const gen = String(file.generation).padStart(3, '0');
  const filePath = path.join(analysisDir, `${file.documentId}_${gen}.json`);
  await fs.writeFile(filePath, JSON.stringify(file, null, 2), 'utf8');
}

function makeFile(generation: number, overrides?: Partial<GenerationalAnalysisFile>): GenerationalAnalysisFile {
  return {
    version: 1,
    documentId: DOC_ID,
    generation,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paragraphs: {},
    ...overrides,
  };
}

// -------------------------------------------------------------------
// listGenerations
// -------------------------------------------------------------------
describe('listGenerations', () => {
  it('analysis ディレクトリが存在しない場合は空配列を返す', async () => {
    await withTempProject(async (projectRoot) => {
      expect(await listGenerations(projectRoot, DOC_ID)).toEqual([]);
    });
  });

  it('documentId に一致するファイルのみ世代番号として抽出し昇順で返す', async () => {
    await withTempProject(async (projectRoot) => {
      await writeAnalysisFile(projectRoot, makeFile(3));
      await writeAnalysisFile(projectRoot, makeFile(1));
      await writeAnalysisFile(projectRoot, makeFile(2));
      // 別の documentId のファイルも混在させる
      const analysisDir = path.join(projectRoot, '.litelizard', 'analysis');
      await fs.writeFile(path.join(analysisDir, 'd_other0000_001.json'), '{}', 'utf8');

      expect(await listGenerations(projectRoot, DOC_ID)).toEqual([1, 2, 3]);
    });
  });
});

// -------------------------------------------------------------------
// loadLatestAnalysis
// -------------------------------------------------------------------
describe('loadLatestAnalysis', () => {
  it('ファイルが存在しない場合は null を返す', async () => {
    await withTempProject(async (projectRoot) => {
      expect(await loadLatestAnalysis(projectRoot, DOC_ID)).toBeNull();
    });
  });

  it('複数世代がある場合に最大番号の内容を返す', async () => {
    await withTempProject(async (projectRoot) => {
      await writeAnalysisFile(projectRoot, makeFile(1));
      await writeAnalysisFile(projectRoot, makeFile(2));
      const file3 = makeFile(3, { paragraphs: { p_test: { patterns: [] } } });
      await writeAnalysisFile(projectRoot, file3);

      const result = await loadLatestAnalysis(projectRoot, DOC_ID);
      expect(result?.generation).toBe(3);
      expect(result?.paragraphs).toHaveProperty('p_test');
    });
  });
});

// -------------------------------------------------------------------
// loadAnalysis
// -------------------------------------------------------------------
describe('loadAnalysis', () => {
  it('指定世代のファイルが存在しない場合は null を返す', async () => {
    await withTempProject(async (projectRoot) => {
      expect(await loadAnalysis(projectRoot, DOC_ID, 1)).toBeNull();
    });
  });

  it('正常なファイルを読み込んで返す', async () => {
    await withTempProject(async (projectRoot) => {
      const file = makeFile(2);
      await writeAnalysisFile(projectRoot, file);

      const result = await loadAnalysis(projectRoot, DOC_ID, 2);
      expect(result).toEqual(file);
    });
  });
});

// -------------------------------------------------------------------
// saveAnalysis
// -------------------------------------------------------------------
describe('saveAnalysis', () => {
  it('analysis ディレクトリが存在しなくても保存できる', async () => {
    await withTempProject(async (projectRoot) => {
      const file = makeFile(1);
      await saveAnalysis(projectRoot, file);

      const result = await loadAnalysis(projectRoot, DOC_ID, 1);
      expect(result).toEqual(file);
    });
  });

  it('ファイルパスが {documentId}_NNN.json 形式になる', async () => {
    await withTempProject(async (projectRoot) => {
      const file = makeFile(5);
      await saveAnalysis(projectRoot, file);

      const analysisDir = path.join(projectRoot, '.litelizard', 'analysis');
      const entries = await fs.readdir(analysisDir);
      expect(entries).toContain(`${DOC_ID}_005.json`);
    });
  });
});

// -------------------------------------------------------------------
// appendParagraphPattern
// -------------------------------------------------------------------
describe('appendParagraphPattern', () => {
  const pattern: ParagraphAnalysisPattern = {
    analyzedAt: '2026-04-11T00:00:00.000Z',
    result: { emotion: ['joy'], theme: ['love'] },
  };

  it('ファイルが存在しない場合は generation:1 で新規作成する', async () => {
    await withTempProject(async (projectRoot) => {
      await appendParagraphPattern(projectRoot, DOC_ID, 'p_para1', pattern);

      const result = await loadLatestAnalysis(projectRoot, DOC_ID);
      expect(result?.generation).toBe(1);
      expect(result?.paragraphs['p_para1'].patterns).toHaveLength(1);
      expect(result?.paragraphs['p_para1'].patterns[0]).toEqual(pattern);
    });
  });

  it('既存ファイルがある場合は patterns に追記する', async () => {
    await withTempProject(async (projectRoot) => {
      const existingPattern: ParagraphAnalysisPattern = {
        analyzedAt: '2026-01-01T00:00:00.000Z',
        result: { emotion: ['sad'] },
      };
      const existing = makeFile(1, {
        paragraphs: { p_para1: { patterns: [existingPattern] } },
      });
      await writeAnalysisFile(projectRoot, existing);

      await appendParagraphPattern(projectRoot, DOC_ID, 'p_para1', pattern);

      const result = await loadAnalysis(projectRoot, DOC_ID, 1);
      expect(result?.paragraphs['p_para1'].patterns).toHaveLength(2);
      expect(result?.paragraphs['p_para1'].patterns[1]).toEqual(pattern);
    });
  });

  it('段落が既存ファイルにない場合は新規パターンで追加する', async () => {
    await withTempProject(async (projectRoot) => {
      const existing = makeFile(1);
      await writeAnalysisFile(projectRoot, existing);

      await appendParagraphPattern(projectRoot, DOC_ID, 'p_new', pattern);

      const result = await loadAnalysis(projectRoot, DOC_ID, 1);
      expect(result?.paragraphs['p_new'].patterns).toHaveLength(1);
    });
  });
});

// -------------------------------------------------------------------
// createGeneration
// -------------------------------------------------------------------
describe('createGeneration', () => {
  it('ファイルが存在しない場合は generation:1 のファイルを作成する', async () => {
    await withTempProject(async (projectRoot) => {
      const result = await createGeneration(projectRoot, DOC_ID);
      expect(result.generation).toBe(1);
      expect(result.paragraphs).toEqual({});

      // ファイルが実際に書き込まれていることを確認
      const loaded = await loadAnalysis(projectRoot, DOC_ID, 1);
      expect(loaded?.generation).toBe(1);
    });
  });

  it('既存世代の次番号でファイルを作成する', async () => {
    await withTempProject(async (projectRoot) => {
      await writeAnalysisFile(projectRoot, makeFile(1));
      await writeAnalysisFile(projectRoot, makeFile(2));

      const result = await createGeneration(projectRoot, DOC_ID);
      expect(result.generation).toBe(3);
    });
  });

  it('generation が 999 の場合はエラーをスローする', async () => {
    await withTempProject(async (projectRoot) => {
      await writeAnalysisFile(projectRoot, makeFile(999));

      await expect(createGeneration(projectRoot, DOC_ID)).rejects.toThrow('999');
    });
  });
});

// -------------------------------------------------------------------
// 並行書き込み（直列化 / tmp 衝突回避）
// -------------------------------------------------------------------
describe('並行書き込み', () => {
  function makePattern(seq: number): ParagraphAnalysisPattern {
    return {
      analyzedAt: `2026-04-11T00:00:0${seq % 10}.000Z`,
      result: { emotion: [`seq-${seq}`] },
    };
  }

  it('同一段落への並行 appendParagraphPattern が直列化されロストアップデートしない', async () => {
    await withTempProject(async (projectRoot) => {
      const total = 10;
      const calls = Array.from({ length: total }, (_, i) =>
        appendParagraphPattern(projectRoot, DOC_ID, 'p_para1', makePattern(i)),
      );
      await Promise.all(calls);

      const result = await loadLatestAnalysis(projectRoot, DOC_ID);
      expect(result?.paragraphs['p_para1'].patterns).toHaveLength(total);
      const seqs = (result?.paragraphs['p_para1'].patterns ?? []).map(
        (p) => (p.result.emotion as string[] | undefined)?.[0],
      );
      // 直列化されているので順序付き、かつ全件揃う
      expect(seqs.sort()).toEqual(
        Array.from({ length: total }, (_, i) => `seq-${i}`).sort(),
      );
    });
  });

  it('異なる段落への並行 append でも全件揃う', async () => {
    await withTempProject(async (projectRoot) => {
      const ids = ['p_a', 'p_b', 'p_c', 'p_d'];
      await Promise.all(
        ids.map((id, i) => appendParagraphPattern(projectRoot, DOC_ID, id, makePattern(i))),
      );

      const result = await loadLatestAnalysis(projectRoot, DOC_ID);
      for (const id of ids) {
        expect(result?.paragraphs[id]?.patterns).toHaveLength(1);
      }
    });
  });

  it('saveAnalysis を並行呼び出ししても tmp 名衝突で落ちない', async () => {
    await withTempProject(async (projectRoot) => {
      const calls = Array.from({ length: 8 }, (_, i) =>
        saveAnalysis(
          projectRoot,
          makeFile(1, { updatedAt: `2026-01-01T00:00:0${i}.000Z` }),
        ),
      );
      await expect(Promise.all(calls)).resolves.not.toThrow();

      const result = await loadAnalysis(projectRoot, DOC_ID, 1);
      expect(result?.generation).toBe(1);
      // tmp ファイルが残っていないこと
      const analysisDir = path.join(projectRoot, '.litelizard', 'analysis');
      const entries = await fs.readdir(analysisDir);
      expect(entries.some((e) => e.endsWith('.tmp'))).toBe(false);
    });
  });

  it('createGeneration の並行呼び出しでも世代番号が重ならない', async () => {
    await withTempProject(async (projectRoot) => {
      const total = 5;
      const results = await Promise.all(
        Array.from({ length: total }, () => createGeneration(projectRoot, DOC_ID)),
      );

      const generations = results.map((r) => r.generation).sort((a, b) => a - b);
      expect(generations).toEqual([1, 2, 3, 4, 5]);

      const persisted = await listGenerations(projectRoot, DOC_ID);
      expect(persisted).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

// -------------------------------------------------------------------
// migrateFromV1
// -------------------------------------------------------------------
describe('migrateFromV1', () => {
  it('complete ステータスの段落を patterns[0] に変換する', () => {
    const v1: LiteLizardAnalysisFile = {
      version: 1,
      documentId: DOC_ID,
      title: 'テスト文書',
      personaMode: 'general-reader',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      paragraphs: [
        {
          paragraphId: 'p_1',
          order: 1,
          lizard: {
            status: 'complete',
            emotion: ['joy'],
            theme: ['love'],
            deepMeaning: 'deep',
            confidence: 0.9,
            model: 'gpt-4o',
            analyzedAt: '2026-01-15T00:00:00.000Z',
          },
        },
        {
          paragraphId: 'p_2',
          order: 2,
          lizard: { status: 'stale' }, // complete でないので除外
        },
      ],
    };

    const result = migrateFromV1(v1);

    expect(result.version).toBe(1);
    expect(result.documentId).toBe(DOC_ID);
    expect(result.generation).toBe(1);
    expect(result.createdAt).toBe(v1.createdAt);
    expect(result.updatedAt).toBe(v1.updatedAt);

    // complete な段落のみ変換される
    expect(Object.keys(result.paragraphs)).toEqual(['p_1']);
    const pattern = result.paragraphs['p_1'].patterns[0];
    expect(pattern.analyzedAt).toBe('2026-01-15T00:00:00.000Z');
    expect(pattern.result).toMatchObject({
      emotion: ['joy'],
      theme: ['love'],
      deepMeaning: 'deep',
      confidence: 0.9,
      model: 'gpt-4o',
    });
  });

  it('段落がすべて complete でない場合は空の paragraphs を返す', () => {
    const v1: LiteLizardAnalysisFile = {
      version: 1,
      documentId: DOC_ID,
      title: 'テスト',
      personaMode: 'friendly',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      paragraphs: [{ paragraphId: 'p_1', order: 1, lizard: { status: 'pending' } }],
    };

    const result = migrateFromV1(v1);
    expect(result.paragraphs).toEqual({});
  });
});
