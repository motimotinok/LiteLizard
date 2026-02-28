import type { FileNode, LiteLizardDocument } from '@litelizard/shared';

export const mockRootPath = '/mock/workspace';

const now = '2026-02-21T00:00:00.000Z';

export const initialMockTree: FileNode[] = [
  {
    path: `${mockRootPath}/welcome.md`,
    name: 'welcome.md',
    type: 'file',
  },
  {
    path: `${mockRootPath}/notes`,
    name: 'notes',
    type: 'directory',
    children: [
      {
        path: `${mockRootPath}/notes/ideas.md`,
        name: 'ideas.md',
        type: 'file',
      },
    ],
  },
];

export const initialMockDocuments: Record<string, LiteLizardDocument> = {
  [`${mockRootPath}/welcome.md`]: {
    version: 2,
    documentId: 'doc_mock_welcome',
    title: 'welcome',
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'litelizard-json',
      originPath: `${mockRootPath}/welcome.md`,
    },
    chapters: [
      {
        id: 'c_welcome1',
        order: 1,
        title: '章1',
      },
    ],
    paragraphs: [
      {
        id: 'p_welcome1',
        chapterId: 'c_welcome1',
        order: 1,
        light: {
          text: 'LiteLizardのモック環境です。ここでUI操作を確認できます。',
          charCount: 31,
        },
        lizard: {
          status: 'stale',
        },
      },
      {
        id: 'p_welcome2',
        chapterId: 'c_welcome1',
        order: 2,
        light: {
          text: 'このデータはpreload内メモリに保持され、再起動で初期化されます。',
          charCount: 34,
        },
        lizard: {
          status: 'complete',
          emotion: ['安心'],
          theme: ['案内', '開発効率'],
          deepMeaning: '検証を素早く回すため、制約を明示したモック運用を選択している。',
          confidence: 0.82,
          model: 'mock-model-v1',
          requestId: 'req_mock_bootstrap',
          analyzedAt: now,
        },
      },
    ],
  },
  [`${mockRootPath}/notes/ideas.md`]: {
    version: 2,
    documentId: 'doc_mock_ideas',
    title: 'ideas',
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'litelizard-json',
      originPath: `${mockRootPath}/notes/ideas.md`,
    },
    chapters: [
      {
        id: 'c_ideas01',
        order: 1,
        title: '章1',
      },
    ],
    paragraphs: [
      {
        id: 'p_ideas01',
        chapterId: 'c_ideas01',
        order: 1,
        light: {
          text: '次の改善案を箇条書きで追記する。',
          charCount: 16,
        },
        lizard: {
          status: 'stale',
        },
      },
    ],
  },
};

export const initialMockApiKeyConfigured = true;
