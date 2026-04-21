export declare function getEffectivePanelMaxWidth(min: number, max: number, viewportWidth: number): number;
interface UseResizablePanelOptions {
    disabled?: boolean;
}
export declare function useResizablePanel(initialWidth: number, min: number, max: number, options?: UseResizablePanelOptions): {
    width: number;
    onMouseDown: (e: React.MouseEvent, growDirection?: 1 | -1) => void;
};
export {};
