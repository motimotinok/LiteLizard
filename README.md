# LiteLizard MVP Monorepo

LiteLizard is an Electron desktop editor that keeps `light` (text) and `lizard` (AI analysis) side-by-side per paragraph.

## Workspaces
- `apps/api`: Legacy Fastify relay API (kept for compatibility/testing).
- `apps/desktop`: Electron + React editor, file tree, DnD paragraph cards, stale-only analysis, autosave, direct OpenAI calls.
- `packages/shared`: Shared types, API contracts, JSON schema validation.
- `tests/e2e`: Playwright smoke test for Electron launch.

## Quick start
1. Install dependencies: `pnpm install`
2. Start desktop: `pnpm --filter @litelizard/desktop dev`
3. Open `Settings` in the desktop app and save your OpenAI API key (`sk-...`).
4. Optional: start legacy API only when needed with `pnpm --filter @litelizard/api dev`

## Environment
- API env file: `apps/api/.env.example`
- Desktop analysis model can be overridden via `OPENAI_MODEL` (default `gpt-4o-mini`).

## Test
- Unit/integration: `pnpm test`
- E2E: `RUN_E2E_ELECTRON=1 pnpm --filter @litelizard/e2e test`

## Notes
- `.md` import/export is intentionally out of scope for MVP.
- OpenAI API key is stored as encrypted local file (PBKDF2 + AES-GCM).
