import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Checkbox,
  Button,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import EditIcon from '@mui/icons-material/Edit';
import LayersIcon from '@mui/icons-material/Layers';
import {
  GroundTruthAreaUi,
  DetectorPrediction,
  LayerVisibility,
} from '../../types/annotation';
import { calculatePolygonArea, calculateCentroid } from '../../utils/annotationGeometry';

interface AnnotationAreaListProps {
  areas: GroundTruthAreaUi[];
  selectedAreaId: string | null;
  selectedAreaIds: Set<string>;
  hoveredAreaId: string | null;
  detectorPredictions: DetectorPrediction[];
  layerVisibility: LayerVisibility;
  onSelectArea: (id: string | null) => void;
  onHoverArea: (id: string | null) => void;
  onToggleSelectArea: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteArea: (id: string) => void;
  onDeleteSelectedAreas: () => void;
  onMergeSelectedAreas: () => void;
  onUpdateAreaId: (oldId: string, newId: string) => void;
  onAcceptPrediction: (predId: string) => void;
  onUsePredictionsAsDraft: () => void;
  onClearPredictions: () => void;
  onLayerVisibilityChange: (layers: LayerVisibility) => void;
}

export const AnnotationAreaList: React.FC<AnnotationAreaListProps> = ({
  areas,
  selectedAreaId,
  selectedAreaIds,
  hoveredAreaId,
  detectorPredictions,
  layerVisibility,
  onSelectArea,
  onHoverArea,
  onToggleSelectArea,
  onToggleVisibility,
  onDeleteArea,
  onDeleteSelectedAreas,
  onMergeSelectedAreas,
  onUpdateAreaId,
  onAcceptPrediction,
  onUsePredictionsAsDraft,
  onClearPredictions,
  onLayerVisibilityChange,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempIdValue, setTempIdValue] = useState<string>('');

  const handleStartRename = (id: string) => {
    setEditingId(id);
    setTempIdValue(id);
  };

  const handleCommitRename = (oldId: string) => {
    if (tempIdValue.trim() && tempIdValue.trim() !== oldId) {
      onUpdateAreaId(oldId, tempIdValue.trim());
    }
    setEditingId(null);
  };

  return (
    <Box
      sx={{
        width: 320,
        height: '100%',
        backgroundColor: '#0e1420',
        borderLeft: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Top Header & Bulk Actions */}
      <Box sx={{ p: 2, borderBottom: '1px solid #1f2937' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f8fafc' }}>
            Areas ({areas.length})
          </Typography>
          {selectedAreaIds.size > 1 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<CallMergeIcon fontSize="small" />}
              onClick={onMergeSelectedAreas}
              sx={{
                fontSize: '0.72rem',
                py: 0.2,
                px: 1,
                color: '#38bdf8',
                borderColor: '#0284c7',
                textTransform: 'none',
                '&:hover': { borderColor: '#38bdf8', backgroundColor: 'rgba(2,132,199,0.1)' },
              }}
            >
              Merge ({selectedAreaIds.size})
            </Button>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Ground Truth room polygons in original pixel space
        </Typography>
      </Box>

      {/* Area List Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {areas.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: '#64748b' }}>
            <Typography variant="body2">No areas drawn yet</Typography>
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#475569' }}>
              Press 'A' to draw a room or click 'Run Detector'
            </Typography>
          </Box>
        ) : (
          areas.map((area) => {
            const isSelected = area.id === selectedAreaId;
            const isHovered = area.id === hoveredAreaId;
            const isChecked = selectedAreaIds.has(area.id);
            const areaSqPx = Math.round(calculatePolygonArea(area.polygon));
            const centroid = calculateCentroid(area.polygon);

            return (
              <Box
                key={area.id}
                onMouseEnter={() => onHoverArea(area.id)}
                onMouseLeave={() => onHoverArea(null)}
                onClick={() => onSelectArea(area.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  mb: 0.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? 'rgba(14, 165, 233, 0.15)'
                    : isHovered
                    ? '#131b2c'
                    : '#090d16',
                  border: isSelected
                    ? '1px solid #0284c7'
                    : isHovered
                    ? '1px solid #334155'
                    : '1px solid #1e293b',
                  opacity: area.isHidden ? 0.45 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Multi-select Checkbox for Merge */}
                <Checkbox
                  size="small"
                  checked={isChecked}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectArea(area.id);
                  }}
                  sx={{
                    p: 0.5,
                    mr: 0.5,
                    color: '#475569',
                    '&.Mui-checked': { color: '#0284c7' },
                  }}
                />

                {/* Color swatch dot */}
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: area.color || '#10b981',
                    mr: 1,
                    flexShrink: 0,
                  }}
                />

                {/* ID & Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {editingId === area.id ? (
                    <TextField
                      size="small"
                      value={tempIdValue}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setTempIdValue(e.target.value)}
                      onBlur={() => handleCommitRename(area.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitRename(area.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: '0.75rem',
                          p: '2px 4px',
                          color: '#fff',
                        },
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          color: isSelected ? '#38bdf8' : '#f8fafc',
                        }}
                      >
                        {area.id}
                      </Typography>
                      <Tooltip title="Rename ID">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(area.id);
                          }}
                          sx={{ p: 0.2, color: '#475569', '&:hover': { color: '#94a3b8' } }}
                        >
                          <EditIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mt: 0.2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                      {area.polygon.length} pts
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                      {areaSqPx.toLocaleString()} px²
                    </Typography>
                  </Box>
                </Box>

                {/* Actions: Hide & Delete */}
                <Tooltip title={area.isHidden ? 'Show Area' : 'Hide Area'}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(area.id);
                    }}
                    sx={{ p: 0.5, color: area.isHidden ? '#64748b' : '#94a3b8' }}
                  >
                    {area.isHidden ? (
                      <VisibilityOffIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <VisibilityIcon sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete Area">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteArea(area.id);
                    }}
                    sx={{ p: 0.5, color: '#64748b', '&:hover': { color: '#ef4444' } }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })
        )}

        {/* Section: Detector Predictions */}
        {detectorPredictions.length > 0 && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #334155' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.78rem' }}>
                Detector Predictions ({detectorPredictions.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button
                  size="small"
                  onClick={onUsePredictionsAsDraft}
                  sx={{ fontSize: '0.65rem', py: 0.1, px: 0.8, color: '#f59e0b', textTransform: 'none' }}
                >
                  Draft All
                </Button>
                <Button
                  size="small"
                  onClick={onClearPredictions}
                  sx={{ fontSize: '0.65rem', py: 0.1, px: 0.8, color: '#64748b', textTransform: 'none' }}
                >
                  Clear
                </Button>
              </Box>
            </Box>

            {detectorPredictions.map((pred) => (
              <Box
                key={pred.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 0.8,
                  mb: 0.5,
                  borderRadius: 1,
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px dashed #f59e0b',
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#fde047' }}>
                    {pred.id} ({pred.polygon.length} vertices)
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 13 }} />}
                  onClick={() => onAcceptPrediction(pred.id)}
                  sx={{
                    fontSize: '0.68rem',
                    py: 0.1,
                    px: 0.8,
                    borderColor: '#f59e0b',
                    color: '#fde047',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#fde047', backgroundColor: 'rgba(245,158,11,0.2)' },
                  }}
                >
                  Accept
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Layer Toggles Section */}
      <Box sx={{ p: 1.5, borderTop: '1px solid #1f2937', backgroundColor: '#090d16' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Visual Overlays
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mt: 0.8 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={layerVisibility.floorplan}
                onChange={(e) =>
                  onLayerVisibilityChange({ ...layerVisibility, floorplan: e.target.checked })
                }
              />
            }
            label={<Typography sx={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Floorplan</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={layerVisibility.groundTruth}
                onChange={(e) =>
                  onLayerVisibilityChange({ ...layerVisibility, groundTruth: e.target.checked })
                }
              />
            }
            label={<Typography sx={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Ground Truth</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={layerVisibility.predictions}
                onChange={(e) =>
                  onLayerVisibilityChange({ ...layerVisibility, predictions: e.target.checked })
                }
              />
            }
            label={<Typography sx={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Predictions</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={layerVisibility.vertexHandles}
                onChange={(e) =>
                  onLayerVisibilityChange({ ...layerVisibility, vertexHandles: e.target.checked })
                }
              />
            }
            label={<Typography sx={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Handles</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={layerVisibility.ids}
                onChange={(e) =>
                  onLayerVisibilityChange({ ...layerVisibility, ids: e.target.checked })
                }
              />
            }
            label={<Typography sx={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Area IDs</Typography>}
          />
        </Box>
      </Box>
    </Box>
  );
};
