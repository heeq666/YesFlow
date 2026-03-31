import { Node, Edge } from '@xyflow/react';

export type FlowState = {
  nodes: Node[];
  edges: Edge[];
};

export type HistoryState = {
  past: FlowState[];
  present: FlowState;
  future: FlowState[];
};

const MAX_HISTORY_SIZE = 50;

/**
 * 比较两个 FlowState 是否实质上相等（忽略函数引用等非序列化内容可选）
 * 这里主要用于避免在没有实质变化时推送快照
 */
const areStatesEqual = (s1: FlowState, s2: FlowState) => {
  return JSON.stringify(s1.nodes) === JSON.stringify(s2.nodes) && 
         JSON.stringify(s1.edges) === JSON.stringify(s2.edges);
};

export const createHistory = (initialState: FlowState): HistoryState => ({
  past: [],
  present: initialState,
  future: [],
});

export const pushToHistory = (state: HistoryState, newState: FlowState): HistoryState => {
  if (areStatesEqual(state.present, newState)) return state;

  const past = [...state.past, state.present];
  if (past.length > MAX_HISTORY_SIZE) {
    past.shift();
  }

  return {
    past,
    present: newState,
    future: [],
  };
};

export const undo = (state: HistoryState): HistoryState => {
  if (state.past.length === 0) return state;

  const previous = state.past[state.past.length - 1];
  const past = state.past.slice(0, state.past.length - 1);

  return {
    past,
    present: previous,
    future: [state.present, ...state.future],
  };
};

export const redo = (state: HistoryState): HistoryState => {
  if (state.future.length === 0) return state;

  const next = state.future[0];
  const future = state.future.slice(1);

  return {
    past: [...state.past, state.present],
    present: next,
    future,
  };
};
