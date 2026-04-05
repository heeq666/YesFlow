# Changelog

All notable changes to **YesFlow** are documented here.

## [0.3.3] - 2026-04-05

### Changed

- Upgraded core toolchain to modern versions, including Vite 8, TypeScript 6, and the latest React plugin and icon package
- Improved release pipeline compatibility by updating GitHub Actions to Node 24.13.0 for reliable `npm ci` installs
- Refined bundle splitting strategy to improve cache reuse and reduce initial payload

### Improved

- Reduced main entry bundle size significantly through additional code-splitting and on-demand module loading
- Deferred heavy AI/layout modules (`aiService`, `flowLayout`) until feature interaction instead of loading them at first paint
- Optimized canvas edge highlighting with adjacency traversal and stable edge object reuse to reduce unnecessary re-renders

### Fixed

- Resolved strict TypeScript regressions introduced by dependency upgrades (React types, node selection typing, nullable checks, and Vite output typing)
- Eliminated inconsistent local dependency states that previously caused missing Vite chunk module errors in development

## [0.3.2] - 2026-04-05

### Added

- Node image workflow upgrades: title editing, copy-source actions, directional reorder controls, and drag-to-reorder support
- Right-side resource dock now surfaces node images with quick actions for copy, open, and jumping into the image tool
- Import safeguards for project JSON: lightweight integrity checks and a warning when many embedded images are detected
- `npm run release:check` and a reusable release checklist in `docs/RELEASE_CHECKLIST.md`

### Changed

- Imported projects now initialize into a fresh local record context instead of overwriting the previous active record
- Node/edge persistence sanitization is now more consistent across local records and exported JSON files
- Older local records go through a safer normalization path during load
- Heavy UI surfaces are split with lazy loading to reduce main bundle pressure

### Fixed

- Top toolbar interaction while selection mode is active
- Local record save feedback when browser storage quota is exceeded
- GitHub Pages deploy workflow action versions upgraded to current major releases

## [0.3.1] - 2026-04-03

### Added

- Node image tool with local uploads and remote image link support
- Project-level AI task tracking so generation progress and outcomes stay attached to each record

### Changed

- Unified task node sizing and spacing through shared layout constants for canvas, grouping, and AI-generated placement
- Refreshed README, metadata, settings copy, and in-app release notes for the `0.3.1` release

### Fixed

- Project saves and exports now strip transient UI and AI runtime fields before persistence
- Added an application error boundary to reduce full-screen blank states after runtime failures

## [0.3.0] - 2026-04-03

### Added

- Node tool workspace with `Document`, `Table`, `Link`, and `Schedule` support
- Right-side utility sidebar with integrated calendar view
- Multi-provider AI configuration for MiniMax, DeepSeek, Qwen, Doubao, Zhipu, and OpenAI-compatible endpoints
- Local project records with auto-save, quick reopen, and drag-to-reorder
- JSON export filename dialog and richer project file handling

### Changed

- Repositioned YesFlow from a flow editor into a fuller AI workflow workspace
- Rewrote both `README.md` and `README_ZH.md` around the current product scope
- Refreshed the in-app About section and release notes for the `0.3.0` launch
- Expanded customization across appearance, interaction, node tools, and provider settings

### Improved

- Workflow editing with grouping, ungrouping, node-side tool access, and richer edge management
- Node context depth by letting each task carry its own notes, references, schedules, and tabular data
- Release messaging and product description consistency across docs and settings

## [0.2.0] - 2026-04-01

### Added

- Project renamed from `AI Orchestra` to `YesFlow`
- Refreshed logo, branding, and browser favicon

### Changed

- Rewrote the original README around the new YesFlow identity

## [0.1.0] - 2026-03-31

### Added

- Initial beta release of YesFlow
- Visual drag-and-drop workflow canvas
- AI task orchestration with model-backed nodes
- Conditional branching and parallel workflow structure
- Multi-select with `Shift + Click` and `Shift + Drag`
- Customizable hotkeys
- Local-first storage
- Static deployment-ready frontend architecture
