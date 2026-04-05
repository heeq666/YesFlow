# YesFlow 0.3.2 Roadmap

This file tracks the practical follow-up scope after `0.3.1`.

## Completed

- Fix top toolbar interaction during selection mode
- Reset imported projects into a fresh record context instead of silently overwriting the previous record
- Sanitize persisted nodes and edges more consistently across local records and exported JSON
- Migrate older local records through a safer normalization path on load
- Add node image title editing and copy-source actions
- Add image ordering controls in both the workspace tool and quick tool
- Add drag-to-reorder for images in both image entry surfaces
- Add image upload protection for oversized local files
- Surface node images inside the right-side resource dock
- Add quick actions inside the resource dock for copy/open/tool jump
- Add a warning when imported JSON contains many embedded images
- Add a light import integrity check before hydration, including duplicate ids and orphan parents
- Add a light “last saved” hint for local records so save state is easier to trust
- Add graceful local-record save failure feedback when storage quota is exceeded
- Upgrade GitHub Pages workflow action versions to current major releases
- Split large UI surfaces with lazy loading to reduce the main bundle size warning
- Add `npm run release:check`
- Add a reusable release checklist in `docs/RELEASE_CHECKLIST.md`

## Still Worth Doing

### Image workflow

- Consider a total per-project image budget, not only a per-file upload limit
- Add image captions or notes distinct from the display title
- Allow replacing an existing image item without deleting and recreating it

### Resource dock

- Explore a mixed timeline/resource layout when both schedule and many resources exist

### Persistence and safety

### Release workflow

- Add a release notes template for bilingual GitHub Releases
- Consider a small script to diff version references before release
- Optionally add a pre-push check script for Pages-related validation

## Suggested Next Slice

If continuing immediately, the next good slice is:

1. Consider a total per-project image budget
2. Add image captions or notes distinct from the display title
3. Allow replacing an existing image item without deleting and recreating it
