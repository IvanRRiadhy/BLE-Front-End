import React, { useRef, useState } from 'react';
import { Text, Group, Path } from 'react-konva';

type BeaconRendererProps = {
  id: string;
  x: number;
  y: number;
  beaconSize: number;
  opacity?: number;
  lastSeen?: number;
  area: string;
  floorplan: string;
  time: string;
  clickable: boolean;
  detailDialogOpen?: boolean;
  setDetailDialogOpen?: (open: boolean) => void;
  openTrackDetail?: boolean;
  setOpenTrackDetail?: (open: boolean) => void;
  onClick?: () => void;
  // Resolved props passed from parent for O(1) performance
  label: string;
  isSecurity: boolean;
  isMember: boolean;
  isVisitor: boolean;
  iconType?: 'person' | 'pin';
};

const BeaconRenderer: React.FC<BeaconRendererProps> = ({
  id,
  x,
  y,
  beaconSize,
  opacity = 1,
  lastSeen = Date.now(),
  clickable,
  onClick = () => {},
  label,
  isSecurity,
  isMember,
  isVisitor: _isVisitor,
  iconType = 'person',
}) => {
  const groupRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  const beaconColor = isSecurity ? '#00c853' : isMember ? '#1976d2' : '#f50057';

  // SVG Icon Path Data
  const personPath = "M16 15.503A5.041 5.041 0 1 0 16 5.42a5.041 5.041 0 0 0 0 10.083zm0 2.215c-6.703 0-11 3.699-11 5.5v3.363h22v-3.363c0-2.178-4.068-5.5-11-5.5z";
  const pinPath = "M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6";

  const isPin = iconType === 'pin';
  const svgPathData = isPin ? pinPath : personPath;

  // Icon dimensions
  const iconSize = 22;
  const iconScale = iconSize / (isPin ? 16 : 32);

  return (
    <>
      <Group
        name="beacon"
        ref={groupRef}
        x={x}
        y={y}
        offsetX={x}
        offsetY={y}
        scaleX={beaconSize}
        scaleY={beaconSize}
        opacity={opacity}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          if (!clickable) return;
          e.cancelBubble = true; // Prevent propagation
          if (onClick) onClick();
        }}
      >
        {/* Label text placed cleanly above the person icon */}
        <Text
          x={x - 55}
          y={y - (iconSize / 2) - 16}
          text={label}
          fontSize={10}
          fill={beaconColor}
          fontStyle="bold"
          width={120}
          align="center"
        />

        {/* Clean Vector SVG Person Silhouette */}
        <Path
          data={svgPathData}
          fill={beaconColor}
          scaleX={iconScale}
          scaleY={iconScale}
          x={x - iconSize / 2}
          y={y - iconSize / 2}
          shadowColor="rgba(0,0,0,0.12)"
          shadowBlur={3}
          shadowOffset={{ x: 0, y: 1.5 }}
        />
      </Group>

      {/* Tooltip for stale beacons */}
      {isHovered && Date.now() - lastSeen > 5000 && (
        <Group x={x} y={y - 45}>
          <Path
            data="M-60,-24 L60,-24 Q64,-24 64,-20 L64,-4 Q64,0 60,0 L5,0 L0,6 L-5,0 L-60,0 Q-64,0 -64,-4 L-64,-20 Q-64,-24 -60,-24 Z"
            fill="rgba(0,0,0,0.85)"
            stroke="#ffffff"
            strokeWidth={1}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={4}
          />
          <Text
            text={`Last seen: ${new Date(lastSeen).toLocaleTimeString()}`}
            fill="white"
            fontSize={10}
            width={120}
            align="center"
            x={-60}
            y={-15}
            fontStyle="bold"
          />
        </Group>
      )}
    </>
  );
};

// Extremely performant memoized component:
// Prevents re-rendering unless the exact position or critical props change
const MemoizedBeaconRenderer = React.memo(BeaconRenderer, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.beaconSize === nextProps.beaconSize &&
    prevProps.opacity === nextProps.opacity &&
    prevProps.lastSeen === nextProps.lastSeen &&
    prevProps.label === nextProps.label &&
    prevProps.isSecurity === nextProps.isSecurity &&
    prevProps.isMember === nextProps.isMember &&
    prevProps.isVisitor === nextProps.isVisitor &&
    prevProps.iconType === nextProps.iconType
  );
});

export default MemoizedBeaconRenderer;
