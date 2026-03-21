/**
 * Returns a new array with one item moved from one index to another.
 * If either index is negative or both indices are the same, the original array is returned.
 */
export declare function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[];
/**
 * Reorders key strings by moving `activeKey` to the position of `overKey`.
 * If either key is not found, the original array is returned by `reorderItems`.
 */
export declare function reorderByKey(keys: string[], activeKey: string, overKey: string): string[];
