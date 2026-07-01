import {
  buildImportedDocument,
  DEFAULT_ANALYSIS_SETTINGS,
  exportDocumentToPlainText,
  filterTagsByDefinitions,
  listDefaultReadingAgentTemplates,
  parseTextToImportResult,
  type AnalysisRunInput,
  type AnalysisSettings,
  type AnalysisSettingsInput,
  type BridgeApi,
  type FileNode,
  type GenerationalAnalysisFile,
  type LiteLizardDocument,
  type ParagraphAnalysisPattern,
  type ReadingAgent,
  type ReadingAgentInput,
  type ReadingAgentTemplate,
} from '@litelizard/shared';
import {
  initialMockApiKeyConfigured,
  initialMockDocuments,
  initialMockTree,
  mockRootPath,
} from './preloadMockData.js';

interface MockState {
  tree: FileNode[];
  documents: Map<string, LiteLizardDocument>;
  revisions: Map<string, number>;
  exportedTextFiles: Map<string, string>;
  analysisFiles: Map<string, GenerationalAnalysisFile>;
  analysisSettings: AnalysisSettings;
  readingAgents: Map<string, ReadingAgent>;
  activeReadingAgentId: string | null;
}

const LEGACY_ANTHROPIC_DEFAULT_MODELS = new Set([
  'claude-3-5-sonnet-latest',
  'claude-haiku-4-5',
]);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeAnthropicDefaultModel(input: string) {
  const model = input.trim();
  if (!model || LEGACY_ANTHROPIC_DEFAULT_MODELS.has(model)) {
    return DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel;
  }
  return model;
}

function normalizePath(value: string) {
  return value.replace(/\\/g, '/').replace(/\/+/g, '/');
}

function joinPath(base: string, name: string) {
  const normalizedBase = normalizePath(base).replace(/\/$/, '');
  return `${normalizedBase}/${name}`;
}

function baseName(filePath: string) {
  const normalized = normalizePath(filePath);
  return normalized.split('/').pop() ?? normalized;
}

function dirName(filePath: string) {
  const normalized = normalizePath(filePath).replace(/\/$/, '');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) {
    return '/';
  }
  return normalized.slice(0, index);
}

function withLzlExtension(fileName: string) {
  return /\.lzl$/i.test(fileName) ? fileName : `${fileName}.lzl`;
}

function sanitizeName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Name must not be empty');
  }
  return trimmed.replace(/[\\/:*?"<>|]/g, '-');
}

function createDocumentId() {
  return `doc_mock_${Math.random().toString(36).slice(2, 10)}`;
}

function createParagraphId() {
  return `p_mock_${Math.random().toString(36).slice(2, 10)}`;
}

function createChapterId() {
  return `c_mock_${Math.random().toString(36).slice(2, 10)}`;
}

function isSameOrNestedPath(value: string, base: string) {
  const normalizedValue = normalizePath(value);
  const normalizedBase = normalizePath(base);
  return (
    normalizedValue === normalizedBase ||
    normalizedValue.startsWith(`${normalizedBase}/`) ||
    normalizedValue.startsWith(`${normalizedBase}\\`)
  );
}

function toTitle(filePath: string) {
  return baseName(filePath).replace(/\.(md|lzl)$/i, '');
}

function buildInitialDocument(filePath: string, title: string): LiteLizardDocument {
  const now = new Date().toISOString();
  const paragraphText = '新しい段落';
  const chapterId = createChapterId();

  return {
    version: 2,
    documentId: createDocumentId(),
    title,
    personaMode: 'general-reader',
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'litelizard-json',
      originPath: filePath,
    },
    chapters: [
      {
        id: chapterId,
        order: 1,
        title: '章1',
      },
    ],
    paragraphs: [
      {
        id: createParagraphId(),
        chapterId,
        order: 1,
        light: {
          text: paragraphText,
          charCount: paragraphText.length,
        },
        lizard: {
          status: 'stale',
        },
      },
    ],
  };
}

function deepFindNode(
  nodes: FileNode[],
  targetPath: string,
  parent: FileNode | null = null
): { node: FileNode; parent: FileNode | null; siblings: FileNode[]; index: number } | null {
  const normalizedTarget = normalizePath(targetPath);
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (normalizePath(node.path) === normalizedTarget) {
      return { node, parent, siblings: nodes, index };
    }
    if (node.children?.length) {
      const found = deepFindNode(node.children, normalizedTarget, node);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findDirectoryChildren(state: MockState, rootPath: string) {
  const normalizedRoot = normalizePath(rootPath);
  if (normalizedRoot === normalizePath(mockRootPath)) {
    return state.tree;
  }

  const found = deepFindNode(state.tree, normalizedRoot);
  if (!found || found.node.type !== 'directory') {
    throw new Error(`Directory not found: ${rootPath}`);
  }

  found.node.children ??= [];
  return found.node.children;
}

function pathExists(nodes: FileNode[], targetPath: string) {
  return deepFindNode(nodes, targetPath) !== null;
}

function remapDocumentPaths(state: MockState, sourcePath: string, targetPath: string) {
  const source = normalizePath(sourcePath);
  const target = normalizePath(targetPath);

  const nextDocuments = new Map<string, LiteLizardDocument>();
  for (const [docPath, doc] of state.documents.entries()) {
    const normalizedDocPath = normalizePath(docPath);
    if (!isSameOrNestedPath(normalizedDocPath, source)) {
      nextDocuments.set(normalizedDocPath, doc);
      continue;
    }

    const suffix = normalizedDocPath.slice(source.length);
    const remappedPath = `${target}${suffix}`;
      nextDocuments.set(remappedPath, {
        ...doc,
        title: normalizePath(remappedPath) === target ? toTitle(remappedPath) : doc.title,
        source: {
          format: 'litelizard-json',
          originPath: remappedPath,
        },
      });
  }
  state.documents = nextDocuments;

  const nextRevisions = new Map<string, number>();
  for (const [filePath, revision] of state.revisions.entries()) {
    const normalized = normalizePath(filePath);
    if (!isSameOrNestedPath(normalized, source)) {
      nextRevisions.set(normalized, revision);
      continue;
    }

    const suffix = normalized.slice(source.length);
    nextRevisions.set(`${target}${suffix}`, revision);
  }
  state.revisions = nextRevisions;
}

function removeDocumentsByPath(state: MockState, targetPath: string) {
  const normalizedTarget = normalizePath(targetPath);

  for (const filePath of state.documents.keys()) {
    if (isSameOrNestedPath(filePath, normalizedTarget)) {
      state.documents.delete(filePath);
    }
  }

  for (const filePath of state.revisions.keys()) {
    if (isSameOrNestedPath(filePath, normalizedTarget)) {
      state.revisions.delete(filePath);
    }
  }
}

function paragraphAnalysisFromText(text: string) {
  const score = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);

  const emotionPool = ['安心', '期待', '緊張', '納得', '集中'];
  const themePool = ['構成', '感情', '描写', '視点', 'テンポ', '明瞭さ'];

  const emotion = emotionPool[score % emotionPool.length];
  const themeA = themePool[score % themePool.length];
  const themeB = themePool[(score + 2) % themePool.length];

  return {
    response: `段落の焦点は「${themeA}」にあり、読み手へ${emotion}を残す構成です。`,
    tags: {
      emotion: [emotion],
      theme: themeA === themeB ? [themeA] : [themeA, themeB],
    },
    model: 'mock-model-v1',
  };
}

function paragraphAnalysisFromAgent(text: string, agent: ReadingAgentInput) {
  const base = paragraphAnalysisFromText(`${agent.name}:${agent.role}:${agent.systemPrompt}:${text}`);
  const tags = filterTagsByDefinitions(
    Object.fromEntries(
      (agent.tagDefinitions ?? []).map((definition, index) => {
        const values = definition.values.map((value) => value.id);
        const first = values[base.response.length % Math.max(values.length, 1)];
        const second = values[(base.response.length + index + 1) % Math.max(values.length, 1)];
        return [definition.id, first && second && first !== second ? [first, second] : first ? [first] : []];
      }),
    ),
    agent.tagDefinitions ?? [],
  );
  return {
    ...base,
    response: `『${agent.name}』は、${base.response}`,
    tags,
    model: agent.model?.trim() || base.model,
  };
}

function applyAdditionalInstruction(analysis: ReturnType<typeof paragraphAnalysisFromAgent>, instruction?: string) {
  const trimmed = instruction?.trim();
  if (!trimmed) {
    return analysis;
  }
  return {
    ...analysis,
    response: `${analysis.response} 今回の追加観点「${trimmed.slice(0, 80)}」も踏まえています。`,
  };
}

function analysisFileKey(documentId: string) {
  return documentId;
}

function isSameAnalysisPattern(a: ParagraphAnalysisPattern, b: ParagraphAnalysisPattern) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function appendAnalysisPattern(
  state: MockState,
  documentId: string,
  paragraphId: string,
  pattern: ParagraphAnalysisPattern,
) {
  const key = analysisFileKey(documentId);
  const current = state.analysisFiles.get(key);
  const now = new Date().toISOString();
  const nextFile: GenerationalAnalysisFile = current
    ? clone(current)
    : {
        version: 1,
        documentId,
        generation: 1,
        createdAt: now,
        updatedAt: now,
        paragraphs: {},
      };

  const history = nextFile.paragraphs[paragraphId]?.patterns ?? [];
  if (history.some((existing) => isSameAnalysisPattern(existing, pattern))) {
    return;
  }

  nextFile.paragraphs[paragraphId] = {
    patterns: [...history, clone(pattern)],
  };
  nextFile.updatedAt = now;
  state.analysisFiles.set(key, nextFile);
}

function listReadingAgentTemplates(): ReadingAgentTemplate[] {
  return listDefaultReadingAgentTemplates();
}

function upsertReadingAgent(state: MockState, input: ReadingAgentInput & { id?: string }): ReadingAgent {
  const now = new Date().toISOString();
  const id = input.id?.trim() || `reader-${Math.random().toString(36).slice(2, 10)}`;
  const current = state.readingAgents.get(id);
  const next: ReadingAgent = {
    id,
    name: input.name.trim(),
    role: input.role.trim(),
    systemPrompt: input.systemPrompt.trim(),
    model: input.model?.trim() || null,
    contextPolicy: input.contextPolicy,
    tagDefinitions: input.tagDefinitions ?? [],
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    builtIn: current?.builtIn ?? false,
  };
  state.readingAgents.set(id, next);
  return clone(next);
}

function addReadingAgentFromTemplate(state: MockState, templateId: string): ReadingAgent {
  const template = listReadingAgentTemplates().find((entry) => entry.id === templateId.trim());
  if (!template) {
    throw new Error(`Reading agent template not found: ${templateId}`);
  }
  const now = new Date().toISOString();
  const baseId = template.id;
  let id = baseId;
  let suffix = 2;
  while (state.readingAgents.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const agent: ReadingAgent = {
    ...template,
    id,
    tagDefinitions: template.tagDefinitions ?? [],
    createdAt: now,
    updatedAt: now,
    builtIn: false,
  };
  state.readingAgents.set(id, agent);
  state.activeReadingAgentId = id;
  return clone(agent);
}

export function createMockPreloadApi(): BridgeApi {
  const state: MockState = {
    tree: clone(initialMockTree),
    documents: new Map(
      Object.entries(initialMockDocuments).map(([filePath, document]) => [normalizePath(filePath), clone(document)])
    ),
    revisions: new Map(Object.keys(initialMockDocuments).map((filePath) => [normalizePath(filePath), 0])),
    exportedTextFiles: new Map(),
    analysisFiles: new Map(),
    analysisSettings: {
      ...structuredClone(DEFAULT_ANALYSIS_SETTINGS),
      providers: {
        ...structuredClone(DEFAULT_ANALYSIS_SETTINGS.providers),
        openai: {
          ...structuredClone(DEFAULT_ANALYSIS_SETTINGS.providers.openai),
          apiKeyConfigured: initialMockApiKeyConfigured,
        },
      },
    },
    readingAgents: new Map(),
    activeReadingAgentId: null,
  };

  return {
    openFolder: async () => mockRootPath,
    getLastOpenedFolder: async () => mockRootPath,
    setLastOpenedFolder: async () => ({ ok: true }),
    getRecentProjects: async () => [],
    removeRecentProject: async () => ({ ok: true }),
    onRequestOpenFolder: () => () => {},

    listTree: async (_root: string) => clone(state.tree),

    createEntry: async (root: string, type: 'file' | 'folder', name: string) => {
      const safeName = sanitizeName(name);
      const children = findDirectoryChildren(state, root);

      if (type === 'folder') {
        const folderPath = joinPath(root, safeName);
        if (pathExists(state.tree, folderPath)) {
          throw new Error(`Target already exists: ${folderPath}`);
        }
        children.push({
          path: folderPath,
          name: safeName,
          type: 'directory',
          children: [],
        });
        return { ok: true, path: folderPath, type };
      }

      const fileName = withLzlExtension(safeName);
      const filePath = joinPath(root, fileName);
      if (pathExists(state.tree, filePath)) {
        throw new Error(`Target already exists: ${filePath}`);
      }

      children.push({
        path: filePath,
        name: fileName,
        type: 'file',
      });

      const document = buildInitialDocument(filePath, toTitle(filePath));
      state.documents.set(normalizePath(filePath), document);
      state.revisions.set(normalizePath(filePath), 0);

      return { ok: true, path: filePath, type };
    },

    renameEntry: async (targetPath: string, nextName: string) => {
      const found = deepFindNode(state.tree, targetPath);
      if (!found) {
        throw new Error(`Path not found: ${targetPath}`);
      }

      const oldPath = normalizePath(found.node.path);
      const parentPath = dirName(oldPath);
      const safeName = sanitizeName(nextName);
      const nextPath =
        found.node.type === 'file'
          ? joinPath(parentPath, withLzlExtension(safeName))
          : joinPath(parentPath, safeName);

      if (pathExists(state.tree, nextPath)) {
        throw new Error(`Target already exists: ${nextPath}`);
      }

      found.node.name = baseName(nextPath);
      found.node.path = nextPath;

      if (found.node.children?.length) {
        const stack = [...found.node.children];
        while (stack.length > 0) {
          const current = stack.shift();
          if (!current) {
            continue;
          }
          current.path = `${nextPath}${normalizePath(current.path).slice(oldPath.length)}`;
          if (current.children?.length) {
            stack.push(...current.children);
          }
        }
      }

      remapDocumentPaths(state, oldPath, nextPath);

      return { ok: true, path: nextPath };
    },

    moveEntry: async (sourcePath: string, destinationFolderPath: string) => {
      const found = deepFindNode(state.tree, sourcePath);
      if (!found) {
        throw new Error(`Path not found: ${sourcePath}`);
      }
      if (found.node.type === 'directory') {
        throw new Error('Folders cannot be moved with this operation.');
      }

      const destinationChildren = findDirectoryChildren(state, destinationFolderPath);
      const oldPath = normalizePath(found.node.path);
      const nextPath = joinPath(destinationFolderPath, baseName(oldPath));

      if (oldPath === normalizePath(nextPath)) {
        return { ok: true, path: oldPath };
      }

      if (pathExists(state.tree, nextPath)) {
        throw new Error(`Target already exists: ${nextPath}`);
      }

      found.siblings.splice(found.index, 1);
      found.node.path = nextPath;
      found.node.name = baseName(nextPath);
      destinationChildren.push(found.node);
      remapDocumentPaths(state, oldPath, nextPath);

      return { ok: true, path: nextPath };
    },

    deleteEntry: async (targetPath: string) => {
      const found = deepFindNode(state.tree, targetPath);
      if (!found) {
        throw new Error(`Path not found: ${targetPath}`);
      }

      found.siblings.splice(found.index, 1);
      removeDocumentsByPath(state, targetPath);

      return { ok: true };
    },

    loadDocument: async (filePath: string) => {
      const document = state.documents.get(normalizePath(filePath));
      if (!document) {
        throw new Error(`Document not found: ${filePath}`);
      }
      return clone(document);
    },

    createDocument: async (root: string, title: string) => {
      const safeStem = sanitizeName(title);
      const fileName = withLzlExtension(safeStem);
      const filePath = joinPath(root, fileName);

      const children = findDirectoryChildren(state, root);
      if (pathExists(state.tree, filePath)) {
        throw new Error(`File already exists: ${filePath}`);
      }

      const document = buildInitialDocument(filePath, toTitle(filePath));
      children.push({
        path: filePath,
        name: fileName,
        type: 'file',
      });
      state.documents.set(normalizePath(filePath), document);
      state.revisions.set(normalizePath(filePath), 0);

      return {
        filePath,
        document: clone(document),
      };
    },

    saveDocument: async (filePath: string, doc: LiteLizardDocument, revision: number) => {
      const normalizedPath = normalizePath(filePath);
      const currentRevision = state.revisions.get(normalizedPath) ?? revision;
      const nextRevision = currentRevision + 1;

      state.documents.set(normalizedPath, {
        ...clone(doc),
        source: {
          format: 'litelizard-json',
          originPath: normalizedPath,
        },
      });
      state.revisions.set(normalizedPath, nextRevision);

      return { ok: true, revision: nextRevision };
    },

    exportDocumentText: async (filePath: string | null, doc: LiteLizardDocument) => {
      const sourcePath = filePath ? normalizePath(filePath) : joinPath(mockRootPath, `${doc.title || 'Untitled'}.lzl`);
      const outputPath = sourcePath.replace(/\.[^.]+$/, '.txt');
      state.exportedTextFiles.set(outputPath, exportDocumentToPlainText(doc));
      return { ok: true as const, filePath: outputPath };
    },

    runAnalysis: async (input: AnalysisRunInput) => {
      const analyzedAt = new Date().toISOString();
      const requestId = `req_mock_${input.documentId}_${input.paragraphs.length}`;
      const agent = state.readingAgents.get(input.agentId) ?? Array.from(state.readingAgents.values())[0];
      if (!agent) {
        throw new Error(`Reading Agent not found: ${input.agentId}`);
      }

      return {
        requestId,
        documentId: input.documentId,
        agentId: input.agentId,
        personaMode: input.personaMode,
        promptVersion: input.promptVersion,
        results: input.paragraphs.map((paragraph) => {
          const analysis = applyAdditionalInstruction(
            paragraphAnalysisFromAgent(paragraph.text, agent),
            input.additionalInstruction,
          );
          return {
            paragraphId: paragraph.paragraphId,
            response: analysis.response,
            tags: analysis.tags,
            model: analysis.model,
            analyzedAt,
            promptVersion: input.promptVersion,
          };
        }),
      };
    },

    loadAnalysisSettings: async () => clone(state.analysisSettings),

    saveProviderApiKey: async (providerId: string, apiKey: string) => {
      if (!apiKey.trim()) {
        throw new Error('API key must not be empty.');
      }
      if (providerId === 'openai' || providerId === 'anthropic') {
        state.analysisSettings.providers[providerId].apiKeyConfigured = true;
      }
      return { ok: true };
    },

    clearProviderApiKey: async (providerId: string) => {
      if (providerId === 'openai' || providerId === 'anthropic') {
        state.analysisSettings.providers[providerId].apiKeyConfigured = false;
      }
      return { ok: true };
    },

    saveAnalysisSettings: async (input: AnalysisSettingsInput) => {
      state.analysisSettings = {
        ...state.analysisSettings,
        defaultProvider: input.defaultProvider,
        analysisRunConfirmationEnabled:
          typeof input.analysisRunConfirmationEnabled === 'boolean'
            ? input.analysisRunConfirmationEnabled
            : state.analysisSettings.analysisRunConfirmationEnabled,
        providers: {
          openai: {
            ...state.analysisSettings.providers.openai,
            defaultModel: input.providers.openai.defaultModel.trim() || DEFAULT_ANALYSIS_SETTINGS.providers.openai.defaultModel,
          },
          anthropic: {
            ...state.analysisSettings.providers.anthropic,
            defaultModel: normalizeAnthropicDefaultModel(input.providers.anthropic.defaultModel),
          },
        },
        localLlm: {
          endpoint: input.localLlm.endpoint.trim() || DEFAULT_ANALYSIS_SETTINGS.localLlm.endpoint,
          defaultModel: input.localLlm.defaultModel.trim() || DEFAULT_ANALYSIS_SETTINGS.localLlm.defaultModel,
          configured: Boolean(input.localLlm.endpoint.trim() && input.localLlm.defaultModel.trim()),
        },
        editorTweaks: input.editorTweaks
          ? { ...input.editorTweaks }
          : { ...state.analysisSettings.editorTweaks },
      };
      return { ok: true };
    },

    testLocalLlmConnection: async (input: { endpoint: string; model: string }) => {
      if (!input.endpoint.trim()) {
        return { ok: false as const, message: 'エンドポイント URL を入力してください。' };
      }
      if (!input.model.trim()) {
        return { ok: false as const, message: 'モデル名を入力してください。' };
      }
      if (/fail/i.test(input.endpoint) || /missing/i.test(input.model)) {
        return { ok: false as const, message: '接続できましたが、指定モデルは見つかりませんでした。' };
      }
      return { ok: true as const, model: input.model.trim() };
    },

    onAnalysisProgress: () => () => {},

    loadAnalysis: async (_projectRoot: string, _documentId: string, _filePath?: string) => {
      return clone(state.analysisFiles.get(analysisFileKey(_documentId)) ?? null);
    },

    saveAnalysisResult: async (
      _projectRoot: string,
      _documentId: string,
      _paragraphId: string,
      _pattern: ParagraphAnalysisPattern,
    ) => {
      appendAnalysisPattern(state, _documentId, _paragraphId, _pattern);
    },

    createAnalysisGeneration: async (_projectRoot: string, _documentId: string) => {
      const key = analysisFileKey(_documentId);
      const current = state.analysisFiles.get(key);
      const generation = (current?.generation ?? 0) + 1;
      const now = new Date().toISOString();
      state.analysisFiles.set(key, {
        version: 1,
        documentId: _documentId,
        generation,
        createdAt: now,
        updatedAt: now,
        paragraphs: {},
      });
      return generation;
    },

    importTextFile: async (createParent: string) => {
      const sampleText = `# サンプル章\n\nサンプル段落1。\n\nサンプル段落2。`;
      const fileName = withLzlExtension('imported-sample');
      const filePath = joinPath(createParent, fileName);

      if (pathExists(state.tree, filePath)) {
        throw new Error(`IMPORT_FILE_ALREADY_EXISTS: ${filePath}`);
      }

      const importResult = parseTextToImportResult(sampleText, 'imported-sample');
      const document = buildImportedDocument(importResult, filePath);
      const children = findDirectoryChildren(state, createParent);
      children.push({ path: filePath, name: fileName, type: 'file' });
      state.documents.set(normalizePath(filePath), document);
      state.revisions.set(normalizePath(filePath), 0);

      return { ok: true as const, filePath, document: clone(document) };
    },

    getActiveReadingAgentId: async () => state.activeReadingAgentId,

    setActiveReadingAgentId: async (id: string) => {
      state.activeReadingAgentId = id;
      return { ok: true };
    },

    listReadingAgents: async () => Array.from(state.readingAgents.values()).map(clone),

    listReadingAgentTemplates: async () => listReadingAgentTemplates().map(clone),

    addReadingAgentFromTemplate: async (templateId: string) => addReadingAgentFromTemplate(state, templateId),

    getReadingAgent: async (id: string) => clone(state.readingAgents.get(id) ?? null),

    saveReadingAgent: async (input: ReadingAgentInput & { id?: string }) => upsertReadingAgent(state, input),

    deleteReadingAgent: async (id: string) => {
      state.readingAgents.delete(id);
      return { ok: true };
    },

    resetReadingAgents: async () => {
      state.readingAgents = new Map();
      state.activeReadingAgentId = null;
      return [];
    },

    getAppVersion: async () => '0.1.0-mock',

    checkForUpdates: async () => ({
      currentVersion: '0.1.0-mock',
      latestVersion: null,
      releaseUrl: 'https://github.com/motimotinok/LiteLizard/releases/tag/mvp-latest',
      updateAvailable: false,
      checkedAt: new Date().toISOString(),
    }),

    openReleasesPage: async () => ({ ok: true }),

    downloadLatestRelease: async () => ({ ok: true }),

    dryRunReadingAgent: async (input) => {
      const analyzedAt = new Date().toISOString();
      const analysis = paragraphAnalysisFromAgent(input.paragraph.text, input.agent);
      return {
        paragraphId: input.paragraph.paragraphId,
        response: analysis.response,
        tags: analysis.tags,
        model: analysis.model,
        analyzedAt,
        promptVersion: input.promptVersion,
      };
    },
  };
}
