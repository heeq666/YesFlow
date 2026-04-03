import { Position, type InternalNode } from '@xyflow/react';
import { HANDLE_OUTSET } from '../constants/handleGeometry';

function getPositionFromHandleId(handleId?: string | null): Position | null {
  if (!handleId) return null;

  if (handleId.startsWith('top-')) return Position.Top;
  if (handleId.startsWith('bottom-')) return Position.Bottom;
  if (handleId.startsWith('left-')) return Position.Left;
  if (handleId.startsWith('right-')) return Position.Right;

  return null;
}

function getHandleCoords(node: InternalNode, position: Position) {
  const width = node.measured?.width ?? 0;
  const height = node.measured?.height ?? 0;
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;

  // Node handles are centered on the 2px border (1px offset from outer edge)
  switch (position) {
    case Position.Top: return { x: x + width / 2, y: y - HANDLE_OUTSET };
    case Position.Bottom: return { x: x + width / 2, y: y + height + HANDLE_OUTSET };
    case Position.Left: return { x: x - HANDLE_OUTSET, y: y + height / 2 };
    case Position.Right: return { x: x + width + HANDLE_OUTSET, y: y + height / 2 };
  }
}

export function getEdgeParams(
  source: InternalNode,
  target: InternalNode,
  sourceHandleId?: string | null,
  targetHandleId?: string | null,
) {
  const sourceCenter = {
    x: source.internals.positionAbsolute.x + (source.measured?.width ?? 0) / 2,
    y: source.internals.positionAbsolute.y + (source.measured?.height ?? 0) / 2,
  };
  const targetCenter = {
    x: target.internals.positionAbsolute.x + (target.measured?.width ?? 0) / 2,
    y: target.internals.positionAbsolute.y + (target.measured?.height ?? 0) / 2,
  };

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  let sourcePos = getPositionFromHandleId(sourceHandleId) ?? Position.Bottom;
  let targetPos = getPositionFromHandleId(targetHandleId) ?? Position.Top;

  if (!getPositionFromHandleId(sourceHandleId) || !getPositionFromHandleId(targetHandleId)) {
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (!getPositionFromHandleId(sourceHandleId)) {
        sourcePos = dx > 0 ? Position.Right : Position.Left;
      }
      if (!getPositionFromHandleId(targetHandleId)) {
        targetPos = dx > 0 ? Position.Left : Position.Right;
      }
    } else {
      // Vertical connection
      if (!getPositionFromHandleId(sourceHandleId)) {
        sourcePos = dy > 0 ? Position.Bottom : Position.Top;
      }
      if (!getPositionFromHandleId(targetHandleId)) {
        targetPos = dy > 0 ? Position.Top : Position.Bottom;
      }
    }
  }

  const { x: sx, y: sy } = getHandleCoords(source, sourcePos);
  const { x: tx, y: ty } = getHandleCoords(target, targetPos);

  return { sx, sy, tx, ty, sourcePos, targetPos };
}
