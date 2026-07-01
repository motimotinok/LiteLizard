import type {
  GenerationalAnalysisFile,
  LiteLizardDocument,
  ParagraphAnalysisPattern,
} from '@litelizard/shared';

export type AnalysisHistoriesByParagraphId = Record<string, ParagraphAnalysisPattern[]>;
export type SelectedPatternIndexByParagraphId = Record<string, number>;

export function toAnalysisHistories(
  analysisFile: GenerationalAnalysisFile | null,
): AnalysisHistoriesByParagraphId {
  if (!analysisFile) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(analysisFile.paragraphs).map(([paragraphId, history]) => [
      paragraphId,
      history.patterns.slice(),
    ]),
  );
}

export function isPatternCompatibleWithParagraph(
  pattern: ParagraphAnalysisPattern,
  paragraphText: string,
): boolean {
  const sourceText = pattern.result.sourceText;
  return typeof sourceText !== 'string' || sourceText === paragraphText;
}

export function getVisiblePatternIndices(
  history: ParagraphAnalysisPattern[] | undefined,
  paragraphText: string,
): number[] {
  if (!history || history.length === 0) {
    return [];
  }

  const indices: number[] = [];
  history.forEach((pattern, index) => {
    if (isPatternCompatibleWithParagraph(pattern, paragraphText)) {
      indices.push(index);
    }
  });
  return indices;
}

export function resolveDisplayedPatternIndex(
  history: ParagraphAnalysisPattern[] | undefined,
  paragraphText: string,
  selectedIndex?: number,
): number | null {
  const visibleIndices = getVisiblePatternIndices(history, paragraphText);
  if (visibleIndices.length === 0) {
    return null;
  }

  if (selectedIndex !== undefined && visibleIndices.includes(selectedIndex)) {
    return selectedIndex;
  }

  return visibleIndices[visibleIndices.length - 1];
}

export function projectAnalysisHistoriesToDocument(
  document: LiteLizardDocument,
  analysisHistoriesByParagraphId: AnalysisHistoriesByParagraphId,
  selectedPatternIndexByParagraphId: SelectedPatternIndexByParagraphId,
): LiteLizardDocument {
  return {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      const history = analysisHistoriesByParagraphId[paragraph.id];
      const displayedIndex = resolveDisplayedPatternIndex(
        history,
        paragraph.light.text,
        selectedPatternIndexByParagraphId[paragraph.id],
      );

      if (displayedIndex === null || !history) {
        return paragraph;
      }

      const pattern = history[displayedIndex];
      const result = pattern.result;

      return {
        ...paragraph,
        lizard: {
          status: 'complete',
          emotion: Array.isArray(result.emotion) ? result.emotion : [],
          theme: Array.isArray(result.theme) ? result.theme : [],
          deepMeaning: typeof result.deepMeaning === 'string' ? result.deepMeaning : '',
          confidence: typeof result.confidence === 'number' ? result.confidence : 0,
          model: typeof result.model === 'string' ? result.model : '',
          analyzedAt: pattern.analyzedAt,
        },
      };
    }),
  };
}

export function appendPatternToHistories(
  analysisHistoriesByParagraphId: AnalysisHistoriesByParagraphId,
  paragraphId: string,
  pattern: ParagraphAnalysisPattern,
): AnalysisHistoriesByParagraphId {
  const history = analysisHistoriesByParagraphId[paragraphId] ?? [];
  if (history.some((existing) => JSON.stringify(existing) === JSON.stringify(pattern))) {
    return analysisHistoriesByParagraphId;
  }

  return {
    ...analysisHistoriesByParagraphId,
    [paragraphId]: [...history, pattern],
  };
}
