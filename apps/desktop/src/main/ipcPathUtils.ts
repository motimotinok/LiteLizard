export function validateEntryName(input: string) {
  const name = input.trim();
  if (!name) {
    throw new Error('Name is required.');
  }
  if (name === '.' || name === '..') {
    throw new Error('Name is invalid.');
  }
  if (name.includes('/') || name.includes('\\')) {
    throw new Error('Name must not contain path separators.');
  }
  return name;
}

export function sanitizeFileStem(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'Untitled';
  }

  const replaced = trimmed.replace(/[<>:"|?*\\/]/g, '_').replace(/\.+$/, '').trim();
  return replaced.length > 0 ? replaced : 'Untitled';
}

export function ensureMarkdownFileName(name: string) {
  if (/\.md$/i.test(name)) {
    return `${name.slice(0, -3)}.md`;
  }
  return `${name}.md`;
}

export function ensureFileName(name: string, originalExt: string): string {
  const ext = originalExt.toLowerCase();
  if (ext === '.lzl') {
    if (/\.lzl$/i.test(name)) {
      return `${name.slice(0, -4)}.lzl`;
    }
    return `${name}.lzl`;
  }
  return ensureMarkdownFileName(name);
}

export function toTitleFromFileName(fileName: string) {
  return fileName.replace(/\.(md|lzl)$/i, '');
}
