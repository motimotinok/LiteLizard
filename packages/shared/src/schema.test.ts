import { describe, expect, it } from 'vitest';
import { isLiteLizardDocument, validateLiteLizardDocument } from './schema.js';

const validDocument = {
  version: 1,
  documentId: 'doc_abcd12',
  title: 'Test Document',
  personaMode: 'general-reader',
  createdAt: '2026-02-12T00:00:00.000Z',
  updatedAt: '2026-02-12T00:00:00.000Z',
  paragraphs: [
    {
      id: 'p_abc123',
      order: 1,
      light: {
        text: '本文',
        charCount: 2,
      },
      lizard: {
        status: 'stale',
      },
    },
  ],
};

describe('LiteLizard schema validation', () => {
  it('accepts valid schema document', () => {
    expect(isLiteLizardDocument(validDocument)).toBe(true);
  });

  it('rejects invalid schema document', () => {
    const invalid = {
      ...validDocument,
      paragraphs: [
        {
          ...validDocument.paragraphs[0],
          id: 'invalid-id',
        },
      ],
    };

    const result = validateLiteLizardDocument(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
