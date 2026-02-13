# LiteLizard MVP Monorepo

LiteLizard is an Electron desktop editor that keeps `light` (text) and `lizard` (AI analysis) side-by-side per paragraph.

## Workspaces
- `apps/api`: Fastify relay API with SQLite, email-link auth (dev code), usage and rate limiting.
- `apps/desktop`: Electron + React editor, file tree, DnD paragraph cards, stale-only analysis, autosave.
- `packages/shared`: Shared types, API contracts, JSON schema validation.
- `tests/e2e`: Playwright smoke test for Electron launch.

## Quick start
1. Install dependencies: `pnpm install`
2. Start API: `pnpm --filter @litelizard/api dev`
3. Start desktop: `pnpm --filter @litelizard/desktop dev`

## Environment
- API env file: `apps/api/.env.example`
- Desktop reads API URL from `LITELIZARD_API_BASE_URL` (default `http://127.0.0.1:8787`).

## Test
- Unit/integration: `pnpm test`
- E2E: `RUN_E2E_ELECTRON=1 pnpm --filter @litelizard/e2e test`

## Notes
- `.md` import/export is intentionally out of scope for MVP.
- Session token is stored as encrypted local file (PBKDF2 + AES-GCM).
