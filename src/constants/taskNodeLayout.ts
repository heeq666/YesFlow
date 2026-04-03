import type { TaskMode } from '../types';

type TaskNodeLayout = {
  width: number;
  height: number;
  radius: number;
  overlayRadius: number;
  innerRadius: number;
  layoutWidth: number;
  layoutHeight: number;
  addOffsetX: number;
  addOffsetY: number;
  groupChildStartY: number;
  groupChildGapY: number;
};

const TASK_NODE_LAYOUTS: Record<TaskMode, TaskNodeLayout> = {
  daily: {
    width: 288,
    height: 76,
    radius: 999,
    overlayRadius: 999,
    innerRadius: 999,
    layoutWidth: 308,
    layoutHeight: 96,
    addOffsetX: 324,
    addOffsetY: 120,
    groupChildStartY: 72,
    groupChildGapY: 120,
  },
  professional: {
    width: 260,
    height: 132,
    radius: 12,
    overlayRadius: 14,
    innerRadius: 10,
    layoutWidth: 260,
    layoutHeight: 140,
    addOffsetX: 300,
    addOffsetY: 180,
    groupChildStartY: 80,
    groupChildGapY: 180,
  },
};

export function getTaskNodeLayout(mode: TaskMode) {
  return TASK_NODE_LAYOUTS[mode];
}
