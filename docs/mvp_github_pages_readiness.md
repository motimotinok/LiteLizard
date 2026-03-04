# LiteLizard MVP readiness for GitHub Pages (static hosting)

## Verdict

Current codebase is **close but not yet MVP-ready** for the GitHub Pages target described.

What is already in place:
- Editor + right-side chat panel layout exists.
- Chat panel can be toggled from toolbar and keyboard shortcut.
- Analysis/generation pipeline (`runAnalysis`) exists in state logic.

What blocks the exact MVP spec right now:
- There is no visible "generate" button in the chat panel UI.
- The renderer assumes `window.litelizard` bridge usage, which is provided in Electron preload but not in a plain browser deployment.

## Evidence found in code

- App layout has editor + toggleable chat panel (`chatPanelOpen`).
- Analysis panel currently displays saved/generated results but does not trigger generation.
- Store implements `runAnalysis`, but it is not wired to a chat-panel action button.
- Desktop preload uses Electron `contextBridge` for exposing API.
- README explicitly says this is an Electron desktop app and preload bridge mock mode is for desktop UI behavior verification.

## Minimum tasks before publishing MVP to GitHub Pages

### 1) Add a generate action in the right chat panel
- Add a button in `AnalysisPane` header (e.g. `生成`) and connect it to `useAppStore().runAnalysis()`.
- Show loading/disabled state while generation is running.
- Keep behavior simple: execute for stale paragraphs only (already implemented in store).

### 2) Add browser fallback for `window.litelizard` (non-Electron)
- In renderer startup (or store layer), detect missing bridge and install a mock API fallback.
- Reuse existing `createMockPreloadApi()` to avoid duplicate logic.
- Goal: GitHub Pages build works without Electron.

### 3) Add static deployment script/config
- Add build/deploy docs for GitHub Pages (`vite build` output path + Pages settings).
- If using subpath deployment, set Vite `base` accordingly.

### 4) Define MVP acceptance checks (manual)
- App opens in browser on GitHub Pages.
- Editor is visible and editable.
- Toggle opens/closes right chat panel.
- Generate button triggers mock LLM text generation and results appear in panel.

## Suggested release decision

- **Do not publish yet** as-is (missing generation trigger + browser fallback).
- After completing tasks 1 and 2 (plus a quick deployment config), this is publishable as MVP.
