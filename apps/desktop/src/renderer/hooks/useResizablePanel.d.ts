export declare function useResizablePanel(initialWidth: number, min: number, max: number): {
    width: number;
    onMouseDown: (e: React.MouseEvent, growDirection?: 1 | -1) => void;
};
