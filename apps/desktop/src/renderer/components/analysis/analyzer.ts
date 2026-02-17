import type { LiteLizardDocument } from '@litelizard/shared';

export interface ImpressionScoreItem {
  key: 'tension' | 'abstractness' | 'emotionDensity' | 'informationDensity';
  label: string;
  value: number;
}

export interface ParagraphRoleItem {
  paragraphId: string;
  label: string;
}

export interface ParagraphAnalysisViewModel {
  scores: ImpressionScoreItem[];
  roles: ParagraphRoleItem[];
  redundancy: string[];
}

export interface ParagraphAnalyzer {
  analyze: (document: LiteLizardDocument) => ParagraphAnalysisViewModel;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function estimateScores(text: string): ImpressionScoreItem[] {
  const safe = normalizeText(text);
  const length = Math.max(safe.length, 1);

  const tensionWords = ['不安', '揺れる', '焦り', '迷い', '痛み', '怒り', 'fear', 'anxiety', 'regret', '痛'];
  const abstractWords = ['意味', '構造', '価値', '視点', '概念', '可能性', '本質', '抽象'];
  const emotionWords = ['嬉', '悲', '怖', '愛', '怒', '寂', '苦', '希望', '喜び', '涙', '心'];
  const infoWords = ['例えば', 'たとえば', '具体', '数値', '原因', '手順', '結果', '比較', 'データ', '証拠'];

  const punctuationTension = (safe.match(/[!?！？]/g)?.length ?? 0) * 10;
  const tensionKeyword = tensionWords.reduce(
    (sum, word) => sum + (safe.toLowerCase().includes(word.toLowerCase()) ? 16 : 0),
    0,
  );

  const abstractness =
    (abstractWords.reduce(
      (sum, word) => sum + (safe.toLowerCase().includes(word.toLowerCase()) ? 1 : 0),
      0,
    ) /
      6) *
    100;

  const emotionDensity =
    (emotionWords.reduce(
      (sum, word) => sum + (safe.toLowerCase().includes(word.toLowerCase()) ? 1 : 0),
      0,
    ) /
      7) *
    100;

  const numberScore = (safe.match(/[0-9]/g)?.length ?? 0) * 4;
  const commaScore = (safe.match(/[、,]/g)?.length ?? 0) * 5;
  const infoKeyword = infoWords.reduce(
    (sum, word) => sum + (safe.toLowerCase().includes(word.toLowerCase()) ? 14 : 0),
    0,
  );
  const lengthScore = Math.min(30, (length / 350) * 100);

  return [
    { key: 'tension', label: '緊張度', value: clamp(punctuationTension + tensionKeyword) },
    { key: 'abstractness', label: '抽象度', value: clamp(abstractness) },
    { key: 'emotionDensity', label: '感情密度', value: clamp(emotionDensity) },
    {
      key: 'informationDensity',
      label: '情報密度',
      value: clamp(numberScore + commaScore + infoKeyword + lengthScore),
    },
  ];
}

function detectParagraphRole(text: string, index: number, total: number): string {
  const normalized = normalizeText(text).toLowerCase();

  if (index === 0) {
    return normalized.includes('問題') || normalized.includes('なぜ') ? '問題提起' : '導入';
  }

  if (index === total - 1) {
    return '回収';
  }

  if (normalized.includes('例えば') || normalized.includes('たとえば') || normalized.includes('具体')) {
    return '具体例';
  }

  if (normalized.includes('思う') || normalized.includes('感じ') || normalized.includes('自分') || normalized.includes('私')) {
    return '内省';
  }

  if (normalized.includes('情景') || normalized.includes('風景') || normalized.includes('光景')) {
    return '情景描写';
  }

  return '展開';
}

function detectRedundancy(paragraphs: string[], scores: ImpressionScoreItem[]) {
  const findings: string[] = [];
  const normalized = paragraphs.map((text) => normalizeText(text)).filter((text) => text.length > 0);

  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const text of normalized) {
    if (seen.has(text)) {
      duplicate.add(text);
    }
    seen.add(text);
  }

  if (duplicate.size > 0) {
    findings.push('同義繰り返し: ほぼ同じ表現の段落が複数あります。');
  }

  const emotion = scores.find((score) => score.key === 'emotionDensity')?.value ?? 0;
  const info = scores.find((score) => score.key === 'informationDensity')?.value ?? 0;

  if (emotion >= 65 && info <= 35) {
    findings.push('感傷過多: 感情表現が強く、情報の支えが不足しています。');
  }

  if (info >= 70 && emotion <= 25) {
    findings.push('説明過多: 情報量が高く、読み心地が硬くなっています。');
  }

  if (findings.length === 0) {
    findings.push('顕著な冗長は検出されませんでした。');
  }

  return findings;
}

export const localParagraphAnalyzer: ParagraphAnalyzer = {
  analyze(document) {
    const joinedText = document.paragraphs.map((paragraph) => paragraph.light.text).join('\n');
    const scores = estimateScores(joinedText);

    const roles: ParagraphRoleItem[] = document.paragraphs.map((paragraph, index) => ({
      paragraphId: paragraph.id,
      label: detectParagraphRole(paragraph.light.text, index, document.paragraphs.length),
    }));

    const redundancy = detectRedundancy(
      document.paragraphs.map((paragraph) => paragraph.light.text),
      scores,
    );

    return { scores, roles, redundancy };
  },
};

export function analyzeWithLocalHeuristics(document: LiteLizardDocument) {
  return localParagraphAnalyzer.analyze(document);
}
