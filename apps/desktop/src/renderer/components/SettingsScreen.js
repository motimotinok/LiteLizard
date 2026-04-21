import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
const PROVIDER_META = [
    {
        id: 'openai',
        label: 'OpenAI',
        description: '既存の解析実行は現時点では OpenAI 接続を使用します。',
        placeholder: 'sk-...',
    },
    {
        id: 'anthropic',
        label: 'Anthropic',
        description: '既定 provider に選ぶと Anthropic で解析を実行します。',
        placeholder: 'sk-ant-...',
    },
];
const PROVIDER_OPTIONS = [
    { value: 'openai', label: 'OpenAI', hint: '現行の解析実行に使用' },
    { value: 'anthropic', label: 'Anthropic', hint: '現行の解析実行に使用' },
    { value: 'local-llm', label: 'Local LLM', hint: '設定保持のみ。実行は後続対応' },
];
export function SettingsScreen() {
    const analysisSettings = useAppStore((s) => s.analysisSettings);
    const saveProviderApiKey = useAppStore((s) => s.saveProviderApiKey);
    const clearProviderApiKey = useAppStore((s) => s.clearProviderApiKey);
    const saveAnalysisSettings = useAppStore((s) => s.saveAnalysisSettings);
    const testLocalLlmConnection = useAppStore((s) => s.testLocalLlmConnection);
    const [draftKeys, setDraftKeys] = useState({
        openai: '',
        anthropic: '',
    });
    const [settingsDraft, setSettingsDraft] = useState({
        defaultProvider: analysisSettings.defaultProvider,
        openaiModel: analysisSettings.providers.openai.defaultModel,
        anthropicModel: analysisSettings.providers.anthropic.defaultModel,
        localEndpoint: analysisSettings.localLlm.endpoint,
        localModel: analysisSettings.localLlm.defaultModel,
    });
    const [localLlmStatus, setLocalLlmStatus] = useState('未接続');
    React.useEffect(() => {
        setSettingsDraft({
            defaultProvider: analysisSettings.defaultProvider,
            openaiModel: analysisSettings.providers.openai.defaultModel,
            anthropicModel: analysisSettings.providers.anthropic.defaultModel,
            localEndpoint: analysisSettings.localLlm.endpoint,
            localModel: analysisSettings.localLlm.defaultModel,
        });
    }, [analysisSettings]);
    const providerStatus = useMemo(() => {
        return {
            openai: analysisSettings.providers.openai.apiKeyConfigured ? '保存済み' : '未設定',
            anthropic: analysisSettings.providers.anthropic.apiKeyConfigured ? '保存済み' : '未設定',
        };
    }, [analysisSettings]);
    const saveDraftSettings = async () => {
        await saveAnalysisSettings({
            defaultProvider: settingsDraft.defaultProvider,
            providers: {
                openai: { defaultModel: settingsDraft.openaiModel.trim() || analysisSettings.providers.openai.defaultModel },
                anthropic: {
                    defaultModel: settingsDraft.anthropicModel.trim() || analysisSettings.providers.anthropic.defaultModel,
                },
            },
            localLlm: {
                endpoint: settingsDraft.localEndpoint.trim(),
                defaultModel: settingsDraft.localModel.trim(),
            },
        });
    };
    return (_jsxs("section", { className: "settings-screen", children: [_jsxs("header", { className: "settings-hero", children: [_jsxs("div", { children: [_jsx("p", { className: "settings-eyebrow", children: "Workspace Settings" }), _jsx("h1", { className: "settings-title", children: "\u5206\u6790\u30A8\u30F3\u30B8\u30F3\u306E\u8A2D\u5B9A" })] }), _jsx("p", { className: "settings-lead", children: "API \u30AD\u30FC\u3001\u65E2\u5B9A\u30E2\u30C7\u30EB\u3001\u30ED\u30FC\u30AB\u30EB LLM \u63A5\u7D9A\u3092\u3053\u3053\u3067\u7BA1\u7406\u3057\u307E\u3059\u3002\u30AD\u30FC\u672C\u4F53\u306F\u518D\u8868\u793A\u305B\u305A\u3001\u72B6\u614B\u3060\u3051\u3092\u4FDD\u6301\u3057\u307E\u3059\u3002" })] }), _jsxs("div", { className: "settings-grid", children: [_jsxs("section", { className: "settings-section", children: [_jsxs("div", { className: "settings-section-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "settings-section-kicker", children: "Secrets" }), _jsx("h2", { children: "API \u30AD\u30FC\u8A2D\u5B9A" })] }), _jsx("p", { children: "\u4FDD\u5B58\u6E08\u307F \uC5EC\uBD80\u306E\u307F\u8868\u793A\u3057\u307E\u3059\u3002\u66F4\u65B0\u6642\u306F\u65B0\u3057\u3044\u30AD\u30FC\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })] }), _jsx("div", { className: "settings-provider-list", children: PROVIDER_META.map((provider) => (_jsxs("article", { className: "settings-provider-row", children: [_jsxs("div", { className: "settings-provider-copy", children: [_jsxs("div", { className: "settings-provider-title-row", children: [_jsx("h3", { children: provider.label }), _jsx("span", { className: analysisSettings.providers[provider.id].apiKeyConfigured
                                                                ? 'settings-status-chip is-ready'
                                                                : 'settings-status-chip', children: providerStatus[provider.id] })] }), _jsx("p", { children: provider.description })] }), _jsxs("div", { className: "settings-provider-actions", children: [_jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "API \u30AD\u30FC" }), _jsx("input", { type: "password", value: draftKeys[provider.id], placeholder: provider.placeholder, onChange: (event) => setDraftKeys((current) => ({
                                                                ...current,
                                                                [provider.id]: event.target.value,
                                                            })) })] }), _jsxs("div", { className: "settings-inline-actions", children: [_jsx("button", { type: "button", className: "settings-primary-button", onClick: () => saveProviderApiKey(provider.id, draftKeys[provider.id]), children: "\u4FDD\u5B58" }), _jsx("button", { type: "button", className: "settings-secondary-button", onClick: () => {
                                                                setDraftKeys((current) => ({ ...current, [provider.id]: '' }));
                                                                void clearProviderApiKey(provider.id);
                                                            }, children: "\u524A\u9664" })] })] })] }, provider.id))) })] }), _jsxs("section", { className: "settings-section", children: [_jsxs("div", { className: "settings-section-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "settings-section-kicker", children: "Defaults" }), _jsx("h2", { children: "\u5206\u6790\u30E2\u30C7\u30EB\u8A2D\u5B9A" })] }), _jsx("p", { children: "\u65E2\u5B9A provider \u3092\u9078\u3076\u3068\u89E3\u6790\u5B9F\u884C\u6642\u306E\u63A5\u7D9A\u5148\u304C\u5207\u308A\u66FF\u308F\u308A\u307E\u3059\u3002Local LLM \u306F\u307E\u3060\u8A2D\u5B9A\u4FDD\u6301\u306E\u307F\u3067\u3059\u3002" })] }), _jsxs("div", { className: "settings-stack", children: [_jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "\u65E2\u5B9A provider" }), _jsx("select", { value: settingsDraft.defaultProvider, onChange: (event) => setSettingsDraft((current) => ({
                                                    ...current,
                                                    defaultProvider: event.target.value,
                                                })), children: PROVIDER_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsx("div", { className: "settings-provider-pills", children: PROVIDER_OPTIONS.map((option) => (_jsxs("div", { className: settingsDraft.defaultProvider === option.value
                                                ? 'settings-provider-pill is-selected'
                                                : 'settings-provider-pill', children: [_jsx("strong", { children: option.label }), _jsx("span", { children: option.hint })] }, option.value))) }), _jsxs("div", { className: "settings-two-column", children: [_jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "OpenAI \u65E2\u5B9A\u30E2\u30C7\u30EB" }), _jsx("input", { type: "text", value: settingsDraft.openaiModel, placeholder: "gpt-4o-mini", onChange: (event) => setSettingsDraft((current) => ({
                                                            ...current,
                                                            openaiModel: event.target.value,
                                                        })) })] }), _jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "Anthropic \u65E2\u5B9A\u30E2\u30C7\u30EB" }), _jsx("input", { type: "text", value: settingsDraft.anthropicModel, placeholder: "claude-3-5-sonnet-latest", onChange: (event) => setSettingsDraft((current) => ({
                                                            ...current,
                                                            anthropicModel: event.target.value,
                                                        })) })] })] })] })] }), _jsxs("section", { className: "settings-section settings-section-wide", children: [_jsxs("div", { className: "settings-section-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "settings-section-kicker", children: "Local Runtime" }), _jsx("h2", { children: "\u30ED\u30FC\u30AB\u30EB LLM" })] }), _jsx("p", { children: "Ollama \u3092\u5225\u9014\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3057\u3001\u63A5\u7D9A\u5148\u3068\u65E2\u5B9A\u30E2\u30C7\u30EB\u3092\u767B\u9332\u3057\u307E\u3059\u3002\u30E2\u30C7\u30EB\u306E pull \u3084\u8D77\u52D5\u306F\u30A2\u30D7\u30EA\u5916\u3067\u884C\u3044\u307E\u3059\u3002" })] }), _jsxs("div", { className: "settings-local-grid", children: [_jsxs("div", { className: "settings-stack", children: [_jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "Endpoint URL" }), _jsx("input", { type: "url", value: settingsDraft.localEndpoint, placeholder: "http://127.0.0.1:11434", onChange: (event) => setSettingsDraft((current) => ({
                                                            ...current,
                                                            localEndpoint: event.target.value,
                                                        })) })] }), _jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "\u65E2\u5B9A\u30E2\u30C7\u30EB" }), _jsx("input", { type: "text", value: settingsDraft.localModel, placeholder: "llama3.1:8b", onChange: (event) => setSettingsDraft((current) => ({
                                                            ...current,
                                                            localModel: event.target.value,
                                                        })) })] }), _jsxs("div", { className: "settings-inline-actions", children: [_jsx("button", { type: "button", className: "settings-primary-button", onClick: async () => {
                                                            const result = await testLocalLlmConnection({
                                                                endpoint: settingsDraft.localEndpoint,
                                                                model: settingsDraft.localModel,
                                                            });
                                                            setLocalLlmStatus(result.message);
                                                        }, children: "\u63A5\u7D9A\u30C6\u30B9\u30C8" }), _jsx("button", { type: "button", className: "settings-secondary-button", onClick: () => {
                                                            void saveDraftSettings();
                                                            setLocalLlmStatus('設定を保存しました');
                                                        }, children: "\u30ED\u30FC\u30AB\u30EB\u8A2D\u5B9A\u3092\u4FDD\u5B58" })] })] }), _jsxs("div", { className: "settings-local-aside", children: [_jsxs("div", { className: "settings-local-card", children: [_jsx("span", { className: analysisSettings.localLlm.configured ? 'settings-status-dot is-ready' : 'settings-status-dot' }), _jsxs("div", { children: [_jsx("strong", { children: "\u73FE\u5728\u306E\u72B6\u614B" }), _jsx("p", { children: localLlmStatus })] })] }), _jsxs("ol", { className: "settings-setup-list", children: [_jsx("li", { children: "Ollama \u3092\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3057\u3066\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u3067\u8D77\u52D5\u3059\u308B" }), _jsx("li", { children: "\u4F7F\u7528\u3057\u305F\u3044\u30E2\u30C7\u30EB\u3092 `ollama pull` \u3067\u53D6\u5F97\u3059\u308B" }), _jsx("li", { children: "\u3053\u3053\u3067 URL \u3068\u30E2\u30C7\u30EB\u540D\u3092\u4FDD\u5B58\u3057\u3001\u63A5\u7D9A\u30C6\u30B9\u30C8\u3092\u884C\u3046" })] })] })] })] })] }), _jsxs("footer", { className: "settings-footer", children: [_jsx("p", { children: "OpenAI / Anthropic \u306F\u65E2\u5B9A provider \u306B\u5FDC\u3058\u3066\u89E3\u6790\u5B9F\u884C\u3078\u53CD\u6620\u3055\u308C\u307E\u3059\u3002Local LLM \u306F\u5F8C\u7D9A\u30BF\u30B9\u30AF\u3067\u63A5\u7D9A\u3057\u307E\u3059\u3002" }), _jsx("button", { type: "button", className: "settings-primary-button", onClick: () => void saveDraftSettings(), children: "\u5168\u4F53\u8A2D\u5B9A\u3092\u4FDD\u5B58" })] })] }));
}
//# sourceMappingURL=SettingsScreen.js.map