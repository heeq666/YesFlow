import CustomNode from '../components/CustomNode';
import GroupNode from '../components/GroupNode';
import FloatingEdge from '../components/FloatingEdge';

export const nodeTypes = { 
  task: CustomNode,
  group: GroupNode
};
export const edgeTypes = { floating: FloatingEdge };
