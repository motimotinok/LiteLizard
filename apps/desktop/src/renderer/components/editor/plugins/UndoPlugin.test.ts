import { describe, expect, it, vi } from 'vitest';
import type { UndoSnapshot } from '../../../store/useAppStore.js';
import { commitPendingUndoSnapshot } from './UndoPlugin.js';

describe('commitPendingUndoSnapshot', () => {
  it('デバウンス中のスナップショットを即時に Undo 履歴へ確定する', () => {
    const snapshot = { documentSnapshot: { documentId: 'd_abcdefghij' } } as UndoSnapshot;
    const timer = setTimeout(() => {}, 10_000);
    const debounceTimerRef = { current: timer };
    const pendingSnapshotRef = { current: snapshot };
    const pushUndo = vi.fn();

    commitPendingUndoSnapshot(debounceTimerRef, pendingSnapshotRef, pushUndo);

    expect(pushUndo).toHaveBeenCalledWith(snapshot);
    expect(debounceTimerRef.current).toBeNull();
    expect(pendingSnapshotRef.current).toBeNull();
  });
});
