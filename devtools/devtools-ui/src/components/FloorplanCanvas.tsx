import React from 'react';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DetectedArea } from 'devtools-floorplan-detection';
import { FloorplanImageState } from '../types/ui';

interface FloorplanCanvasProps {
  imageState: FloorplanImageState;
  areas: DetectedArea[];
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  showCoordinates: boolean;
  calculatedTextBoxes: Map<
    string,
    {
      areaNameTextBox: { posX: number; posY: number; fontSize: number; fontColor: string };
      occupancyNameTextBox: { posX: number; posY: number; fontSize: number; fontColor: string };
    }
  >;
  onSelectArea: (id: string | null) => void;
  onHoverArea: (id: string | null) => void;
  onUploadClick: () => void;
}

export const FloorplanCanvas: React.FC<FloorplanCanvasProps> = ({
  imageState,
  areas,
  selectedAreaId,
  hoveredAreaId,
  showCoordinates,
  calculatedTextBoxes,
  onSelectArea,
  onHoverArea,
  onUploadClick,
}) => {
  const { url, dimensions } = imageState;
  const hasImage = Boolean(url && dimensions.width > 0 && dimensions.height > 0);

  if (!hasImage) {
    return (
      <Box
        sx={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b0f17',
          border: '2px dashed #1f2937',
          borderRadius: 2,
          m: 2,
          cursor: 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
          '&:hover': {
            borderColor: '#38bdf8',
            backgroundColor: '#0f172a',
          },
        }}
        onClick={onUploadClick}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: '#64748b', mb: 1.5 }} />
        <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
          No Floorplan Loaded
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
          Click to upload an architectural floorplan (PNG, JPG, WEBP) or click "Load Mock"
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#070a10',
        overflow: 'hidden',
        p: 2,
      }}
      onClick={(e) => {
        // Deselect if clicking on empty workspace background
        if (e.target === e.currentTarget) {
          onSelectArea(null);
        }
      }}
    >
      {/* Container maintaining original image aspect ratio */}
      <Box
        sx={{
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: `${dimensions.width} / ${dimensions.height}`,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
          border: '1px solid #1e293b',
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: '#0e131d',
        }}
      >
        {/* Floorplan Image Background */}
        <img
          src={url!}
          alt="Floorplan Viewport"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        {/* Synchronized Vector Overlay in Original Pixel Coordinate Space */}
        <svg
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Render Area Polygons */}
          {areas.map((area) => {
            const isSelected = area.id === selectedAreaId;
            const isHovered = area.id === hoveredAreaId;
            const pointsString = area.polygon.map((p) => `${p.xPx},${p.yPx}`).join(' ');

            // Color scheme based on selection & BIONIC specifications
            const fillColor = isSelected
              ? 'rgba(14, 165, 233, 0.4)'
              : isHovered
              ? 'rgba(34, 139, 34, 0.42)'
              : 'rgba(34, 139, 34, 0.25)';

            const strokeColor = isSelected ? '#38bdf8' : isHovered ? '#4ade80' : '#228B22';
            const strokeWidth = isSelected ? 3 : isHovered ? 2.5 : 2;

            return (
              <g key={area.id}>
                {/* Polygon Boundary */}
                <polygon
                  points={pointsString}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  style={{
                    cursor: 'pointer',
                    transition: 'fill 0.15s ease, stroke 0.15s ease',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectArea(area.id);
                  }}
                  onMouseEnter={() => onHoverArea(area.id)}
                  onMouseLeave={() => onHoverArea(null)}
                />
              </g>
            );
          })}

          {/* Render Visual Center Text Boxes (from textBoxCalculator) */}
          {areas.map((area) => {
            const isSelected = area.id === selectedAreaId;
            const textBoxes = calculatedTextBoxes.get(area.id);
            if (!textBoxes) return null;

            const { areaNameTextBox, occupancyNameTextBox } = textBoxes;

            return (
              <g
                key={`label-${area.id}`}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {/* Visual Center Indicator Dot */}
                <circle
                  cx={areaNameTextBox.posX}
                  cy={areaNameTextBox.posY}
                  r={isSelected ? 4.5 : 3.5}
                  fill={isSelected ? '#38bdf8' : '#22c55e'}
                  stroke="#ffffff"
                  strokeWidth={1.2}
                />

                {/* Area Name Box (Computed Visual Center Position) */}
                <text
                  x={areaNameTextBox.posX}
                  y={areaNameTextBox.posY - 8}
                  textAnchor="middle"
                  fill={isSelected ? '#f0f9ff' : '#dcfce7'}
                  fontSize={areaNameTextBox.fontSize}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight={700}
                  style={{
                    paintOrder: 'stroke fill',
                    stroke: '#0b0f17',
                    strokeWidth: 3,
                    strokeLinejoin: 'round',
                  }}
                >
                  {area.name || 'Unnamed'}
                </text>

                {/* Occupancy Name Box (Positioned below Area Name) */}
                <text
                  x={occupancyNameTextBox.posX}
                  y={occupancyNameTextBox.posY}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={occupancyNameTextBox.fontSize}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={500}
                  style={{
                    paintOrder: 'stroke fill',
                    stroke: '#0b0f17',
                    strokeWidth: 2.5,
                    strokeLinejoin: 'round',
                  }}
                >
                  Occupancy: 0
                </text>
              </g>
            );
          })}

          {/* Coordinate Debug Overlay (Visible when Show Coordinates is toggled) */}
          {showCoordinates &&
            areas.map((area) => (
              <g key={`debug-${area.id}`}>
                {area.polygon.map((p, vIdx) => {
                  const isSelected = area.id === selectedAreaId;
                  return (
                    <g key={`vertex-${area.id}-${vIdx}`}>
                      {/* Vertex Dot */}
                      <circle
                        cx={p.xPx}
                        cy={p.yPx}
                        r={isSelected ? 4 : 3}
                        fill={isSelected ? '#f59e0b' : '#38bdf8'}
                        stroke="#0f172a"
                        strokeWidth={1.5}
                      />

                      {/* Vertex Coordinate Label */}
                      <text
                        x={p.xPx + 6}
                        y={p.yPx - 6}
                        fill="#cbd5e1"
                        fontSize={10}
                        fontFamily="'JetBrains Mono', monospace"
                        fontWeight={500}
                        style={{
                          paintOrder: 'stroke fill',
                          stroke: '#0f172a',
                          strokeWidth: 2,
                        }}
                      >
                        {`v${vIdx}: (${Math.round(p.xPx)}, ${Math.round(p.yPx)})`}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}
        </svg>
      </Box>
    </Box>
  );
};
