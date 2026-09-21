import React, { useRef } from 'react';
import { Box, Paper } from '@mui/material';
import { useFloorplanDevTools } from '../hooks/useFloorplanDevTools';
import { DevToolsToolbar } from '../components/DevToolsToolbar';
import { FloorplanCanvas } from '../components/FloorplanCanvas';
import { AreaList } from '../components/AreaList';
import { AreaProperties } from '../components/AreaProperties';
import { JsonPreview } from '../components/JsonPreview';

export const FloorplanDevTools: React.FC = () => {
  const {
    imageState,
    areas,
    selectedAreaId,
    hoveredAreaId,
    productionJson,
    showCoordinates,
    isProcessing,
    copyFeedback,
    engineStatus,
    computedStatsMap,
    calculatedTextBoxes,
    detectionMode,
    backendOnline,
    backendPort,
    errorMessage,
    setDetectionMode,
    setBackendPort,
    refreshBackendStatus,
    setSelectedAreaId,
    setHoveredAreaId,
    setShowCoordinates,
    loadMockFloorplan,
    handleImageUpload,
    runDetection,
    resetWorkspace,
    updateAreaName,
    copyJson,
    downloadJson,
  } = useFloorplanDevTools();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedArea = areas.find((a) => a.id === selectedAreaId) || null;
  const selectedStats = selectedAreaId ? computedStatsMap.get(selectedAreaId) : undefined;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0b0f17',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Hidden input trigger for canvas empty click */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />

      {/* Top Application Toolbar */}
      <DevToolsToolbar
        engineStatus={engineStatus}
        isProcessing={isProcessing}
        hasImage={Boolean(imageState.url)}
        isMock={imageState.isMock}
        filename={imageState.filename}
        showCoordinates={showCoordinates}
        onToggleCoordinates={setShowCoordinates}
        onUploadImage={handleImageUpload}
        onLoadMock={loadMockFloorplan}
        onRunDetection={runDetection}
        onReset={resetWorkspace}
        onDownloadJson={downloadJson}
        hasAreas={areas.length > 0}
        detectionMode={detectionMode}
        onDetectionModeChange={setDetectionMode}
        backendOnline={backendOnline}
        backendPort={backendPort}
        onPortChange={setBackendPort}
        onRefreshBackend={refreshBackendStatus}
        errorMessage={errorMessage}
      />

      {/* Main Workspace (Canvas + Side Panels) */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Floorplan Viewport Canvas */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <FloorplanCanvas
            imageState={imageState}
            areas={areas}
            selectedAreaId={selectedAreaId}
            hoveredAreaId={hoveredAreaId}
            showCoordinates={showCoordinates}
            calculatedTextBoxes={calculatedTextBoxes}
            onSelectArea={setSelectedAreaId}
            onHoverArea={setHoveredAreaId}
            onUploadClick={() => fileInputRef.current?.click()}
          />
        </Box>

        {/* Right Engineering Inspector Panel */}
        <Paper
          square
          elevation={4}
          sx={{
            width: 380,
            minWidth: 320,
            maxWidth: 440,
            height: '100%',
            backgroundColor: '#0e1420',
            borderLeft: '1px solid #1f2937',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top Half: Area List */}
          <Box
            sx={{
              flex: '0 0 45%',
              borderBottom: '1px solid #1f2937',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AreaList
              areas={areas}
              selectedAreaId={selectedAreaId}
              hoveredAreaId={hoveredAreaId}
              onSelectArea={setSelectedAreaId}
              onHoverArea={setHoveredAreaId}
            />
          </Box>

          {/* Bottom Half: Area Properties */}
          <Box
            sx={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AreaProperties
              selectedArea={selectedArea}
              stats={selectedStats}
              onUpdateName={updateAreaName}
            />
          </Box>
        </Paper>
      </Box>

      {/* Bottom Production JSON Preview */}
      <JsonPreview
        productionJson={productionJson}
        copyFeedback={copyFeedback}
        onCopyJson={copyJson}
        onDownloadJson={downloadJson}
      />
    </Box>
  );
};
