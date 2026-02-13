import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { LiteLizardDocument } from './types.js';

const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020') as {
  default: new (options?: Record<string, unknown>) => {
    compile: (schema: unknown) => {
      (input: unknown): boolean;
      errors?: Array<{ instancePath?: string; message?: string }>;
    };
    errorsText: (errors?: unknown, options?: { separator?: string }) => string;
  };
};
const addFormats = require('ajv-formats') as (ajv: unknown) => void;
const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../LiteLizard_schema_v1.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020.default({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export function isLiteLizardDocument(input: unknown): input is LiteLizardDocument {
  return validate(input) as boolean;
}

export function assertLiteLizardDocument(input: unknown): asserts input is LiteLizardDocument {
  if (validate(input)) {
    return;
  }
  const message = ajv.errorsText(validate.errors, { separator: '; ' });
  throw new Error(`Document schema validation failed: ${message}`);
}

export function validateLiteLizardDocument(input: unknown): {
  valid: boolean;
  errors: string[];
} {
  const valid = validate(input) as boolean;
  if (valid) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: (validate.errors ?? []).map((error: { instancePath?: string; message?: string }) =>
      `${error.instancePath ?? ''} ${error.message ?? 'validation error'}`.trim(),
    ),
  };
}
