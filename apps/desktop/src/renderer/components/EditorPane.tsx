import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';

interface Props {
  document: LiteLizardDocument | null;
  dirty: boolean;
  activeParagraphId: string | null;
  setActiveParagraphId: (paragraphId: string | null) => void;
  onSyncParagraphs: (paragraphTexts: string[]) => void;
  onCreateEssay: () => void;
  onOpenFolder: () => void;
}

interface ParagraphRange {
  text: string;
  start: number;
  end: number;
}

function toEditorText(document: LiteLizardDocument | null) {
  if (!document || document.paragraphs.length === 0) {
    return '';
  }
  return document.paragraphs.map((paragraph) => paragraph.light.text).join('\n\n');
}

function parseParagraphRanges(text: string): ParagraphRange[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const ranges: ParagraphRange[] = [];

  let offset = 0;
  let start: number | null = null;
  let chunk: string[] = [];

  const flush = (end: number) => {
    if (start === null || chunk.length === 0) {
      return;
    }
    const paragraphText = chunk.join('\n').trimEnd();
    if (paragraphText.trim().length > 0) {
      ranges.push({ text: paragraphText, start, end });
    }
    start = null;
    chunk = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const isBlank = line.trim().length === 0;

    if (isBlank) {
      flush(offset);
    } else {
      if (start === null) {
        start = offset;
      }
      chunk.push(line);
    }

    offset += line.length + 1;
  }

  flush(normalized.length);
  return ranges;
}

export function EditorPane({
  document,
  dirty,
  activeParagraphId,
  setActiveParagraphId,
  onSyncParagraphs,
  onCreateEssay,
  onOpenFolder,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editorText, setEditorText] = useState(() => toEditorText(document));
  const [lastSyncedText, setLastSyncedText] = useState(() => toEditorText(document));

  useEffect(() => {
    const next = toEditorText(document);
    setEditorText(next);
    setLastSyncedText(next);
  }, [document?.documentId]);

  const ranges = useMemo(() => parseParagraphRanges(editorText), [editorText]);

  useEffect(() => {
    if (!document) {
      return;
    }
    if (editorText === lastSyncedText) {
      return;
    }

    const handle = window.setTimeout(() => {
      const nextParagraphs = ranges.map((range) => range.text);
      onSyncParagraphs(nextParagraphs.length > 0 ? nextParagraphs : [' ']);
      setLastSyncedText(editorText);
    }, 120);

    return () => {
      window.clearTimeout(handle);
    };
  }, [document, editorText, lastSyncedText, ranges, onSyncParagraphs]);

  const updateActiveParagraphByCursor = (cursor: number) => {
    if (!document || document.paragraphs.length === 0) {
      setActiveParagraphId(null);
      return;
    }

    if (ranges.length === 0) {
      setActiveParagraphId(document.paragraphs[0]?.id ?? null);
      return;
    }

    const index = ranges.findIndex((range) => cursor >= range.start && cursor <= range.end);
    if (index < 0) {
      if (cursor < ranges[0].start) {
        setActiveParagraphId(document.paragraphs[0]?.id ?? null);
      } else {
        const last = Math.min(ranges.length - 1, document.paragraphs.length - 1);
        setActiveParagraphId(document.paragraphs[last]?.id ?? null);
      }
      return;
    }

    const safeIndex = Math.min(index, document.paragraphs.length - 1);
    setActiveParagraphId(document.paragraphs[safeIndex]?.id ?? null);
  };

  const onChangeText = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorText(event.target.value);
  };

  const onMoveCursor = () => {
    const cursor = textareaRef.current?.selectionStart ?? 0;
    updateActiveParagraphByCursor(cursor);
  };

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

  const activeParagraphIndex = document.paragraphs.findIndex((paragraph) => paragraph.id === activeParagraphId);
  const paragraphCount = ranges.length;

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
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={editorText}
            onChange={onChangeText}
            onClick={onMoveCursor}
            onKeyUp={onMoveCursor}
            onSelect={onMoveCursor}
            placeholder={'ここに本文を入力してください。\n\n空行で段落を区切ると、段落単位で構造を扱えます。'}
          />
        </div>

        <footer className="editor-footer">
          <div className="editor-footer-left">
            <span>{editorText.length} 文字</span>
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
