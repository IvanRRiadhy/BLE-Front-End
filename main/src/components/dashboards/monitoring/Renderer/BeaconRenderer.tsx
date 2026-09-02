import React, { useRef, useState } from 'react';
import { Text, Group, Path, Circle } from 'react-konva';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';
import { BASE_URL } from 'src/utils/axios';

// Global lightweight image cache for high-performance canvas rendering
const imageCache = new Map<string, HTMLImageElement>();
const pendingImages = new Set<string>();

export function getFullImageUrl(src?: string): string | null {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = src.startsWith('/') ? src : `/${src}`;
  return `${cleanBase}${cleanPath}`;
}

export function preloadImage(src?: string, onLoaded?: () => void): HTMLImageElement | null {
  const fullUrl = getFullImageUrl(src);
  if (!fullUrl) return null;

  const cached = imageCache.get(fullUrl);
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : null;
  }

  if (!pendingImages.has(fullUrl)) {
    pendingImages.add(fullUrl);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(fullUrl, img);
      pendingImages.delete(fullUrl);
      if (onLoaded) onLoaded();
    };
    img.onerror = () => {
      pendingImages.delete(fullUrl);
    };
    img.src = fullUrl;
  }

  return null;
}

// Pure, high-performance mathematical parser for SVG Path bounding box
const getPathBounds = (d: string) => {
  let curX = 0;
  let curY = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  let idx = 0;
  const len = d.length;
  
  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  const skipWhitespace = () => {
    while (idx < len) {
      const c = d[idx];
      if (c === ' ' || c === ',' || c === '\t' || c === '\n' || c === '\r') {
        idx++;
      } else {
        break;
      }
    }
  };

  const parseNumber = (): number => {
    skipWhitespace();
    if (idx >= len) return 0;

    const start = idx;
    let c = d[idx];

    // Sign
    if (c === '+' || c === '-') {
      idx++;
    }

    let hasDigit = false;
    while (idx < len && d[idx] >= '0' && d[idx] <= '9') {
      idx++;
      hasDigit = true;
    }

    if (idx < len && d[idx] === '.') {
      idx++;
      while (idx < len && d[idx] >= '0' && d[idx] <= '9') {
        idx++;
        hasDigit = true;
      }
    }

    if (hasDigit && idx < len && (d[idx] === 'e' || d[idx] === 'E')) {
      const expIdx = idx;
      idx++;
      if (idx < len && (d[idx] === '+' || d[idx] === '-')) {
        idx++;
      }
      let hasExpDigits = false;
      while (idx < len && d[idx] >= '0' && d[idx] <= '9') {
        idx++;
        hasExpDigits = true;
      }
      if (!hasExpDigits) {
        idx = expIdx; // Backtrack
      }
    }

    if (idx > start) {
      const val = parseFloat(d.substring(start, idx));
      return isNaN(val) ? 0 : val;
    }

    return 0;
  };

  const parseFlag = (): number => {
    skipWhitespace();
    if (idx >= len) return 0;
    const c = d[idx];
    if (c === '0' || c === '1') {
      idx++;
      return c === '1' ? 1 : 0;
    }
    return 0;
  };

  let cmd = '';
  
  while (idx < len) {
    skipWhitespace();
    if (idx >= len) break;
    
    const c = d[idx];
    const isCommand = /^[a-df-z]$/i.test(c);
    
    if (isCommand) {
      cmd = c;
      idx++;
    } else {
      if (cmd === '') cmd = 'M'; 
    }
    
    const cmdLower = cmd.toLowerCase();
    
    if (cmdLower === 'm' || cmdLower === 'l') {
      const xVal = parseNumber();
      const yVal = parseNumber();
      if (cmd === 'M' || cmd === 'L') {
        curX = xVal;
        curY = yVal;
      } else {
        curX += xVal;
        curY += yVal;
      }
      updateBounds(curX, curY);
      
      // Implicit subsequent coordinates are treated as L/l
      if (cmd === 'M') cmd = 'L';
      if (cmd === 'm') cmd = 'l';
    } else if (cmdLower === 'h') {
      const xVal = parseNumber();
      if (cmd === 'H') {
        curX = xVal;
      } else {
        curX += xVal;
      }
      updateBounds(curX, curY);
    } else if (cmdLower === 'v') {
      const yVal = parseNumber();
      if (cmd === 'V') {
        curY = yVal;
      } else {
        curY += yVal;
      }
      updateBounds(curX, curY);
    } else if (cmdLower === 'c') {
      const x1 = parseNumber();
      const y1 = parseNumber();
      const x2 = parseNumber();
      const y2 = parseNumber();
      const x = parseNumber();
      const y = parseNumber();
      
      const targetX = cmd === 'C' ? x : curX + x;
      const targetY = cmd === 'C' ? y : curY + y;
      
      const ctrl1X = cmd === 'C' ? x1 : curX + x1;
      const ctrl1Y = cmd === 'C' ? y1 : curY + y1;
      const ctrl2X = cmd === 'C' ? x2 : curX + x2;
      const ctrl2Y = cmd === 'C' ? y2 : curY + y2;
      
      updateBounds(ctrl1X, ctrl1Y);
      updateBounds(ctrl2X, ctrl2Y);
      updateBounds(targetX, targetY);
      
      curX = targetX;
      curY = targetY;
    } else if (cmdLower === 's') {
      const x2 = parseNumber();
      const y2 = parseNumber();
      const x = parseNumber();
      const y = parseNumber();
      
      const targetX = cmd === 'S' ? x : curX + x;
      const targetY = cmd === 'S' ? y : curY + y;
      
      const ctrl2X = cmd === 'S' ? x2 : curX + x2;
      const ctrl2Y = cmd === 'S' ? y2 : curY + y2;
      
      updateBounds(ctrl2X, ctrl2Y);
      updateBounds(targetX, targetY);
      
      curX = targetX;
      curY = targetY;
    } else if (cmdLower === 'q') {
      const x1 = parseNumber();
      const y1 = parseNumber();
      const x = parseNumber();
      const y = parseNumber();
      
      const targetX = cmd === 'Q' ? x : curX + x;
      const targetY = cmd === 'Q' ? y : curY + y;
      
      const ctrl1X = cmd === 'Q' ? x1 : curX + x1;
      const ctrl1Y = cmd === 'Q' ? y1 : curY + y1;
      
      updateBounds(ctrl1X, ctrl1Y);
      updateBounds(targetX, targetY);
      
      curX = targetX;
      curY = targetY;
    } else if (cmdLower === 't') {
      const x = parseNumber();
      const y = parseNumber();
      
      curX = cmd === 'T' ? x : curX + x;
      curY = cmd === 'T' ? y : curY + y;
      updateBounds(curX, curY);
    } else if (cmdLower === 'a') {
      const rx = parseNumber();
      const ry = parseNumber();
      const xAxisRotation = parseNumber();
      const largeArcFlag = parseFlag();
      const sweepFlag = parseFlag();
      const x = parseNumber();
      const y = parseNumber();
      
      curX = cmd === 'A' ? x : curX + x;
      curY = cmd === 'A' ? y : curY + y;
      updateBounds(curX, curY);
    } else if (cmdLower === 'z') {
      // closed path
    } else {
      idx++;
    }
  }

  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    return { x: 0, y: 0, width: 24, height: 24 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// O(1) Cache for performance
const boundsCache: Record<string, { x: number; y: number; width: number; height: number }> = {};

const getCachedPathBounds = (d: string) => {
  if (!d) return { x: 0, y: 0, width: 24, height: 24 };
  if (boundsCache[d]) return boundsCache[d];
  const bounds = getPathBounds(d);
  boundsCache[d] = bounds;
  return bounds;
};

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
  iconType?: 'person' | 'pin' | 'photo' | 'custom';
  isFollowed?: boolean;
  faceImage?: string;
  loadedImage?: HTMLImageElement;
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
  iconType,
  isFollowed = false,
  faceImage,
  loadedImage,
}) => {
  const groupRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  const iconTypeSetting = useSelector((state: RootState) => state.settings.beaconIconType || 'person');
  const customSvgPath = useSelector((state: RootState) => state.settings.customSvgPath || '');

  const beaconColor = isSecurity ? '#00c853' : isMember ? '#1976d2' : '#f50057';

  // SVG Icon Path Data
  const personPath = "M16 15.503A5.041 5.041 0 1 0 16 5.42a5.041 5.041 0 0 0 0 10.083zm0 2.215c-6.703 0-11 3.699-11 5.5v3.363h22v-3.363c0-2.178-4.068-5.5-11-5.5z";
  const pinPath = "M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6";
  const solidPinPath = "M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10Z";

  const resolvedIconType = iconType || iconTypeSetting;
  const isPhoto = resolvedIconType === 'photo';
  const isPin = resolvedIconType === 'pin';
  const isCustom = resolvedIconType === 'custom';
  const svgPathData = isCustom ? customSvgPath : isPin ? pinPath : personPath;

  // Icon dimensions
  const iconSize = isPhoto ? 48 : 32;
  const bbox = isPhoto ? { x: 0, y: 0, width: 16, height: 16 } : getCachedPathBounds(svgPathData);
  
  // Custom SVG scale and offsets
  const baseScale = iconSize / (isPin || isPhoto ? 16 : 32);
  const maxDim = Math.max(bbox.width, bbox.height) || 24;
  const finalScale = isCustom ? iconSize / maxDim : baseScale;
  
  const finalX = isCustom 
    ? x - (bbox.x + bbox.width / 2) * finalScale
    : x - iconSize / 2;
  const finalY = isCustom 
    ? y - (bbox.y + bbox.height / 2) * finalScale
    : y - iconSize / 2;

  const effectiveBeaconSize = isFollowed ? beaconSize * 1.2 : beaconSize;
  const textFontSize = isFollowed ? 18 : 16 ;

  // Photo pin dimensions
  const circleCenterX = finalX + 8 * baseScale;
  const circleCenterY = finalY + 6 * baseScale;
  const innerRadius = 5.2 * baseScale;

  const img = loadedImage || (faceImage ? preloadImage(faceImage) : null);

  return (
    <>
      <Group
        name="beacon"
        ref={groupRef}
        x={x}
        y={y}
        offsetX={x}
        offsetY={y}
        scaleX={effectiveBeaconSize}
        scaleY={effectiveBeaconSize}
        opacity={opacity}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          if (!clickable) return;
          e.cancelBubble = true; // Prevent propagation
          if (onClick) onClick();
        }}
      >
        {/* Circular border around the icon in the same color as the icon */}
        {isFollowed && (
          <Circle
            x={x}
            y={isPhoto ? circleCenterY : y}
            radius={isPhoto ? 22 : 17}
            stroke={beaconColor}
            strokeWidth={2.5}
            fill="transparent"
            shadowColor={beaconColor}
            shadowBlur={4}
            shadowOpacity={0.6}
          />
        )}

        {/* Label text placed cleanly above the person icon */}
        <Text
          x={x - 60}
          y={y - (iconSize / 2) - (isFollowed ? 30 : 26)}
          text={label}
          fontSize={textFontSize}
          fill={beaconColor}
          fontStyle="bold"
          width={120}
          align="center"
          shadowColor="#ffffff"     
          shadowBlur={4}
          shadowOpacity={0.8}
        />

        {/* Icon Rendering */}
        {isPhoto ? (
          <>
            {/* Solid Pin outer body (colored border + pointer) */}
            <Path
              data={solidPinPath}
              fill={beaconColor}
              scaleX={baseScale}
              scaleY={baseScale}
              x={finalX}
              y={finalY}
              shadowColor="rgba(0,0,0,0.2)"
              shadowBlur={isFollowed ? 4 : 2}
              shadowOffset={{ x: 0, y: 1 }}
              shadowOpacity={1}
            />

            {/* White background circle inside pin head */}
            <Circle
              x={circleCenterX}
              y={circleCenterY}
              radius={innerRadius}
              fill="#ffffff"
            />

            {/* Photo overlay or fallback person silhouette */}
            {img ? (
              <Circle
                x={circleCenterX}
                y={circleCenterY}
                radius={innerRadius}
                fillPatternImage={img}
                fillPatternScale={{
                  x: (innerRadius * 2) / (img.width || 1),
                  y: (innerRadius * 2) / (img.height || 1),
                }}
                fillPatternOffset={{
                  x: (img.width || 0) / 2,
                  y: (img.height || 0) / 2,
                }}
                fillPatternRepeat="no-repeat"
              />
            ) : (
              <Path
                data={personPath}
                fill={beaconColor}
                scaleX={innerRadius / 20}
                scaleY={innerRadius / 20}
                x={circleCenterX - (16 * innerRadius) / 20}
                y={circleCenterY - (16 * innerRadius) / 20}
              />
            )}
          </>
        ) : (
          <Path
            data={svgPathData}
            fill={beaconColor}
            scaleX={finalScale}
            scaleY={finalScale}
            x={finalX}
            y={finalY}
            shadowColor="rgba(0,0,0,0.2)"
            shadowBlur={isFollowed ? 4 : 2}
            shadowOffset={{ x: 0, y: 1 }}
            shadowOpacity={1}
          />
        )}
      </Group>
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
    prevProps.iconType === nextProps.iconType &&
    prevProps.isFollowed === nextProps.isFollowed &&
    prevProps.faceImage === nextProps.faceImage &&
    prevProps.loadedImage === nextProps.loadedImage
  );
});

export default MemoizedBeaconRenderer;

