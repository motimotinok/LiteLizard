export type IdPrefix = 'd' | 'c' | 'p';

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 10;

function isValidId(prefix: IdPrefix, id: string) {
  return new RegExp(`^${prefix}_[a-z0-9]{${ID_LENGTH}}$`).test(id);
}

export function randomAlphanumeric(length: number): string {
  let value = '';

  while (value.length < length) {
    const index = Math.floor(Math.random() * ALPHANUMERIC.length);
    value += ALPHANUMERIC[index];
  }

  return value;
}

export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${randomAlphanumeric(ID_LENGTH)}`;
}

export function createDocumentId(): string {
  return generateId('d');
}

export function createChapterId(): string {
  return generateId('c');
}

export function createParagraphId(): string {
  return generateId('p');
}

export function isValidDocumentId(id: string): boolean {
  return isValidId('d', id);
}

export function isValidChapterId(id: string): boolean {
  return isValidId('c', id);
}

export function isValidParagraphId(id: string): boolean {
  return isValidId('p', id);
}
