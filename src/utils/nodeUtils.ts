import { Node, XYPosition } from '@xyflow/react';

/**
 * 递归计算节点在画布上的绝对坐标（World Space）
 * React Flow 内部虽有 positionAbsolute，但在 state 频繁更新的拖拽过程中，
 * 如果是受控组件，该值可能会有延迟或不一致。手动递归能够确保计算结果是基于当前 state 的实时位置。
 */
export function getNodeAbsolutePosition(node: Node, allNodes: Node[]): XYPosition {
  let x = node.position.x;
  let y = node.position.y;
  let currentParentId = node.parentId;
  let depth = 0;

  while (currentParentId && depth < 20) {
    const parent = allNodes.find((n) => n.id === currentParentId);
    if (parent) {
      x += parent.position.x;
      y += parent.position.y;
      currentParentId = parent.parentId;
      depth++;
    } else {
      break;
    }
  }

  return { x, y };
}
