import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
export function LexicalEditorRefPlugin({ onReady }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        onReady(editor);
    }, [editor, onReady]);
    return null;
}
//# sourceMappingURL=LexicalEditorRefPlugin.js.map