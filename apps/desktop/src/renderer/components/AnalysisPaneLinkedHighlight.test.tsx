import { DEFAULT_ANALYSIS_SETTINGS, type LiteLizardDocument, type ParagraphAnalysisPattern } from '@litelizard/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store/useAppStore.js';
import { AnalysisHistoryPanel, AnalysisPane } from './AnalysisPane.js';

const baseState = useAppStore.getState();

function createDocument(): LiteLizardDocument {
  return {
    version: 2,
    documentId: 'doc_linked_highlight',
    title: 'linked highlight draft',
    personaMode: 'general-reader',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    source: { format: 'lzl-v1', originPath: '/projects/novel/linked-highlight.lzl' },
    chapters: [{ id: 'c1', order: 1, title: '一章' }],
    paragraphs: [
      {
        id: 'p1',
        chapterId: 'c1',
        order: 1,
        light: { text: '最初の段落です。', charCount: 8 },
        lizard: { status: 'stale' },
      },
    ],
  };
}

function makePattern(
  analyzedAt: string,
  response: string,
  agentName?: string,
): ParagraphAnalysisPattern {
  return {
    analyzedAt,
    provenance: agentName
      ? {
          agentId: `agent-${agentName}`,
          agentName,
          agentPromptVersion: '2026-07-01',
          contextPolicy: { mode: 'whole-document' },
          referencedParagraphCount: 2,
          hasAdditionalInstruction: false,
          targetScope: 'paragraph',
          model: 'gpt-test',
          resultContractVersion: 'response-tags-v1',
        }
      : undefined,
    result: { response },
  };
}

describe('AnalysisPane focused paragraph view', () => {
  beforeEach(() => {
    useAppStore.setState(baseState, true);
    useAppStore.setState({
      analysisSettings: structuredClone(DEFAULT_ANALYSIS_SETTINGS),
      agents: [],
      activeAgentId: null,
      agentsLoaded: true,
    });
  });

  it('未選択時は右パネルで段落詳細を出さず、本文横レーンからの選択を促す', () => {
    const html = renderToStaticMarkup(
      <AnalysisPane
        document={createDocument()}
        activeParagraphId={null}
      />,
    );

    expect(html).toContain('本文横の読みから段落を選ぶと詳細が表示されます。');
    expect(html).not.toContain('analysis-focus-card');
  });

  it('選択段落の詳細と段落限定質問の入口を表示する', () => {
    const html = renderToStaticMarkup(
      <AnalysisPane
        document={createDocument()}
        activeParagraphId="p1"
      />,
    );

    expect(html).toContain('data-analysis-paragraph-id="p1"');
    expect(html).toContain('analysis-focus-card');
    expect(html).toContain('この段落について聞く');
  });

  it('履歴を開いたときだけ履歴位置と Reading Agent 名を表示する', () => {
    const history = [
      makePattern('2026-07-01T01:00:00.000Z', '初回の読み', '初読者'),
      makePattern('2026-07-01T02:00:00.000Z', '二回目の読み', '構造編集者'),
    ];
    const collapsed = renderToStaticMarkup(
      <AnalysisHistoryPanel
        history={history}
        visibleIndices={[0, 1]}
        displayedIndex={1}
        open={false}
        onToggle={() => undefined}
        onSelect={() => undefined}
      />,
    );
    const open = renderToStaticMarkup(
      <AnalysisHistoryPanel
        history={history}
        visibleIndices={[0, 1]}
        displayedIndex={1}
        open
        onToggle={() => undefined}
        onSelect={() => undefined}
      />,
    );

    expect(collapsed).toContain('履歴');
    expect(collapsed).toContain('2/2');
    expect(collapsed).not.toContain('構造編集者');
    expect(open).toContain('Reading Agent');
    expect(open).toContain('構造編集者');
    expect(open).toContain('前の分析結果');
    expect(open).toContain('次の分析結果');
    expect(open).toContain('disabled=""');
  });

  it('Reading Agent 情報がない旧形式履歴でも壊れず表示する', () => {
    const html = renderToStaticMarkup(
      <AnalysisHistoryPanel
        history={[makePattern('2026-07-01T01:00:00.000Z', '旧形式の読み')]}
        visibleIndices={[0]}
        displayedIndex={0}
        open
        onToggle={() => undefined}
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('旧形式の履歴');
    expect(html).toContain('1/1');
  });
});
