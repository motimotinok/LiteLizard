import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { buildParagraphGutterMeta, type StructureSnapshot } from '../utils/structureBuilder.js';

export function StructureChromePlugin({
  chapterNodeKeys,
  paragraphNodeKeys,
  paragraphIds,
  structureSnapshot,
  active,
  linkedHighlightParagraphId,
  emptyParagraphNodeKeys,
  onPreviewParagraphLink,
}: {
  chapterNodeKeys: string[];
  paragraphNodeKeys: string[];
  paragraphIds: string[];
  structureSnapshot: StructureSnapshot;
  active: { nodeKey: string | null; type: 'chapter' | 'paragraph' | null };
  linkedHighlightParagraphId: string | null;
  emptyParagraphNodeKeys: Set<string>;
  onPreviewParagraphLink?: (id: string | null) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    chapterNodeKeys.forEach((nodeKey, index) => {
      const element = editor.getElementByKey(nodeKey);
      if (!element) {
        return;
      }

      element.classList.add('editor-chapter-row');
      element.classList.toggle('editor-chapter-row-active', active.type === 'chapter' && active.nodeKey === nodeKey);
      element.setAttribute('data-chapter-index', String(index + 1));
      element.setAttribute('data-testid', `editor-chapter-row-${index + 1}`);
    });

    const paragraphGutterMeta = buildParagraphGutterMeta(structureSnapshot);

    paragraphNodeKeys.forEach((nodeKey, index) => {
      const element = editor.getElementByKey(nodeKey);
      const paragraphId = paragraphIds[index] ?? null;
      const meta = paragraphGutterMeta[index] ?? {
        paragraphIndex: index + 1,
        chapterIndex: 1,
        chapterPosition: 'single' as const,
      };
      if (!element) {
        return;
      }

      element.classList.add('editor-paragraph-row');
      element.classList.toggle('editor-paragraph-row-active', active.type === 'paragraph' && active.nodeKey === nodeKey);
      element.classList.toggle(
        'editor-paragraph-row-linked-highlight',
        Boolean(paragraphId && paragraphId === linkedHighlightParagraphId),
      );
      element.classList.toggle('editor-paragraph-row-chapter-single', meta.chapterPosition === 'single');
      element.classList.toggle('editor-paragraph-row-chapter-start', meta.chapterPosition === 'start');
      element.classList.toggle('editor-paragraph-row-chapter-middle', meta.chapterPosition === 'middle');
      element.classList.toggle('editor-paragraph-row-chapter-end', meta.chapterPosition === 'end');
      element.setAttribute('data-paragraph-index', String(meta.paragraphIndex));
      element.setAttribute('data-chapter-index', String(meta.chapterIndex));
      element.setAttribute('data-testid', `editor-paragraph-row-${index + 1}`);

      if (paragraphId && onPreviewParagraphLink) {
        const onEnter = () => onPreviewParagraphLink(paragraphId);
        const onLeave = () => onPreviewParagraphLink(null);
        element.addEventListener('mouseenter', onEnter);
        element.addEventListener('mouseleave', onLeave);
        element.addEventListener('focusin', onEnter);
        element.addEventListener('focusout', onLeave);
        cleanups.push(() => {
          element.removeEventListener('mouseenter', onEnter);
          element.removeEventListener('mouseleave', onLeave);
          element.removeEventListener('focusin', onEnter);
          element.removeEventListener('focusout', onLeave);
        });
      }

      const showHint = active.type === 'paragraph' && active.nodeKey === nodeKey && emptyParagraphNodeKeys.has(nodeKey);
      element.classList.toggle('editor-paragraph-row-show-hint', showHint);
      if (showHint) {
        element.setAttribute('data-command-hint', 'Enterで段落 / Ctrl+Enterで次の章');
      } else {
        element.removeAttribute('data-command-hint');
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [
    active.nodeKey,
    active.type,
    chapterNodeKeys,
    editor,
    emptyParagraphNodeKeys,
    linkedHighlightParagraphId,
    onPreviewParagraphLink,
    paragraphIds,
    paragraphNodeKeys,
    structureSnapshot,
  ]);

  return null;
}
