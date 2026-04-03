import type { VisualSettings } from '../types';

export const DEFAULT_VISUALS: VisualSettings = {
  nodeHighlightColor: '#3b82f6', // Classic Blue
  edgeColor: '#94a3b8',
  edgeSelectedColor: '#3b82f6',
  handleColor: '#3b82f6',
};

export const APPEARANCE_PRESETS = [
  { 
    id: 'classic-blue', 
    name: '经典蓝', 
    visuals: DEFAULT_VISUALS 
  },
  { 
    id: 'dark-night', 
    name: '黑夜', 
    visuals: { 
      nodeHighlightColor: '#6366f1', 
      edgeColor: '#334155', 
      edgeSelectedColor: '#818cf8', 
      handleColor: '#6366f1' 
    } 
  },
  { 
    id: 'premium-gray', 
    name: '高级灰', 
    visuals: { 
      nodeHighlightColor: '#475569', 
      edgeColor: '#cbd5e1', 
      edgeSelectedColor: '#64748b', 
      handleColor: '#475569' 
    } 
  },
];
