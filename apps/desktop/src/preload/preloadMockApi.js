import { DEFAULT_ANALYSIS_SETTINGS, } from '@litelizard/shared';
import { initialMockApiKeyConfigured, initialMockDocuments, initialMockTree, mockRootPath, } from './preloadMockData.js';
function clone(value) {
    return structuredClone(value);
}
function normalizePath(value) {
    return value.replace(/\\/g, '/').replace(/\/+/g, '/');
}
function joinPath(base, name) {
    const normalizedBase = normalizePath(base).replace(/\/$/, '');
    return `${normalizedBase}/${name}`;
}
function baseName(filePath) {
    const normalized = normalizePath(filePath);
    return normalized.split('/').pop() ?? normalized;
}
function dirName(filePath) {
    const normalized = normalizePath(filePath).replace(/\/$/, '');
    const index = normalized.lastIndexOf('/');
    if (index <= 0) {
        return '/';
    }
    return normalized.slice(0, index);
}
function withMarkdownExtension(fileName) {
    return /\.md$/i.test(fileName) ? fileName : `${fileName}.md`;
}
function withLzlExtension(fileName) {
    return /\.lzl$/i.test(fileName) ? fileName : `${fileName}.lzl`;
}
function sanitizeName(name) {
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
function isSameOrNestedPath(value, base) {
    const normalizedValue = normalizePath(value);
    const normalizedBase = normalizePath(base);
    return (normalizedValue === normalizedBase ||
        normalizedValue.startsWith(`${normalizedBase}/`) ||
        normalizedValue.startsWith(`${normalizedBase}\\`));
}
function toTitle(filePath) {
    return baseName(filePath).replace(/\.(md|lzl)$/i, '');
}
function buildInitialDocument(filePath, title) {
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
function deepFindNode(nodes, targetPath, parent = null) {
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
function findDirectoryChildren(state, rootPath) {
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
function pathExists(nodes, targetPath) {
    return deepFindNode(nodes, targetPath) !== null;
}
function remapDocumentPaths(state, sourcePath, targetPath) {
    const source = normalizePath(sourcePath);
    const target = normalizePath(targetPath);
    const nextDocuments = new Map();
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
    const nextRevisions = new Map();
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
function removeDocumentsByPath(state, targetPath) {
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
function paragraphAnalysisFromText(text) {
    const score = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const emotionPool = ['安心', '期待', '緊張', '納得', '集中'];
    const themePool = ['構成', '感情', '描写', '視点', 'テンポ', '明瞭さ'];
    const emotion = emotionPool[score % emotionPool.length];
    const themeA = themePool[score % themePool.length];
    const themeB = themePool[(score + 2) % themePool.length];
    const confidenceRaw = 0.55 + (score % 40) / 100;
    return {
        emotion: [emotion],
        theme: themeA === themeB ? [themeA] : [themeA, themeB],
        deepMeaning: `段落の焦点は「${themeA}」にあり、読み手へ${emotion}を残す構成です。`,
        confidence: Number(Math.min(confidenceRaw, 0.95).toFixed(2)),
        model: 'mock-model-v1',
    };
}
export function createMockPreloadApi() {
    const state = {
        tree: clone(initialMockTree),
        documents: new Map(Object.entries(initialMockDocuments).map(([filePath, document]) => [normalizePath(filePath), clone(document)])),
        revisions: new Map(Object.keys(initialMockDocuments).map((filePath) => [normalizePath(filePath), 0])),
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
    };
    return {
        openFolder: async () => mockRootPath,
        getLastOpenedFolder: async () => mockRootPath,
        setLastOpenedFolder: async () => ({ ok: true }),
        onRequestOpenFolder: () => () => { },
        listTree: async (_root) => clone(state.tree),
        createEntry: async (root, type, name) => {
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
        renameEntry: async (targetPath, nextName) => {
            const found = deepFindNode(state.tree, targetPath);
            if (!found) {
                throw new Error(`Path not found: ${targetPath}`);
            }
            const oldPath = normalizePath(found.node.path);
            const parentPath = dirName(oldPath);
            const safeName = sanitizeName(nextName);
            const nextPath = found.node.type === 'file'
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
        deleteEntry: async (targetPath) => {
            const found = deepFindNode(state.tree, targetPath);
            if (!found) {
                throw new Error(`Path not found: ${targetPath}`);
            }
            found.siblings.splice(found.index, 1);
            removeDocumentsByPath(state, targetPath);
            return { ok: true };
        },
        loadDocument: async (filePath) => {
            const document = state.documents.get(normalizePath(filePath));
            if (!document) {
                throw new Error(`Document not found: ${filePath}`);
            }
            return clone(document);
        },
        createDocument: async (root, title) => {
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
        saveDocument: async (filePath, doc, revision) => {
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
        runAnalysis: async (input) => {
            const analyzedAt = new Date().toISOString();
            const requestId = `req_mock_${input.documentId}_${input.paragraphs.length}`;
            return {
                requestId,
                documentId: input.documentId,
                personaMode: input.personaMode,
                promptVersion: input.promptVersion,
                results: input.paragraphs.map((paragraph) => {
                    const analysis = paragraphAnalysisFromText(paragraph.text);
                    return {
                        paragraphId: paragraph.paragraphId,
                        emotion: analysis.emotion,
                        theme: analysis.theme,
                        deepMeaning: analysis.deepMeaning,
                        confidence: analysis.confidence,
                        model: analysis.model,
                        analyzedAt,
                        promptVersion: input.promptVersion,
                    };
                }),
            };
        },
        loadAnalysisSettings: async () => clone(state.analysisSettings),
        saveProviderApiKey: async (providerId, apiKey) => {
            if (!apiKey.trim()) {
                throw new Error('API key must not be empty.');
            }
            if (providerId === 'openai' || providerId === 'anthropic') {
                state.analysisSettings.providers[providerId].apiKeyConfigured = true;
            }
            return { ok: true };
        },
        clearProviderApiKey: async (providerId) => {
            if (providerId === 'openai' || providerId === 'anthropic') {
                state.analysisSettings.providers[providerId].apiKeyConfigured = false;
            }
            return { ok: true };
        },
        saveAnalysisSettings: async (input) => {
            state.analysisSettings = {
                ...state.analysisSettings,
                defaultProvider: input.defaultProvider,
                providers: {
                    openai: {
                        ...state.analysisSettings.providers.openai,
                        defaultModel: input.providers.openai.defaultModel.trim() || DEFAULT_ANALYSIS_SETTINGS.providers.openai.defaultModel,
                    },
                    anthropic: {
                        ...state.analysisSettings.providers.anthropic,
                        defaultModel: input.providers.anthropic.defaultModel.trim() || DEFAULT_ANALYSIS_SETTINGS.providers.anthropic.defaultModel,
                    },
                },
                localLlm: {
                    endpoint: input.localLlm.endpoint.trim() || DEFAULT_ANALYSIS_SETTINGS.localLlm.endpoint,
                    defaultModel: input.localLlm.defaultModel.trim() || DEFAULT_ANALYSIS_SETTINGS.localLlm.defaultModel,
                    configured: Boolean(input.localLlm.endpoint.trim() && input.localLlm.defaultModel.trim()),
                },
            };
            return { ok: true };
        },
        testLocalLlmConnection: async (input) => {
            if (!input.endpoint.trim()) {
                return { ok: false, message: 'エンドポイント URL を入力してください。' };
            }
            if (!input.model.trim()) {
                return { ok: false, message: 'モデル名を入力してください。' };
            }
            if (/fail/i.test(input.endpoint) || /missing/i.test(input.model)) {
                return { ok: false, message: '接続できましたが、指定モデルは見つかりませんでした。' };
            }
            return { ok: true, model: input.model.trim() };
        },
        loadAnalysis: async (_projectRoot, _documentId, _filePath) => {
            return null;
        },
        saveAnalysisResult: async (_projectRoot, _documentId, _paragraphId, _pattern) => {
            // mock: no-op
        },
        createAnalysisGeneration: async (_projectRoot, _documentId) => {
            return 1;
        },
    };
}
