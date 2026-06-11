import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { searchInDocument, type SearchHit } from '../utils/searchInDocument.js';
import { AuxShell } from './ui/AuxShell.js';
import { CenteredHeader } from './ui/CenteredHeader.js';
import type { LeftIconRailPanel } from './LeftIconRail.js';

const SNIPPET_RADIUS = 30;

export function buildSearchSnippet(hit: SearchHit) {
  const text = hit.paragraphText;
  if (hit.matchKind !== 'paragraph' || hit.matchStart === undefined || hit.matchEnd === undefined) {
    return {
      leading: text.slice(0, SNIPPET_RADIUS * 2),
      match: '',
      trailing: '',
      truncatedHead: false,
      truncatedTail: text.length > SNIPPET_RADIUS * 2,
    };
  }
  const headStart = Math.max(0, hit.matchStart - SNIPPET_RADIUS);
  const tailEnd = Math.min(text.length, hit.matchEnd + SNIPPET_RADIUS);
  return {
    leading: text.slice(headStart, hit.matchStart),
    match: text.slice(hit.matchStart, hit.matchEnd),
    trailing: text.slice(hit.matchEnd, tailEnd),
    truncatedHead: headStart > 0,
    truncatedTail: tailEnd < text.length,
  };
}

function matchKindLabel(kind: SearchHit['matchKind']) {
  if (kind === 'paragraph') return '本文';
  if (kind === 'chapter-title') return '章タイトル';
  return 'タイトル';
}

export function SearchScreen() {
  const document = useAppStore((s) => s.document);
  const openEditorPanel = useAppStore((s) => s.openEditorPanel);
  const openAgentsPanel = useAppStore((s) => s.openAgentsPanel);
  const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
  const openSearchPanel = useAppStore((s) => s.openSearchPanel);
  const requestNavigateToParagraph = useAppStore((s) => s.requestNavigateToParagraph);

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelectPanel = (panel: LeftIconRailPanel) => {
    if (panel === 'editor') openEditorPanel();
    else if (panel === 'agents') openAgentsPanel();
    else if (panel === 'settings') openSettingsPanel();
    else if (panel === 'search') openSearchPanel();
  };

  const trimmedQuery = query.trim();
  const hits = useMemo(() => searchInDocument(document, query), [document, query]);

  const titlebar = (
    <div className="workspace-titlebar" aria-hidden>
      <span className="workspace-titlebar-spacer" />
      <span className="workspace-titlebar-center">検索</span>
      <span className="workspace-titlebar-actions" />
    </div>
  );

  return (
    <AuxShell activePanel="search" onSelectPanel={handleSelectPanel} titlebar={titlebar}>
      <div className="aux-content">
        <CenteredHeader overline="search" title="現在の文書を検索" />

        <div className="search-input-row">
          <input
            ref={inputRef}
            type="search"
            className="settings-input"
            placeholder={
              document ? '段落本文・章タイトル・タイトルを検索' : 'ドキュメントを開くと検索できます'
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!document}
            aria-label="検索キーワード"
          />
        </div>

        {!document ? (
          <p className="search-empty-state">ドキュメントを開いてから検索してください。</p>
        ) : trimmedQuery.length === 0 ? (
          <p className="search-empty-state">キーワードを入力してください。</p>
        ) : hits.length === 0 ? (
          <p className="search-empty-state" data-testid="search-no-results">
            該当する段落は見つかりませんでした。
          </p>
        ) : (
          <>
            <p className="search-summary" aria-live="polite">
              {hits.length} 件の段落が一致しました。
            </p>
            <ul className="search-result-list" role="list">
              {hits.map((hit) => {
                const snippet = buildSearchSnippet(hit);
                return (
                  <li key={hit.paragraphId} className="search-result-item">
                    <button
                      type="button"
                      className="search-result-button"
                      onClick={() => requestNavigateToParagraph(hit.paragraphId)}
                    >
                      <div className="search-result-meta">
                        <span className="search-result-kind">{matchKindLabel(hit.matchKind)}</span>
                        {hit.chapterTitle ? (
                          <span className="search-result-chapter">{hit.chapterTitle}</span>
                        ) : null}
                      </div>
                      <div className="search-result-snippet">
                        {snippet.truncatedHead ? <span>…</span> : null}
                        <span>{snippet.leading}</span>
                        {snippet.match ? <mark>{snippet.match}</mark> : null}
                        <span>{snippet.trailing}</span>
                        {snippet.truncatedTail ? <span>…</span> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </AuxShell>
  );
}
