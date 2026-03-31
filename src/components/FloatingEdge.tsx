import { 
  useInternalNode, 
  getBezierPath, 
  getStraightPath,
  getSmoothStepPath,
  type EdgeProps, 
  BaseEdge, 
  EdgeLabelRenderer 
} from '@xyflow/react';
import { getEdgeParams } from '../utils/edgeUtils';
import { TaskData } from '../types';

const COLOR_SWATCHES: Record<string, string> = {
  sky: '#0ea5e9',
  green: '#22c55e',
  amber: '#f59e0b',
  indigo: '#6366f1',
  rose: '#f43f5e',
  teal: '#14b8a6',
  fuchsia: '#d946ef',
  orange: '#f97316',
  cyan: '#06b6d4',
  violet: '#8b5cf6'
};

export default function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style = {},
  selected,
  animated,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  const pathParams = {
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  };

  const pathType = (data?.pathType as string) || 'bezier';
  
  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (pathType === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath(pathParams);
  } else if (pathType === 'step') {
    [edgePath, labelX, labelY] = getSmoothStepPath({ ...pathParams, borderRadius: 16 });
  } else {
    [edgePath, labelX, labelY] = getBezierPath(pathParams);
  }

  const sourceData = sourceNode.data as TaskData;
  const sourceColor = sourceData.color ? COLOR_SWATCHES[sourceData.color] || sourceData.color : '#94a3b8';
  // Use edge explicit color if provided, otherwise fallback to source node color
  const edgeData = data as any;
  const edgeColor = edgeData?.color ? (COLOR_SWATCHES[edgeData.color] || edgeData.color) : sourceColor;
  const isHighlighted = edgeData?.isHighlighted || selected;
  const activeColor = edgeData?.activeColor || '#8b5cf6';
  const idleColor = edgeData?.idleColor || edgeColor;
  const finalColor = isHighlighted ? activeColor : idleColor;

  const finalMarkerEnd = (markerEnd && typeof markerEnd === 'object') 
    ? { ...(markerEnd as any), color: finalColor } 
    : markerEnd;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={finalMarkerEnd}
        style={{
          ...(style as any),
          strokeWidth: isHighlighted ? 3 : 2,
          stroke: finalColor,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
          opacity: isHighlighted ? 1 : 0.6
        }}
        className={`${animated ? 'react-flow__edge-path react-flow__edge-path--animated' : 'react-flow__edge-path'} ${isHighlighted ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]' : ''}`}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              ...(labelBgStyle as any),
              padding: Array.isArray(labelBgPadding) ? `${labelBgPadding[1]}px ${labelBgPadding[0]}px` : '2px 4px',
              borderRadius: labelBgBorderRadius || 4,
              fontSize: 10,
              fontWeight: 700,
              color: '#64748b',
              whiteSpace: 'nowrap',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
