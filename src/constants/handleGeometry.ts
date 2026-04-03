import { Position } from '@xyflow/react';
import type { CSSProperties } from 'react';

export const HANDLE_HIT_SIZE = 20;
export const HANDLE_DOT_SIZE = 12;
export const HANDLE_OUTSET = 6;

export function getUnifiedHandleStyle(position: Position): CSSProperties {
  return {
    position: 'absolute',
    width: HANDLE_HIT_SIZE,
    height: HANDLE_HIT_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    top: position === Position.Top
      ? -HANDLE_OUTSET
      : position === Position.Bottom
        ? `calc(100% + ${HANDLE_OUTSET}px)`
        : '50%',
    left: position === Position.Left
      ? -HANDLE_OUTSET
      : position === Position.Right
        ? `calc(100% + ${HANDLE_OUTSET}px)`
        : '50%',
    transform: 'translate(-50%, -50%)',
  };
}
