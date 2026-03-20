import { useState, useCallback, useEffect } from 'react';

export function useResizablePanel(initialWidth: number, min: number, max: number) {
  const getEffectiveMax = useCallback(
    () => Math.max(min, Math.min(max, window.innerWidth * 0.5)),
    [min, max],
  );

  const [width, setWidth] = useState(() => Math.min(initialWidth, getEffectiveMax()));

  useEffect(() => {
    const onResize = () => {
      setWidth((w) => Math.min(w, getEffectiveMax()));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getEffectiveMax]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, growDirection: 1 | -1 = 1) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        const delta = (ev.clientX - startX) * growDirection;
        setWidth(Math.min(Math.max(startWidth + delta, min), getEffectiveMax()));
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
    [width, min, getEffectiveMax],
  );

  return { width, onMouseDown };
}
