import { useState, useCallback, useEffect } from 'react';

export function getEffectivePanelMaxWidth(min: number, max: number, viewportWidth: number) {
  return Math.max(min, Math.min(max, viewportWidth * 0.5));
}

interface UseResizablePanelOptions {
  disabled?: boolean;
}

export function useResizablePanel(
  initialWidth: number,
  min: number,
  max: number,
  options?: UseResizablePanelOptions,
) {
  const disabled = options?.disabled ?? false;
  const getEffectiveMax = useCallback(
    () => getEffectivePanelMaxWidth(min, max, window.innerWidth),
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
      if (disabled) {
        return;
      }

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
    [disabled, width, min, getEffectiveMax],
  );

  return { width, onMouseDown };
}
