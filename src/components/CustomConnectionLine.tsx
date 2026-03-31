import React from 'react';
import { ConnectionLineComponentProps } from '@xyflow/react';

export default function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  return (
    <g>
      <path
        fill="none"
        stroke="#4F46E5"
        strokeWidth={2}
        className="animated"
        strokeDasharray="5,5"
        d={`M${fromX},${fromY} C ${fromX},${toY} ${fromX},${toY} ${toX},${toY}`} 
      />
      {/* 10px diameter solid endpoint as requested by user */}
      <circle 
        cx={toX} 
        cy={toY} 
        fill="#4F46E5" 
        r={5} 
        stroke="#fff" 
        strokeWidth={2} 
      />
    </g>
  );
}
