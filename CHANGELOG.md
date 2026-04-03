# Changelog

All notable changes to **YesFlow** are documented here.

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
