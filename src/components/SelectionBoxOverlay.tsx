type SelectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

type SelectionBoxOverlayProps = {
  selectionBox: SelectionBox;
  transform: [number, number, number];
};

export default function SelectionBoxOverlay({ selectionBox, transform }: SelectionBoxOverlayProps) {
  if (!selectionBox || selectionBox.width <= 0 || selectionBox.height <= 0) {
    return null;
  }

  return (
    <svg
      className="absolute pointer-events-none z-[5]"
      style={{
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
        transformOrigin: '0 0',
      }}
    >
      <rect
        x={selectionBox.x}
        y={selectionBox.y}
        width={selectionBox.width}
        height={selectionBox.height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="rgba(59, 130, 246, 0.8)"
        strokeWidth={1 / transform[2]}
        strokeDasharray="4 2"
      />
    </svg>
  );
}
