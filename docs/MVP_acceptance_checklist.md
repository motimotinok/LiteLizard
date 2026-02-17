# LiteLizard MVP Acceptance Checklist

Source of truth: `/Users/jane/devidea/liteLizard/docs/LiteLizard_spec_v002.md`

## Functional checks
- [ ] 1. Open folder and display `*.md` documents in explorer tree.
- [ ] 2. For each document, load paired `*.litelizard.analysis.json` when it exists.
- [ ] 3. New paragraph insertion creates one paragraph entry and a persistent `paragraphId`.
- [ ] 4. Drag-and-drop reorder updates only `order`; `paragraphId` remains unchanged.
- [ ] 5. Closing editor without explicit save does not modify files on disk.
- [ ] 6. Explicit save persists both `.md` and `.litelizard.analysis.json`.
- [ ] 7. Global analysis executes from top analysis pane button.
- [ ] 8. Local analysis executes from each paragraph card button.

## Security and API checks
- [ ] 9. Analysis UI is disabled when user is not logged in.
- [ ] 10. Client calls only first-party server API for analysis (no direct provider call).
- [ ] 11. No user API key setting UI is exposed.

## Quality checks
- [ ] 12. Paragraph-level status supports `fresh | stale | pending | failed`.
- [ ] 13. Partial failure handling reflects success/failed counts on global analysis.
- [ ] 14. Retry guidance is shown for network/auth failures.
