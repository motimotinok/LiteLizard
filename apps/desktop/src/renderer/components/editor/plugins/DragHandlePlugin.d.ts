import React from 'react';
interface Props {
    paragraphNodeKeys: string[];
    containerRef: React.RefObject<HTMLDivElement | null>;
}
export declare function DragHandlePlugin({ paragraphNodeKeys, containerRef }: Props): React.ReactPortal | null;
export {};
