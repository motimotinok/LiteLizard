import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { reorderByKey } from '../utils/arrayUtils.js';
import { useAppStore } from '../store/useAppStore.js';
const EMOTION_COLOR_MAP = {
    '期待': { background: '#fef9c3', borderColor: '#fde68a', color: '#713f12' },
    '安心': { background: '#dcfce7', borderColor: '#86efac', color: '#14532d' },
    '孤独': { background: '#dbeafe', borderColor: '#93c5fd', color: '#1e3a5f' },
    '後悔': { background: '#ede9fe', borderColor: '#c4b5fd', color: '#4c1d95' },
    '焦り': { background: '#fee2e2', borderColor: '#fca5a5', color: '#7f1d1d' },
    '内省': { background: '#ccfbf1', borderColor: '#5eead4', color: '#134e4a' },
    '罪悪感': { background: '#fce7f3', borderColor: '#f9a8d4', color: '#831843' },
    '緊張': { background: '#fff7ed', borderColor: '#fdba74', color: '#7c2d12' },
    '納得': { background: '#ecfeff', borderColor: '#a5f3fc', color: '#164e63' },
    '集中': { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' },
};
const FALLBACK_PALETTE = [
    { background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' },
    { background: '#fdf4ff', borderColor: '#e9d5ff', color: '#6b21a8' },
    { background: '#fff1f2', borderColor: '#fecdd3', color: '#881337' },
    { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' },
];
function hashString(s) {
    let h = 0;
    for (const c of s)
        h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
    return Math.abs(h);
}
function getEmotionStyle(emotion) {
    return EMOTION_COLOR_MAP[emotion] ?? FALLBACK_PALETTE[hashString(emotion) % FALLBACK_PALETTE.length];
}
function statusLabel(document) {
    if (document === 'pending') {
        return '解析中です。完了後に生成結果が表示されます。';
    }
    if (document === 'failed') {
        return '解析に失敗しました。再実行してください。';
    }
    if (document === 'stale') {
        return '本文更新により再解析待ちです。';
    }
    return '生成結果はまだありません。';
}
function formatAnalyzedAt(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toLocaleString('ja-JP', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function getAnalysisProviderUiState(analysisSettings) {
    if (analysisSettings.defaultProvider === 'openai') {
        const configured = analysisSettings.providers.openai.apiKeyConfigured;
        return {
            label: 'OpenAI',
            configured,
            runnable: configured,
            missingTitle: 'OpenAI API キーを設定すると解析を開始できます。',
            missingBody: '歯車アイコンから設定画面を開き、OpenAI のキーを保存してください。',
            disabledTitle: 'OpenAI API キーが未設定です',
        };
    }
    if (analysisSettings.defaultProvider === 'anthropic') {
        const configured = analysisSettings.providers.anthropic.apiKeyConfigured;
        return {
            label: 'Anthropic',
            configured,
            runnable: configured,
            missingTitle: 'Anthropic API キーを設定すると解析を開始できます。',
            missingBody: '歯車アイコンから設定画面を開き、Anthropic のキーを保存してください。',
            disabledTitle: 'Anthropic API キーが未設定です',
        };
    }
    return {
        label: 'Local LLM',
        configured: false,
        runnable: false,
        missingTitle: 'ローカル LLM はまだ解析実行に対応していません。',
        missingBody: '現時点では OpenAI または Anthropic を既定 provider に選んでください。',
        disabledTitle: 'ローカル LLM は未対応です',
    };
}
export function AnalysisPane({ document, activeParagraphId, onSetActiveParagraphId, onReorderParagraphs, onRequestScrollToParagraph, }) {
    const runAnalysis = useAppStore((s) => s.runAnalysis);
    const runAnalysisFor = useAppStore((s) => s.runAnalysisFor);
    const openSettingsPanel = useAppStore((s) => s.openSettingsPanel);
    const analysisSettings = useAppStore((s) => s.analysisSettings);
    const providerUi = getAnalysisProviderUiState(analysisSettings);
    const staleCount = document?.paragraphs.filter((p) => p.lizard.status === 'stale').length ?? 0;
    const hasPending = document?.paragraphs.some((p) => p.lizard.status === 'pending') ?? false;
    const generateAllDisabled = staleCount === 0 || hasPending || !providerUi.runnable;
    const [analysisMode, setAnalysisMode] = useState('paragraph');
    const [expandedByParagraphId, setExpandedByParagraphId] = useState({});
    const [draggingParagraphId, setDraggingParagraphId] = useState(null);
    const [dropTargetParagraphId, setDropTargetParagraphId] = useState(null);
    useEffect(() => {
        if (!document) {
            setExpandedByParagraphId({});
            return;
        }
        const nextIds = new Set(document.paragraphs.map((paragraph) => paragraph.id));
        setExpandedByParagraphId((current) => {
            const next = {};
            Object.entries(current).forEach(([paragraphId, expanded]) => {
                if (nextIds.has(paragraphId)) {
                    next[paragraphId] = expanded;
                }
            });
            return next;
        });
    }, [document]);
    const orderedParagraphIds = useMemo(() => {
        if (!document) {
            return [];
        }
        return document.paragraphs.map((paragraph) => paragraph.id);
    }, [document]);
    const onDropReorder = (activeId, overId) => {
        if (!document || !onReorderParagraphs) {
            return;
        }
        const nextOrder = reorderByKey(orderedParagraphIds, activeId, overId);
        if (nextOrder === orderedParagraphIds) {
            return;
        }
        onReorderParagraphs(nextOrder);
    };
    return (_jsxs("section", { className: "analysis-shell analysis-shell-chat", children: [_jsxs("header", { className: "analysis-header", children: [_jsxs("div", { className: "analysis-title-wrap", children: [_jsx("span", { className: "analysis-title-icon", "aria-hidden": true, children: "\u00B6" }), _jsxs("div", { children: [_jsx("h2", { className: "analysis-title", children: "\u6BB5\u843D\u89E3\u6790" }), _jsx("p", { className: "analysis-subtitle", children: "\u5404\u6BB5\u843D\u306E\u611F\u60C5\u30FB\u30C6\u30FC\u30DE\u30FB\u89E3\u91C8" })] })] }), _jsx("button", { type: "button", className: "analysis-generate-btn", onClick: runAnalysis, disabled: generateAllDisabled, title: !providerUi.runnable
                            ? providerUi.disabledTitle
                            : hasPending
                                ? '解析実行中です'
                                : staleCount === 0
                                    ? '再解析が必要な段落はありません'
                                    : `${staleCount}件の段落を解析`, children: "\u751F\u6210" }), _jsxs("select", { className: "analysis-mode-select", value: analysisMode, onChange: (e) => setAnalysisMode(e.target.value), children: [_jsx("option", { value: "paragraph", children: "\u6BB5\u843D\u89E3\u6790" }), _jsx("option", { value: "chapter-summary", children: "\u7AE0\u30B5\u30DE\u30EA\u30FC" }), _jsx("option", { value: "theme", children: "\u30C6\u30FC\u30DE\u5206\u6790" })] })] }), !document ? (_jsx("div", { className: "analysis-empty", children: "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3092\u958B\u304F\u3068\u5206\u6790\u30AB\u30FC\u30C9\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002" })) : (_jsxs("div", { className: "analysis-scroll", children: [!providerUi.runnable ? (_jsxs("div", { className: "analysis-settings-callout", children: [_jsxs("div", { children: [_jsx("strong", { children: providerUi.missingTitle }), _jsx("p", { children: providerUi.missingBody })] }), _jsx("button", { type: "button", className: "analysis-settings-link", onClick: () => openSettingsPanel(), children: "\u8A2D\u5B9A\u3092\u958B\u304F" })] })) : null, _jsx("div", { className: "analysis-card-list", children: document.paragraphs.map((paragraph, index) => {
                            const expanded = Boolean(expandedByParagraphId[paragraph.id]);
                            const active = paragraph.id === activeParagraphId;
                            const isDragging = draggingParagraphId === paragraph.id;
                            const isDropTarget = dropTargetParagraphId === paragraph.id;
                            const isComplete = paragraph.lizard.status === 'complete';
                            const analyzedAt = paragraph.lizard.analyzedAt
                                ? formatAnalyzedAt(paragraph.lizard.analyzedAt)
                                : null;
                            const confidence = typeof paragraph.lizard.confidence === 'number'
                                ? `${Math.round(paragraph.lizard.confidence * 100)}%`
                                : null;
                            const statusText = statusLabel(paragraph.lizard.status);
                            const tags = [
                                ...(paragraph.lizard.theme ?? []).map((value) => ({ value, kind: 'theme' })),
                                ...(paragraph.lizard.emotion ?? []).map((value) => ({ value, kind: 'emotion' })),
                            ];
                            return (_jsxs("article", { className: [
                                    'analysis-card',
                                    active ? 'analysis-card-active' : '',
                                    isDragging ? 'analysis-card-dragging' : '',
                                    isDropTarget ? 'analysis-card-drop-target' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' '), onClick: () => {
                                    onSetActiveParagraphId?.(paragraph.id);
                                    onRequestScrollToParagraph?.(paragraph.id);
                                }, children: [_jsxs("header", { className: "analysis-card-header", children: [_jsx("div", { className: "analysis-card-heading", children: _jsxs("span", { className: "analysis-card-index", children: ["P", String(index + 1).padStart(2, '0')] }) }), _jsxs("div", { className: "analysis-card-actions", children: [_jsx("button", { type: "button", className: "analysis-card-regen-btn", onClick: (event) => {
                                                            event.stopPropagation();
                                                            runAnalysisFor(paragraph.id);
                                                        }, disabled: paragraph.lizard.status === 'pending' || hasPending || !providerUi.runnable, title: "\u3053\u306E\u6BB5\u843D\u3060\u3051\u518D\u89E3\u6790", "aria-label": `P${index + 1} を再解析`, children: "\u21BA" }), _jsx("button", { type: "button", className: "analysis-card-toggle", onClick: (event) => {
                                                            event.stopPropagation();
                                                            setExpandedByParagraphId((current) => ({
                                                                ...current,
                                                                [paragraph.id]: !current[paragraph.id],
                                                            }));
                                                        }, children: expanded ? '折りたたむ' : '全文' }), _jsx("button", { type: "button", className: "analysis-card-drag-handle", draggable: true, onClick: (event) => event.stopPropagation(), onDragStart: (event) => {
                                                            event.dataTransfer.setData('text/plain', paragraph.id);
                                                            event.dataTransfer.effectAllowed = 'move';
                                                            setDraggingParagraphId(paragraph.id);
                                                            setDropTargetParagraphId(null);
                                                        }, onDragOver: (event) => {
                                                            event.preventDefault();
                                                            setDropTargetParagraphId(paragraph.id);
                                                        }, onDrop: (event) => {
                                                            event.preventDefault();
                                                            const draggedId = event.dataTransfer.getData('text/plain');
                                                            if (!draggedId || draggedId === paragraph.id) {
                                                                setDraggingParagraphId(null);
                                                                setDropTargetParagraphId(null);
                                                                return;
                                                            }
                                                            onDropReorder(draggedId, paragraph.id);
                                                            setDraggingParagraphId(null);
                                                            setDropTargetParagraphId(null);
                                                        }, onDragEnd: () => {
                                                            setDraggingParagraphId(null);
                                                            setDropTargetParagraphId(null);
                                                        }, "aria-label": `P${index + 1} をドラッグ`, title: "\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3073\u66FF\u3048", children: "\u22EE\u22EE" })] })] }), isComplete ? (_jsxs(_Fragment, { children: [tags.length > 0 ? (_jsx("ul", { className: "analysis-tag-list", children: tags.map((tag, tagIndex) => (_jsx("li", { className: `analysis-tag analysis-tag-${tag.kind}`, style: tag.kind === 'emotion' ? getEmotionStyle(tag.value) : undefined, children: tag.value }, `${paragraph.id}-${tag.kind}-${tag.value}-${tagIndex}`))) })) : null, confidence || analyzedAt ? (_jsxs("div", { className: "analysis-card-meta", children: [confidence ? _jsxs("span", { children: ["\u4FE1\u983C\u5EA6 ", confidence] }) : _jsx("span", { children: "\u4FE1\u983C\u5EA6 -" }), analyzedAt ? _jsx("span", { children: analyzedAt }) : null] })) : null, _jsx("p", { className: expanded ? 'analysis-card-body analysis-card-body-expanded' : 'analysis-card-body', children: paragraph.lizard.deepMeaning?.trim() || '生成結果が空です。' })] })) : (_jsxs("p", { className: "analysis-card-status", children: [statusText, paragraph.lizard.status === 'failed' && paragraph.lizard.error?.message
                                                ? ` (${paragraph.lizard.error.message})`
                                                : ''] }))] }, paragraph.id));
                        }) })] }))] }));
}
//# sourceMappingURL=AnalysisPane.js.map