export const matchesHotkey = (hotkey: string, event: KeyboardEvent | Set<string>) => {
  if (!hotkey || hotkey.trim() === '') return false;
  const parts = hotkey.toLowerCase().split('+').map((part) => part.trim());

  const needsCtrl = parts.includes('ctrl') || parts.includes('meta') || parts.includes('control');
  const needsAlt = parts.includes('alt');
  const needsShift = parts.includes('shift');
  const isLmb = parts.includes('lmb') || parts.includes('鼠标左键');

  const mainKey = parts.find((part) => !['ctrl', 'meta', 'alt', 'shift', 'control', 'lmb', '鼠标左键'].includes(part));

  if (event instanceof Set) {
    const hasCtrl = event.has('control') || event.has('meta');
    const hasAlt = event.has('alt');
    const hasShift = event.has('shift');
    const hasLmb = event.has('lmb');

    if (needsCtrl !== hasCtrl || needsAlt !== hasAlt || needsShift !== hasShift) return false;
    if (isLmb && !hasLmb) return false;
    if (!mainKey && !isLmb) return true;
    if (!mainKey && isLmb) return true;

    const targetKey = mainKey === 'space' ? ' ' : mainKey!;
    return event.has(targetKey);
  }

  const hasCtrl = event.ctrlKey || event.metaKey;
  const hasAlt = event.altKey;
  const hasShift = event.shiftKey;

  if (needsCtrl !== hasCtrl || needsAlt !== hasAlt || needsShift !== hasShift) return false;

  if (!mainKey) {
    const eventKey = event.key.toLowerCase();
    if (needsShift && eventKey === 'shift') return true;
    if (needsCtrl && (eventKey === 'control' || eventKey === 'meta')) return true;
    if (needsAlt && eventKey === 'alt') return true;
    return false;
  }

  const eventKey = event.key.toLowerCase();
  const eventCode = event.code.toLowerCase();

  if (mainKey === 'space') return eventCode === 'space';
  if (mainKey === 'delete') return event.key === 'Delete' || event.key === 'Backspace';

  return eventKey === mainKey;
};
