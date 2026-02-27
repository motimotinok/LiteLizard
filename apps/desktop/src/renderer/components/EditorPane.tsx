import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import type { DocumentStructureInput, ParagraphStructureInput } from '../types/documentStructure.js';
import {
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type LexicalEditor,
  type ParagraphNode,
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary, type LexicalErrorBoundaryProps } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

const RichTextErrorBoundary: React.ComponentType<LexicalErrorBoundaryProps> = LexicalErrorBoundary;

interface StructureSnapshot {
  chapters: Array<{ nodeKey: string; title: string }>;
  paragraphs: Array<{ nodeKey: string; chapterNodeKey: string | null; text: string }>;
}

interface Props {
  isExpanded: boolean;
  document: LiteLizardDocument | null;
  dirty: boolean;
  viewScale: 'micro' | 'macro';
  activeParagraphId: string | null;
  scrollRequest: { paragraphId: string; nonce: number } | null;
  setActiveParagraphId: (paragraphId: string | null) => void;
  onSetViewScale: (viewScale: 'micro' | 'macro') => void;
  onSyncStructure: (input: DocumentStructureInput) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

function toStructureSignature(snapshot: StructureSnapshot) {
  return JSON.stringify({
    chapters: snapshot.chapters.map((chapter) => chapter.title),
    paragraphs: snapshot.paragraphs.map((paragraph) => [paragraph.chapterNodeKey, paragraph.text]),
  });
}

export function reorderNodeKeys(nodeKeys: string[], activeKey: string, overKey: string): string[] {
  const oldIndex = nodeKeys.findIndex((nodeKey) => nodeKey === activeKey);
  const newIndex = nodeKeys.findIndex((nodeKey) => nodeKey === overKey);

  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return nodeKeys;
  }

  const next = [...nodeKeys];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}

export function mapParagraphIdsByNodeKeys(
  currentNodeKeys: string[],
  nextNodeKeys: string[],
  paragraphIds: string[],
  previousKeyToId: ReadonlyMap<string, string> = new Map(),
): string[] | null {
  const keyToId = new Map(previousKeyToId);
  if (currentNodeKeys.length === paragraphIds.length) {
    keyToId.clear();
    currentNodeKeys.forEach((nodeKey, index) => {
      const paragraphId = paragraphIds[index];
      if (paragraphId) {
        keyToId.set(nodeKey, paragraphId);
      }
    });
  }

  const rankById = new Map<string, number>();
  nextNodeKeys.forEach((nodeKey, index) => {
    const paragraphId = keyToId.get(nodeKey);
    if (paragraphId && !rankById.has(paragraphId)) {
      rankById.set(paragraphId, index);
    }
  });

  if (rankById.size === 0) {
    return null;
  }

  return [...paragraphIds]
    .map((paragraphId, index) => ({
      paragraphId,
      sortRank: rankById.get(paragraphId) ?? nextNodeKeys.length + index,
    }))
    .sort((left, right) => left.sortRank - right.sortRank)
    .map((item) => item.paragraphId);
}

export function mergeParagraphIdByNodeKey(
  previousKeyToId: ReadonlyMap<string, string>,
  currentNodeKeys: string[],
  paragraphIds: string[],
): Map<string, string> {
  if (currentNodeKeys.length !== paragraphIds.length) {
    return new Map(previousKeyToId);
  }

  const paragraphIdSet = new Set(paragraphIds);
  const next = new Map<string, string>();

  currentNodeKeys.forEach((nodeKey, index) => {
    const previousParagraphId = previousKeyToId.get(nodeKey);
    if (previousParagraphId && paragraphIdSet.has(previousParagraphId)) {
      next.set(nodeKey, previousParagraphId);
      return;
    }

    const paragraphId = paragraphIds[index];
    if (paragraphId) {
      next.set(nodeKey, paragraphId);
    }
  });

  return next;
}

function mergeChapterIdByNodeKey(
  previousKeyToId: ReadonlyMap<string, string>,
  currentNodeKeys: string[],
  chapterIds: string[],
): Map<string, string> {
  if (currentNodeKeys.length !== chapterIds.length) {
    return new Map(previousKeyToId);
  }

  const chapterIdSet = new Set(chapterIds);
  const next = new Map<string, string>();

  currentNodeKeys.forEach((nodeKey, index) => {
    const previousChapterId = previousKeyToId.get(nodeKey);
    if (previousChapterId && chapterIdSet.has(previousChapterId)) {
      next.set(nodeKey, previousChapterId);
      return;
    }

    const chapterId = chapterIds[index];
    if (chapterId) {
      next.set(nodeKey, chapterId);
    }
  });

  return next;
}

function createChapterId() {
  return `c_${Math.random().toString(36).slice(2, 10)}`;
}

function createParagraphId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildChapterInputs(
  snapshotChapters: StructureSnapshot['chapters'],
  chapterIdByNodeKey: ReadonlyMap<string, string>,
): Array<{ id: string; title: string }> {
  const nextMap = new Map(chapterIdByNodeKey);
  const usedIds = new Set<string>(chapterIdByNodeKey.values());

  return snapshotChapters.map((chapter, index) => {
    let chapterId = nextMap.get(chapter.nodeKey);
    if (!chapterId) {
      do {
        chapterId = createChapterId();
      } while (usedIds.has(chapterId));
    }

    usedIds.add(chapterId);
    nextMap.set(chapter.nodeKey, chapterId);

    return {
      id: chapterId,
      title: chapter.title.trim() || `章${index + 1}`,
    };
  });
}

export function buildParagraphInputs(
  snapshotParagraphs: StructureSnapshot['paragraphs'],
  paragraphIdByNodeKey: ReadonlyMap<string, string>,
  chapterIdByNodeKey: ReadonlyMap<string, string>,
  fallbackChapterId: string | undefined,
): Array<ParagraphStructureInput & { id: string }> {
  const nextMap = new Map(paragraphIdByNodeKey);
  const usedIds = new Set<string>(paragraphIdByNodeKey.values());

  return snapshotParagraphs.map((paragraph) => {
    let paragraphId = nextMap.get(paragraph.nodeKey);
    if (!paragraphId) {
      do {
        paragraphId = createParagraphId();
      } while (usedIds.has(paragraphId));
    }

    usedIds.add(paragraphId);
    nextMap.set(paragraph.nodeKey, paragraphId);

    return {
      id: paragraphId,
      chapterId: paragraph.chapterNodeKey ? chapterIdByNodeKey.get(paragraph.chapterNodeKey) ?? fallbackChapterId : fallbackChapterId,
      text: paragraph.text.length > 0 ? paragraph.text : ' ',
    };
  });
}

function findCurrentChapterNode(topLevel: ParagraphNode | null, chapterNodeKeySet: Set<string>): ParagraphNode | null {
  if (!topLevel) {
    return null;
  }

  if (chapterNodeKeySet.has(topLevel.getKey())) {
    return topLevel;
  }

  let current = topLevel.getPreviousSibling();
  while (current) {
    if ($isParagraphNode(current) && chapterNodeKeySet.has(current.getKey())) {
      return current;
    }
    current = current.getPreviousSibling();
  }

  return null;
}

function StructureStatePlugin({
  chapterNodeKeySetRef,
  fallbackChapterNodeIndexes,
  onSnapshot,
  onActiveElement,
}: {
  chapterNodeKeySetRef: React.MutableRefObject<Set<string>>;
  fallbackChapterNodeIndexes: number[];
  onSnapshot: (snapshot: StructureSnapshot, emptyParagraphNodeKeys: Set<string>) => void;
  onActiveElement: (active: { nodeKey: string | null; type: 'chapter' | 'paragraph' | null }) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const topLevelParagraphs = root.getChildren().filter((node): node is ParagraphNode => $isParagraphNode(node));

        const nextChapterSet = new Set<string>();
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

        const chapters: StructureSnapshot['chapters'] = [];
        const paragraphs: StructureSnapshot['paragraphs'] = [];
        const emptyParagraphNodeKeys = new Set<string>();

        let currentChapterNodeKey: string | null = null;

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

function ChapterCommandPlugin({ chapterNodeKeySetRef }: { chapterNodeKeySetRef: React.MutableRefObject<Set<string>> }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event) {
          return false;
        }

        const hasModifier = event.metaKey || event.ctrlKey;

        if (hasModifier) {
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
              return;
            }

            const topLevel = selection.anchor.getNode().getTopLevelElement();
            if (!topLevel || !$isParagraphNode(topLevel)) {
              return;
            }

            const chapterNode = findCurrentChapterNode(topLevel, chapterNodeKeySetRef.current);
            let insertAfter: ParagraphNode = topLevel;

            if (chapterNode) {
              insertAfter = chapterNode;
              let walker = chapterNode.getNextSibling();
              while (walker && !($isParagraphNode(walker) && chapterNodeKeySetRef.current.has(walker.getKey()))) {
                if ($isParagraphNode(walker)) {
                  insertAfter = walker;
                }
                walker = walker.getNextSibling();
              }
            }

            const chapterParagraph = $createParagraphNode();
            chapterParagraph.append($createTextNode(`章${chapterNodeKeySetRef.current.size + 1}`));
            const bodyParagraph = $createParagraphNode();

            insertAfter.insertAfter(chapterParagraph);
            chapterParagraph.insertAfter(bodyParagraph);
            chapterNodeKeySetRef.current.add(chapterParagraph.getKey());
            chapterParagraph.selectStart();
          });
          return true;
        }

        let handled = false;
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }

          const topLevel = selection.anchor.getNode().getTopLevelElement();
          if (!topLevel || !$isParagraphNode(topLevel)) {
            return;
          }

          if (!chapterNodeKeySetRef.current.has(topLevel.getKey())) {
            return;
          }

          handled = true;
          event.preventDefault();

          const nextSibling = topLevel.getNextSibling();
          if (nextSibling && $isParagraphNode(nextSibling) && !chapterNodeKeySetRef.current.has(nextSibling.getKey())) {
            nextSibling.selectStart();
            return;
          }

          const paragraph = $createParagraphNode();
          topLevel.insertAfter(paragraph);
          paragraph.selectStart();
        });

        return handled;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        event?.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    );

    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        let handled = false;

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return;
          }

          const topLevel = selection.anchor.getNode().getTopLevelElement();
          if (!topLevel || !$isParagraphNode(topLevel)) {
            return;
          }

          if (!chapterNodeKeySetRef.current.has(topLevel.getKey())) {
            return;
          }

          const isAtStart = selection.anchor.offset === 0;
          if (!isAtStart || topLevel.getTextContent().trim().length > 0) {
            return;
          }

          handled = true;
          event?.preventDefault();

          const paragraphsInChapter: ParagraphNode[] = [];
          let walker = topLevel.getNextSibling();
          while (walker && !($isParagraphNode(walker) && chapterNodeKeySetRef.current.has(walker.getKey()))) {
            if ($isParagraphNode(walker)) {
              paragraphsInChapter.push(walker);
            }
            walker = walker.getNextSibling();
          }

          const hasContent = paragraphsInChapter.some((node) => node.getTextContent().trim().length > 0);
          if (hasContent) {
            return;
          }

          const previous = topLevel.getPreviousSibling();
          paragraphsInChapter.forEach((node) => node.remove());
          chapterNodeKeySetRef.current.delete(topLevel.getKey());
          topLevel.remove();

          const root = $getRoot();
          const topParagraphs = root.getChildren().filter((node): node is ParagraphNode => $isParagraphNode(node));

          if (topParagraphs.length === 0) {
            const chapter = $createParagraphNode();
            chapter.append($createTextNode('章1'));
            const paragraph = $createParagraphNode();
            root.append(chapter, paragraph);
            chapterNodeKeySetRef.current = new Set([chapter.getKey()]);
            chapter.selectStart();
            return;
          }

          if (previous && $isParagraphNode(previous)) {
            previous.selectEnd();
          } else {
            topParagraphs[0].selectStart();
          }
        });

        return handled;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      unregisterEnter();
      unregisterTab();
      unregisterBackspace();
    };
  }, [chapterNodeKeySetRef, editor]);

  return null;
}

function StructureChromePlugin({
  chapterNodeKeys,
  paragraphNodeKeys,
  active,
  emptyParagraphNodeKeys,
}: {
  chapterNodeKeys: string[];
  paragraphNodeKeys: string[];
  active: { nodeKey: string | null; type: 'chapter' | 'paragraph' | null };
  emptyParagraphNodeKeys: Set<string>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    chapterNodeKeys.forEach((nodeKey, index) => {
      const element = editor.getElementByKey(nodeKey);
      if (!element) {
        return;
      }

      element.classList.add('editor-chapter-row');
      element.classList.toggle('editor-chapter-row-active', active.type === 'chapter' && active.nodeKey === nodeKey);
      element.setAttribute('data-chapter-index', `Chapter ${index + 1}`);
      element.setAttribute('data-testid', `editor-chapter-row-${index + 1}`);
    });

    paragraphNodeKeys.forEach((nodeKey, index) => {
      const element = editor.getElementByKey(nodeKey);
      if (!element) {
        return;
      }

      element.classList.add('editor-paragraph-row');
      element.classList.toggle('editor-paragraph-row-active', active.type === 'paragraph' && active.nodeKey === nodeKey);
      element.setAttribute('data-paragraph-index', String(index + 1));
      element.setAttribute('data-testid', `editor-paragraph-row-${index + 1}`);

      const showHint = active.type === 'paragraph' && active.nodeKey === nodeKey && emptyParagraphNodeKeys.has(nodeKey);
      element.classList.toggle('editor-paragraph-row-show-hint', showHint);
      if (showHint) {
        element.setAttribute('data-command-hint', 'Enterで段落 / Ctrl+Enterで次の章');
      } else {
        element.removeAttribute('data-command-hint');
      }
    });
  }, [active.nodeKey, active.type, chapterNodeKeys, editor, emptyParagraphNodeKeys, paragraphNodeKeys]);

  return null;
}

function LexicalEditorRefPlugin({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
}

function buildMacroSummary(document: LiteLizardDocument) {
  const grouped = new Map<string, typeof document.paragraphs>();

  document.paragraphs
    .slice()
    .sort((left, right) => left.order - right.order)
    .forEach((paragraph) => {
      const list = grouped.get(paragraph.chapterId) ?? [];
      list.push(paragraph);
      grouped.set(paragraph.chapterId, list);
    });

  return document.chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((chapter) => {
      const paragraphs = grouped.get(chapter.id) ?? [];
      const preview = paragraphs[0]?.light.text.trim() ?? '';
      return {
        id: chapter.id,
        title: chapter.title,
        paragraphCount: paragraphs.length,
        preview: preview.length > 90 ? `${preview.slice(0, 90)}…` : preview || '（空の章）',
      };
    });
}

function buildFallbackChapterNodeIndexes(document: LiteLizardDocument): number[] {
  const countsByChapterId = new Map<string, number>();
  document.paragraphs.forEach((paragraph) => {
    countsByChapterId.set(paragraph.chapterId, (countsByChapterId.get(paragraph.chapterId) ?? 0) + 1);
  });

  const indexes: number[] = [];
  let cursor = 0;
  document.chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .forEach((chapter) => {
      indexes.push(cursor);
      const paragraphCount = Math.max(1, countsByChapterId.get(chapter.id) ?? 0);
      cursor += 1 + paragraphCount;
    });

  return indexes;
}

export function EditorPane({
  isExpanded,
  document,
  dirty,
  viewScale,
  activeParagraphId,
  scrollRequest,
  setActiveParagraphId,
  onSetViewScale,
  onSyncStructure,
  onCreateEssay,
  onOpenFolder,
}: Props) {
  const [structureSnapshot, setStructureSnapshot] = useState<StructureSnapshot>({ chapters: [], paragraphs: [] });
  const [chapterNodeKeys, setChapterNodeKeys] = useState<string[]>([]);
  const [paragraphNodeKeys, setParagraphNodeKeys] = useState<string[]>([]);
  const [activeElement, setActiveElement] = useState<{ nodeKey: string | null; type: 'chapter' | 'paragraph' | null }>({
    nodeKey: null,
    type: null,
  });
  const [emptyParagraphNodeKeys, setEmptyParagraphNodeKeys] = useState<Set<string>>(new Set());
  const [lastSyncedSignature, setLastSyncedSignature] = useState(() => toStructureSignature({ chapters: [], paragraphs: [] }));

  const editorRef = useRef<LexicalEditor | null>(null);
  const paragraphIdByNodeKeyRef = useRef<Map<string, string>>(new Map());
  const chapterIdByNodeKeyRef = useRef<Map<string, string>>(new Map());
  const chapterNodeKeySetRef = useRef<Set<string>>(new Set());
  const consumedScrollRequestNonceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!document) {
      paragraphIdByNodeKeyRef.current = new Map();
      chapterIdByNodeKeyRef.current = new Map();
      chapterNodeKeySetRef.current = new Set();
      return;
    }

    if (chapterNodeKeys.length === document.chapters.length) {
      chapterIdByNodeKeyRef.current = mergeChapterIdByNodeKey(
        chapterIdByNodeKeyRef.current,
        chapterNodeKeys,
        document.chapters.map((chapter) => chapter.id),
      );
    }

    if (paragraphNodeKeys.length === document.paragraphs.length) {
      paragraphIdByNodeKeyRef.current = mergeParagraphIdByNodeKey(
        paragraphIdByNodeKeyRef.current,
        paragraphNodeKeys,
        document.paragraphs.map((paragraph) => paragraph.id),
      );
    }
  }, [chapterNodeKeys, document, paragraphNodeKeys]);

  useEffect(() => {
    setStructureSnapshot({ chapters: [], paragraphs: [] });
    setChapterNodeKeys([]);
    setParagraphNodeKeys([]);
    setActiveElement({ nodeKey: null, type: null });
    setEmptyParagraphNodeKeys(new Set());
    setLastSyncedSignature(toStructureSignature({ chapters: [], paragraphs: [] }));
    paragraphIdByNodeKeyRef.current = new Map();
    chapterIdByNodeKeyRef.current = new Map();
    chapterNodeKeySetRef.current = new Set();
    consumedScrollRequestNonceRef.current = null;
  }, [document?.documentId]);

  useEffect(() => {
    if (!document || structureSnapshot.chapters.length === 0) {
      return;
    }

    const nextSignature = toStructureSignature(structureSnapshot);
    if (nextSignature === lastSyncedSignature) {
      return;
    }

    const handle = window.setTimeout(() => {
      const chapterInputs = buildChapterInputs(structureSnapshot.chapters, chapterIdByNodeKeyRef.current);
      chapterIdByNodeKeyRef.current = mergeChapterIdByNodeKey(
        chapterIdByNodeKeyRef.current,
        structureSnapshot.chapters.map((chapter) => chapter.nodeKey),
        chapterInputs.map((chapter) => chapter.id),
      );

      const chapterIdByNodeKey = new Map<string, string>();
      chapterInputs.forEach((chapter, index) => {
        if (chapter.id) {
          chapterIdByNodeKey.set(structureSnapshot.chapters[index].nodeKey, chapter.id);
        }
      });

      const fallbackChapterId = chapterInputs[0]?.id;

      const paragraphInputs = buildParagraphInputs(
        structureSnapshot.paragraphs,
        paragraphIdByNodeKeyRef.current,
        chapterIdByNodeKey,
        fallbackChapterId,
      );
      paragraphIdByNodeKeyRef.current = mergeParagraphIdByNodeKey(
        paragraphIdByNodeKeyRef.current,
        structureSnapshot.paragraphs.map((paragraph) => paragraph.nodeKey),
        paragraphInputs.map((paragraph) => paragraph.id),
      );

      onSyncStructure({
        chapters: chapterInputs,
        paragraphs: paragraphInputs,
      });
      setLastSyncedSignature(nextSignature);
    }, 120);

    return () => {
      window.clearTimeout(handle);
    };
  }, [document, lastSyncedSignature, onSyncStructure, structureSnapshot]);

  useEffect(() => {
    if (!document || activeElement.type !== 'paragraph' || !activeElement.nodeKey) {
      return;
    }

    const activeIndex = paragraphNodeKeys.findIndex((nodeKey) => nodeKey === activeElement.nodeKey);
    if (activeIndex < 0 || activeIndex >= document.paragraphs.length) {
      return;
    }

    const paragraphId = document.paragraphs[activeIndex]?.id ?? null;
    if (paragraphId && paragraphId !== activeParagraphId) {
      setActiveParagraphId(paragraphId);
    }
  }, [activeElement, activeParagraphId, document, paragraphNodeKeys, setActiveParagraphId]);

  useEffect(() => {
    if (!scrollRequest || !document) {
      return;
    }

    if (consumedScrollRequestNonceRef.current === scrollRequest.nonce) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const paragraphIdByNodeKey = paragraphIdByNodeKeyRef.current;
    let targetNodeKey: string | null = null;

    paragraphIdByNodeKey.forEach((paragraphId, nodeKey) => {
      if (!targetNodeKey && paragraphId === scrollRequest.paragraphId) {
        targetNodeKey = nodeKey;
      }
    });

    if (!targetNodeKey) {
      return;
    }

    const element = editor.getElementByKey(targetNodeKey);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    consumedScrollRequestNonceRef.current = scrollRequest.nonce;
  }, [document, scrollRequest, paragraphNodeKeys]);

  const initialConfig = useMemo(
    () => ({
      namespace: `litelizard-editor-${document?.documentId ?? 'empty'}`,
      onError(error: Error) {
        throw error;
      },
      nodes: [],
      theme: {
        paragraph: 'editor-paragraph-row',
      },
      editorState: () => {
        const root = $getRoot();
        root.clear();

        if (!document || document.chapters.length === 0) {
          const chapter = $createParagraphNode();
          chapter.append($createTextNode('章1'));
          root.append(chapter);
          root.append($createParagraphNode());
          chapterNodeKeySetRef.current = new Set([chapter.getKey()]);
          return;
        }

        const chapterSet = new Set<string>();
        const chapterList = document.chapters.slice().sort((left, right) => left.order - right.order);
        const paragraphsByChapterId = new Map<string, Array<{ text: string }>>();

        document.paragraphs
          .slice()
          .sort((left, right) => left.order - right.order)
          .forEach((paragraph) => {
            const list = paragraphsByChapterId.get(paragraph.chapterId) ?? [];
            list.push({ text: paragraph.light.text });
            paragraphsByChapterId.set(paragraph.chapterId, list);
          });

        chapterList.forEach((chapter) => {
          const chapterNode = $createParagraphNode();
          chapterNode.append($createTextNode(chapter.title));
          root.append(chapterNode);
          chapterSet.add(chapterNode.getKey());

          const chapterParagraphs = paragraphsByChapterId.get(chapter.id) ?? [];
          if (chapterParagraphs.length === 0) {
            root.append($createParagraphNode());
            return;
          }

          chapterParagraphs.forEach((paragraph) => {
            const paragraphNode = $createParagraphNode();
            if (paragraph.text.length > 0) {
              paragraphNode.append($createTextNode(paragraph.text));
            }
            root.append(paragraphNode);
          });
        });

        chapterNodeKeySetRef.current = chapterSet;
      },
    }),
    [document],
  );

  if (!document) {
    return (
      <section className={isExpanded ? 'editor-shell editor-shell-expanded' : 'editor-shell'}>
        <div className="editor-empty-state">
          <h2 className="editor-empty-title">構造を設計するための執筆エリア</h2>
          <p className="editor-empty-description">段落単位で思考できるように、まずは作品ファイルを用意してください。</p>
          <div className="editor-empty-actions">
            <button className="action-button action-button-primary" onClick={onCreateEssay}>
              ✍ 新しいエッセイを書く
            </button>
            <button className="action-button" onClick={onOpenFolder}>
              📂 フォルダを開く
            </button>
          </div>
        </div>
      </section>
    );
  }

  const activeParagraphIndex = activeParagraphId ? document.paragraphs.findIndex((paragraph) => paragraph.id === activeParagraphId) : -1;
  const paragraphCount = document.paragraphs.length;
  const charCount = document.paragraphs.reduce((sum, paragraph) => sum + paragraph.light.text.length, 0);
  const macroSummary = buildMacroSummary(document);
  const fallbackChapterNodeIndexes = buildFallbackChapterNodeIndexes(document);

  return (
    <section className={isExpanded ? 'editor-shell editor-shell-expanded' : 'editor-shell'}>
      <div className="editor-frame">
        <header className="editor-header">
          <div className="editor-title-wrap">
            <span className={dirty ? 'save-dot save-dot-dirty' : 'save-dot'} />
            <h1 className="editor-title">{document.title}</h1>
          </div>
          <div className="editor-meta">
            <span>{document.chapters.length} 章</span>
            <span>{paragraphCount} 段落</span>
            {activeParagraphIndex >= 0 ? <span>注目 {activeParagraphIndex + 1}</span> : null}
          </div>
        </header>

        <div
          className="editor-body"
          onWheel={(event) => {
            if (!(event.ctrlKey || event.metaKey)) {
              return;
            }
            event.preventDefault();
            onSetViewScale(event.deltaY > 0 ? 'macro' : 'micro');
          }}
        >
          {viewScale === 'macro' ? (
            <div className="editor-macro-list">
              {macroSummary.map((chapter, index) => (
                <article key={chapter.id} className="editor-macro-card">
                  <header className="editor-macro-card-header">
                    <span className="editor-macro-card-index">C{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="editor-macro-card-title">{chapter.title}</h3>
                  </header>
                  <p className="editor-macro-card-preview">{chapter.preview}</p>
                  <footer className="editor-macro-card-footer">{chapter.paragraphCount} 段落</footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="editor-paragraph-list">
              <LexicalComposer key={document.documentId} initialConfig={initialConfig}>
                <LexicalEditorRefPlugin onReady={(editor) => (editorRef.current = editor)} />

                <StructureStatePlugin
                  chapterNodeKeySetRef={chapterNodeKeySetRef}
                  fallbackChapterNodeIndexes={fallbackChapterNodeIndexes}
                  onSnapshot={(snapshot, emptyKeys) => {
                    setStructureSnapshot(snapshot);
                    setChapterNodeKeys(snapshot.chapters.map((chapter) => chapter.nodeKey));
                    setParagraphNodeKeys(snapshot.paragraphs.map((paragraph) => paragraph.nodeKey));
                    setEmptyParagraphNodeKeys(emptyKeys);
                  }}
                  onActiveElement={(active) => {
                    setActiveElement(active);
                  }}
                />

                <StructureChromePlugin
                  chapterNodeKeys={chapterNodeKeys}
                  paragraphNodeKeys={paragraphNodeKeys}
                  active={activeElement}
                  emptyParagraphNodeKeys={emptyParagraphNodeKeys}
                />

                <ChapterCommandPlugin chapterNodeKeySetRef={chapterNodeKeySetRef} />
                <HistoryPlugin />

                <RichTextPlugin
                  contentEditable={<ContentEditable className="editor-paragraph-textarea" />}
                  placeholder={<div className="editor-paragraph-placeholder" />}
                  ErrorBoundary={RichTextErrorBoundary}
                />
              </LexicalComposer>
            </div>
          )}
        </div>

        <footer className="editor-footer">
          <div className="editor-footer-left">
            <span>{charCount} 文字</span>
          </div>
          <div className="editor-footer-right">
            <span>{dirty ? '未保存' : '保存済み'}</span>
            <span className={dirty ? 'save-dot save-dot-dirty' : 'save-dot'} />
          </div>
        </footer>
      </div>
    </section>
  );
}
