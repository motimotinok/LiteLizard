export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function reorderByKey(keys: string[], activeKey: string, overKey: string): string[] {
  const from = keys.indexOf(activeKey);
  const to = keys.indexOf(overKey);
  return reorderItems(keys, from, to);
}
