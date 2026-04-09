import Store from 'electron-store';
import { screen, type BrowserWindow } from 'electron';

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

const store = new Store<{ windowBounds: WindowBounds }>({
  defaults: { windowBounds: { width: 1400, height: 900 } },
});

export function loadWindowBounds(): WindowBounds {
  const bounds = store.get('windowBounds');
  const { x, y, width, height } = bounds;
  if (x !== undefined && y !== undefined) {
    const displays = screen.getAllDisplays();
    const isVisible = displays.some(d => {
      const db = d.bounds;
      return x >= db.x && x < db.x + db.width &&
             y >= db.y && y < db.y + db.height;
    });
    if (!isVisible) {
      return { width, height };
    }
  }
  return bounds;
}

export function saveWindowBounds(win: BrowserWindow): void {
  if (!win.isMinimized() && !win.isMaximized()) {
    store.set('windowBounds', win.getBounds());
  }
}
