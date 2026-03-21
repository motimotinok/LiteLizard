import { useEffect } from 'react';
import { $getRoot, $getSelection, $isParagraphNode, $isRangeSelection } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
export function StructureStatePlugin({ chapterNodeKeySetRef, fallbackChapterNodeIndexes, onSnapshot, onActiveElement, }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const root = $getRoot();
                const topLevelParagraphs = root.getChildren().filter((node) => $isParagraphNode(node));
                const nextChapterSet = new Set();
                const existingSet = chapterNodeKeySetRef.current;
                topLevelParagraphs.forEach((node) => {
                    if (existingSet.has(node.getKey())) {
                        nextChapterSet.add(node.getKey());
                    }
                });
                // On editor remount (e.g. macro -> micro), node keys are regenerated.
                // Recover chapter nodes by deterministic top-level positions from the current document snapshot.
                if (nextChapterSet.size === 0 && topLevelParagraphs.length > 0) {
                    fallbackChapterNodeIndexes.forEach((index) => {
                        const node = topLevelParagraphs[index];
                        if (node) {
                            nextChapterSet.add(node.getKey());
                        }
                    });
                    if (nextChapterSet.size === 0) {
                        nextChapterSet.add(topLevelParagraphs[0].getKey());
                    }
                }
                const chapters = [];
                const paragraphs = [];
                const emptyParagraphNodeKeys = new Set();
                let currentChapterNodeKey = null;
                topLevelParagraphs.forEach((node) => {
                    const text = node.getTextContent();
                    const isChapter = nextChapterSet.has(node.getKey()) || currentChapterNodeKey === null;
                    if (isChapter) {
                        nextChapterSet.add(node.getKey());
                        currentChapterNodeKey = node.getKey();
                        chapters.push({
                            nodeKey: node.getKey(),
                            title: text.trim() || `章${chapters.length + 1}`,
                        });
                        return;
                    }
                    if (text.trim().length === 0) {
                        emptyParagraphNodeKeys.add(node.getKey());
                    }
                    paragraphs.push({
                        nodeKey: node.getKey(),
                        chapterNodeKey: currentChapterNodeKey,
                        text,
                    });
                });
                chapterNodeKeySetRef.current = nextChapterSet;
                onSnapshot({ chapters, paragraphs }, emptyParagraphNodeKeys);
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) {
                    onActiveElement({ nodeKey: null, type: null });
                    return;
                }
                const topLevel = selection.anchor.getNode().getTopLevelElement();
                if (!topLevel || !$isParagraphNode(topLevel)) {
                    onActiveElement({ nodeKey: null, type: null });
                    return;
                }
                if (nextChapterSet.has(topLevel.getKey())) {
                    onActiveElement({ nodeKey: topLevel.getKey(), type: 'chapter' });
                    return;
                }
                onActiveElement({ nodeKey: topLevel.getKey(), type: 'paragraph' });
            });
        });
    }, [chapterNodeKeySetRef, editor, fallbackChapterNodeIndexes, onActiveElement, onSnapshot]);
    return null;
}
//# sourceMappingURL=StructureStatePlugin.js.map