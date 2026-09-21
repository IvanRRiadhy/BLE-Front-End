import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FloorplanFileItem,
  GroundTruthAreaUi,
  GroundTruthPoint,
  GroundTruthJson,
  DetectorPrediction,
  AnnotationToolMode,
  LayerVisibility,
  ValidationError,
} from '../types/annotation';
import { useAnnotationHistory } from './useAnnotationHistory';
import {
  fetchFloorplanDataset,
  fetchGroundTruth,
  saveGroundTruth as saveGtApi,
  runDetectorOnFloorplan,
  exportGroundTruthFile,
} from '../services/annotationApi';
import { validateAllGroundTruthAreas } from '../utils/annotationValidation';
import { mergeTwoPolygons, getAreaColor } from '../utils/annotationGeometry';

import { checkBackendHealth, getApiBaseUrl } from '../services/detectorApi';

export function useAnnotationTool(initialPort?: number) {
  const [backendPort, setBackendPortState] = useState<number>(() => {
    if (initialPort) return initialPort;
    try {
      const saved = localStorage.getItem('bionic_detector_port');
      return saved ? parseInt(saved, 10) || 9000 : 9000;
    } catch {
      return 9000;
    }
  });

  const setBackendPort = useCallback((port: number) => {
    setBackendPortState(port);
    try {
      localStorage.setItem('bionic_detector_port', String(port));
    } catch {}
  }, []);

  useEffect(() => {
    async function detectPort() {
      try {
        const is9000 = await checkBackendHealth(getApiBaseUrl(9000));
        if (is9000) {
          setBackendPort(9000);
          return;
        }
        const is8000 = await checkBackendHealth(getApiBaseUrl(8000));
        if (is8000) {
          setBackendPort(8000);
        }
      } catch {}
    }
    detectPort();
  }, [setBackendPort]);

  const [floorplans, setFloorplans] = useState<FloorplanFileItem[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Selected floorplan item
  const selectedFloorplan = useMemo(
    () => floorplans.find((f) => f.filename === selectedFilename) || null,
    [floorplans, selectedFilename]
  );

  // Areas state managed by history
  const {
    areas,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useAnnotationHistory([]);

  // Selection state
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);

  // Predictions
  const [detectorPredictions, setDetectorPredictions] = useState<DetectorPrediction[]>([]);

  // Tool Mode & Drawing
  const [toolMode, setToolMode] = useState<AnnotationToolMode>('select');
  const [drawingPoints, setDrawingPoints] = useState<GroundTruthPoint[]>([]);
  const [activeMousePos, setActiveMousePos] = useState<GroundTruthPoint | null>(null);

  // Layer Visibility
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    floorplan: true,
    groundTruth: true,
    predictions: true,
    vertexHandles: true,
    ids: true,
  });

  // Validation & Notifications
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [toast, setToast] = useState<{
    text: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  const showToast = useCallback(
    (text: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      setToast({ text, severity });
    },
    []
  );

  // Load dataset file list
  const loadFloorplans = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const list = await fetchFloorplanDataset(backendPort);
      setFloorplans(list);
      if (list.length > 0 && !selectedFilename) {
        setSelectedFilename(list[0].filename);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load floorplans', 'error');
    } finally {
      setLoadingFiles(false);
    }
  }, [backendPort, selectedFilename, showToast]);

  useEffect(() => {
    loadFloorplans();
  }, [backendPort]);

  // Load Ground Truth for active floorplan
  const loadFloorplanDetails = useCallback(
    async (file: FloorplanFileItem) => {
      setLoadingDetails(true);
      setSelectedAreaId(null);
      setSelectedAreaIds(new Set());
      setDetectorPredictions([]);
      setDrawingPoints([]);
      setValidationErrors([]);

      try {
        const gt = await fetchGroundTruth(file.filename, backendPort);
        if (gt && Array.isArray(gt.areas) && gt.areas.length > 0) {
          const loadedAreas: GroundTruthAreaUi[] = gt.areas.map((a, idx) => ({
            id: a.id || `gt_${String(idx + 1).padStart(3, '0')}`,
            label: a.label || 'room',
            polygon: a.polygon.map((p) => ({
              xPx: Math.round(p.xPx),
              yPx: Math.round(p.yPx),
            })),
            color: getAreaColor(idx),
            isHidden: false,
          }));
          resetHistory(loadedAreas);
        } else {
          resetHistory([]);
        }
      } catch (err: any) {
        resetHistory([]);
      } finally {
        setLoadingDetails(false);
      }
    },
    [backendPort, resetHistory]
  );

  // Trigger loading when selected file changes
  useEffect(() => {
    if (selectedFloorplan) {
      loadFloorplanDetails(selectedFloorplan);
    }
  }, [selectedFilename]);

  // Generate next sequential Area ID
  const getNextAreaId = useCallback(
    (existingAreas: GroundTruthAreaUi[]): string => {
      let maxNum = 0;
      for (const a of existingAreas) {
        const match = a.id.match(/^gt_(\d+)$/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      return `gt_${String(maxNum + 1).padStart(3, '0')}`;
    },
    []
  );

  // Add new completed polygon
  const addCompletedPolygon = useCallback(
    (polygon: GroundTruthPoint[], label = 'room') => {
      if (polygon.length < 3) return;

      const newId = getNextAreaId(areas);
      const newArea: GroundTruthAreaUi = {
        id: newId,
        label,
        polygon: polygon.map((p) => ({ xPx: Math.round(p.xPx), yPx: Math.round(p.yPx) })),
        color: getAreaColor(areas.length),
        isHidden: false,
      };

      const nextAreas = [...areas, newArea];
      pushState(nextAreas);
      setSelectedAreaId(newId);
      setToolMode('select');
      setDrawingPoints([]);
      showToast(`Area ${newId} created.`, 'success');
    },
    [areas, getNextAreaId, pushState, showToast]
  );

  // Update vertex position
  const updateAreaVertex = useCallback(
    (areaId: string, vertexIndex: number, newPoint: GroundTruthPoint) => {
      const nextAreas = areas.map((a) => {
        if (a.id !== areaId) return a;
        const newPoly = [...a.polygon];
        newPoly[vertexIndex] = {
          xPx: Math.round(newPoint.xPx),
          yPx: Math.round(newPoint.yPx),
        };
        return { ...a, polygon: newPoly };
      });
      pushState(nextAreas);
    },
    [areas, pushState]
  );

  // Insert vertex on edge
  const insertAreaVertex = useCallback(
    (areaId: string, afterIndex: number, point: GroundTruthPoint) => {
      const nextAreas = areas.map((a) => {
        if (a.id !== areaId) return a;
        const newPoly = [...a.polygon];
        newPoly.splice(afterIndex + 1, 0, {
          xPx: Math.round(point.xPx),
          yPx: Math.round(point.yPx),
        });
        return { ...a, polygon: newPoly };
      });
      pushState(nextAreas);
      showToast(`Vertex added to ${areaId}.`, 'info');
    },
    [areas, pushState, showToast]
  );

  // Delete vertex
  const deleteAreaVertex = useCallback(
    (areaId: string, vertexIndex: number) => {
      const target = areas.find((a) => a.id === areaId);
      if (!target) return;
      if (target.polygon.length <= 3) {
        showToast('Cannot delete vertex: a polygon must have at least 3 vertices.', 'warning');
        return;
      }

      const nextAreas = areas.map((a) => {
        if (a.id !== areaId) return a;
        const newPoly = a.polygon.filter((_, idx) => idx !== vertexIndex);
        return { ...a, polygon: newPoly };
      });
      pushState(nextAreas);
      showToast(`Vertex removed from ${areaId}.`, 'info');
    },
    [areas, pushState, showToast]
  );

  // Translate entire polygon
  const translateArea = useCallback(
    (areaId: string, dx: number, dy: number) => {
      if (dx === 0 && dy === 0) return;
      const nextAreas = areas.map((a) => {
        if (a.id !== areaId) return a;
        const newPoly = a.polygon.map((p) => ({
          xPx: Math.round(p.xPx + dx),
          yPx: Math.round(p.yPx + dy),
        }));
        return { ...a, polygon: newPoly };
      });
      pushState(nextAreas);
    },
    [areas, pushState]
  );

  // Delete single area
  const deleteArea = useCallback(
    (areaId: string) => {
      const nextAreas = areas.filter((a) => a.id !== areaId);
      pushState(nextAreas);
      if (selectedAreaId === areaId) setSelectedAreaId(null);
      setSelectedAreaIds((prev) => {
        const copy = new Set(prev);
        copy.delete(areaId);
        return copy;
      });
      showToast(`Area ${areaId} deleted.`, 'info');
    },
    [areas, pushState, selectedAreaId, showToast]
  );

  // Delete selected areas
  const deleteSelectedAreas = useCallback(() => {
    const toDelete = new Set(selectedAreaIds);
    if (selectedAreaId) toDelete.add(selectedAreaId);
    if (toDelete.size === 0) return;

    const nextAreas = areas.filter((a) => !toDelete.has(a.id));
    pushState(nextAreas);
    setSelectedAreaId(null);
    setSelectedAreaIds(new Set());
    showToast(`Deleted ${toDelete.size} area(s).`, 'info');
  }, [areas, pushState, selectedAreaId, selectedAreaIds, showToast]);

  // Merge selected areas
  const mergeSelectedAreas = useCallback(() => {
    const ids = Array.from(selectedAreaIds);
    if (ids.length < 2) {
      showToast('Select at least 2 areas using checkboxes to merge.', 'warning');
      return;
    }

    const selectedList = areas.filter((a) => ids.includes(a.id));
    let mergedPoly = selectedList[0].polygon;
    for (let i = 1; i < selectedList.length; i++) {
      mergedPoly = mergeTwoPolygons(mergedPoly, selectedList[i].polygon);
    }

    const newId = selectedList[0].id;
    const remaining = areas.filter((a) => !ids.includes(a.id));
    const mergedArea: GroundTruthAreaUi = {
      id: newId,
      label: 'room',
      polygon: mergedPoly,
      color: selectedList[0].color || getAreaColor(0),
      isHidden: false,
    };

    const nextAreas = [...remaining, mergedArea];
    pushState(nextAreas);
    setSelectedAreaId(newId);
    setSelectedAreaIds(new Set());
    showToast(`Merged ${ids.length} areas into ${newId}.`, 'success');
  }, [areas, pushState, selectedAreaIds, showToast]);

  // Toggle area visibility
  const toggleAreaVisibility = useCallback(
    (areaId: string) => {
      const nextAreas = areas.map((a) =>
        a.id === areaId ? { ...a, isHidden: !a.isHidden } : a
      );
      pushState(nextAreas);
    },
    [areas, pushState]
  );

  // Update area label or ID
  const updateAreaLabel = useCallback(
    (areaId: string, label: string) => {
      const nextAreas = areas.map((a) => (a.id === areaId ? { ...a, label } : a));
      pushState(nextAreas);
    },
    [areas, pushState]
  );

  const updateAreaId = useCallback(
    (oldId: string, newId: string) => {
      const trimmed = newId.trim();
      if (!trimmed || trimmed === oldId) return;
      if (areas.some((a) => a.id === trimmed)) {
        showToast(`Area ID "${trimmed}" already exists.`, 'error');
        return;
      }
      const nextAreas = areas.map((a) => (a.id === oldId ? { ...a, id: trimmed } : a));
      pushState(nextAreas);
      if (selectedAreaId === oldId) setSelectedAreaId(trimmed);
      showToast(`Renamed ${oldId} to ${trimmed}.`, 'info');
    },
    [areas, pushState, selectedAreaId, showToast]
  );

  // Multi-select toggle
  const toggleSelectAreaId = useCallback((areaId: string) => {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  }, []);

  // Run Detector
  const runDetector = useCallback(async () => {
    if (!selectedFloorplan) return;
    setIsDetecting(true);
    try {
      const preds = await runDetectorOnFloorplan(selectedFloorplan.filename, backendPort);
      setDetectorPredictions(preds);
      if (preds.length === 0) {
        showToast('Detector ran but found 0 enclosed rooms for this floorplan.', 'info');
      } else {
        showToast(`Detector found ${preds.length} candidate rooms.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Detector execution failed', 'error');
    } finally {
      setIsDetecting(false);
    }
  }, [backendPort, selectedFloorplan, showToast]);

  // Convert all detector predictions into draft GT areas
  const usePredictionsAsDraft = useCallback(() => {
    if (detectorPredictions.length === 0) {
      showToast('No detector predictions available to draft.', 'warning');
      return;
    }

    let currentAreasCopy = [...areas];
    const newAreas: GroundTruthAreaUi[] = detectorPredictions.map((pred, idx) => {
      const id = `gt_${String(currentAreasCopy.length + idx + 1).padStart(3, '0')}`;
      return {
        id,
        label: 'room',
        polygon: pred.polygon,
        color: getAreaColor(currentAreasCopy.length + idx),
        isHidden: false,
      };
    });

    const nextAreas = [...currentAreasCopy, ...newAreas];
    pushState(nextAreas);
    setDetectorPredictions([]);
    showToast(`Converted ${newAreas.length} detector predictions into draft GT.`, 'success');
  }, [areas, detectorPredictions, pushState, showToast]);

  // Convert a single prediction to GT
  const acceptSinglePrediction = useCallback(
    (predId: string) => {
      const pred = detectorPredictions.find((p) => p.id === predId);
      if (!pred) return;

      const newId = getNextAreaId(areas);
      const newArea: GroundTruthAreaUi = {
        id: newId,
        label: 'room',
        polygon: pred.polygon,
        color: getAreaColor(areas.length),
        isHidden: false,
      };

      const nextAreas = [...areas, newArea];
      pushState(nextAreas);
      setDetectorPredictions((prev) => prev.filter((p) => p.id !== predId));
      setSelectedAreaId(newId);
      showToast(`Accepted prediction as ${newId}.`, 'success');
    },
    [areas, detectorPredictions, getNextAreaId, pushState, showToast]
  );

  const clearPredictions = useCallback(() => {
    setDetectorPredictions([]);
  }, []);

  // Save Ground Truth
  const saveGroundTruth = useCallback(async () => {
    if (!selectedFloorplan) return;

    // Validate
    const validation = validateAllGroundTruthAreas(
      areas,
      selectedFloorplan.imageWidth,
      selectedFloorplan.imageHeight
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showToast(
        `Cannot save: ${validation.errors.length} validation error(s) found.`,
        'error'
      );
      return;
    }

    setValidationErrors([]);
    setIsSaving(true);

    const baseStem = selectedFloorplan.filename.replace(/\.[^/.]+$/, '');
    const payload: GroundTruthJson = {
      imageId: baseStem,
      imagePath: selectedFloorplan.filename,
      imageWidth: selectedFloorplan.imageWidth,
      imageHeight: selectedFloorplan.imageHeight,
      areas: areas.map((a) => ({
        id: a.id,
        label: a.label || 'room',
        polygon: a.polygon.map((p) => ({
          xPx: Math.round(p.xPx),
          yPx: Math.round(p.yPx),
        })),
      })),
    };

    try {
      const res = await saveGtApi(selectedFloorplan.filename, payload, backendPort);
      showToast(
        `Successfully saved Ground Truth with ${res.roomCount} room(s) to ${baseStem}.gt.json`,
        'success'
      );

      // Update local file item status
      setFloorplans((prev) =>
        prev.map((f) =>
          f.filename === selectedFloorplan.filename
            ? {
                ...f,
                hasGt: true,
                status: 'Annotated',
                roomCount: areas.length,
                gtFilename: `${baseStem}.gt.json`,
              }
            : f
        )
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to save Ground Truth', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [areas, backendPort, selectedFloorplan, showToast]);

  // Export Ground Truth as File
  const exportGroundTruth = useCallback(() => {
    if (!selectedFloorplan) return;
    const baseStem = selectedFloorplan.filename.replace(/\.[^/.]+$/, '');
    const payload: GroundTruthJson = {
      imageId: baseStem,
      imagePath: selectedFloorplan.filename,
      imageWidth: selectedFloorplan.imageWidth,
      imageHeight: selectedFloorplan.imageHeight,
      areas: areas.map((a) => ({
        id: a.id,
        label: a.label || 'room',
        polygon: a.polygon.map((p) => ({
          xPx: Math.round(p.xPx),
          yPx: Math.round(p.yPx),
        })),
      })),
    };
    exportGroundTruthFile(selectedFloorplan.filename, payload);
    showToast(`Exported ${baseStem}.gt.json`, 'success');
  }, [areas, selectedFloorplan, showToast]);

  // Navigation: Next / Prev floorplan
  const selectNextFloorplan = useCallback(() => {
    if (!selectedFilename || floorplans.length === 0) return;
    const idx = floorplans.findIndex((f) => f.filename === selectedFilename);
    const nextIdx = (idx + 1) % floorplans.length;
    setSelectedFilename(floorplans[nextIdx].filename);
  }, [floorplans, selectedFilename]);

  const selectPrevFloorplan = useCallback(() => {
    if (!selectedFilename || floorplans.length === 0) return;
    const idx = floorplans.findIndex((f) => f.filename === selectedFilename);
    const prevIdx = (idx - 1 + floorplans.length) % floorplans.length;
    setSelectedFilename(floorplans[prevIdx].filename);
  }, [floorplans, selectedFilename]);

  return {
    floorplans,
    selectedFilename,
    selectedFloorplan,
    loadingFiles,
    loadingDetails,
    isSaving,
    isDetecting,
    areas,
    selectedAreaId,
    selectedAreaIds,
    hoveredAreaId,
    detectorPredictions,
    toolMode,
    drawingPoints,
    activeMousePos,
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
    setActiveMousePos,
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
    updateAreaLabel,
    updateAreaId,
    runDetector,
    usePredictionsAsDraft,
    acceptSinglePrediction,
    clearPredictions,
    saveGroundTruth,
    exportGroundTruth,
    selectNextFloorplan,
    selectPrevFloorplan,
    backendPort,
    setBackendPort,
    undo,
    redo,
    loadFloorplans,
  };
}
