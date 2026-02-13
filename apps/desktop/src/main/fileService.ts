import fs from 'node:fs/promises';
import path from 'node:path';
import { assertLiteLizardDocument } from '@litelizard/shared';
import type { FileNode, LiteLizardDocument } from '@litelizard/shared';

async function walk(root: string): Promise<FileNode[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      nodes.push({
        path: absolutePath,
        name: entry.name,
        type: 'directory',
        children: await walk(absolutePath),
      });
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.litelizard.json')) {
      nodes.push({
        path: absolutePath,
        name: entry.name,
        type: 'file',
      });
    }
  }

  return nodes.sort((a, b) => a.name.localeCompare(b.name));
}

export function createFileService() {
  const revisionMap = new Map<string, number>();

  return {
    async listTree(root: string) {
      return walk(root);
    },

    async load(filePath: string): Promise<LiteLizardDocument> {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      assertLiteLizardDocument(parsed);
      if (!revisionMap.has(filePath)) {
        revisionMap.set(filePath, 0);
      }
      return parsed;
    },

    async save(filePath: string, document: LiteLizardDocument, expectedRevision: number) {
      const current = revisionMap.get(filePath) ?? 0;
      if (current !== expectedRevision) {
        return {
          ok: false,
          code: 'REVISION_MISMATCH' as const,
          revision: current,
        };
      }

      await fs.writeFile(filePath, JSON.stringify(document, null, 2), 'utf8');
      const next = current + 1;
      revisionMap.set(filePath, next);

      return {
        ok: true,
        revision: next,
      };
    },

    async createDocument(filePath: string, document: LiteLizardDocument) {
      await fs.writeFile(filePath, JSON.stringify(document, null, 2), 'utf8');
      revisionMap.set(filePath, 0);
    },
  };
}
