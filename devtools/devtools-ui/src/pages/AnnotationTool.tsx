import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { useAnnotationTool } from '../hooks/useAnnotationTool';
import { AnnotationToolbar } from '../components/annotation/AnnotationToolbar';
import { FloorplanSidebar } from '../components/annotation/FloorplanSidebar';
import { AnnotationCanvas } from '../components/annotation/AnnotationCanvas';
import { AnnotationAreaList } from '../components/annotation/AnnotationAreaList';
import { ValidationSnackbar } from '../components/annotation/ValidationSnackbar';
import { getFloorplanImageUrl } from '../services/annotationApi';
import { calculateFitTransform } from '../utils/annotationTransform';

interface AnnotationToolProps {
  backendPort?: number;
}

export const AnnotationTool: React.FC<AnnotationToolProps> = ({ backendPort = 8000 }) => {
  const {
    floorplans,
    selectedFilename,
    selectedFloorplan,
    loadingFiles,
    isSaving,
    isDetecting,
    areas,
    selectedAreaId,
    selectedAreaIds,
    hoveredAreaId,
    detectorPredictions,
    toolMode,
    drawingPoints,
    layerVisibility,
    validationErrors,
    toast,
    canUndo,
    canRedo,
    setSelectedFilename,
    setSelectedAreaId,
    setHoveredAreaId,
    setToolMode,
    setDrawingPoints,
    setLayerVisibility,
    setToast,
    toggleSelectAreaId,
    addCompletedPolygon,
    updateAreaVertex,
    insertAreaVertex,
    deleteAreaVertex,
    translateArea,
    deleteArea,
    deleteSelectedAreas,
    mergeSelectedAreas,
    toggleAreaVisibility,
    updateAreaId,
    runDetector,
    usePredictionsAsDraft,
    acceptSinglePrediction,
    clearPredictions,
    saveGroundTruth,
    exportGroundTruth,
    backendPort: activePort,
    setBackendPort,
    selectNextFloorplan,
    selectPrevFloorplan,
    undo,
    redo,
    loadFloorplans,
  } = useAnnotationTool(backendPort);

  // Viewport transform
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Fit image to screen
  const handleFitScreen = useCallback(() => {
    if (!selectedFloorplan || !workspaceRef.current) return;
    const { clientWidth, clientHeight } = workspaceRef.current;
    const fit = calculateFitTransform(
      clientWidth,
      clientHeight,
      selectedFloorplan.imageWidth,
      selectedFloorplan.imageHeight,
      32
    );
    setZoom(fit.zoom);
    setPan({ x: fit.panX, y: fit.panY });
  }, [selectedFloorplan]);

  // Automatically fit on floorplan change
  useEffect(() => {
    if (selectedFloorplan) {
      handleFitScreen();
    }
  }, [selectedFloorplan?.filename]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(25, z * 1.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.02, z / 1.25));
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input / textfield
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Save GT
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveGroundTruth();
        return;
      }

      // Tool modes
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.altKey) {
        setToolMode('draw');
        return;
      }

      if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.altKey) {
        setToolMode('select');
        return;
      }

      // Fit screen
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.altKey) {
        handleFitScreen();
        return;
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAreaId || selectedAreaIds.size > 0) {
          e.preventDefault();
          deleteSelectedAreas();
        }
        return;
      }

      // Finish drawing
      if (e.key === 'Enter') {
        if (toolMode === 'draw' && drawingPoints.length >= 3) {
          addCompletedPolygon(drawingPoints);
        }
        return;
      }

      // Cancel drawing / Deselect
      if (e.key === 'Escape') {
        if (toolMode === 'draw') {
          setDrawingPoints([]);
          setToolMode('select');
        } else {
          setSelectedAreaId(null);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    addCompletedPolygon,
    canRedo,
    canUndo,
    deleteSelectedAreas,
    drawingPoints,
    handleFitScreen,
    redo,
    saveGroundTruth,
    selectedAreaId,
    selectedAreaIds.size,
    setDrawingPoints,
    setSelectedAreaId,
    setToolMode,
    toolMode,
    undo,
  ]);

  const imageUrl = selectedFloorplan
    ? getFloorplanImageUrl(selectedFloorplan.filename, activePort)
    : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#0b0f17',
        color: '#f8fafc',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Annotation Toolbar */}
      <AnnotationToolbar
        selectedFloorplan={selectedFloorplan}
        toolMode={toolMode}
        drawingPointCount={drawingPoints.length}
        selectedAreaCount={selectedAreaId ? 1 : selectedAreaIds.size}
        hasDetectorPredictions={detectorPredictions.length > 0}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        isDetecting={isDetecting}
        zoomLevel={zoom}
        backendPort={activePort}
        onPortChange={setBackendPort}
        onSetToolMode={setToolMode}
        onFinishDrawing={() => addCompletedPolygon(drawingPoints)}
        onCancelDrawing={() => {
          setDrawingPoints([]);
          setToolMode('select');
        }}
        onDeleteSelected={deleteSelectedAreas}
        onMergeSelected={mergeSelectedAreas}
        onUndo={undo}
        onRedo={redo}
        onRunDetector={runDetector}
        onUsePredictionsAsDraft={usePredictionsAsDraft}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitScreen={handleFitScreen}
        onResetZoom={handleResetZoom}
        onSaveGroundTruth={saveGroundTruth}
        onExportGroundTruth={exportGroundTruth}
        onNextFloorplan={selectNextFloorplan}
        onPrevFloorplan={selectPrevFloorplan}
      />

      {/* Main Workspace (Left Sidebar + Center Canvas + Right Area List) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Left: Floorplan Dataset Explorer */}
        <FloorplanSidebar
          floorplans={floorplans}
          selectedFilename={selectedFilename}
          loading={loadingFiles}
          onSelectFloorplan={setSelectedFilename}
          onRefresh={loadFloorplans}
        />

        {/* Center: High-Precision Annotation Canvas */}
        <Box ref={workspaceRef} sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <AnnotationCanvas
            floorplan={selectedFloorplan}
            imageUrl={imageUrl}
            areas={areas}
            selectedAreaId={selectedAreaId}
            hoveredAreaId={hoveredAreaId}
            detectorPredictions={detectorPredictions}
            toolMode={toolMode}
            drawingPoints={drawingPoints}
            layerVisibility={layerVisibility}
            zoom={zoom}
            pan={pan}
            onZoomChange={setZoom}
            onPanChange={setPan}
            onSelectArea={setSelectedAreaId}
            onHoverArea={setHoveredAreaId}
            onAddPolygon={addCompletedPolygon}
            onUpdateVertex={updateAreaVertex}
            onInsertVertex={insertAreaVertex}
            onDeleteVertex={deleteAreaVertex}
            onTranslateArea={translateArea}
            onDrawingPointsChange={setDrawingPoints}
            onAcceptPrediction={acceptSinglePrediction}
          />
        </Box>

        {/* Right: Area List & Visual Overlays Inspector */}
        <AnnotationAreaList
          areas={areas}
          selectedAreaId={selectedAreaId}
          selectedAreaIds={selectedAreaIds}
          hoveredAreaId={hoveredAreaId}
          detectorPredictions={detectorPredictions}
          layerVisibility={layerVisibility}
          onSelectArea={setSelectedAreaId}
          onHoverArea={setHoveredAreaId}
          onToggleSelectArea={toggleSelectAreaId}
          onToggleVisibility={toggleAreaVisibility}
          onDeleteArea={deleteArea}
          onDeleteSelectedAreas={deleteSelectedAreas}
          onMergeSelectedAreas={mergeSelectedAreas}
          onUpdateAreaId={updateAreaId}
          onAcceptPrediction={acceptSinglePrediction}
          onUsePredictionsAsDraft={usePredictionsAsDraft}
          onClearPredictions={clearPredictions}
          onLayerVisibilityChange={setLayerVisibility}
        />
      </Box>

      {/* Floating Validation & Toast Feedback */}
      <ValidationSnackbar
        toast={toast}
        validationErrors={validationErrors}
        onCloseToast={() => setToast(null)}
        onClearValidationErrors={() => {}}
      />
    </Box>
  );
};
