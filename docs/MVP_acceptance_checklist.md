# LiteLizard MVP Acceptance Checklist

Source of truth: `/Users/jane/devidea/liteLizard/LiteLizard_clean_spec_v1.md`

## Functional checks
- [ ] 1. Open folder and display `.litelizard.json` files in explorer tree.
- [ ] 2. Create a new document file and load it into editor.
- [ ] 3. Edit paragraph text and verify `lizard.status` becomes `stale`.
- [ ] 4. Auto-save runs after 3 seconds of inactivity.
- [ ] 5. Drag-and-drop paragraph reorder updates only `order` and keeps `id` unchanged.
- [ ] 6. Run analysis sends only `stale` paragraphs.
- [ ] 7. Analysis success renders `emotion/theme/deepMeaning/confidence` in right pane.

## Security and API checks
- [ ] 8. Without login token, analysis endpoint returns `401` and UI shows login guidance.
- [ ] 9. On rate limit exceed, API returns `429` with retryable message.
- [ ] 10. If any paragraph fails, API applies all-or-nothing and UI keeps zero partial updates.

## Quality checks
- [ ] Unit tests pass for schema validation, stale transition, reorder behavior.
- [ ] API integration tests pass for auth/rate-limit/all-or-nothing/usage.
- [ ] E2E smoke test launches desktop shell (`RUN_E2E_ELECTRON=1`).
