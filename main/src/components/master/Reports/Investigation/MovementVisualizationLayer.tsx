import React, { useMemo, useState, useEffect } from 'react';
import { Group, Image as KonvaImage, Line, Circle, Text, Shape } from 'react-konva';
import dayjs from 'dayjs';
import { VisualPathPointType } from 'src/store/apps/crud/visitorSession';
import { DwellPoint, simplifyPath, cleanTimeStr } from './movementAnalysisUtils';
import { formatOrRawTime } from 'src/utils/time';

export type MovementViewMode = 'density' | 'replay' | 'trace' | 'stops' | 'incidents';

interface IncidentPointItem {
  id: string;
  x: number;
  y: number;
  timeStr: string;
  title?: string;
  pointIndex: number;
}

interface MovementVisualizationLayerProps {
  showTrace?: boolean;
  showStops?: boolean;
  showIncidents?: boolean;
  mode?: MovementViewMode;
  points: VisualPathPointType[];
  dwellPoints: DwellPoint[];
  currentIndex: number;
  currentAnimatedPos: { x: number; y: number } | null;
  currentAnimTimeMs?: number | null;
  scale: number;
  densityCanvas: HTMLCanvasElement | null;
  stageWidth: number;
  stageHeight: number;
  personName?: string;
  hasIncident?: boolean;
  incidentTimeStr?: string | null;
  incidentPoints?: IncidentPointItem[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  meterPerPx?: number;
}

export const MovementVisualizationLayer: React.FC<MovementVisualizationLayerProps> = ({
  showTrace = true,
  showStops = true,
  showIncidents = true,
  mode = 'trace',
  points,
  dwellPoints,
  currentIndex,
  currentAnimatedPos,
  currentAnimTimeMs,
  scale,
  densityCanvas,
  stageWidth,
  stageHeight,
  personName,
  hasIncident,
  incidentTimeStr,
  incidentPoints = [],
  selectedIncidentId,
  onSelectIncident,
  meterPerPx,
}) => {
  // Scale factor derived from meterPerPx (reference baseline: ~0.05m per px)
  const sizeFactor = useMemo(() => {
    if (!meterPerPx || meterPerPx <= 0) return 3.5;
    // For high pixel floorplans (small meterPerPx e.g. 0.005 - 0.015), scale up substantially
    const factor = (0.05 / meterPerPx);
    return Math.max(2.5, Math.min(2.0, factor));
  }, [meterPerPx]);

  const sortedPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    return [...points].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [points]);

  const currentPoint = useMemo(() => {
    if (sortedPoints.length === 0) return null;
    const idx = Math.min(Math.max(0, currentIndex), sortedPoints.length - 1);
    return sortedPoints[idx] || null;
  }, [sortedPoints, currentIndex]);

  const displayPos = useMemo(() => {
    if (currentAnimatedPos === null) return null;
    if (currentAnimatedPos) return currentAnimatedPos;
    if (currentPoint && currentIndex >= 0) return { x: currentPoint.x, y: currentPoint.y };
    return null;
  }, [currentAnimatedPos, currentPoint, currentIndex]);

  const startPoint = useMemo(() => {
    return sortedPoints.length > 0 ? sortedPoints[0] : null;
  }, [sortedPoints]);

  const endPoint = useMemo(() => {
    return sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null;
  }, [sortedPoints]);

  // Fallback single incident calculation if incidentPoints array is empty
  const fallbackIncidentPoint = useMemo(() => {
    if (!hasIncident) return null;
    if (incidentTimeStr && sortedPoints.length > 0) {
      const incMs = dayjs(cleanTimeStr(incidentTimeStr)).valueOf();
      let closest = sortedPoints[0];
      let minDiff = Math.abs(dayjs(cleanTimeStr(sortedPoints[0].time)).valueOf() - incMs);
      for (let i = 1; i < sortedPoints.length; i++) {
        const diff = Math.abs(dayjs(cleanTimeStr(sortedPoints[i].time)).valueOf() - incMs);
        if (diff < minDiff) {
          minDiff = diff;
          closest = sortedPoints[i];
        }
      }
      return closest;
    }
    return endPoint || startPoint;
  }, [hasIncident, incidentTimeStr, sortedPoints, endPoint, startPoint]);

  // Consolidated incident markers list
  const allIncidentItems = useMemo<IncidentPointItem[]>(() => {
    if (incidentPoints && incidentPoints.length > 0) {
      return incidentPoints;
    }
    if (hasIncident && fallbackIncidentPoint) {
      return [
        {
          id: 'default-incident',
          x: fallbackIncidentPoint.x,
          y: fallbackIncidentPoint.y,
          timeStr: incidentTimeStr || fallbackIncidentPoint.time,
          pointIndex: 0,
        },
      ];
    }
    return [];
  }, [incidentPoints, hasIncident, fallbackIncidentPoint, incidentTimeStr]);

  // Find index of the incident nearest to the current playback/beacon position
  const nearestIncidentIdx = useMemo(() => {
    if (allIncidentItems.length === 0 || !displayPos) return -1;
    let minDist = Infinity;
    let nearestIdx = -1;
    allIncidentItems.forEach((inc, idx) => {
      const dist = Math.hypot(inc.x - displayPos.x, inc.y - displayPos.y);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });
    return nearestIdx;
  }, [allIncidentItems, displayPos]);

  const nearestIncident = nearestIncidentIdx >= 0 ? allIncidentItems[nearestIncidentIdx] : null;

  const isBeeping = useMemo(() => {
    if (allIncidentItems.length === 0 || mode !== 'replay' || !displayPos || !nearestIncident) return false;
    return Math.hypot(displayPos.x - nearestIncident.x, displayPos.y - nearestIncident.y) < 2;
  }, [allIncidentItems, mode, displayPos, nearestIncident]);

  // Trajectory points traveled up to current playback position (only past trail, no future path)
  const traveledPoints = useMemo(() => {
    if (sortedPoints.length === 0 || currentIndex < 0) return [];
    const pointsUpToCurrent = sortedPoints.slice(0, currentIndex + 1);
    if (displayPos) {
      const lastPt = pointsUpToCurrent[pointsUpToCurrent.length - 1];
      if (!lastPt) return [];

      const distToDisplay = Math.hypot(displayPos.x - lastPt.x, displayPos.y - lastPt.y);
      // Only append displayPos if it is physically close (<= 200px) to avoid diagonal cuts across walls
      if (distToDisplay > 0.01 && distToDisplay <= 200) {
        return [
          ...pointsUpToCurrent,
          {
            x: displayPos.x,
            y: displayPos.y,
            time: lastPt.time ?? '',
            area: lastPt.area ?? '',
            personName: lastPt.personName ?? '',
            personId: lastPt.personId ?? '',
          },
        ];
      }
    }
    return pointsUpToCurrent;
  }, [sortedPoints, currentIndex, displayPos]);

  const simplifiedTraveledPoints = useMemo(() => {
    return simplifyPath(traveledPoints, 4);
  }, [traveledPoints]);

  if (sortedPoints.length === 0) return null;

  return (
    <Group>
      {/* 1. TRACE / TRAJECTORY LAYER (Trail behind current position with fading tail) */}
      {showTrace && simplifiedTraveledPoints.length > 1 && (
        <Group>
          {simplifiedTraveledPoints.slice(0, -1).map((pt, idx) => {
            const nextPt = simplifiedTraveledPoints[idx + 1];

            // Prevent drawing connecting line across large spatial jumps (e.g. teleports or wall crossings)
            const segDist = Math.hypot(nextPt.x - pt.x, nextPt.y - pt.y);
            if (segDist > 250) return null;

            // Compute relative progress along the trail (0 at start/oldest, 1 at end/newest)
            const progress = (idx + 1) / (simplifiedTraveledPoints.length - 1);
            // Opacity fades out towards older points (min ~0, max 1)
            const opacity = Math.pow(progress, 1.8);
            if (opacity <= 0.01) return null;

            return (
              <React.Fragment key={`trail-seg-${idx}`}>
                {/* Glow Segment */}
                <Line
                  points={[pt.x * scale, pt.y * scale, nextPt.x * scale, nextPt.y * scale]}
                  stroke="rgba(24, 119, 242, 0.25)"
                  strokeWidth={6 * sizeFactor}
                  lineCap="round"
                  lineJoin="round"
                  opacity={opacity}
                  listening={false}
                />
                {/* Core Segment */}
                <Line
                  points={[pt.x * scale, pt.y * scale, nextPt.x * scale, nextPt.y * scale]}
                  stroke="#1877F2"
                  strokeWidth={2.5 * sizeFactor}
                  lineCap="round"
                  lineJoin="round"
                  opacity={opacity}
                  listening={false}
                />
              </React.Fragment>
            );
          })}
        </Group>
      )}

      {/* 4. DWELL / STOP POINTS */}
      {showStops &&
        dwellPoints.map((d, dIdx) => {
          const haloRadius = Math.max(1, Math.min(38 * sizeFactor, (14 + (d.durationMinutes || 0) * 0.8) * sizeFactor));
          const coreRadius = 5 * sizeFactor;
          const labelOffsetY = haloRadius + 4;
          const fontSize = 9 * sizeFactor;

          return (
            <Group key={`dwell-${dIdx}`} x={d.x * scale} y={d.y * scale}>
              {/* Outer halo sized by duration */}
              <Circle
                radius={haloRadius}
                fill="rgba(24, 119, 242, 0.14)"
                stroke="rgba(24, 119, 242, 0.65)"
                strokeWidth={1.5 * sizeFactor}
                dash={[4, 3]}
                perfectDrawEnabled={false}
                listening={false}
              />
              {/* Inner core circle */}
              <Circle
                radius={coreRadius}
                fill="#1877F2"
                stroke="#ffffff"
                strokeWidth={2 * sizeFactor}
                shadowBlur={6 * sizeFactor}
                shadowColor="#1877F2"
                perfectDrawEnabled={false}
                listening={false}
              />
              {/* Duration Label */}
              <Group y={-22 * sizeFactor}>
                <Shape
                  sceneFunc={(ctx, shape) => {
                    ctx.beginPath();
                    ctx.roundRect(-45 * sizeFactor, 0, 90 * sizeFactor, 16 * sizeFactor, 4 * sizeFactor);
                    ctx.fillStrokeShape(shape);
                  }}
                  fill="rgba(2, 132, 199, 0.9)"
                  shadowBlur={4 * sizeFactor}
                  shadowColor="rgba(0,0,0,0.2)"
                />
                <Text
                  text={`Stopped (${d.durationFormatted})`}
                  fontSize={8 * sizeFactor}
                  fontStyle="bold"
                  fill="#ffffff"
                  align="center"
                  width={90 * sizeFactor}
                  offsetX={45 * sizeFactor}
                  offsetY={-3 * sizeFactor}
                  listening={false}
                />
              </Group>
            </Group>
          );
        })}

      {/* 5. START POSITION MARKER (Green Semantic Marker) */}
      {startPoint && (
        <Group x={startPoint.x * scale} y={startPoint.y * scale}>
          <Circle
            radius={14 * sizeFactor}
            fill="rgba(46, 125, 50, 0.2)"
            stroke="#2e7d32"
            strokeWidth={1.5 * sizeFactor}
            perfectDrawEnabled={false}
            listening={false}
          />
          <Circle
            radius={6 * sizeFactor}
            fill="#2e7d32"
            stroke="#ffffff"
            strokeWidth={2 * sizeFactor}
            shadowBlur={6 * sizeFactor}
            shadowColor="#2e7d32"
            perfectDrawEnabled={false}
            listening={false}
          />
          {/* Start Tag */}
          <Group y={-20 * sizeFactor}>
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.roundRect(-22 * sizeFactor, 0, 44 * sizeFactor, 15 * sizeFactor, 3 * sizeFactor);
                ctx.fillStrokeShape(shape);
              }}
              fill="#2e7d32"
            />
            <Text
              text="Start"
              fontSize={8.5 * sizeFactor}
              fontStyle="bold"
              fill="#ffffff"
              align="center"
              width={44 * sizeFactor}
              offsetX={22 * sizeFactor}
              offsetY={-3 * sizeFactor}
              listening={false}
            />
          </Group>
        </Group>
      )}

      {/* 6. END POSITION MARKER (Red Semantic Marker - when not on incident) */}
      {endPoint && !hasIncident && (
        <Group x={endPoint.x * scale} y={endPoint.y * scale}>
          <Circle
            radius={14 * sizeFactor}
            fill="rgba(198, 40, 40, 0.18)"
            stroke="#c62828"
            strokeWidth={1.5 * sizeFactor}
            perfectDrawEnabled={false}
            listening={false}
          />
          <Circle
            radius={6 * sizeFactor}
            fill="#c62828"
            stroke="#ffffff"
            strokeWidth={2 * sizeFactor}
            shadowBlur={6 * sizeFactor}
            shadowColor="#c62828"
            perfectDrawEnabled={false}
            listening={false}
          />
          {/* End Tag */}
          <Group y={-20 * sizeFactor}>
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.roundRect(-20 * sizeFactor, 0, 40 * sizeFactor, 15 * sizeFactor, 3 * sizeFactor);
                ctx.fillStrokeShape(shape);
              }}
              fill="#c62828"
            />
            <Text
              text="End"
              fontSize={8.5 * sizeFactor}
              fontStyle="bold"
              fill="#ffffff"
              align="center"
              width={40 * sizeFactor}
              offsetX={20 * sizeFactor}
              offsetY={-3 * sizeFactor}
              listening={false}
            />
          </Group>
        </Group>
      )}

      {/* 7. INCIDENT MARKERS (Rendered above Start & End markers, in front of Start label) */}
      {showIncidents && allIncidentItems.length > 0 && (
        <Group>
          {allIncidentItems.map((inc, incIdx) => {
            const isSelected = selectedIncidentId ? inc.id === selectedIncidentId : false;
            // If no incident is manually selected, the nearest incident to current position is focused
            const isFocused = selectedIncidentId
              ? isSelected
              : incIdx === nearestIncidentIdx;

            const shouldShowLabel = isSelected || isFocused;

            return (
              <IncidentMarkerComponent
                key={inc.id}
                x={inc.x}
                y={inc.y}
                scale={scale}
                sizeFactor={sizeFactor}
                incidentTimeStr={inc.timeStr}
                title={inc.title}
                isBeeping={isBeeping && isFocused}
                isFocused={isFocused}
                isSelected={isSelected}
                showLabel={shouldShowLabel}
                onClick={() => onSelectIncident?.(inc.id)}
              />
            );
          })}
        </Group>
      )}

      {/* 7. ACTIVE/CURRENT PERSON BEACON AVATAR MARKER (Top-most z-index overlay) */}
      {displayPos && (
        <Group x={displayPos.x * scale} y={displayPos.y * scale}>
          {/* Pulsing Outer Glow */}
          <Circle
            radius={18 * sizeFactor}
            fill="rgba(24, 119, 242, 0.22)"
            stroke="rgba(24, 119, 242, 0.75)"
            strokeWidth={2 * sizeFactor}
            shadowBlur={12 * sizeFactor}
            shadowColor="#1877F2"
            perfectDrawEnabled={false}
            listening={false}
          />
          {/* Primary Beacon Dot */}
          <Circle
            radius={7.5 * sizeFactor}
            fill="#1877F2"
            stroke="#ffffff"
            strokeWidth={2.5 * sizeFactor}
            shadowBlur={8 * sizeFactor}
            shadowColor="#1877F2"
            perfectDrawEnabled={false}
            listening={false}
          />
          {/* Person Name Tag */}
          {personName && (
            <Group y={-26 * sizeFactor}>
              <Shape
                sceneFunc={(ctx, shape) => {
                  const w = Math.max(50 * sizeFactor, personName.length * 6.5 * sizeFactor + 16 * sizeFactor);
                  ctx.beginPath();
                  ctx.roundRect(-w / 2, 0, w, 18 * sizeFactor, 5 * sizeFactor);
                  ctx.fillStrokeShape(shape);
                }}
                fill="#1877F2"
                shadowBlur={4 * sizeFactor}
                shadowColor="rgba(0,0,0,0.3)"
              />
              <Text
                text={personName}
                fontSize={9.5 * sizeFactor}
                fontStyle="bold"
                fill="#ffffff"
                align="center"
                width={120 * sizeFactor}
                offsetX={60 * sizeFactor}
                offsetY={-3.5 * sizeFactor}
                listening={false}
              />
            </Group>
          )}
        </Group>
      )}
    </Group>
  );
};

const IncidentMarkerComponent: React.FC<{
  x: number;
  y: number;
  scale: number;
  sizeFactor: number;
  incidentTimeStr?: string | null;
  isBeeping: boolean;
  isFocused?: boolean;
  isSelected?: boolean;
  showLabel?: boolean;
  title?: string;
  onClick?: () => void;
}> = ({
  x,
  y,
  scale,
  sizeFactor,
  incidentTimeStr,
  isBeeping,
  isFocused = false,
  isSelected = false,
  showLabel = true,
  title,
  onClick,
}) => {
  const [beepRadius, setBeepRadius] = useState(15);
  const [beepOpacity, setBeepOpacity] = useState(0.8);
  const [activeBeep, setActiveBeep] = useState(isBeeping);

  useEffect(() => {
    if (!isBeeping) {
      setActiveBeep(false);
      return;
    }

    setActiveBeep(true);
    let animFrame: number;
    let start = Date.now();
    const DURATION = 3000; // Limit expanding wave beep animation to 3 seconds

    const animate = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= DURATION) {
        setActiveBeep(false);
        return;
      }
      const progress = (elapsed % 1000) / 1000;
      setBeepRadius(15 + progress * 45);
      setBeepOpacity(1 - progress);
      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [isBeeping]);

  const formattedTime = useMemo(() => {
    return incidentTimeStr ? formatOrRawTime(incidentTimeStr, 'HH:mm:ss') : '';
  }, [incidentTimeStr]);

  const labelText = title || (formattedTime ? `Incident at ${formattedTime}` : 'Incident');
  const opacity = (isFocused || isSelected) ? 1 : 0.45;

  return (
    <Group x={x * scale} y={y * scale} onClick={onClick} onTap={onClick} opacity={opacity}>
      {/* Expanding Beep Radar Wave Circle - active only when triggered */}
      {activeBeep && (
        <Circle
          radius={beepRadius * sizeFactor}
          stroke="#ef4444"
          strokeWidth={3 * sizeFactor}
          fill="rgba(239, 68, 68, 0.3)"
          opacity={beepOpacity}
          listening={false}
        />
      )}

      {/* Red Outer Pulsing Halo */}
      <Circle
        radius={(isFocused || isSelected ? 24 : 18) * sizeFactor}
        fill="rgba(244, 67, 54, 0.25)"
        stroke="#f44336"
        strokeWidth={(isFocused || isSelected ? 2 : 1.2) * sizeFactor}
        dash={[4, 4]}
        perfectDrawEnabled={false}
        listening={false}
      />

      {/* Incident Pin */}
      <Circle
        radius={(isFocused || isSelected ? 10 : 8) * sizeFactor}
        fill="#d32f2f"
        stroke="#ffffff"
        strokeWidth={2 * sizeFactor}
        shadowBlur={(isFocused || isSelected ? 12 : 4) * sizeFactor}
        shadowColor="#d32f2f"
        perfectDrawEnabled={false}
      />
      <Text
        text="!"
        fontSize={(isFocused || isSelected ? 13 : 10) * sizeFactor}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        width={16 * sizeFactor}
        offsetX={8 * sizeFactor}
        offsetY={(isFocused || isSelected ? 6.5 : 5) * sizeFactor}
        listening={false}
      />

      {/* Label Tag showing "Incident at {time}" when focused / selected */}
      {showLabel && (
        <Group y={-26 * sizeFactor}>
          <Shape
            sceneFunc={(ctx, shape) => {
              const width = Math.max(70, labelText.length * 7.5) * sizeFactor;
              ctx.beginPath();
              ctx.roundRect(-width / 2, 0, width, 18 * sizeFactor, 4 * sizeFactor);
              ctx.fillStrokeShape(shape);
            }}
            fill="#d32f2f"
            shadowBlur={6 * sizeFactor}
            shadowColor="rgba(0,0,0,0.3)"
          />
          <Text
            text={labelText}
            fontSize={8.5 * sizeFactor}
            fontStyle="bold"
            fill="#ffffff"
            align="center"
            width={140 * sizeFactor}
            offsetX={70 * sizeFactor}
            offsetY={-4 * sizeFactor}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};
