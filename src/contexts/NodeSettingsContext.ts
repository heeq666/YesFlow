import React from 'react';
import { DEFAULT_VISUALS } from '../constants/appearancePresets';
import type { VisualSettings } from '../types';

export const NodeSettingsContext = React.createContext<{
  completedStyle: 'classic' | 'logo' | 'minimal';
  visuals: VisualSettings;
}>({
  completedStyle: 'logo',
  visuals: DEFAULT_VISUALS,
});
