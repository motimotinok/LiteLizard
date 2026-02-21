import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type LexicalEditor,
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

interface Props {
  document: LiteLizardDocument | null;
  dirty: boolean;
  activeParagraphId: string | null;
  setActiveParagraphId: (paragraphId: string | null) => void;
  onSyncParagraphs: (paragraphTexts: string[]) => void;
  onReorderParagraphs?: (orderedIds: string[]) => void;
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

function getInitialParagraphTexts(document: LiteLizardDocument | null): string[] {
  if (!document || document.paragraphs.length === 0) {
    return [''];
  }
  return document.paragraphs.map((paragraph) => paragraph.light.text);
}

function toTextSyncSignature(paragraphTexts: string[]) {
  return JSON.stringify(paragraphTexts);
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
): string[] | null {
  if (currentNodeKeys.length !== paragraphIds.length) {
    return null;
  }

  const keyToId = new Map<string, string>();
  currentNodeKeys.forEach((nodeKey, index) => {
    const paragraphId = paragraphIds[index];
    if (paragraphId) {
      keyToId.set(nodeKey, paragraphId);
    }
  });

  const orderedIds: string[] = [];
  for (const nodeKey of nextNodeKeys) {
    const paragraphId = keyToId.get(nodeKey);
    if (!paragraphId) {
      return null;
    }
    orderedIds.push(paragraphId);
  }

  return orderedIds;
}

function ParagraphStatePlugin({
  onSnapshot,
  onActiveNodeKey,
}: {
  onSnapshot: (texts: string[], nodeKeys: string[]) => void;
  onActiveNodeKey: (nodeKey: string | null) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const paragraphs = root.getChildren().filter((node) => $isParagraphNode(node));
        const texts = paragraphs.map((node) => node.getTextContent());
        const nodeKeys = paragraphs.map((node) => node.getKey());
        onSnapshot(texts.length > 0 ? texts : [''], nodeKeys);

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          onActiveNodeKey(null);
          return;
        }

        const topLevel = selection.anchor.getNode().getTopLevelElement();
        onActiveNodeKey(topLevel && $isParagraphNode(topLevel) ? topLevel.getKey() : null);
      });
    });
  }, [editor, onActiveNodeKey, onSnapshot]);

  return null;
}

function ParagraphChromePlugin({
  paragraphNodeKeys,
  activeNodeKey,
  onDropReorder,
}: {
  paragraphNodeKeys: string[];
  activeNodeKey: string | null;
  onDropReorder: (activeKey: string, overKey: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    paragraphNodeKeys.forEach((nodeKey, index) => {
      const element = editor.getElementByKey(nodeKey);
      if (!element) {
        return;
      }

      element.classList.add('editor-paragraph-row');
      element.classList.toggle('editor-paragraph-row-active', nodeKey === activeNodeKey);
      element.setAttribute('data-node-key', nodeKey);
      element.setAttribute('data-paragraph-index', String(index + 1));
      element.setAttribute('data-testid', `editor-paragraph-row-${index + 1}`);
      element.setAttribute('draggable', 'true');
      element.ondragstart = (event) => {
        const rect = element.getBoundingClientRect();
        const dragHandleWidth = 56;
        if (event.clientX > rect.left + dragHandleWidth) {
          event.preventDefault();
          return;
        }
        event.dataTransfer?.setData('text/plain', nodeKey);
        event.dataTransfer?.setData('application/x-litelizard-node-key', nodeKey);
        event.dataTransfer?.setDragImage(element, 24, 12);
        element.classList.add('editor-paragraph-row-dragging');
      };

      element.ondragend = () => {
        element.classList.remove('editor-paragraph-row-dragging');
      };

      element.ondragover = (event) => {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
      };

      element.ondrop = (event) => {
        event.preventDefault();
        const draggedNodeKey =
          event.dataTransfer?.getData('application/x-litelizard-node-key') ?? event.dataTransfer?.getData('text/plain') ?? '';
        if (!draggedNodeKey || draggedNodeKey === nodeKey) {
          element.classList.remove('editor-paragraph-row-dragging');
          return;
        }
        onDropReorder(draggedNodeKey, nodeKey);
        element.classList.remove('editor-paragraph-row-dragging');
      };
    });
  }, [activeNodeKey, editor, onDropReorder, paragraphNodeKeys]);

  return null;
}

function reorderParagraphNodes(editor: LexicalEditor, currentKeys: string[], activeKey: string, overKey: string): string[] {
  const nextKeys = reorderNodeKeys(currentKeys, activeKey, overKey);
  if (nextKeys === currentKeys) {
    return currentKeys;
  }

  editor.update(() => {
    const root = $getRoot();
    const paragraphNodes = nextKeys
      .map((nodeKey) => $getNodeByKey(nodeKey))
      .filter((node): node is ReturnType<typeof $createParagraphNode> => Boolean(node) && $isParagraphNode(node));

    paragraphNodes.forEach((node) => {
      root.append(node);
    });
  });

  return nextKeys;
}

export function EditorPane({
  document,
  dirty,
  activeParagraphId,
  setActiveParagraphId,
  onSyncParagraphs,
  onReorderParagraphs,
  onCreateEssay,
  onOpenFolder,
}: Props) {
  const [paragraphTexts, setParagraphTexts] = useState(() => getInitialParagraphTexts(document));
  const [paragraphNodeKeys, setParagraphNodeKeys] = useState<string[]>([]);
  const [activeParagraphNodeKey, setActiveParagraphNodeKey] = useState<string | null>(null);
  const [lastSyncedSignature, setLastSyncedSignature] = useState(() => toTextSyncSignature(getInitialParagraphTexts(document)));
  const editorRef = useRef<LexicalEditor | null>(null);
  const paragraphNodeKeysRef = useRef<string[]>([]);

  useEffect(() => {
    paragraphNodeKeysRef.current = paragraphNodeKeys;
  }, [paragraphNodeKeys]);

  useEffect(() => {
    const nextTexts = getInitialParagraphTexts(document);
    setParagraphTexts(nextTexts);
    setParagraphNodeKeys([]);
    setActiveParagraphNodeKey(null);
    setLastSyncedSignature(toTextSyncSignature(nextTexts));
  }, [document?.documentId]);

  useEffect(() => {
    if (!document) {
      return;
    }

    const nextSignature = toTextSyncSignature(paragraphTexts);
    if (nextSignature === lastSyncedSignature) {
      return;
    }

    const handle = window.setTimeout(() => {
      onSyncParagraphs(paragraphTexts.length > 0 ? paragraphTexts : [' ']);
      setLastSyncedSignature(nextSignature);
    }, 120);

    return () => {
      window.clearTimeout(handle);
    };
  }, [document, lastSyncedSignature, onSyncParagraphs, paragraphTexts]);

  useEffect(() => {
    if (!document || !activeParagraphNodeKey) {
      return;
    }

    const activeIndex = paragraphNodeKeys.findIndex((nodeKey) => nodeKey === activeParagraphNodeKey);
    if (activeIndex < 0 || activeIndex >= document.paragraphs.length) {
      return;
    }

    const paragraphId = document.paragraphs[activeIndex]?.id ?? null;
    if (paragraphId && paragraphId !== activeParagraphId) {
      setActiveParagraphId(paragraphId);
    }
  }, [activeParagraphId, activeParagraphNodeKey, document, paragraphNodeKeys, setActiveParagraphId]);

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

        const initialTexts = getInitialParagraphTexts(document);
        for (const text of initialTexts) {
          const paragraph = $createParagraphNode();
          if (text.length > 0) {
            paragraph.append($createTextNode(text));
          }
          root.append(paragraph);
        }
      },
    }),
    [document],
  );

  if (!document) {
    return (
      <section className="editor-shell">
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

  const onDropReorder = (activeKey: string, overKey: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const currentKeys = paragraphNodeKeysRef.current;
    const nextKeys = reorderParagraphNodes(editor, currentKeys, activeKey, overKey);
    if (nextKeys === currentKeys) {
      return;
    }

    const orderedIds = mapParagraphIdsByNodeKeys(
      currentKeys,
      nextKeys,
      document.paragraphs.map((paragraph) => paragraph.id),
    );
    if (orderedIds) {
      onReorderParagraphs?.(orderedIds);
    }
  };

  const activeParagraphIndex = activeParagraphId
    ? document.paragraphs.findIndex((paragraph) => paragraph.id === activeParagraphId)
    : -1;
  const paragraphCount = paragraphTexts.length;
  const charCount = paragraphTexts.reduce((sum, text) => sum + text.length, 0);

  return (
    <section className="editor-shell">
      <div className="editor-frame">
        <header className="editor-header">
          <div className="editor-title-wrap">
            <span className={dirty ? 'save-dot save-dot-dirty' : 'save-dot'} />
            <h1 className="editor-title">{document.title}</h1>
          </div>
          <div className="editor-meta">
            <span>{paragraphCount} 段落</span>
            {activeParagraphIndex >= 0 ? <span>注目 {activeParagraphIndex + 1}</span> : null}
          </div>
        </header>

        <div className="editor-body">
          <div className="editor-paragraph-list">
            <LexicalComposer key={document.documentId} initialConfig={initialConfig}>
              <LexicalEditorRefPlugin onReady={(editor) => (editorRef.current = editor)} />

              <ParagraphStatePlugin
                onSnapshot={(texts, nodeKeys) => {
                  setParagraphTexts(texts);
                  setParagraphNodeKeys(nodeKeys);
                }}
                onActiveNodeKey={(nodeKey) => {
                  setActiveParagraphNodeKey(nodeKey);
                }}
              />

              <ParagraphChromePlugin
                paragraphNodeKeys={paragraphNodeKeys}
                activeNodeKey={activeParagraphNodeKey}
                onDropReorder={onDropReorder}
              />

              <HistoryPlugin />

              <RichTextPlugin
                contentEditable={<ContentEditable className="editor-paragraph-textarea" />}
                placeholder={<div className="editor-paragraph-placeholder">ここに本文を入力してください。</div>}
                ErrorBoundary={LexicalErrorBoundary}
              />
            </LexicalComposer>
          </div>
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

function LexicalEditorRefPlugin({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
}
