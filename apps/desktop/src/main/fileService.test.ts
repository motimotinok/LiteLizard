import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileNode, LiteLizardDocument } from '@litelizard/shared';
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

      await fs.writeFile(filePath, '<!-- ll:id=p_keep -->\n最初の段落\n\n次の段落', 'utf8');
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
                paragraphId: 'p_order',
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

      expect(document.documentId).toBe('doc_test');
      expect(document.paragraphs).toHaveLength(2);
      expect(document.paragraphs[0].id).toBe('p_keep');
      expect(document.paragraphs[0].lizard.status).toBe('complete');
      expect(document.paragraphs[1].id).toBe('p_order');
      expect(document.paragraphs[1].lizard.status).toBe('failed');
    });
  });

  it('saves markdown and analysis json together', async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, 'essay.md');
      const service = createFileService();

      const document: LiteLizardDocument = {
        version: 1,
        documentId: 'doc_saved',
        title: 'essay',
        personaMode: 'general-reader',
        createdAt: '2026-02-17T00:00:00.000Z',
        updatedAt: '2026-02-17T00:00:00.000Z',
        paragraphs: [
          {
            id: 'p_a',
            order: 1,
            light: { text: '段落A' },
            lizard: { status: 'stale' },
          },
          {
            id: 'p_b',
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

      expect(markdown).toContain('<!-- ll:id=p_a -->');
      expect(markdown).toContain('段落A');
      expect(analysis.paragraphs.map((item) => item.paragraphId)).toEqual(['p_a', 'p_b']);
    });
  });

  it('resolves analysis sidecar path for uppercase extension', async () => {
    const service = createFileService();
    expect(service.toAnalysisPath('/tmp/Essay.MD')).toBe('/tmp/Essay.litelizard.analysis.json');
  });
});
