import { useMemo } from 'react';

import { matchesHotkey } from '../lib/hotkeys';

type UseCanvasInteractionConfigParams = {
  panHotkey: string;
  selectHotkey: string;
  activeKeys: Set<string>;
  isLmbActive: boolean;
};

export function useCanvasInteractionConfig({
  panHotkey,
  selectHotkey,
  activeKeys,
  isLmbActive,
}: UseCanvasInteractionConfigParams) {
  const interactionConfig = useMemo(() => {
    const panHotkeyStr = (panHotkey || '').toLowerCase();
    const selectHotkeyStr = (selectHotkey || '').toLowerCase();

    const panParts = panHotkeyStr.split('+').map((part) => part.trim());
    const panIsLmb = panParts.includes('lmb') || panParts.includes('鼠标左键');
    const panModifier = panParts.find((part) => ['ctrl', 'alt', 'shift', 'space'].includes(part));

    const selectParts = selectHotkeyStr.split('+').map((part) => part.trim());
    const selectModifier = selectParts.find((part) => ['shift', 'ctrl', 'alt', 'meta'].includes(part)) || 'Shift';

    return {
      panOnDrag: panIsLmb ? [0, 1, 2] : [1, 2],
      panActivationKeyCode: panModifier
        ? (panModifier === 'space' ? 'Space' : panModifier.charAt(0).toUpperCase() + panModifier.slice(1))
        : (panIsLmb ? null : 'Space'),
      selectionKeyCode: selectModifier.charAt(0).toUpperCase() + selectModifier.slice(1),
    };
  }, [panHotkey, selectHotkey]);

  const isLmbPanningConfigured = (panHotkey || '').toLowerCase().includes('lmb') || (panHotkey || '').toLowerCase().includes('鼠标左键');
  const isSelectActive = matchesHotkey(selectHotkey, activeKeys);
  const isPanActive = isLmbPanningConfigured
    ? (isLmbActive && !isSelectActive)
    : matchesHotkey(panHotkey, activeKeys);

  return {
    interactionConfig,
    isSelectActive,
    isPanActive,
  };
}

