import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  SelectionMode,
  type Edge,
  type Node,
  type NodeChange,
  type OnConnectEnd,
} from '@xyflow/react';
import React, { useCallback, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';

import GroupNode from './GroupNode';
import SelectionBoxOverlay from './SelectionBoxOverlay';
import TopToolbar from './TopToolbar';
import { HelperLines } from './HelperLines';
import { edgeTypes, nodeTypes as baseNodeTypes } from '../constants/flowConfig';
import type { HelperLines as HelperLinesType } from '../utils/helperLineUtils';
import type { ConnectionMode, NodePreset, TaskMode, ThemeMode } from '../types';

const nodeTypes = {
  ...baseNodeTypes,
  group: GroupNode,
};

type FlowCanvasProps = {
  selectionBox: { x: number; y: number; width: number; height: number } | null;
  transform: [number, number, number];
  nodes: Node[];
  activeEdges: Edge[];
  helperLines: HelperLinesType;
  mode: TaskMode;
  themeMode: ThemeMode;
  showCanvasGrid: boolean;
  edgeColor: string;
  onMouseDown: (event: React.MouseEvent) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (params: any) => void;
  onConnectStart: (_: any, params: any) => void;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (_: React.MouseEvent, node: Node) => void;
  onEdgeClick: (_: React.MouseEvent, edge: Edge) => void;
  onPaneClick: () => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  selectionKeyCode: string;
  panOnDrag: number[];
  panActivationKeyCode: string | null;
  onSelectionChange: (params: any) => void;
  onSelectionStart: () => void;
  onSelectionEnd: () => void;
  onNodeDragStart: (_: any, node: Node) => void;
  onNodeDrag: (_: any, node: Node) => void;
  onNodeDragStop: (_: any, node: Node) => void;
  currentProjectLabel: string;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveToLocal: () => void;
  onSaveFile: () => void;
  onOpenFile: () => void;
  onModeChange: (mode: TaskMode) => void;
  defaultPathType: string;
  onApplyPathTypeToAll: (pathType: string) => void;
  connectionMode: ConnectionMode;
  onApplyConnectionMode: (mode: ConnectionMode) => void;
  onToggleCanvasGrid: () => void;
  language: 'zh' | 'en';
  nodePresets: NodePreset[];
  onAddPresetNode: (preset: NodePreset) => void;
  onAddNodeLocal: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
};

export default function FlowCanvas({
  selectionBox,
  transform,
  nodes,
  activeEdges,
  helperLines,
  mode,
  themeMode,
  showCanvasGrid,
  edgeColor,
  onMouseDown,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onDrop,
  onDragOver,
  selectionKeyCode,
  panOnDrag,
  panActivationKeyCode,
  onSelectionChange,
  onSelectionStart,
  onSelectionEnd,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  currentProjectLabel,
  projectName,
  onProjectNameChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveToLocal,
  onSaveFile,
  onOpenFile,
  onModeChange,
  defaultPathType,
  onApplyPathTypeToAll,
  connectionMode,
  onApplyConnectionMode,
  onToggleCanvasGrid,
  language,
  nodePresets,
  onAddPresetNode,
  onAddNodeLocal,
  onToggleTheme,
  onToggleLanguage,
}: FlowCanvasProps) {
  const gridVariant = mode === 'professional' ? BackgroundVariant.Dots : BackgroundVariant.Lines;
  const minorGridGap = mode === 'professional' ? 24 : 32;
  const majorGridGap = minorGridGap * 4;
  const minorGridColor = themeMode === 'dark' ? '#24344f' : '#cbd5e1';
  const majorGridColor = themeMode === 'dark' ? '#3b5375' : '#94a3b8';
  const connectionLineStyle = useMemo(() => ({ zIndex: -1 }), []);
  const defaultEdgeOptions = useMemo(() => ({
    type: 'floating',
    style: { strokeWidth: 2, stroke: edgeColor },
  }), [edgeColor]);
  const isValidConnection = useCallback((connection: { source?: string | null; target?: string | null }) => (
    connection.source !== connection.target
  ), []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <SelectionBoxOverlay selectionBox={selectionBox} transform={transform} />
      <ReactFlow
        onMouseDown={onMouseDown}
        nodes={nodes}
        edges={activeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid={false}
        selectionKeyCode={selectionKeyCode}
        multiSelectionKeyCode={selectionKeyCode}
        selectionOnDrag={true}
        panOnDrag={panOnDrag}
        panActivationKeyCode={panActivationKeyCode}
        selectionMode={SelectionMode.Full}
        deleteKeyCode={null}
        onSelectionChange={onSelectionChange}
        onSelectionStart={onSelectionStart}
        onSelectionEnd={onSelectionEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        isValidConnection={isValidConnection}
        connectionLineContainerStyle={connectionLineStyle}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <AnimatePresence>
          {/* Import Status moved to bottom-left container */}
        </AnimatePresence>
        <HelperLines horizontal={helperLines.horizontal} vertical={helperLines.vertical} />
        {showCanvasGrid && (
          <>
            <Background
              id="canvas-grid-minor"
              color={minorGridColor}
              variant={gridVariant}
              gap={minorGridGap}
              size={mode === 'professional' ? 1.8 : 1}
              lineWidth={1}
              style={{ opacity: themeMode === 'dark' ? 0.72 : 0.9 }}
            />
            <Background
              id="canvas-grid-major"
              color={majorGridColor}
              variant={gridVariant}
              gap={majorGridGap}
              size={mode === 'professional' ? 2.6 : 1}
              lineWidth={mode === 'professional' ? 1.2 : 1.35}
              style={{ opacity: themeMode === 'dark' ? 0.92 : 1 }}
            />
          </>
        )}
        <Controls position="bottom-right" className="!bg-white !border-neutral-200 !shadow-lg m-4" />
        <TopToolbar
          currentProjectLabel={currentProjectLabel}
          projectName={projectName}
          onProjectNameChange={onProjectNameChange}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onSaveToLocal={onSaveToLocal}
          onSaveFile={onSaveFile}
          onOpenFile={onOpenFile}
          mode={mode}
          onModeChange={onModeChange}
          defaultPathType={defaultPathType}
          onApplyPathTypeToAll={onApplyPathTypeToAll}
          connectionMode={connectionMode}
          onApplyConnectionMode={onApplyConnectionMode}
          showCanvasGrid={showCanvasGrid}
          onToggleCanvasGrid={onToggleCanvasGrid}
          themeMode={themeMode}
          language={language}
          nodePresets={nodePresets}
          onAddPresetNode={onAddPresetNode}
          onAddNodeLocal={onAddNodeLocal}
          onToggleTheme={onToggleTheme}
          onToggleLanguage={onToggleLanguage}
        />
      </ReactFlow>
    </div>
  );
}
