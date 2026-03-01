import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export function StructureChromePlugin({
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
