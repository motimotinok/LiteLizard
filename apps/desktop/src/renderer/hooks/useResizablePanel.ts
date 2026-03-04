import { useState, useCallback } from 'react';

export function useResizablePanel(initialWidth: number, min: number, max: number) {
  const [width, setWidth] = useState(initialWidth);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, growDirection: 1 | -1 = 1) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        const delta = (ev.clientX - startX) * growDirection;
        setWidth(Math.min(Math.max(startWidth + delta, min), max));
      };
      const onUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [width, min, max],
  );

  return { width, onMouseDown };
}
