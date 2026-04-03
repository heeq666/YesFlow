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

/**
 * 根据子节点计算组节点的最小外接矩形及其位移修正。
 * 返回：{ delta: {x, y}, style: {width, height} }
 * 这里的 delta 是父节点相对于当前位置需要偏移的距离。
 */
export function getGroupBounds(nodes: Node[], groupId: string, padding: number = 60) {
  const children = nodes.filter((n) => n.parentId === groupId);
  if (children.length === 0) return null;

  // 使用 measured 属性获取实时宽高，如果不存在则使用预设值
  const minX = Math.min(...children.map((n) => n.position.x));
  const minY = Math.min(...children.map((n) => n.position.y));
  const maxX = Math.max(...children.map((n) => n.position.x + (n.measured?.width || 260)));
  const maxY = Math.max(...children.map((n) => n.position.y + (n.measured?.height || 140)));

  const deltaX = minX - padding;
  const deltaY = minY - padding;
  const newWidth = (maxX - minX) + padding * 2;
  const newHeight = (maxY - minY) + padding * 2;

  return {
    delta: { x: deltaX, y: deltaY },
    style: { width: newWidth, height: newHeight }
  };
}

/**
 * Estimate token count from text
 * Simple estimation: ~2 Chinese chars per token, ~4 English chars per token
 * This is a rough approximation for UI display purposes
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Count Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // Count non-Chinese characters (English, numbers, punctuation, etc.)
  const nonChineseChars = text.length - chineseChars;
  // Approximate: 1 token ≈ 2 Chinese chars or 4 non-Chinese chars
  return Math.ceil(chineseChars / 2 + nonChineseChars / 4);
}

/**
 * Get color class based on character count percentage
 */
export function getCharCountColor(charCount: number, maxChars: number = 4000): {
  textClass: string;
  isWarning: boolean;
  isError: boolean;
} {
  const percentage = charCount / maxChars;
  if (percentage >= 1) {
    return {
      textClass: 'text-red-600 dark:text-red-400',
      isWarning: false,
      isError: true,
    };
  }
  if (percentage >= 0.8) {
    return {
      textClass: 'text-amber-600 dark:text-amber-400',
      isWarning: true,
      isError: false,
    };
  }
  return {
    textClass: 'text-neutral-400 dark:text-neutral-500',
    isWarning: false,
    isError: false,
  };
}
