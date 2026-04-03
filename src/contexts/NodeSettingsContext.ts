import React from 'react';
import { DEFAULT_VISUALS } from '../constants/appearancePresets';
import type { NodeToolSettings, ThemeMode, VisualSettings } from '../types';

const DEFAULT_NODE_TOOL_SETTINGS: NodeToolSettings = {
  enabled: true,
  showToolbarOnSelect: true,
  panelWidth: 420,
  enabledTools: {
    table: true,
    document: true,
    link: true,
    schedule: true,
  },
  calendar: {
    enabled: true,
    collapsed: false,
    defaultView: 'month',
    showTodayPanel: true,
  },
};

export const NodeSettingsContext = React.createContext<{
  completedStyle: 'classic' | 'logo' | 'minimal';
  visuals: VisualSettings;
  themeMode: ThemeMode;
  nodeTools: NodeToolSettings;
}>({
  completedStyle: 'logo',
  visuals: DEFAULT_VISUALS,
  themeMode: 'light',
  nodeTools: DEFAULT_NODE_TOOL_SETTINGS,
});
