import type { LiteLizardDocument } from '@litelizard/shared';

export function updateParagraphInDocument(
  document: LiteLizardDocument,
  paragraphId: string,
  text: string,
): LiteLizardDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    paragraphs: document.paragraphs.map((paragraph) =>
      paragraph.id === paragraphId
        ? {
            ...paragraph,
            light: {
              ...paragraph.light,
              text,
              charCount: text.length,
            },
            lizard: {
              ...paragraph.lizard,
              status: 'stale',
            },
          }
        : paragraph,
    ),
  };
}

export function reorderParagraphsInDocument(
  document: LiteLizardDocument,
  orderedIds: string[],
): LiteLizardDocument {
  const map = new Map(document.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
  const paragraphs = orderedIds
    .map((id) => map.get(id))
    .filter((paragraph): paragraph is NonNullable<typeof paragraph> => Boolean(paragraph))
    .map((paragraph, index) => ({
      ...paragraph,
      order: index + 1,
    }));

  return {
    ...document,
    updatedAt: new Date().toISOString(),
    paragraphs,
  };
}

export function collectStaleParagraphs(document: LiteLizardDocument) {
  return document.paragraphs.filter((paragraph) => paragraph.lizard.status === 'stale');
}
