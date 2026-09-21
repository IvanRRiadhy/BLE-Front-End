import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import {
  GroundTruthPoint,
  GroundTruthAreaUi,
  DetectorPrediction,
  AnnotationToolMode,
  LayerVisibility,
  FloorplanFileItem,
} from '../../types/annotation';
import {
  calculateCentroid,
  pointToSegmentDistance,
} from '../../utils/annotationGeometry';
import { calculateFitTransform } from '../../utils/annotationTransform';

interface AnnotationCanvasProps {
  floorplan: FloorplanFileItem | null;
  imageUrl: string | null;
  areas: GroundTruthAreaUi[];
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  detectorPredictions: DetectorPrediction[];
  toolMode: AnnotationToolMode;
  drawingPoints: GroundTruthPoint[];
  layerVisibility: LayerVisibility;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onSelectArea: (id: string | null) => void;
  onHoverArea: (id: string | null) => void;
  onAddPolygon: (points: GroundTruthPoint[]) => void;
  onUpdateVertex: (areaId: string, vertexIndex: number, newPoint: GroundTruthPoint) => void;
  onInsertVertex: (areaId: string, afterIndex: number, point: GroundTruthPoint) => void;
  onDeleteVertex: (areaId: string, vertexIndex: number) => void;
  onTranslateArea: (areaId: string, dx: number, dy: number) => void;
  onDrawingPointsChange: (points: GroundTruthPoint[]) => void;
  onAcceptPrediction: (predId: string) => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  floorplan,
  imageUrl,
  areas,
  selectedAreaId,
  hoveredAreaId,
  detectorPredictions,
  toolMode,
  drawingPoints,
  layerVisibility,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onSelectArea,
  onHoverArea,
  onAddPolygon,
  onUpdateVertex,
  onInsertVertex,
  onDeleteVertex,
  onTranslateArea,
  onDrawingPointsChange,
  onAcceptPrediction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const [mousePixelPos, setMousePixelPos] = useState<GroundTruthPoint | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Vertex Dragging
  const [draggingVertex, setDraggingVertex] = useState<{
    areaId: string;
    vertexIndex: number;
  } | null>(null);

  // Polygon Translation Dragging
  const [draggingPolygon, setDraggingPolygon] = useState<{
    areaId: string;
    startPoint: GroundTruthPoint;
    lastPoint: GroundTruthPoint;
  } | null>(null);

  // Edge Midpoint Ghost Vertex (for insertion)
  const [ghostVertex, setGhostVertex] = useState<{
    areaId: string;
    afterIndex: number;
    point: GroundTruthPoint;
  } | null>(null);

  const imageWidth = floorplan?.imageWidth || 0;
  const imageHeight = floorplan?.imageHeight || 0;

  // Convert client screen coordinate to original image pixel space
  const screenToImage = useCallback(
    (clientX: number, clientY: number, clamp = true): GroundTruthPoint => {
      if (gRef.current) {
        const ctm = gRef.current.getScreenCTM();
        if (ctm && svgRef.current) {
          const pt = svgRef.current.createSVGPoint();
          pt.x = clientX;
          pt.y = clientY;
          const transformed = pt.matrixTransform(ctm.inverse());
          let x = Math.round(transformed.x);
          let y = Math.round(transformed.y);
          if (clamp && imageWidth > 0 && imageHeight > 0) {
            x = Math.max(0, Math.min(imageWidth, x));
            y = Math.max(0, Math.min(imageHeight, y));
          }
          return { xPx: x, yPx: y };
        }
      }

      // Fallback arithmetic
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        let x = Math.round((mouseX - pan.x) / zoom);
        let y = Math.round((mouseY - pan.y) / zoom);
        if (clamp && imageWidth > 0 && imageHeight > 0) {
          x = Math.max(0, Math.min(imageWidth, x));
          y = Math.max(0, Math.min(imageHeight, y));
        }
        return { xPx: x, yPx: y };
      }

      return { xPx: 0, yPx: 0 };
    },
    [imageHeight, imageWidth, pan.x, pan.y, zoom]
  );

  // Check if hovering near first drawing point (Snapping)
  const isSnappedToStart = useMemo(() => {
    if (toolMode !== 'draw' || drawingPoints.length < 3 || !mousePixelPos) return false;
    const start = drawingPoints[0];
    const distScreen = Math.hypot(
      (mousePixelPos.xPx - start.xPx) * zoom,
      (mousePixelPos.yPx - start.yPx) * zoom
    );
    return distScreen <= 16;
  }, [drawingPoints, mousePixelPos, toolMode, zoom]);

  // Mouse Wheel Zoom centered at cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.02, Math.min(25, zoom * factor));

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    onZoomChange(newZoom);
    onPanChange({ x: newPanX, y: newPanY });
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space+click initiates pan
    if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing / editing

    const pt = screenToImage(e.clientX, e.clientY);

    // DRAW MODE
    if (toolMode === 'draw') {
      if (isSnappedToStart && drawingPoints.length >= 3) {
        // Close polygon
        onAddPolygon(drawingPoints);
      } else {
        onDrawingPointsChange([...drawingPoints, pt]);
      }
      return;
    }

    // SELECT / EDIT MODE: Check if clicking empty background to pan
    if (toolMode === 'select') {
      // If not clicking on an area, vertex, or ghost vertex, initiate canvas pan
      const target = e.target as SVGElement;
      const isBackground =
        target === svgRef.current ||
        target.tagName === 'svg' ||
        target.classList.contains('canvas-background') ||
        target.tagName === 'image';

      if (isBackground) {
        onSelectArea(null);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = screenToImage(e.clientX, e.clientY);
    setMousePixelPos(pt);

    // 1. Panning in progress
    if (isPanning) {
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // 2. Vertex dragging in progress
    if (draggingVertex) {
      onUpdateVertex(draggingVertex.areaId, draggingVertex.vertexIndex, pt);
      return;
    }

    // 3. Polygon translation in progress
    if (draggingPolygon) {
      const dx = pt.xPx - draggingPolygon.lastPoint.xPx;
      const dy = pt.yPx - draggingPolygon.lastPoint.yPx;
      if (dx !== 0 || dy !== 0) {
        onTranslateArea(draggingPolygon.areaId, dx, dy);
        setDraggingPolygon({
          ...draggingPolygon,
          lastPoint: pt,
        });
      }
      return;
    }

    // 4. Ghost vertex detection on selected area edge
    if (toolMode === 'select' && selectedAreaId && !draggingVertex && !draggingPolygon) {
      const selected = areas.find((a) => a.id === selectedAreaId);
      if (selected && !selected.isHidden) {
        let nearestDist = Infinity;
        let nearestGhost: { areaId: string; afterIndex: number; point: GroundTruthPoint } | null = null;

        const poly = selected.polygon;
        const n = poly.length;
        for (let i = 0; i < n; i++) {
          const a = poly[i];
          const b = poly[(i + 1) % n];
          const res = pointToSegmentDistance(pt, a, b);
          const screenDist = res.distance * zoom;
          if (screenDist < 10 && screenDist < nearestDist && res.t > 0.05 && res.t < 0.95) {
            nearestDist = screenDist;
            nearestGhost = {
              areaId: selected.id,
              afterIndex: i,
              point: res.closestPoint,
            };
          }
        }

        setGhostVertex(nearestGhost);
      } else {
        setGhostVertex(null);
      }
    } else {
      setGhostVertex(null);
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingVertex(null);
    setDraggingPolygon(null);
  };

  // Double click closes polygon in draw mode
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (toolMode === 'draw' && drawingPoints.length >= 3) {
      e.stopPropagation();
      onAddPolygon(drawingPoints);
    }
  };

  // Vertex handle size scaled inversely to zoom so it remains comfortable to grab
  const handleRadius = Math.max(3.5, Math.min(10, 6 / zoom));

  return (
    <Box
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        flex: 1,
        height: '100%',
        backgroundColor: '#070a10',
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanning
          ? 'grabbing'
          : toolMode === 'draw'
          ? 'crosshair'
          : draggingVertex || draggingPolygon
          ? 'grabbing'
          : 'default',
      }}
    >
      {/* Blueprint grid background */}
      <Box
        className="canvas-background"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          backgroundImage:
            'radial-gradient(rgba(30, 41, 59, 0.4) 1px, transparent 1px), radial-gradient(rgba(30, 41, 59, 0.2) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <g ref={gRef} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Layer 1: Floorplan Image */}
          {layerVisibility.floorplan && imageUrl && imageWidth > 0 && (
            <image
              href={imageUrl}
              width={imageWidth}
              height={imageHeight}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            />
          )}

          {/* Layer 2: Detector Predictions (dashed) */}
          {layerVisibility.predictions &&
            detectorPredictions.map((pred) => {
              const pts = pred.polygon.map((p) => `${p.xPx},${p.yPx}`).join(' ');
              return (
                <g key={pred.id}>
                  <polygon
                    points={pts}
                    fill="rgba(245, 158, 11, 0.15)"
                    stroke="#f59e0b"
                    strokeWidth={2 / zoom}
                    strokeDasharray={`${6 / zoom},${4 / zoom}`}
                    strokeLinejoin="round"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptPrediction(pred.id);
                    }}
                  />
                </g>
              );
            })}

          {/* Layer 3: Ground Truth Polygons */}
          {layerVisibility.groundTruth &&
            areas.map((area) => {
              if (area.isHidden) return null;
              const isSelected = area.id === selectedAreaId;
              const isHovered = area.id === hoveredAreaId;
              const pts = area.polygon.map((p) => `${p.xPx},${p.yPx}`).join(' ');

              const fillColor = isSelected
                ? 'rgba(14, 165, 233, 0.35)'
                : isHovered
                ? 'rgba(16, 185, 129, 0.35)'
                : 'rgba(16, 185, 129, 0.22)';

              const strokeColor = isSelected ? '#38bdf8' : isHovered ? '#4ade80' : area.color || '#10b981';
              const strokeWidth = (isSelected ? 3 : isHovered ? 2.5 : 2) / zoom;

              return (
                <g key={area.id}>
                  <polygon
                    points={pts}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    style={{
                      cursor: toolMode === 'select' ? (isSelected ? 'move' : 'pointer') : 'crosshair',
                      transition: 'fill 0.12s ease',
                    }}
                    onClick={(e) => {
                      if (toolMode === 'select') {
                        e.stopPropagation();
                        onSelectArea(area.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (toolMode === 'select' && isSelected && e.button === 0) {
                        e.stopPropagation();
                        const pt = screenToImage(e.clientX, e.clientY);
                        setDraggingPolygon({
                          areaId: area.id,
                          startPoint: pt,
                          lastPoint: pt,
                        });
                      }
                    }}
                    onMouseEnter={() => onHoverArea(area.id)}
                    onMouseLeave={() => onHoverArea(null)}
                  />
                </g>
              );
            })}

          {/* Layer 4: Area IDs / Labels */}
          {layerVisibility.ids &&
            areas.map((area) => {
              if (area.isHidden) return null;
              const isSelected = area.id === selectedAreaId;
              const centroid = calculateCentroid(area.polygon);
              const fontSize = Math.max(10, Math.min(22, 14 / zoom));

              return (
                <g key={`label-${area.id}`} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  <text
                    x={centroid.xPx}
                    y={centroid.yPx}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#ffffff' : '#e2e8f0'}
                    fontSize={fontSize}
                    fontWeight={700}
                    fontFamily="'JetBrains Mono', 'Plus Jakarta Sans', monospace"
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: '#0b0f17',
                      strokeWidth: 3 / zoom,
                      strokeLinejoin: 'round',
                    }}
                  >
                    {area.id}
                  </text>
                </g>
              );
            })}

          {/* Layer 5: Vertex Handles (for Selected Area) */}
          {layerVisibility.vertexHandles &&
            toolMode === 'select' &&
            selectedAreaId &&
            (() => {
              const selected = areas.find((a) => a.id === selectedAreaId);
              if (!selected || selected.isHidden) return null;

              return (
                <g key="selected-vertices">
                  {selected.polygon.map((p, vIdx) => (
                    <circle
                      key={`vertex-${selected.id}-${vIdx}`}
                      cx={p.xPx}
                      cy={p.yPx}
                      r={handleRadius}
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth={2.5 / zoom}
                      style={{
                        cursor: 'grab',
                        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (e.button === 0) {
                          setDraggingVertex({
                            areaId: selected.id,
                            vertexIndex: vIdx,
                          });
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteVertex(selected.id, vIdx);
                      }}
                    />
                  ))}
                </g>
              );
            })()}

          {/* Layer 6: Ghost Vertex (for insertion on edge hover) */}
          {ghostVertex && (
            <circle
              cx={ghostVertex.point.xPx}
              cy={ghostVertex.point.yPx}
              r={handleRadius * 0.9}
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth={1.5 / zoom}
              style={{ cursor: 'copy' }}
              onClick={(e) => {
                e.stopPropagation();
                onInsertVertex(ghostVertex.areaId, ghostVertex.afterIndex, ghostVertex.point);
              }}
            />
          )}

          {/* Layer 7: Active Drawing Preview */}
          {toolMode === 'draw' && (
            <g key="drawing-preview">
              {/* Existing lines in current polygon */}
              {drawingPoints.length > 1 && (
                <polyline
                  points={drawingPoints.map((p) => `${p.xPx},${p.yPx}`).join(' ')}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={2.5 / zoom}
                  strokeLinejoin="round"
                />
              )}

              {/* Rubberband line to mouse position */}
              {drawingPoints.length > 0 && mousePixelPos && (
                <line
                  x1={drawingPoints[drawingPoints.length - 1].xPx}
                  y1={drawingPoints[drawingPoints.length - 1].yPx}
                  x2={isSnappedToStart ? drawingPoints[0].xPx : mousePixelPos.xPx}
                  y2={isSnappedToStart ? drawingPoints[0].yPx : mousePixelPos.yPx}
                  stroke="#38bdf8"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${5 / zoom},${3 / zoom}`}
                />
              )}

              {/* Placed vertex dots */}
              {drawingPoints.map((p, idx) => (
                <circle
                  key={`draw-pt-${idx}`}
                  cx={p.xPx}
                  cy={p.yPx}
                  r={idx === 0 && isSnappedToStart ? handleRadius * 1.6 : handleRadius}
                  fill={idx === 0 && isSnappedToStart ? '#38bdf8' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth={2 / zoom}
                  style={{
                    transition: 'r 0.15s ease, fill 0.15s ease',
                  }}
                />
              ))}
            </g>
          )}
        </g>
      </svg>

      {/* Floating Coordinate HUD at Bottom-Left */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #334155',
          borderRadius: 1,
          px: 1.5,
          py: 0.6,
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
          X: <strong style={{ color: '#38bdf8' }}>{mousePixelPos ? mousePixelPos.xPx : 0}</strong> px
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
          Y: <strong style={{ color: '#38bdf8' }}>{mousePixelPos ? mousePixelPos.yPx : 0}</strong> px
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          |
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Zoom: <strong style={{ color: '#4ade80' }}>{Math.round(zoom * 100)}%</strong>
        </Typography>
      </Box>
    </Box>
  );
};
