import { Node, XYPosition } from '@xyflow/react';

export type HelperLineHorizontal = {
  y: number;
  x1: number;
  x2: number;
};

export type HelperLineVertical = {
  x: number;
  y1: number;
  y2: number;
};

export type HelperLines = {
  horizontal: HelperLineHorizontal | null;
  vertical: HelperLineVertical | null;
};

const SNAP_THRESHOLD = 8;

export function getHelperLines(
  draggedNode: Node,
  allNodes: Node[],
  distance = SNAP_THRESHOLD
): {
  snappedPosition: XYPosition;
  helperLines: HelperLines;
} {
  const helperLines: HelperLines = {
    horizontal: null,
    vertical: null,
  };
  const nodeLookup = new Map(allNodes.map((node) => [node.id, node]));
  const absolutePositionCache = new Map<string, XYPosition>();

  const getAbsolutePosition = (node: Node): XYPosition => {
    const cachedPosition = absolutePositionCache.get(node.id);
    if (cachedPosition) return cachedPosition;

    let x = node.position.x;
    let y = node.position.y;
    let currentParentId = node.parentId;
    let depth = 0;

    while (currentParentId && depth < 20) {
      const parent = nodeLookup.get(currentParentId);
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      currentParentId = parent.parentId;
      depth += 1;
    }

    const absolutePosition = { x, y };
    absolutePositionCache.set(node.id, absolutePosition);
    return absolutePosition;
  };

  // 这里假设传入的 draggedNode.position 已经是绝对坐标（在 App.tsx 中计算好）
  const draggedPos = draggedNode.position;
  const snappedPosition: XYPosition = { ...draggedPos };

  const draggedWidth = draggedNode.measured?.width ?? 0;
  const draggedHeight = draggedNode.measured?.height ?? 0;

  const draggedLeft = draggedPos.x;
  const draggedRight = draggedLeft + draggedWidth;
  const draggedCenterX = draggedLeft + draggedWidth / 2;

  const draggedTop = draggedPos.y;
  const draggedBottom = draggedTop + draggedHeight;
  const draggedCenterY = draggedTop + draggedHeight / 2;

  allNodes.forEach((node) => {
    if (node.id === draggedNode.id) return;

    // 计算参照节点的真实绝对坐标
    const nodeWidth = node.measured?.width ?? 0;
    const nodeHeight = node.measured?.height ?? 0;
    
    // 使用统一递归工具获取绝对位置
    const absPos = getAbsolutePosition(node);
    const nodeX = absPos.x;
    const nodeY = absPos.y;

    const nodeLeft = nodeX;
    const nodeRight = nodeLeft + nodeWidth;
    const nodeCenterX = nodeLeft + nodeWidth / 2;

    const nodeTop = nodeY;
    const nodeBottom = nodeTop + nodeHeight;
    const nodeCenterY = nodeTop + nodeHeight / 2;

    // Vertical alignment (snapping X)
    const verticalAlignments = [
      { dragged: draggedLeft, target: nodeLeft, snap: nodeLeft },
      { dragged: draggedLeft, target: nodeRight, snap: nodeRight },
      { dragged: draggedRight, target: nodeLeft, snap: nodeLeft - draggedWidth },
      { dragged: draggedRight, target: nodeRight, snap: nodeRight - draggedWidth },
      { dragged: draggedCenterX, target: nodeCenterX, snap: nodeCenterX - draggedWidth / 2 },
    ];

    verticalAlignments.forEach(({ dragged, target, snap }) => {
      if (Math.abs(dragged - target) < distance) {
        snappedPosition.x = snap;
        helperLines.vertical = {
          x: target,
          y1: 0, 
          y2: 0, 
        };
      }
    });

    // Horizontal alignment (snapping Y)
    const horizontalAlignments = [
      { dragged: draggedTop, target: nodeTop, snap: nodeTop },
      { dragged: draggedTop, target: nodeBottom, snap: nodeBottom },
      { dragged: draggedBottom, target: nodeTop, snap: nodeTop - draggedHeight },
      { dragged: draggedBottom, target: nodeBottom, snap: nodeBottom - draggedHeight },
      { dragged: draggedCenterY, target: nodeCenterY, snap: nodeCenterY - draggedHeight / 2 },
    ];

    horizontalAlignments.forEach(({ dragged, target, snap }) => {
      if (Math.abs(dragged - target) < distance) {
        snappedPosition.y = snap;
        helperLines.horizontal = {
          y: target,
          x1: 0, 
          x2: 0, 
        };
      }
    });
  });

  return { snappedPosition, helperLines };
}
