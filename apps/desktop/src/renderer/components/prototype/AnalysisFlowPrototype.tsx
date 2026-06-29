import React, { useMemo, useState } from 'react';
import { IconChevronRight, IconPanel } from '../ui/icons.js';

export type AnalysisFlowPrototypeVariant = 'focus' | 'rail';

type ParagraphAnalysisStatus = 'ready' | 'empty' | 'stale';

interface PrototypeAgent {
  id: string;
  name: string;
  role: string;
}

interface PrototypeParagraph {
  id: string;
  order: number;
  text: string;
  analysis: {
    status: ParagraphAnalysisStatus;
    agentId: string;
    summary: string;
    detail: string;
    historyLabel: string;
    tags: string[];
  };
}

interface PrototypeMessage {
  id: string;
  role: 'user' | 'assistant';
  body: string;
}

export interface AnalysisFlowPrototypeProps {
  initialVariant?: AnalysisFlowPrototypeVariant;
  initialFocusedParagraphId?: string | null;
  initialPanelCollapsed?: boolean;
}

const agents: PrototypeAgent[] = [
  {
    id: 'reader',
    name: '初見の読者',
    role: '読者にどう届くかを見る',
  },
  {
    id: 'editor',
    name: '構造編集者',
    role: '流れと削れる箇所を見る',
  },
];

const paragraphs: PrototypeParagraph[] = [
  {
    id: 'p1',
    order: 1,
    text:
      '朝の台所に立つと、まだ誰も触っていない水差しだけが冷たく光っていた。返事を待つ間に、私は湯を沸かす音ばかり数えていた。',
    analysis: {
      status: 'ready',
      agentId: 'reader',
      summary: '静かな待機の感覚は届くが、何を待っているのかはまだ少し遠い。',
      detail:
        '読者は「返事を待つ間」で立ち止まります。水差しと湯の音はよく効いているので、相手との距離を説明しすぎず、次段落で具体的な不在を見せると余韻が保てます。',
      historyLabel: '2 / 2',
      tags: ['余韻', '不在'],
    },
  },
  {
    id: 'p2',
    order: 2,
    text:
      '昨日のメールには、用件だけが短く並んでいた。謝罪の言葉はなく、けれど怒りを向けるほどの熱も、もう私の側には残っていなかった。',
    analysis: {
      status: 'ready',
      agentId: 'editor',
      summary: '感情の温度が明確。後半の抽象度がやや上がる。',
      detail:
        '「怒りを向けるほどの熱」が段落の芯になっています。前半のメールの具体性と後半の心理語の抽象度に差があるため、メール内の一語を拾うと、推敲時に重心が安定します。',
      historyLabel: '1 / 1',
      tags: ['温度差', '具体化'],
    },
  },
  {
    id: 'p3',
    order: 3,
    text:
      '窓の外では、工事現場の足場が少しずつ解かれていた。隠れていた壁の色が現れるたび、私は自分の中にも同じような覆いがあったのだと思った。',
    analysis: {
      status: 'stale',
      agentId: 'reader',
      summary: '比喩は働いているが、本文更新後の読み直しが必要。',
      detail:
        '足場と内面の覆いの対応は分かりやすい一方、更新後の文では結論が少し早く見えます。再分析では比喩が説明に寄りすぎていないかを確認したい箇所です。',
      historyLabel: '1 / 1',
      tags: ['比喩', '要再分析'],
    },
  },
  {
    id: 'p4',
    order: 4,
    text:
      '昼過ぎ、机の端に置いた封筒を開けた。中身は予想通りだったのに、紙の折り目だけが妙に新しく、そこにだけ相手の手が残っている気がした。',
    analysis: {
      status: 'ready',
      agentId: 'reader',
      summary: '物の細部から相手の存在が立ち上がる。段落単独でも強い。',
      detail:
        '封筒と折り目の観察が、相手を直接出さずに気配を作っています。この段落は説明を足すより、前後の段落がこの細部を急いで回収しないようにする方が効果的です。',
      historyLabel: '3 / 3',
      tags: ['細部', '気配'],
    },
  },
  {
    id: 'p5',
    order: 5,
    text:
      '夜になっても、返事は書けなかった。ただ、下書きの一行目に名前を打ち込んだところで、ようやく自分が何を惜しんでいたのかが分かった。',
    analysis: {
      status: 'empty',
      agentId: 'editor',
      summary: 'まだ分析されていない段落。',
      detail:
        'この段落には分析結果がありません。プロトタイプ上では未分析の空状態として扱い、チャットは既存分析がない場合の見え方だけを確認します。',
      historyLabel: '0 / 0',
      tags: [],
    },
  },
];

const initialMessages: Record<string, PrototypeMessage[]> = {
  p1: [
    {
      id: 'p1-a1',
      role: 'assistant',
      body:
        'この段落は、返事そのものより「待っている時間」が主役になっています。推敲するなら、待つ身体感覚をもう一つだけ足す余地があります。',
    },
  ],
  p4: [
    {
      id: 'p4-u1',
      role: 'user',
      body: 'この段落だけ直すなら、説明を足す方向ですか。',
    },
    {
      id: 'p4-a1',
      role: 'assistant',
      body:
        '説明を足すより、折り目に触れた動作を一つ置く方がよさそうです。読者が相手の存在を自分で拾える余白が残ります。',
    },
  ],
};

function getAgentName(agentId: string) {
  return agents.find((agent) => agent.id === agentId)?.name ?? 'Reading Agent';
}

function createPrototypeReply(paragraph: PrototypeParagraph): string {
  if (paragraph.analysis.status === 'empty') {
    return 'この段落にはまだ分析結果がないため、まず一括分析か段落分析を実行した後に深掘りする想定です。';
  }

  return 'この段落では、読み手の視線が具体的な物や音へ集まっています。推敲では説明を増やすより、次の動作を一つだけ確かめる流れが合いそうです。';
}

function statusText(status: ParagraphAnalysisStatus) {
  if (status === 'empty') {
    return '未分析';
  }
  if (status === 'stale') {
    return '要再分析';
  }
  return '分析済み';
}

function statusClassName(status: ParagraphAnalysisStatus) {
  return `analysis-flow-status is-${status}`;
}

function ReadingToc({
  focusedParagraphId,
  onSelectParagraph,
}: {
  focusedParagraphId: string | null;
  onSelectParagraph: (paragraphId: string) => void;
}) {
  return (
    <div className="analysis-flow-toc" aria-label="段落ごとの読み">
      {paragraphs.map((paragraph) => (
        <button
          key={paragraph.id}
          type="button"
          className={
            focusedParagraphId === paragraph.id
              ? 'analysis-flow-toc-row is-active'
              : 'analysis-flow-toc-row'
          }
          onClick={(event) => {
            event.stopPropagation();
            onSelectParagraph(paragraph.id);
          }}
        >
          <span className="analysis-flow-toc-index">{paragraph.order}</span>
          <span className="analysis-flow-toc-copy">{paragraph.analysis.summary}</span>
          <span className={statusClassName(paragraph.analysis.status)}>
            {statusText(paragraph.analysis.status)}
          </span>
        </button>
      ))}
    </div>
  );
}

function ChatSurface({
  paragraph,
  messages,
  draft,
  onDraftChange,
  onSubmit,
}: {
  paragraph: PrototypeParagraph;
  messages: PrototypeMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const compact = messages.length === 0;

  return (
    <form
      className={compact ? 'analysis-flow-chat is-compact' : 'analysis-flow-chat'}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {messages.length > 0 ? (
        <div className="analysis-flow-chat-log" aria-label={`${paragraph.order} の問いかけ`}>
          {messages.map((message) => (
            <p
              key={message.id}
              className={
                message.role === 'user'
                  ? 'analysis-flow-chat-bubble is-user'
                  : 'analysis-flow-chat-bubble is-assistant'
              }
            >
              {message.body}
            </p>
          ))}
        </div>
      ) : null}
      <label className="analysis-flow-chat-input-label">
        <span>問いかけ</span>
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="この段落について聞く"
          rows={compact ? 2 : 3}
        />
      </label>
      <button type="submit" className="analysis-flow-send-button" disabled={!draft.trim()}>
        仮送信 <IconChevronRight size={13} />
      </button>
    </form>
  );
}

function FocusInspector({
  paragraph,
  messages,
  draft,
  onDraftChange,
  onSubmit,
}: {
  paragraph: PrototypeParagraph;
  messages: PrototypeMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="analysis-flow-inspector-body" aria-label={`${paragraph.order} の分析`}>
      <div className="analysis-flow-inspector-kicker">
        <span>{paragraph.order}</span>
        <span>{getAgentName(paragraph.analysis.agentId)}</span>
        <span>{paragraph.analysis.historyLabel}</span>
      </div>
      <p className="analysis-flow-inspector-summary">{paragraph.analysis.summary}</p>
      <p className="analysis-flow-inspector-detail">{paragraph.analysis.detail}</p>
      {paragraph.analysis.tags.length > 0 ? (
        <ul className="analysis-flow-tag-list">
          {paragraph.analysis.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}
      <ChatSurface
        paragraph={paragraph}
        messages={messages}
        draft={draft}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
      />
    </section>
  );
}

function PrototypeParagraphButton({
  paragraph,
  focused,
  variant,
  onSelectParagraph,
}: {
  paragraph: PrototypeParagraph;
  focused: boolean;
  variant: AnalysisFlowPrototypeVariant;
  onSelectParagraph: (paragraphId: string) => void;
}) {
  return (
    <button
      type="button"
      className={[
        'analysis-flow-paragraph',
        focused ? 'is-focused' : '',
        variant === 'rail' ? 'has-rail' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => {
        event.stopPropagation();
        onSelectParagraph(paragraph.id);
      }}
    >
      <span className="analysis-flow-paragraph-index">{paragraph.order}</span>
      <span className="analysis-flow-paragraph-text">
        {paragraph.text}
        {focused ? <span className="analysis-flow-caret" aria-hidden /> : null}
      </span>
    </button>
  );
}

function ReadingRail({
  focusedParagraphId,
  onSelectParagraph,
}: {
  focusedParagraphId: string | null;
  onSelectParagraph: (paragraphId: string) => void;
}) {
  return (
    <aside className="analysis-flow-reading-rail" aria-label="本文横の読み">
      {paragraphs.map((paragraph) => (
        <button
          key={paragraph.id}
          type="button"
          className={
            focusedParagraphId === paragraph.id
              ? 'analysis-flow-rail-note is-active'
              : 'analysis-flow-rail-note'
          }
          onClick={(event) => {
            event.stopPropagation();
            onSelectParagraph(paragraph.id);
          }}
        >
          <span className="analysis-flow-rail-index">{paragraph.order}</span>
          <span>{paragraph.analysis.summary}</span>
        </button>
      ))}
    </aside>
  );
}

export function AnalysisFlowPrototype({
  initialVariant = 'focus',
  initialFocusedParagraphId = null,
  initialPanelCollapsed = false,
}: AnalysisFlowPrototypeProps) {
  const [variant, setVariant] = useState<AnalysisFlowPrototypeVariant>(initialVariant);
  const [focusedParagraphId, setFocusedParagraphId] = useState<string | null>(initialFocusedParagraphId);
  const [panelCollapsed, setPanelCollapsed] = useState(initialPanelCollapsed);
  const [draft, setDraft] = useState('');
  const [messagesByParagraphId, setMessagesByParagraphId] =
    useState<Record<string, PrototypeMessage[]>>(initialMessages);

  const focusedParagraph = useMemo(
    () => paragraphs.find((paragraph) => paragraph.id === focusedParagraphId) ?? null,
    [focusedParagraphId],
  );
  const showFocusedInspector = Boolean(focusedParagraph && !panelCollapsed);
  const selectedMessages = focusedParagraph ? messagesByParagraphId[focusedParagraph.id] ?? [] : [];

  const selectParagraph = (paragraphId: string) => {
    setFocusedParagraphId(paragraphId);
    setPanelCollapsed(false);
    setDraft('');
  };

  const clearFocus = () => {
    setFocusedParagraphId(null);
    setPanelCollapsed(false);
    setDraft('');
  };

  const collapsePanel = () => {
    setFocusedParagraphId(null);
    setPanelCollapsed(true);
    setDraft('');
  };

  const submitDraft = () => {
    const body = draft.trim();
    if (!body || !focusedParagraph) {
      return;
    }

    const nextMessages: PrototypeMessage[] = [
      ...selectedMessages,
      { id: `${focusedParagraph.id}-u-${Date.now()}`, role: 'user', body },
      {
        id: `${focusedParagraph.id}-a-${Date.now()}`,
        role: 'assistant',
        body: createPrototypeReply(focusedParagraph),
      },
    ];
    setMessagesByParagraphId((current) => ({
      ...current,
      [focusedParagraph.id]: nextMessages,
    }));
    setDraft('');
  };

  return (
    <main
      className={[
        'analysis-flow-prototype',
        variant === 'focus' ? 'is-focus-variant' : 'is-rail-variant',
        showFocusedInspector ? 'has-focused-inspector' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={clearFocus}
    >
      <header className="analysis-flow-topbar" onClick={(event) => event.stopPropagation()}>
        <div className="analysis-flow-brand">
          <span className="analysis-flow-eyebrow">LiteLizard</span>
          <h1>Analysis Flow Prototype</h1>
        </div>
        <div className="analysis-flow-toolbar" role="group" aria-label="プロトタイプ表示">
          <button
            type="button"
            className={variant === 'focus' ? 'analysis-flow-toolbar-button is-active' : 'analysis-flow-toolbar-button'}
            onClick={() => {
              setVariant('focus');
              setPanelCollapsed(false);
            }}
          >
            A Focus Inspector
          </button>
          <button
            type="button"
            className={variant === 'rail' ? 'analysis-flow-toolbar-button is-active' : 'analysis-flow-toolbar-button'}
            onClick={() => {
              setVariant('rail');
              setPanelCollapsed(false);
            }}
          >
            B Reading Rail
          </button>
          <button type="button" className="analysis-flow-toolbar-button" onClick={clearFocus}>
            全体
          </button>
          <button
            type="button"
            className="analysis-flow-icon-button"
            onClick={collapsePanel}
            aria-label="分析パネルを縮小"
            title="分析パネルを縮小"
          >
            <IconPanel size={15} />
          </button>
        </div>
      </header>

      <div className="analysis-flow-workspace">
        <section className="analysis-flow-manuscript" aria-label="原稿">
          <p className="analysis-flow-document-title">返事の折り目</p>
          <div className="analysis-flow-manuscript-grid">
            <div className="analysis-flow-paragraph-stack">
              {paragraphs.map((paragraph) => (
                <PrototypeParagraphButton
                  key={paragraph.id}
                  paragraph={paragraph}
                  focused={focusedParagraphId === paragraph.id && !panelCollapsed}
                  variant={variant}
                  onSelectParagraph={selectParagraph}
                />
              ))}
            </div>
            {variant === 'rail' ? (
              <ReadingRail focusedParagraphId={focusedParagraphId} onSelectParagraph={selectParagraph} />
            ) : null}
          </div>
        </section>

        {variant === 'focus' || showFocusedInspector ? (
          <aside className="analysis-flow-inspector" onClick={(event) => event.stopPropagation()}>
            <header className="analysis-flow-inspector-header">
              <span>Reading Agent</span>
              <span>{showFocusedInspector && focusedParagraph ? getAgentName(focusedParagraph.analysis.agentId) : 'Overview'}</span>
            </header>
            {showFocusedInspector && focusedParagraph ? (
              <FocusInspector
                paragraph={focusedParagraph}
                messages={selectedMessages}
                draft={draft}
                onDraftChange={setDraft}
                onSubmit={submitDraft}
              />
            ) : (
              <ReadingToc focusedParagraphId={focusedParagraphId} onSelectParagraph={selectParagraph} />
            )}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
