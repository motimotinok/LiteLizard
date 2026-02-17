import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LiteLizardDocument } from '@litelizard/shared';

interface Props {
  document: LiteLizardDocument | null;
  dirty: boolean;
  activeParagraphId: string | null;
  setActiveParagraphId: (paragraphId: string | null) => void;
  onSyncParagraphs: (paragraphTexts: string[]) => void;
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

export function EditorPane({ document, dirty, activeParagraphId, setActiveParagraphId, onSyncParagraphs }: Props) {
  const textareaRef = useRef<any>(null);
  const [editorText, setEditorText] = useState(() => toEditorText(document));
  const [lineCount, setLineCount] = useState(1);
  const [lastSyncedText, setLastSyncedText] = useState(() => toEditorText(document));

  useEffect(() => {
    const next = toEditorText(document);
    setEditorText(next);
    setLastSyncedText(next);
    setLineCount(Math.max(1, next.split('\n').length));
  }, [document?.documentId]);

  const ranges = useMemo(() => parseParagraphRanges(editorText), [editorText]);
  const paragraphCount = ranges.length;

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

  const onChangeText = (event: React.ChangeEvent<any>) => {
    const next = event.target.value;
    setEditorText(next);
    setLineCount(Math.max(1, next.split('\n').length));
  };

  const onMoveCursor = () => {
    const cursor = textareaRef.current?.selectionStart ?? 0;
    updateActiveParagraphByCursor(cursor);
  };

  if (!document) {
    return (
      <section className="editor-shell">
        <div className="editor-header">
          <div className="editor-title-wrap">
            <span className="editor-title-dot" />
            <span className="editor-title">ドキュメント未選択</span>
          </div>
        </div>
        <div className="editor-empty">左のファイルツリーからドキュメントを選択してください。</div>
      </section>
    );
  }

  const activeParagraphIndex = document.paragraphs.findIndex((paragraph) => paragraph.id === activeParagraphId);

  return (
    <section className="editor-shell">
      <div className="editor-header">
        <div className="editor-title-wrap">
          <span className="editor-title-dot" />
          <span className="editor-title">{document.title}</span>
        </div>
        <div className="editor-meta">{paragraphCount} パラグラフ</div>
      </div>

      <div className="editor-body">
        <div className="line-number-column" aria-hidden>
          {Array.from({ length: lineCount }, (_, index) => {
            const line = index + 1;
            return (
              <div key={line} className="line-number">
                {line}
              </div>
            );
          })}
        </div>
        <div className="editor-text-wrap">
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={editorText}
            onChange={onChangeText}
            onClick={onMoveCursor}
            onKeyUp={onMoveCursor}
            onSelect={onMoveCursor}
            placeholder={
              'ここにMarkdown本文を入力してください...\n\n空行で段落を区切ると、段落単位で解析結果が表示されます。'
            }
          />
        </div>
      </div>

      <div className="editor-footer">
        <div className="editor-footer-left">
          <span>{editorText.length} 文字</span>
          <span>{lineCount} 行</span>
          {activeParagraphIndex >= 0 ? <span>注目: {activeParagraphIndex + 1}</span> : null}
        </div>
        <div className="editor-footer-right">
          <span className={dirty ? 'save-dot save-dot-dirty' : 'save-dot'} />
          <span>{dirty ? '未保存の変更' : '保存済み'}</span>
        </div>
      </div>
    </section>
  );
}
