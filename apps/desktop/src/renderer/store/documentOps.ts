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

function createParagraphId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export function replaceParagraphsInDocument(
  document: LiteLizardDocument,
  nextParagraphTexts: string[],
): LiteLizardDocument {
  const safeTexts = nextParagraphTexts.length > 0 ? nextParagraphTexts : [' '];

  const paragraphs = safeTexts.map((text, index) => {
    const existing = document.paragraphs[index];
    if (!existing) {
      return {
        id: createParagraphId(),
        order: index + 1,
        light: {
          text,
          charCount: text.length,
        },
        lizard: {
          status: 'stale' as const,
        },
      };
    }

    const changed = existing.light.text !== text;
    return {
      ...existing,
      order: index + 1,
      light: {
        ...existing.light,
        text,
        charCount: text.length,
      },
      lizard: changed ? { status: 'stale' as const } : existing.lizard,
    };
  });

  return {
    ...document,
    updatedAt: new Date().toISOString(),
    paragraphs,
  };
}
