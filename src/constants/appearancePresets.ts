import type { VisualSettings } from '../types';

export const DEFAULT_VISUALS: VisualSettings = {
  nodeHighlightColor: '#3b82f6',
  edgeColor: '#94a3b8',
  edgeSelectedColor: '#8b5cf6',
  handleColor: '#8b5cf6',
};

export const APPEARANCE_PRESETS = [
  { id: 'default', name: '经典蓝', visuals: DEFAULT_VISUALS },
  { id: 'neon', name: '极光霓虹', visuals: { nodeHighlightColor: '#f472b6', edgeColor: '#38bdf8', edgeSelectedColor: '#4ade80', handleColor: '#22d3ee' } },
  { id: 'forest', name: '森林秘境', visuals: { nodeHighlightColor: '#10b981', edgeColor: '#64748b', edgeSelectedColor: '#059669', handleColor: '#059669' } },
];
