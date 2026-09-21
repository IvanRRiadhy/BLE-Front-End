import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import GestureIcon from '@mui/icons-material/Gesture';
import NearMeIcon from '@mui/icons-material/NearMe';
import DeleteIcon from '@mui/icons-material/Delete';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import {
  AnnotationToolMode,
  FloorplanFileItem,
} from '../../types/annotation';

interface AnnotationToolbarProps {
  selectedFloorplan: FloorplanFileItem | null;
  toolMode: AnnotationToolMode;
  drawingPointCount: number;
  selectedAreaCount: number;
  hasDetectorPredictions: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  isDetecting: boolean;
  zoomLevel: number;
  onSetToolMode: (mode: AnnotationToolMode) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  onDeleteSelected: () => void;
  onMergeSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRunDetector: () => void;
  onUsePredictionsAsDraft: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  onResetZoom: () => void;
  backendPort?: number;
  onPortChange?: (port: number) => void;
  onSaveGroundTruth: () => void;
  onExportGroundTruth: () => void;
  onNextFloorplan: () => void;
  onPrevFloorplan: () => void;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  backendPort,
  onPortChange,
  selectedFloorplan,
  toolMode,
  drawingPointCount,
  selectedAreaCount,
  hasDetectorPredictions,
  canUndo,
  canRedo,
  isSaving,
  isDetecting,
  zoomLevel,
  onSetToolMode,
  onFinishDrawing,
  onCancelDrawing,
  onDeleteSelected,
  onMergeSelected,
  onUndo,
  onRedo,
  onRunDetector,
  onUsePredictionsAsDraft,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onResetZoom,
  onSaveGroundTruth,
  onExportGroundTruth,
  onNextFloorplan,
  onPrevFloorplan,
}) => {
  const isDrawing = toolMode === 'draw';

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        backgroundColor: '#111827',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        userSelect: 'none',
      }}
    >
      {/* Left: Navigation & Active Image Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ButtonGroup size="small" variant="outlined" sx={{ borderColor: '#374151' }}>
          <Tooltip title="Previous floorplan">
            <IconButton
              size="small"
              onClick={onPrevFloorplan}
              sx={{ color: '#94a3b8', borderColor: '#374151', borderRadius: '4px 0 0 4px' }}
            >
              <NavigateBeforeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Next floorplan">
            <IconButton
              size="small"
              onClick={onNextFloorplan}
              sx={{ color: '#94a3b8', borderColor: '#374151', borderRadius: '0 4px 4px 0' }}
            >
              <NavigateNextIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        {selectedFloorplan && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>
              {selectedFloorplan.filename}
            </Typography>
            <Chip
              size="small"
              label={`${selectedFloorplan.imageWidth} × ${selectedFloorplan.imageHeight} px`}
              sx={{
                height: 20,
                fontSize: '0.68rem',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
              }}
            />
            {backendPort && (
              <Tooltip title={`FastAPI Backend Port (Currently :${backendPort}). Click to toggle 9000/8000.`}>
                <Chip
                  size="small"
                  label={`FastAPI: :${backendPort}`}
                  onClick={() => {
                    const next = backendPort === 9000 ? 8000 : 9000;
                    if (onPortChange) onPortChange(next);
                  }}
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    backgroundColor: '#064e3b',
                    color: '#a7f3d0',
                    border: '1px solid #059669',
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: '#047857' },
                  }}
                />
              </Tooltip>
            )}
            {selectedFloorplan.status === 'Annotated' && (
              <Chip
                size="small"
                icon={<CheckCircleIcon style={{ fontSize: 13, color: '#34d399' }} />}
                label="Annotated"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  backgroundColor: '#064e3b',
                  color: '#a7f3d0',
                  border: '1px solid #059669',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Middle: Tool Selection & Drawing Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {/* Undo / Redo */}
        <ButtonGroup size="small" variant="outlined">
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton
                size="small"
                onClick={onUndo}
                disabled={!canUndo}
                sx={{ color: canUndo ? '#94a3b8' : '#475569' }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
            <span>
              <IconButton
                size="small"
                onClick={onRedo}
                disabled={!canRedo}
                sx={{ color: canRedo ? '#94a3b8' : '#475569' }}
              >
                <RedoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ borderColor: '#1f2937', my: 0.5 }} />

        {/* Mode Selector */}
        <ButtonGroup size="small">
          <Button
            variant={toolMode === 'select' ? 'contained' : 'outlined'}
            startIcon={<NearMeIcon fontSize="small" />}
            onClick={() => onSetToolMode('select')}
            sx={{
              fontSize: '0.78rem',
              textTransform: 'none',
              backgroundColor: toolMode === 'select' ? '#0284c7' : 'transparent',
              color: toolMode === 'select' ? '#fff' : '#94a3b8',
              borderColor: '#334155',
              '&:hover': { backgroundColor: toolMode === 'select' ? '#0369a1' : '#1e293b' },
            }}
          >
            Select / Edit (E)
          </Button>
          <Button
            variant={toolMode === 'draw' ? 'contained' : 'outlined'}
            startIcon={<GestureIcon fontSize="small" />}
            onClick={() => onSetToolMode('draw')}
            sx={{
              fontSize: '0.78rem',
              textTransform: 'none',
              backgroundColor: toolMode === 'draw' ? '#10b981' : 'transparent',
              color: toolMode === 'draw' ? '#fff' : '#94a3b8',
              borderColor: '#334155',
              '&:hover': { backgroundColor: toolMode === 'draw' ? '#059669' : '#1e293b' },
            }}
          >
            Draw Area (A)
          </Button>
        </ButtonGroup>

        {/* Active Drawing Actions */}
        {isDrawing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: 0.5 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={drawingPointCount < 3}
              startIcon={<CheckCircleIcon fontSize="small" />}
              onClick={onFinishDrawing}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Finish Area ({drawingPointCount} pts)
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<CancelIcon fontSize="small" />}
              onClick={onCancelDrawing}
              sx={{ fontSize: '0.75rem', textTransform: 'none', borderColor: '#475569', color: '#94a3b8' }}
            >
              Cancel (Esc)
            </Button>
          </Box>
        )}

        {/* Delete Area */}
        {selectedAreaCount > 0 && !isDrawing && (
          <Tooltip title="Delete selected polygon (Delete / Backspace)">
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon fontSize="small" />}
              onClick={onDeleteSelected}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Delete
            </Button>
          </Tooltip>
        )}

        <Divider orientation="vertical" flexItem sx={{ borderColor: '#1f2937', my: 0.5 }} />

        {/* Detector Assistant */}
        <Tooltip title="Run existing OpenCV detector to discover candidate rooms">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={
                isDetecting ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <SmartToyIcon fontSize="small" />
                )
              }
              onClick={onRunDetector}
              disabled={isDetecting}
              sx={{
                fontSize: '0.78rem',
                textTransform: 'none',
                borderColor: '#f59e0b',
                color: '#fde047',
                '&:hover': { borderColor: '#fde047', backgroundColor: 'rgba(245,158,11,0.1)' },
              }}
            >
              {isDetecting ? 'Running Detector...' : 'Run Current Detector'}
            </Button>
          </span>
        </Tooltip>

        {hasDetectorPredictions && (
          <Tooltip title="Convert all detector candidate polygons into draft GT polygons">
            <Button
              size="small"
              variant="outlined"
              onClick={onUsePredictionsAsDraft}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                borderColor: '#eab308',
                color: '#fef08a',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                '&:hover': { backgroundColor: 'rgba(234, 179, 8, 0.2)' },
              }}
            >
              Use Predictions as Draft
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Right: Zoom & Save Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Zoom Controls */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1e293b',
            borderRadius: 1,
            px: 0.5,
            border: '1px solid #334155',
          }}
        >
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={onZoomOut} sx={{ color: '#94a3b8', p: 0.5 }}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography
            variant="caption"
            sx={{
              px: 0.8,
              minWidth: 46,
              textAlign: 'center',
              fontWeight: 700,
              color: '#38bdf8',
              fontSize: '0.75rem',
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </Typography>
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={onZoomIn} sx={{ color: '#94a3b8', p: 0.5 }}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit to Screen (F)">
            <IconButton size="small" onClick={onFitScreen} sx={{ color: '#94a3b8', p: 0.5 }}>
              <FitScreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Zoom (100%)">
            <IconButton size="small" onClick={onResetZoom} sx={{ color: '#94a3b8', p: 0.5 }}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Export GT JSON */}
        <Tooltip title="Export ground-truth JSON directly as download">
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon fontSize="small" />}
            onClick={onExportGroundTruth}
            sx={{
              fontSize: '0.78rem',
              textTransform: 'none',
              borderColor: '#374151',
              color: '#cbd5e1',
              '&:hover': { borderColor: '#4b5563', backgroundColor: '#1f2937' },
            }}
          >
            Export GT
          </Button>
        </Tooltip>

        {/* Save GT */}
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={
            isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon fontSize="small" />
          }
          onClick={onSaveGroundTruth}
          disabled={isSaving}
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'none',
            px: 2,
            backgroundColor: '#0284c7',
            '&:hover': { backgroundColor: '#0369a1' },
          }}
        >
          {isSaving ? 'Saving...' : 'Save GT'}
        </Button>
      </Box>
    </Box>
  );
};
