import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { FileNode, LiteLizardDocument } from '@litelizard/shared';
import { buildImportedDocument, parseLzl, parseTextToImportResult } from '@litelizard/shared';
import { createFileService } from './fileService.js';

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'litelizard-file-service-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function flattenFiles(nodes: FileNode[]): string[] {
  const files: string[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      files.push(node.path);
      continue;
    }
    if (node.children) {
      files.push(...flattenFiles(node.children));
    }
  }
  return files;
}

function silenceConsoleWarn() {
  // 修正済み: 期待修復経路の検証済みログでテストstderrを汚さないため、対象テスト内で明示的に抑制する。
  return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}

describe('fileService markdown + analysis', () => {
  it('lists only markdown files in tree', async () => {
    await withTempDir(async (dir) => {
      await fs.mkdir(path.join(dir, 'nested'));
      await fs.writeFile(path.join(dir, 'Essay.MD'), 'hello2', 'utf8');
      await fs.writeFile(path.join(dir, 'Essay.litelizard.analysis.json'), '{}', 'utf8');
      await fs.writeFile(path.join(dir, 'notes.txt'), 'ignore', 'utf8');
      await fs.writeFile(path.join(dir, 'nested', 'inside.md'), 'inside', 'utf8');

      const service = createFileService();
      const tree = await service.listTree(dir);
      const files = flattenFiles(tree).map((item) => path.basename(item)).sort();

      expect(files).toEqual(['Essay.MD', 'inside.md']);
    });
  });

  it('loads markdown and merges analysis by id/order', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'draft.md');
      const analysisPath = path.join(dir, 'draft.litelizard.analysis.json');

      await fs.writeFile(
        filePath,
        '<!-- ll:chapter=c_test01 -->\n## 第一章\n\n<!-- ll:id=p_keep -->\n最初の段落\n\n<!-- ll:id=p_next01 -->\n次の段落',
        'utf8',
      );
      await fs.writeFile(
        analysisPath,
        JSON.stringify(
          {
            version: 1,
            documentId: 'doc_test',
            title: 'draft',
            personaMode: 'general-reader',
            createdAt: '2026-02-17T00:00:00.000Z',
            updatedAt: '2026-02-17T00:00:00.000Z',
            paragraphs: [
              {
                paragraphId: 'p_keep',
                order: 1,
                lizard: { status: 'complete', deepMeaning: 'ok' },
              },
              {
                paragraphId: 'p_next01',
                order: 2,
                lizard: { status: 'failed', error: { code: 'X', message: 'bad' } },
              },
            ],
          },
          null,
          2,
        ),
        'utf8',
      );

      const service = createFileService();
      const document = await service.load(filePath);

      expect(document.version).toBe(2);
      expect(document.documentId).toBe('doc_test');
      expect(document.chapters).toHaveLength(1);
      expect(document.paragraphs).toHaveLength(2);
      expect(document.paragraphs[0].id).toBe('p_keep');
      expect(document.paragraphs[0].lizard.status).toBe('complete');
      expect(document.paragraphs[0].chapterId).toBe(document.chapters[0].id);
      expect(document.paragraphs[1].id).toBe('p_next01');
      expect(document.paragraphs[1].lizard.status).toBe('failed');
    });
  });

  it('maps legacy markdown without headings into one chapter', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'legacy.md');
      await fs.writeFile(filePath, '<!-- ll:id=p_legacy1 -->\n段落A\n\n段落B', 'utf8');

      const service = createFileService();
      const document = await service.load(filePath);

      expect(document.chapters).toHaveLength(1);
      expect(document.paragraphs).toHaveLength(2);
      expect(document.paragraphs.every((paragraph) => paragraph.chapterId === document.chapters[0].id)).toBe(true);
    });
  });

  it('keeps chapters that only contain whitespace paragraphs', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'empty-chapter.md');
      await fs.writeFile(
        filePath,
        [
          '<!-- ll:chapter=c_intro -->',
          '## Intro',
          '',
          '<!-- ll:id=p_intro -->',
          '本文',
          '',
          '<!-- ll:chapter=c_empty -->',
          '## Empty',
          '',
          '<!-- ll:id=p_empty -->',
          ' ',
        ].join('\n'),
        'utf8',
      );

      const service = createFileService();
      const document = await service.load(filePath);

      expect(document.chapters.map((chapter) => chapter.id)).toEqual(['c_intro', 'c_empty']);
      expect(document.paragraphs).toHaveLength(1);
      expect(document.paragraphs[0]?.chapterId).toBe('c_intro');
    });
  });

  it('treats markdown-like syntax as paragraph text when inside ll:id blocks', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'syntax-literal.md');
      await fs.writeFile(
        filePath,
        [
          '<!-- ll:chapter=c_intro -->',
          '## Intro',
          '',
          '<!-- ll:id=p_literal -->',
          '## heading-like',
          '- list-item',
          '* emphasis-like',
          '```code',
          'plain text',
          '```',
        ].join('\n'),
        'utf8',
      );

      const service = createFileService();
      const document = await service.load(filePath);

      expect(document.chapters).toHaveLength(1);
      expect(document.paragraphs).toHaveLength(1);
      expect(document.paragraphs[0]?.id).toBe('p_literal');
      expect(document.paragraphs[0]?.light.text).toBe('## heading-like\n- list-item\n* emphasis-like\n```code\nplain text\n```');
    });
  });

  it('keeps markdown-like paragraph text through load-save-load roundtrip', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'roundtrip-literal.md');
      await fs.writeFile(
        filePath,
        [
          '<!-- ll:chapter=c_rt01 -->',
          '## Roundtrip',
          '',
          '<!-- ll:id=p_rt01 -->',
          '## not-a-heading',
          '- stays literal',
        ].join('\n'),
        'utf8',
      );

      const service = createFileService();
      const loaded = await service.load(filePath);
      const saved = await service.save(filePath, loaded, 0);

      expect(saved.ok).toBe(true);

      const reloaded = await service.load(filePath);
      expect(reloaded.paragraphs[0]?.light.text).toBe('## not-a-heading\n- stays literal');
      expect(reloaded.paragraphs[0]?.id).toBe('p_rt01');
    });
  });

  it('saves markdown and analysis json together', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'essay.md');
      const service = createFileService();

      const document: LiteLizardDocument = {
        version: 2,
        documentId: 'doc_saved',
        title: 'essay',
        personaMode: 'general-reader',
        createdAt: '2026-02-17T00:00:00.000Z',
        updatedAt: '2026-02-17T00:00:00.000Z',
        chapters: [
          {
            id: 'c_save01',
            order: 1,
            title: '章1',
          },
        ],
        paragraphs: [
          {
            id: 'p_save01',
            chapterId: 'c_save01',
            order: 1,
            light: { text: '段落A' },
            lizard: { status: 'stale' },
          },
          {
            id: 'p_save02',
            chapterId: 'c_save01',
            order: 2,
            light: { text: '段落B' },
            lizard: { status: 'complete', confidence: 0.7 },
          },
        ],
      };

      await service.createDocument(filePath, document);
      const result = await service.save(filePath, document, 0);
      expect(result.ok).toBe(true);

      const markdown = await fs.readFile(filePath, 'utf8');
      const analysisRaw = await fs.readFile(path.join(dir, 'essay.litelizard.analysis.json'), 'utf8');
      const analysis = JSON.parse(analysisRaw) as {
        paragraphs: Array<{ paragraphId: string; order: number }>;
      };

      expect(markdown).toContain('<!-- ll:chapter=c_save01 -->');
      expect(markdown).toContain('## 章1');
      expect(markdown).toContain('<!-- ll:id=p_save01 -->');
      expect(analysis.paragraphs.map((item) => item.paragraphId)).toEqual(['p_save01', 'p_save02']);
    });
  });

  it('resolves analysis sidecar path for uppercase extension', async () => {
    const service = createFileService();
    expect(service.toAnalysisPath('/tmp/Essay.MD')).toBe('/tmp/Essay.litelizard.analysis.json');
  });
});

describe('fileService lzl', () => {
  const MINIMAL_LZL = `---
documentId: d_test123456
format: lzl-v1
title: テスト文書
chapters: 1
paragraphs: 1
created: 2024-01-01T00:00:00.000Z
updated: 2024-01-01T00:00:00.000Z
---
<!--:: ch c_test123456 | 第1章 ::-->
<!--:: p p_test123456 ::-->
これはテスト段落です。
`;

  it('loads a .lzl file and returns LiteLizardDocument', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'story.lzl');
      await fs.writeFile(filePath, MINIMAL_LZL, 'utf8');

      const service = createFileService();
      const doc = await service.load(filePath);

      expect(doc.source?.format).toBe('lzl-v1');
      expect(doc.source?.originPath).toBe(filePath);
      expect(doc.chapters).toHaveLength(1);
      expect(doc.chapters[0].title).toBe('第1章');
      expect(doc.paragraphs.length).toBeGreaterThan(0);
      expect(doc.paragraphs[0].light.text).toBe('これはテスト段落です。');
    });
  });

  it('auto-repairs a .lzl file with missing frontmatter', async () => {
    const consoleWarnSpy = silenceConsoleWarn();
    try {
      await withTempDir(async (dir) => {
        const filePath = path.join(dir, 'broken.lzl');
        // frontmatter なし、マーカーなし
        await fs.writeFile(filePath, 'これは壊れたファイルです。\n', 'utf8');

        const service = createFileService();
        const doc = await service.load(filePath);

        expect(doc.chapters.length).toBeGreaterThan(0);
        expect(doc.paragraphs.length).toBeGreaterThan(0);
        expect(doc.documentId).toBeTruthy();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[fileService] lzl validation issues:',
          expect.arrayContaining(['フロントマターを再生成しました。']),
        );
      });
    } finally {
      consoleWarnSpy.mockRestore();
    }
  });

  it('listTree includes .lzl files', async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, 'a.md'), '', 'utf8');
      await fs.writeFile(path.join(dir, 'b.lzl'), '', 'utf8');
      await fs.writeFile(path.join(dir, 'c.txt'), '', 'utf8');

      const service = createFileService();
      const tree = await service.listTree(dir);
      const files = flattenFiles(tree).map((f) => path.basename(f)).sort();

      expect(files).toEqual(['a.md', 'b.lzl']);
    });
  });

  it('createDocument writes a valid .lzl file for .lzl paths', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'fresh.lzl');
      const service = createFileService();
      const document: LiteLizardDocument = {
        version: 2,
        documentId: 'd_test123456',
        title: 'fresh',
        personaMode: 'general-reader',
        createdAt: '2026-04-14T00:00:00.000Z',
        updatedAt: '2026-04-14T00:00:00.000Z',
        chapters: [{ id: 'c_test123456', order: 1, title: '第1章' }],
        paragraphs: [
          {
            id: 'p_test123456',
            chapterId: 'c_test123456',
            order: 1,
            light: { text: '新しい段落' },
            lizard: { status: 'stale' },
          },
        ],
      };

      await service.createDocument(filePath, document);

      const raw = await fs.readFile(filePath, 'utf8');
      expect(raw).toContain('format: lzl-v1');
      expect(raw).toContain('documentId: d_test123456');

      const loaded = await service.load(filePath);
      expect(loaded.source?.format).toBe('lzl-v1');
      expect(loaded.title).toBe('fresh');
      expect(loaded.paragraphs[0]?.light.text).toBe('新しい段落');
    });
  });

  it('persists an imported text document as a readable .lzl file', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'imported.lzl');
      const importResult = parseTextToImportResult('# 第一章\n本文A\n\n本文B', 'imported');
      const importedDocument = buildImportedDocument(importResult, filePath);
      const service = createFileService();

      await service.createDocument(filePath, importedDocument);

      const loaded = await service.load(filePath);
      expect(loaded.documentId).toBe(importedDocument.documentId);
      expect(loaded.title).toBe('imported');
      expect(loaded.chapters.map((chapter) => chapter.title)).toEqual(['第一章']);
      expect(loaded.paragraphs.map((paragraph) => paragraph.light.text)).toEqual(['本文A', '本文B']);
    });
  });

  it('throws UNSUPPORTED_FORMAT for unknown extensions', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'notes.txt');
      await fs.writeFile(filePath, 'hello', 'utf8');

      const service = createFileService();
      await expect(service.load(filePath)).rejects.toThrow('UNSUPPORTED_FORMAT');
    });
  });

  it('.lzl load → save → load でドキュメント内容が一致する', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'story.lzl');
      await fs.writeFile(filePath, MINIMAL_LZL, 'utf8');

      const service = createFileService();
      const loaded = await service.load(filePath);
      const saveResult = await service.save(filePath, loaded, 0);

      expect(saveResult.ok).toBe(true);

      const reloaded = await service.load(filePath);
      expect(reloaded.documentId).toBe(loaded.documentId);
      expect(reloaded.chapters).toHaveLength(loaded.chapters.length);
      expect(reloaded.paragraphs).toHaveLength(loaded.paragraphs.length);
      expect(reloaded.paragraphs[0].light.text).toBe(loaded.paragraphs[0].light.text);
    });
  });

  it('.lzl save で revision mismatch のとき REVISION_MISMATCH を返す', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'story.lzl');
      await fs.writeFile(filePath, MINIMAL_LZL, 'utf8');

      const service = createFileService();
      const loaded = await service.load(filePath);

      const result = await service.save(filePath, loaded, 999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('REVISION_MISMATCH');
      }
    });
  });

  it('.lzl save 後に .tmp ファイルが残らない', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'story.lzl');
      await fs.writeFile(filePath, MINIMAL_LZL, 'utf8');

      const service = createFileService();
      const loaded = await service.load(filePath);
      await service.save(filePath, loaded, 0);

      const dirEntries = await fs.readdir(dir);
      const tmpFiles = dirEntries.filter((name) => name.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });
  });

  it('reassigns the later-opened .lzl file when project documentIds collide', async () => {
    const consoleWarnSpy = silenceConsoleWarn();
    try {
      await withTempDir(async (dir) => {
        await fs.mkdir(path.join(dir, '.litelizard', 'analysis'), { recursive: true });
        await fs.writeFile(path.join(dir, '.litelizard', 'config.json'), '{"version":1}', 'utf8');

        const firstPath = path.join(dir, 'first.lzl');
        const secondPath = path.join(dir, 'second.lzl');
        const duplicateId = 'd_abcdefghij';
        const firstContent = `---
documentId: ${duplicateId}
format: lzl-v1
title: first
chapters: 1
paragraphs: 1
created: 2026-04-24T00:00:00.000Z
updated: 2026-04-24T00:00:00.000Z
---

<!--:: ch c_abcdefghij | 第一章 ::-->

<!--:: p p_abcdefghij ::-->
本文A
`;
        const secondContent = firstContent.replace('title: first', 'title: second').replace('本文A', '本文B');
        await fs.writeFile(firstPath, firstContent, 'utf8');
        await fs.writeFile(secondPath, secondContent, 'utf8');

        const service = createFileService();
        const first = await service.load(firstPath);
        const second = await service.load(secondPath);
        const secondAgain = await service.load(secondPath);
        const secondRaw = await fs.readFile(secondPath, 'utf8');
        const persistedSecond = parseLzl(secondRaw);

        expect(first.documentId).toBe(duplicateId);
        expect(second.documentId).toMatch(/^d_[a-z0-9]{10}$/);
        expect(second.documentId).not.toBe(duplicateId);
        expect(secondAgain.documentId).toBe(second.documentId);
        expect(persistedSecond.frontmatter.documentId).toBe(second.documentId);
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[fileService] duplicate documentId repaired:'));
      });
    } finally {
      consoleWarnSpy.mockRestore();
    }
  });

  it('repairs a duplicate .lzl copy even when the copy is opened first after startup', async () => {
    const consoleWarnSpy = silenceConsoleWarn();
    try {
      await withTempDir(async (dir) => {
        await fs.mkdir(path.join(dir, '.litelizard', 'analysis'), { recursive: true });
        await fs.writeFile(path.join(dir, '.litelizard', 'config.json'), '{"version":1}', 'utf8');

        const originalPath = path.join(dir, 'a-original.lzl');
        const copiedPath = path.join(dir, 'z-copied.lzl');
        const duplicateId = 'd_abcdefghij';
        const originalContent = `---
documentId: ${duplicateId}
format: lzl-v1
title: original
chapters: 1
paragraphs: 1
created: 2026-04-24T00:00:00.000Z
updated: 2026-04-24T00:00:00.000Z
---

<!--:: ch c_abcdefghij | 第一章 ::-->

<!--:: p p_abcdefghij ::-->
本文A
`;
        const copiedContent = originalContent.replace('title: original', 'title: copied').replace('本文A', '本文B');
        await fs.writeFile(originalPath, originalContent, 'utf8');
        await fs.writeFile(copiedPath, copiedContent, 'utf8');
        await fs.utimes(originalPath, new Date('2026-04-24T00:00:00.000Z'), new Date('2026-04-24T00:00:00.000Z'));
        await fs.utimes(copiedPath, new Date('2026-04-24T00:01:00.000Z'), new Date('2026-04-24T00:01:00.000Z'));

        const service = createFileService();
        const copied = await service.load(copiedPath);
        const original = await service.load(originalPath);
        const copiedRaw = await fs.readFile(copiedPath, 'utf8');
        const persistedCopied = parseLzl(copiedRaw);

        expect(original.documentId).toBe(duplicateId);
        expect(copied.documentId).toMatch(/^d_[a-z0-9]{10}$/);
        expect(copied.documentId).not.toBe(duplicateId);
        expect(persistedCopied.frontmatter.documentId).toBe(copied.documentId);
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[fileService] duplicate documentId repaired:'));
      });
    } finally {
      consoleWarnSpy.mockRestore();
    }
  });

  it('keeps the document with analysis history when duplicate documentIds are opened', async () => {
    const consoleWarnSpy = silenceConsoleWarn();
    try {
      await withTempDir(async (dir) => {
        await fs.mkdir(path.join(dir, '.litelizard', 'analysis'), { recursive: true });
        await fs.writeFile(path.join(dir, '.litelizard', 'config.json'), '{"version":1}', 'utf8');

        const originalPath = path.join(dir, 'z-original.lzl');
        const copiedPath = path.join(dir, 'a-copied.lzl');
        const duplicateId = 'd_abcdefghij';
        const originalContent = `---
documentId: ${duplicateId}
format: lzl-v1
title: original
chapters: 1
paragraphs: 1
created: 2026-04-24T00:00:00.000Z
updated: 2026-04-24T00:00:00.000Z
---

<!--:: ch c_abcdefghij | 第一章 ::-->

<!--:: p p_abcdefghij ::-->
本文A
`;
        const copiedContent = originalContent
          .replace('title: original', 'title: copied')
          .replace('p p_abcdefghij', 'p p_bcdefghijk')
          .replace('本文A', '本文B');
        await fs.writeFile(originalPath, originalContent, 'utf8');
        await fs.writeFile(copiedPath, copiedContent, 'utf8');
        await fs.writeFile(
          path.join(dir, '.litelizard', 'analysis', `${duplicateId}_001.json`),
          JSON.stringify({
            version: 1,
            documentId: duplicateId,
            generation: 1,
            paragraphs: {
              p_abcdefghij: { patterns: [] },
            },
          }),
          'utf8',
        );

        const service = createFileService();
        const copied = await service.load(copiedPath);
        const original = await service.load(originalPath);
        const copiedRaw = await fs.readFile(copiedPath, 'utf8');
        const persistedCopied = parseLzl(copiedRaw);

        expect(original.documentId).toBe(duplicateId);
        expect(copied.documentId).toMatch(/^d_[a-z0-9]{10}$/);
        expect(copied.documentId).not.toBe(duplicateId);
        expect(persistedCopied.frontmatter.documentId).toBe(copied.documentId);
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[fileService] duplicate documentId repaired:'));
      });
    } finally {
      consoleWarnSpy.mockRestore();
    }
  });

  it('does not treat the same documentId in another project as a collision', async () => {
    await withTempDir(async (dir) => {
      const projectA = path.join(dir, 'project-a');
      const projectB = path.join(dir, 'project-b');
      await fs.mkdir(path.join(projectA, '.litelizard', 'analysis'), { recursive: true });
      await fs.mkdir(path.join(projectB, '.litelizard', 'analysis'), { recursive: true });
      await fs.writeFile(path.join(projectA, '.litelizard', 'config.json'), '{"version":1}', 'utf8');
      await fs.writeFile(path.join(projectB, '.litelizard', 'config.json'), '{"version":1}', 'utf8');

      const duplicateId = 'd_abcdefghij';
      const content = `---
documentId: ${duplicateId}
format: lzl-v1
title: story
chapters: 1
paragraphs: 1
created: 2026-04-24T00:00:00.000Z
updated: 2026-04-24T00:00:00.000Z
---

<!--:: ch c_abcdefghij | 第一章 ::-->

<!--:: p p_abcdefghij ::-->
本文
`;
      const fileA = path.join(projectA, 'story.lzl');
      const fileB = path.join(projectB, 'story.lzl');
      await fs.writeFile(fileA, content, 'utf8');
      await fs.writeFile(fileB, content, 'utf8');

      const service = createFileService();
      const documentA = await service.load(fileA);
      const documentB = await service.load(fileB);

      expect(documentA.documentId).toBe(duplicateId);
      expect(documentB.documentId).toBe(duplicateId);
    });
  });

  it('keeps the documentId when a previously loaded .lzl file is renamed', async () => {
    await withTempDir(async (dir) => {
      const originalPath = path.join(dir, 'original.lzl');
      const renamedPath = path.join(dir, 'renamed.lzl');
      const document: LiteLizardDocument = {
        version: 2,
        documentId: 'd_abcdefghij',
        title: 'original',
        personaMode: 'general-reader',
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
        chapters: [{ id: 'c_abcdefghij', order: 1, title: '第一章' }],
        paragraphs: [
          {
            id: 'p_abcdefghij',
            chapterId: 'c_abcdefghij',
            order: 1,
            light: { text: '本文' },
            lizard: { status: 'stale' },
          },
        ],
      };

      const service = createFileService();
      await service.createDocument(originalPath, document);
      const original = await service.load(originalPath);
      await fs.rename(originalPath, renamedPath);

      const renamed = await service.load(renamedPath);

      expect(renamed.documentId).toBe(original.documentId);
    });
  });
});
