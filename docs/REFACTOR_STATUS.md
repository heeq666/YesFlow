# Refactor Status

## Current State

The main orchestration page has been split into smaller modules and hooks. `src/App.tsx` is still the top-level composition layer, but it is no longer responsible for every UI block and every persistence concern.

Current `src/App.tsx` size:
- about 592 lines

## Completed Extractions

### Components
- `src/components/StartDialog.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/TopToolbar.tsx`
- `src/components/ContextualToolbar.tsx`
- `src/components/SidebarPanel.tsx`
- `src/components/SidebarFooter.tsx`
- `src/components/SidebarToggle.tsx`
- `src/components/SelectionBoxOverlay.tsx`
- `src/components/StatusIndicators.tsx`
- `src/components/FlowCanvas.tsx`

### Hooks
- `src/hooks/useCanvasHotkeys.tsx`
- `src/hooks/useCanvasSelection.ts`
- `src/hooks/useCanvasHistory.ts`
- `src/hooks/useProjectRecords.ts`
- `src/hooks/useProjectFileIO.ts`
- `src/hooks/useAppSettings.ts`
- `src/hooks/useAiOrchestration.tsx`
- `src/hooks/useCanvasActions.ts`
- `src/hooks/useCanvasLayoutActions.ts`
- `src/hooks/useEdgeHighlighting.ts`
- `src/hooks/useCanvasInteractionConfig.ts`

### Constants / Context / Lib
- `src/constants/appearancePresets.ts`
- `src/constants/flowConfig.ts`
- `src/constants/translations.ts`
- `src/contexts/NodeSettingsContext.ts`
- `src/lib/flowLayout.ts`
- `src/lib/hotkeys.ts`

## What App Still Owns

`src/App.tsx` still directly owns:
- React Flow shell wiring
- node and edge mutations tied to live canvas behavior
- clipboard actions
- connect / drag / drop behavior
- node layout and selection-dependent canvas actions
- project-level page state composition

## Good Signs

- `npm run lint` passes
- `npm run build` passes
- behavior-preserving refactor has been incremental
- module boundaries are clearer than the starting point
- initial bundle optimization is in place (manual chunks + lazy settings modal)

## Remaining Hotspots

These are still the heaviest parts left in `src/App.tsx`:
- top-level state composition and cross-feature wiring
- project/session lifecycle orchestration
- data flow between modal, sidebar, and canvas action layers

## Recommended Next Steps

1. Continue reducing orchestration density in `App.tsx` by grouping related state into focused hooks.
2. Extract drag/drop and connect-end behavior into a `useCanvasConnections` hook.
3. Add smoke tests around critical canvas flows (copy/paste/delete/layout/connect).
4. Revisit route-level and modal-level lazy loading based on real usage telemetry.
