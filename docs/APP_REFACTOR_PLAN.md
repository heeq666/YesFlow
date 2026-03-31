# App Refactor Plan

## Goal

Reduce the size and coupling of `src/App.tsx` without changing product behavior.

## Progress Snapshot

Completed:
- utility extraction
- settings, records, file I/O, history, hotkey, selection hooks
- AI orchestration hook
- major modal, toolbar, sidebar, overlay component extraction

Current status:
- `src/App.tsx` is now primarily a composition and canvas-orchestration layer
- canvas editing and layout actions have been extracted to dedicated hooks
- React Flow shell has been extracted into `FlowCanvas`
- bundle splitting has started with manual chunks and lazy settings modal

## Proposed Split

1. Move pure helpers into `src/lib/flow/`
   - hotkey matching
   - layout helpers
   - node and edge serialization helpers

2. Move persistence and history into hooks
   - `useProjectRecords`
   - `useProjectFileIO`
   - `useCanvasHistory`
   - `useAppSettings`
   - `useCanvasHotkeys`

3. Move AI orchestration into a dedicated hook
   - `useAiOrchestration`
   - generate, modify, decompose, group generation, abort handling

4. Extract modal and overlay UI
   - `SettingsModal`
   - `StartDialog`
   - `StatusToasts`
   - `SelectionToolbar`

5. Extract canvas shell
   - `FlowCanvas`
   - owns `ReactFlow` wiring, panels, helper lines, and node drag/connect interactions

6. Optimize delivery
   - lazy-load non-critical UI surfaces
   - refine manual chunking strategy based on build output

## Suggested Order

1. Extract utilities with no React state.
2. Extract history and persistence hooks.
3. Extract AI action hook.
4. Extract modal and overlay components.
5. Extract the final `FlowCanvas` container.

## Expected Outcome

- Smaller `App.tsx` focused on composition
- Faster onboarding for future changes
- Easier code-splitting for large modal and settings surfaces
- Lower regression risk when changing canvas behavior
