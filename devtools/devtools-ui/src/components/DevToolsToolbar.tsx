import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  InputBase,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import DownloadIcon from '@mui/icons-material/Download';
import LayersIcon from '@mui/icons-material/Layers';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { EngineStatusInfo } from '../types/ui';
import { DetectionMode } from '../hooks/useFloorplanDevTools';

interface DevToolsToolbarProps {
  engineStatus: EngineStatusInfo;
  isProcessing: boolean;
  hasImage: boolean;
  isMock: boolean;
  filename: string;
  showCoordinates: boolean;
  onToggleCoordinates: (show: boolean) => void;
  onUploadImage: (file: File) => void;
  onLoadMock: () => void;
  onRunDetection: () => void;
  onReset: () => void;
  onDownloadJson: () => void;
  hasAreas: boolean;
  detectionMode: DetectionMode;
  onDetectionModeChange: (mode: DetectionMode) => void;
  backendOnline: boolean | null;
  backendPort: number;
  onPortChange: (port: number) => void;
  onRefreshBackend: () => void;
  errorMessage?: string | null;
}

export const DevToolsToolbar: React.FC<DevToolsToolbarProps> = ({
  engineStatus,
  isProcessing,
  hasImage,
  isMock,
  filename,
  showCoordinates,
  onToggleCoordinates,
  onUploadImage,
  onLoadMock,
  onRunDetection,
  onReset,
  onDownloadJson,
  hasAreas,
  detectionMode,
  onDetectionModeChange,
  backendOnline,
  backendPort,
  onPortChange,
  onRefreshBackend,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputPort, setInputPort] = useState<string>(String(backendPort));

  useEffect(() => {
    setInputPort(String(backendPort));
  }, [backendPort]);

  const handlePortSubmit = () => {
    const p = parseInt(inputPort, 10);
    if (!isNaN(p) && p > 0 && p <= 65535) {
      if (p !== backendPort) {
        onPortChange(p);
      }
    } else {
      setInputPort(String(backendPort));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
      // Reset value so re-uploading the same file works
      e.target.value = '';
    }
  };

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: DetectionMode | null
  ) => {
    if (newMode !== null) {
      onDetectionModeChange(newMode);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.2,
          backgroundColor: '#111827',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Brand & Module Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 1,
              backgroundColor: '#064e3b',
              color: '#10b981',
              border: '1px solid #059669',
            }}
          >
            <ArchitectureIcon fontSize="small" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f9fafb', letterSpacing: 0.5 }}>
                BIONIC
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
                Floorplan DevTools
              </Typography>
            </Box>
            {hasImage && (
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.72rem' }}>
                {isMock ? 'Mock CAD Blueprint' : filename}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Engine Mode Toggle, Port Input & Backend Health Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Mode Selector */}
          <ToggleButtonGroup
            size="small"
            value={detectionMode}
            exclusive
            onChange={handleModeChange}
            sx={{
              backgroundColor: '#1e293b',
              borderRadius: 1,
              border: '1px solid #334155',
              height: 28,
              '& .MuiToggleButton-root': {
                color: '#94a3b8',
                border: 'none',
                px: 1.2,
                py: 0,
                fontSize: '0.72rem',
                fontWeight: 600,
                textTransform: 'none',
                '&.Mui-selected': {
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#0369a1',
                  },
                },
              },
            }}
          >
            <ToggleButton value="mock">Mock Engine</ToggleButton>
            <ToggleButton value="python-cv">Python CV (FastAPI)</ToggleButton>
          </ToggleButtonGroup>

          {/* Configurable Port Input */}
          <Tooltip title="FastAPI Port (Press Enter or click outside to switch port)">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                backgroundColor: '#1e293b',
                px: 1,
                borderRadius: 1,
                border: '1px solid #334155',
                height: 26,
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, userSelect: 'none' }}>
                Port:
              </Typography>
              <InputBase
                value={inputPort}
                onChange={(e) => setInputPort(e.target.value)}
                onBlur={handlePortSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePortSubmit();
                }}
                placeholder="8000"
                type="number"
                inputProps={{
                  min: 1024,
                  max: 65535,
                  style: {
                    width: 48,
                    fontSize: '0.75rem',
                    padding: 0,
                    color: '#38bdf8',
                    fontWeight: 700,
                    textAlign: 'center',
                  },
                }}
              />
            </Box>
          </Tooltip>

          {/* Live FastAPI Backend Status Chip */}
          <Tooltip
            title={
              backendOnline
                ? `FastAPI Python CV Backend (: ${backendPort}) is online and connected`
                : `FastAPI (: ${backendPort}) is offline. Click to retry or change port.`
            }
          >
            <Chip
              size="small"
              icon={
                backendOnline ? (
                  <CheckCircleIcon style={{ color: '#34d399', fontSize: '14px' }} />
                ) : (
                  <ErrorOutlineIcon style={{ color: '#f87171', fontSize: '14px' }} />
                )
              }
              label={
                backendOnline === null
                  ? 'FastAPI: Checking...'
                  : backendOnline
                  ? `FastAPI: Online (:${backendPort})`
                  : `FastAPI: Offline (:${backendPort})`
              }
              onClick={backendOnline ? undefined : onRefreshBackend}
              sx={{
                backgroundColor: backendOnline ? '#064e3b' : '#450a0a',
                color: backendOnline ? '#a7f3d0' : '#fca5a5',
                border: `1px solid ${backendOnline ? '#059669' : '#991b1b'}`,
                fontSize: '0.72rem',
                fontWeight: 600,
                height: 26,
                cursor: backendOnline ? 'default' : 'pointer',
              }}
            />
          </Tooltip>

          {/* Engine Status Indicators */}
          <Tooltip title="Detection Subsystem Status">
            <Chip
              size="small"
              label={isProcessing ? 'Processing' : engineStatus.engine}
              sx={{
                backgroundColor: isProcessing ? '#854d0e' : '#1e293b',
                color: isProcessing ? '#fde047' : '#38bdf8',
                fontSize: '0.72rem',
                fontWeight: 600,
                height: 26,
                border: '1px solid #334155',
              }}
            />
          </Tooltip>

          <Tooltip title="BIONIC Serializer Status">
            <Chip
              size="small"
              label="Serializer: Ready"
              sx={{
                backgroundColor: '#1e293b',
                color: '#4ade80',
                fontSize: '0.72rem',
                fontWeight: 600,
                height: 26,
                border: '1px solid #334155',
              }}
            />
          </Tooltip>
        </Box>

        {/* Toolbar Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Upload Button */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              borderColor: '#374151',
              color: '#d1d5db',
              textTransform: 'none',
              fontSize: '0.8rem',
              '&:hover': { borderColor: '#4b5563', backgroundColor: '#1f2937' },
            }}
          >
            Upload Image
          </Button>

          {/* Load Mock Floorplan */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<LayersIcon />}
            onClick={onLoadMock}
            sx={{
              borderColor: '#0284c7',
              color: '#38bdf8',
              textTransform: 'none',
              fontSize: '0.8rem',
              '&:hover': { borderColor: '#38bdf8', backgroundColor: 'rgba(2, 132, 199, 0.1)' },
            }}
          >
            Load Mock
          </Button>

          {/* Run Detection */}
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            disabled={!hasImage || isProcessing || (detectionMode === 'python-cv' && backendOnline === false)}
            onClick={onRunDetection}
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#0284c7',
              '&:hover': { backgroundColor: '#0369a1' },
            }}
          >
            {isProcessing
              ? 'Detecting...'
              : detectionMode === 'python-cv'
              ? 'Detect (Python CV)'
              : 'Detect (Mock)'}
          </Button>

          {/* Coordinate Debug Switch */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showCoordinates}
                onChange={(e) => onToggleCoordinates(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#38bdf8' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#0284c7' },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: '#9ca3af', userSelect: 'none', fontSize: '0.78rem' }}>
                Show Coordinates
              </Typography>
            }
            sx={{ ml: 0.5, mr: 0 }}
          />

          {/* Download JSON Button */}
          <Tooltip title="Download BIONIC floorplan-areas.json">
            <span>
              <IconButton
                size="small"
                disabled={!hasAreas}
                onClick={onDownloadJson}
                sx={{
                  color: '#10b981',
                  border: '1px solid #065f46',
                  borderRadius: 1,
                  p: 0.7,
                  '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                  '&.Mui-disabled': { color: '#4b5563', borderColor: '#374151' },
                }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {/* Reset Button */}
          <Tooltip title="Reset Workspace">
            <IconButton
              size="small"
              onClick={onReset}
              sx={{
                color: '#9ca3af',
                border: '1px solid #374151',
                borderRadius: 1,
                p: 0.7,
                '&:hover': { color: '#ef4444', borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Message Banner */}
      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            py: 0.5,
            px: 2.5,
            fontSize: '0.8rem',
            backgroundColor: '#450a0a',
            color: '#fca5a5',
            '& .MuiAlert-icon': { color: '#ef4444' },
          }}
        >
          {errorMessage}
        </Alert>
      )}
    </Box>
  );
};
