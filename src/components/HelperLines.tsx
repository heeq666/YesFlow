import React from 'react';
import { useStore } from '@xyflow/react';
import { HelperLines as HelperLinesType } from '../utils/helperLineUtils';

interface HelperLinesProps {
  horizontal: HelperLinesType['horizontal'];
  vertical: HelperLinesType['vertical'];
}

export const HelperLines: React.FC<HelperLinesProps> = ({ horizontal, vertical }) => {
  const transform = useStore((s) => s.transform);
  const [x, y, zoom] = transform;

  if (!horizontal && !vertical) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        top: 0,
        left: 0,
      }}
    >
      <g transform={`translate(${x},${y}) scale(${zoom})`}>
        {vertical && (
          <line
            x1={vertical.x}
            y1={-100000}
            x2={vertical.x}
            y2={100000}
            stroke="#6366f1"
            strokeWidth={1 / zoom}
            strokeDasharray={`${4 / zoom} ${4 / zoom}`}
          />
        )}
        {horizontal && (
          <line
            x1={-100000}
            y1={horizontal.y}
            x2={100000}
            y2={horizontal.y}
            stroke="#6366f1"
            strokeWidth={1 / zoom}
            strokeDasharray={`${4 / zoom} ${4 / zoom}`}
          />
        )}
      </g>
    </svg>
  );
};
