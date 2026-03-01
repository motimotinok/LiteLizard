export function createChapterId(): string {
  return `c_${Math.random().toString(36).slice(2, 10)}`;
}

export function createParagraphId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}
