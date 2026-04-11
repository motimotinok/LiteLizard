import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  GenerationalAnalysisFile,
  LiteLizardAnalysisFile,
  ParagraphAnalysisPattern,
} from '@litelizard/shared';

const MAX_GENERATION = 999;

function getAnalysisDir(projectRoot: string): string {
  return path.join(projectRoot, '.litelizard', 'analysis');
}

function analysisFilePath(projectRoot: string, documentId: string, generation: number): string {
  const fileName = `${documentId}_${String(generation).padStart(3, '0')}.json`;
  return path.join(getAnalysisDir(projectRoot), fileName);
}

/**
 * documentId に対応する世代番号の一覧を昇順で返す。
 * ファイルが存在しない場合は空配列。
 */
export async function listGenerations(projectRoot: string, documentId: string): Promise<number[]> {
  const dir = getAnalysisDir(projectRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const pattern = new RegExp(`^${escapeRegExp(documentId)}_(\\d{3})\\.json$`);
  const generations: number[] = [];
  for (const entry of entries) {
    const match = pattern.exec(entry);
    if (match) {
      generations.push(parseInt(match[1], 10));
    }
  }
  return generations.sort((a, b) => a - b);
}

/**
 * 最新世代の解析ファイルを読み込む。存在しない場合は null。
 */
export async function loadLatestAnalysis(
  projectRoot: string,
  documentId: string,
): Promise<GenerationalAnalysisFile | null> {
  const generations = await listGenerations(projectRoot, documentId);
  if (generations.length === 0) {
    return null;
  }
  const latest = generations[generations.length - 1];
  return loadAnalysis(projectRoot, documentId, latest);
}

/**
 * 指定世代の解析ファイルを読み込む。存在しない場合は null。
 */
export async function loadAnalysis(
  projectRoot: string,
  documentId: string,
  generation: number,
): Promise<GenerationalAnalysisFile | null> {
  const filePath = analysisFilePath(projectRoot, documentId, generation);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as GenerationalAnalysisFile;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.documentId !== 'string' ||
      parsed.paragraphs === null ||
      typeof parsed.paragraphs !== 'object' ||
      Array.isArray(parsed.paragraphs)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 解析ファイルを保存する（一時ファイル経由でアトミックに書き込む）。
 */
export async function saveAnalysis(
  projectRoot: string,
  data: GenerationalAnalysisFile,
): Promise<void> {
  const filePath = analysisFilePath(projectRoot, data.documentId, data.generation);
  const tmpPath = `${filePath}.tmp`;
  await fs.mkdir(getAnalysisDir(projectRoot), { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

/**
 * 段落の解析パターンを最新世代ファイルに追記する。
 * ファイルが存在しない場合は generation:1 で新規作成する。
 */
export async function appendParagraphPattern(
  projectRoot: string,
  documentId: string,
  paragraphId: string,
  pattern: ParagraphAnalysisPattern,
): Promise<void> {
  let file = await loadLatestAnalysis(projectRoot, documentId);
  if (!file) {
    const now = new Date().toISOString();
    file = {
      version: 1,
      documentId,
      generation: 1,
      createdAt: now,
      updatedAt: now,
      paragraphs: {},
    };
  }

  // 破損ファイル等で paragraphs が欠けていれば新規作成
  file.paragraphs = (file.paragraphs && typeof file.paragraphs === 'object') ? file.paragraphs : {};
  const history = file.paragraphs[paragraphId] ?? { patterns: [] };
  file.paragraphs[paragraphId] = {
    patterns: [...history.patterns, pattern],
  };
  file.updatedAt = new Date().toISOString();

  await saveAnalysis(projectRoot, file);
}

/**
 * 新しい世代ファイルを作成して返す（前世代の段落はコピーしない。仕様 §6.3）。
 * 現在の最大世代が 999 の場合はエラー。
 */
export async function createGeneration(
  projectRoot: string,
  documentId: string,
): Promise<GenerationalAnalysisFile> {
  const generations = await listGenerations(projectRoot, documentId);
  const currentMax = generations.length > 0 ? generations[generations.length - 1] : 0;

  if (currentMax >= MAX_GENERATION) {
    throw new Error(
      `世代番号の上限 (${MAX_GENERATION}) に達しています: documentId=${documentId}`,
    );
  }

  const now = new Date().toISOString();
  const newFile: GenerationalAnalysisFile = {
    version: 1,
    documentId,
    generation: currentMax + 1,
    createdAt: now,
    updatedAt: now,
    paragraphs: {},
  };

  await saveAnalysis(projectRoot, newFile);
  return newFile;
}

/**
 * 旧サイドカー形式（LiteLizardAnalysisFile）を新形式（GenerationalAnalysisFile）に変換する。
 * 既存の lizard データを patterns[0] として generation:1 で作成。
 */
export function migrateFromV1(v1: LiteLizardAnalysisFile): GenerationalAnalysisFile {
  const paragraphs: Record<string, { patterns: ParagraphAnalysisPattern[] }> = {};

  for (const p of v1.paragraphs) {
    if (p.lizard.status === 'complete') {
      paragraphs[p.paragraphId] = {
        patterns: [
          {
            analyzedAt: p.lizard.analyzedAt ?? v1.updatedAt,
            result: {
              emotion: p.lizard.emotion,
              theme: p.lizard.theme,
              deepMeaning: p.lizard.deepMeaning,
              confidence: p.lizard.confidence,
              model: p.lizard.model,
            },
          },
        ],
      };
    }
  }

  return {
    version: 1,
    documentId: v1.documentId,
    generation: 1,
    createdAt: v1.createdAt,
    updatedAt: v1.updatedAt,
    paragraphs,
  };
}

/**
 * documentId に対応する全世代ファイルを削除する（ドキュメント削除時のクリーンアップ用）。
 */
export async function deleteAnalysisFiles(projectRoot: string, documentId: string): Promise<void> {
  const generations = await listGenerations(projectRoot, documentId);
  await Promise.all(
    generations.map((gen) =>
      fs.rm(analysisFilePath(projectRoot, documentId, gen), { force: true }),
    ),
  );
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
