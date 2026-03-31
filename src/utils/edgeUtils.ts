import { Position, type InternalNode } from '@xyflow/react';

function getHandleCoords(node: InternalNode, position: Position) {
  const width = node.measured?.width ?? 0;
  const height = node.measured?.height ?? 0;
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;

  // Node handles are centered on the 2px border (1px offset from outer edge)
  switch (position) {
    case Position.Top: return { x: x + width / 2, y: y };
    case Position.Bottom: return { x: x + width / 2, y: y + height };
    case Position.Left: return { x: x, y: y + height / 2 };
    case Position.Right: return { x: x + width, y: y + height / 2 };
  }
}

export function getEdgeParams(source: InternalNode, target: InternalNode) {
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

  let sourcePos = Position.Bottom;
  let targetPos = Position.Top;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      sourcePos = Position.Right;
      targetPos = Position.Left;
    } else {
      sourcePos = Position.Left;
      targetPos = Position.Right;
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      sourcePos = Position.Bottom;
      targetPos = Position.Top;
    } else {
      sourcePos = Position.Top;
      targetPos = Position.Bottom;
    }
  }

  const { x: sx, y: sy } = getHandleCoords(source, sourcePos);
  const { x: tx, y: ty } = getHandleCoords(target, targetPos);

  return { sx, sy, tx, ty, sourcePos, targetPos };
}
