import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import type { DocumentStructureInput } from '../../types/documentStructure.js';
import { type LexicalEditor } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { UndoPlugin } from './plugins/UndoPlugin.js';
import { LexicalErrorBoundary, type LexicalErrorBoundaryProps } from '@lexical/react/LexicalErrorBoundary';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { StructureStatePlugin } from './plugins/StructureStatePlugin.js';
import { StructureChromePlugin } from './plugins/StructureChromePlugin.js';
import { ChapterCommandPlugin } from './plugins/ChapterCommandPlugin.js';
import { LexicalEditorRefPlugin } from './plugins/LexicalEditorRefPlugin.js';
import { DragHandlePlugin } from './plugins/DragHandlePlugin.js';
import {
  buildChapterInputs,
  buildFallbackChapterNodeIndexes,
  buildParagraphInputs,
  shouldSyncStructure,
  toStructureSignature,
  type StructureSnapshot,
} from './utils/structureBuilder.js';
import { mergeChapterIdByNodeKey, mergeParagraphIdByNodeKey } from './utils/nodeKeyMapping.js';
import { applyDocumentToLexicalRoot } from './utils/buildLexicalFromDocument.js';
import { useAppStore } from '../../store/useAppStore.js';

const RichTextErrorBoundary: React.ComponentType<LexicalErrorBoundaryProps> = LexicalErrorBoundary;

interface Props {
  document: LiteLizardDocument;
  activeParagraphId: string | null;
  linkedHighlightParagraphId: string | null;
  scrollRequest: { paragraphId: string; nonce: number } | null;
  setActiveParagraphId: (id: string | null) => void;
  onRequestScrollToAnalysis?: (id: string) => void;
  onPreviewParagraphLink?: (id: string | null) => void;
  onSyncStructure: (input: DocumentStructureInput) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
}

export function MicroEditorView({
  document,
  activeParagraphId,
  linkedHighlightParagraphId,
  scrollRequest,
  setActiveParagraphId,
  onRequestScrollToAnalysis,
  onPreviewParagraphLink,
  onSyncStructure,
  onReorderParagraphs: _onReorderParagraphs,
}: Props) {
  const [structureSnapshot, setStructureSnapshot] = useState<StructureSnapshot>({ chapters: [], paragraphs: [] });
  const [chapterNodeKeys, setChapterNodeKeys] = useState<string[]>([]);
  const [paragraphNodeKeys, setParagraphNodeKeys] = useState<string[]>([]);
  const [activeElement, setActiveElement] = useState<{ nodeKey: string | null; type: 'chapter' | 'paragraph' | null }>({
    nodeKey: null,
    type: null,
  });
  const [emptyParagraphNodeKeys, setEmptyParagraphNodeKeys] = useState<Set<string>>(new Set());
  const [lastSyncedSignature, setLastSyncedSignature] = useState(() =>
    toStructureSignature({ chapters: [], paragraphs: [] }),
  );

  const editorRef = useRef<LexicalEditor | null>(null);
  const paragraphIdByNodeKeyRef = useRef<Map<string, string>>(new Map());
  const chapterIdByNodeKeyRef = useRef<Map<string, string>>(new Map());
  const chapterNodeKeySetRef = useRef<Set<string>>(new Set());
  const consumedScrollRequestNonceRef = useRef<number | null>(null);
  const initialBaselineCapturedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ドキュメント切り替え時のリセット
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
    initialBaselineCapturedRef.current = false;
    useAppStore.getState().clearUndoStacks();
  }, [document.documentId]);

  // nodeKey ↔ ID マッピングの同期
  useEffect(() => {
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

  // 構造変化のデバウンス同期
  useEffect(() => {
    if (structureSnapshot.chapters.length === 0) {
      return;
    }

    const nextSignature = toStructureSignature(structureSnapshot);
    const { shouldSync, nextBaselineCaptured } = shouldSyncStructure(
      nextSignature,
      lastSyncedSignature,
      initialBaselineCapturedRef.current,
    );
    initialBaselineCapturedRef.current = nextBaselineCaptured;
    if (!shouldSync) {
      setLastSyncedSignature(nextSignature);
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
  }, [lastSyncedSignature, onSyncStructure, structureSnapshot]);

  // アクティブ段落 ID の同期
  useEffect(() => {
    if (activeElement.type !== 'paragraph' || !activeElement.nodeKey) {
      return;
    }

    const activeIndex = paragraphNodeKeys.findIndex((nodeKey) => nodeKey === activeElement.nodeKey);
    if (activeIndex < 0 || activeIndex >= document.paragraphs.length) {
      return;
    }

    const paragraphId = document.paragraphs[activeIndex]?.id ?? null;
    if (paragraphId && paragraphId !== activeParagraphId) {
      setActiveParagraphId(paragraphId);
      onRequestScrollToAnalysis?.(paragraphId);
    }
  }, [
    activeElement,
    activeParagraphId,
    document.paragraphs,
    onRequestScrollToAnalysis,
    paragraphNodeKeys,
    setActiveParagraphId,
  ]);

  // スクロールリクエストの処理
  useEffect(() => {
    if (!scrollRequest) {
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
  }, [scrollRequest, paragraphNodeKeys]);

  const fallbackChapterNodeIndexes = useMemo(() => buildFallbackChapterNodeIndexes(document), [document]);
  const paragraphIds = useMemo(() => document.paragraphs.map((paragraph) => paragraph.id), [document.paragraphs]);

  const initialConfig = useMemo(
    () => ({
      namespace: `litelizard-editor-${document.documentId}`,
      onError(error: Error) {
        throw error;
      },
      nodes: [],
      theme: {
        paragraph: 'editor-paragraph-row',
      },
      editorState: () => {
        const chapterSet = new Set<string>();
        applyDocumentToLexicalRoot(document, chapterSet);
        chapterNodeKeySetRef.current = chapterSet;
      },
    }),
    [document],
  );

  const handleSnapshot = useCallback(
    (snapshot: StructureSnapshot, emptyKeys: Set<string>) => {
      setStructureSnapshot(snapshot);
      setChapterNodeKeys(snapshot.chapters.map((chapter) => chapter.nodeKey));
      setParagraphNodeKeys(snapshot.paragraphs.map((paragraph) => paragraph.nodeKey));
      setEmptyParagraphNodeKeys(emptyKeys);
    },
    [],
  );

  const handleActiveElement = useCallback(
    (active: { nodeKey: string | null; type: 'chapter' | 'paragraph' | null }) => {
      setActiveElement(active);
    },
    [],
  );

  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <DndContext sensors={sensors}>
      <SortableContext items={paragraphNodeKeys} strategy={verticalListSortingStrategy}>
        <div className="editor-paragraph-list" ref={containerRef}>
          <LexicalComposer key={document.documentId} initialConfig={initialConfig}>
            <LexicalEditorRefPlugin onReady={(editor) => (editorRef.current = editor)} />

            <StructureStatePlugin
              chapterNodeKeySetRef={chapterNodeKeySetRef}
              fallbackChapterNodeIndexes={fallbackChapterNodeIndexes}
              onSnapshot={handleSnapshot}
              onActiveElement={handleActiveElement}
            />

            <StructureChromePlugin
              chapterNodeKeys={chapterNodeKeys}
              paragraphNodeKeys={paragraphNodeKeys}
              paragraphIds={paragraphIds}
              structureSnapshot={structureSnapshot}
              active={activeElement}
              linkedHighlightParagraphId={linkedHighlightParagraphId}
              emptyParagraphNodeKeys={emptyParagraphNodeKeys}
              onPreviewParagraphLink={onPreviewParagraphLink}
            />

            <ChapterCommandPlugin chapterNodeKeySetRef={chapterNodeKeySetRef} />

            <DragHandlePlugin
              paragraphNodeKeys={paragraphNodeKeys}
              structureSnapshot={structureSnapshot}
              containerRef={containerRef}
            />

            <UndoPlugin chapterNodeKeySetRef={chapterNodeKeySetRef} />

            <RichTextPlugin
              contentEditable={<ContentEditable className="editor-paragraph-textarea" />}
              placeholder={<div className="editor-paragraph-placeholder" />}
              ErrorBoundary={RichTextErrorBoundary}
            />
          </LexicalComposer>
        </div>
      </SortableContext>
    </DndContext>
  );
}
