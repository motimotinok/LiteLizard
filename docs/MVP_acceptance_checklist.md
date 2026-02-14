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
- [ ] 8. Without configured API key, UI shows settings guidance and analysis does not run.
- [ ] 9. With invalid API key or OpenAI request failure, stale paragraphs become `failed` with no partial `complete` updates.
- [ ] 10. If any paragraph fails, all-or-nothing behavior is preserved and UI keeps zero partial updates.

## Quality checks
- [ ] Unit tests pass for schema validation, stale transition, reorder behavior.
- [ ] Desktop tests pass for vault encryption/decryption and store document ops behavior.
- [ ] E2E smoke test launches desktop shell (`RUN_E2E_ELECTRON=1`).
