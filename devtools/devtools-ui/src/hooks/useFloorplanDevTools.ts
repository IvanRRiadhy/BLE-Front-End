import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DetectedArea,
  AreaPoint,
  ProductionAreaJson,
  FloorplanDetectionPipeline,
  calculateVisualCenter,
  calculateBoundingBox,
  serializeAreasToProductionJson,
  normalizePolygonGeometry,
  calculateBothTextBoxes,
  assignDefaultAreaNames,
} from 'devtools-floorplan-detection';

import {
  FloorplanImageState,
  EngineStatusInfo,
  AreaComputedStats,
  IFloorplanDetectionProvider,
} from '../types/ui';

import {
  MockFloorplanDetectionProvider,
  generateMockFloorplanSvgDataUrl,
  MOCK_IMAGE_WIDTH,
  MOCK_IMAGE_HEIGHT,
} from '../mock/mockFloorplan';

import {
  checkBackendHealth,
  detectFloorplanApi,
  getApiBaseUrl,
} from '../services/detectorApi';

export type DetectionMode = 'mock' | 'python-cv';

export function useFloorplanDevTools(
  initialProvider: IFloorplanDetectionProvider = new MockFloorplanDetectionProvider()
) {
  // Provider instance
  const [provider] = useState<IFloorplanDetectionProvider>(initialProvider);

  // Detection Mode & Backend Connection
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('mock');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendPort, setBackendPortState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bionic_detector_port');
      return saved ? parseInt(saved, 10) || 8000 : 8000;
    } catch {
      return 8000;
    }
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(backendPort), [backendPort]);

  const setBackendPort = useCallback((port: number | string) => {
    const parsed = typeof port === 'string' ? parseInt(port, 10) : port;
    if (!isNaN(parsed) && parsed > 0 && parsed <= 65535) {
      setBackendPortState(parsed);
      try {
        localStorage.setItem('bionic_detector_port', String(parsed));
      } catch {
        // Ignore localStorage error
      }
    }
  }, []);

  // Image Viewport State
  const [imageState, setImageState] = useState<FloorplanImageState>({
    url: null,
    dimensions: { width: 0, height: 0 },
    filename: '',
    isMock: false,
  });

  // Areas State
  const [areas, setAreas] = useState<DetectedArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);

  // Serialized BIONIC JSON Output
  const [productionJson, setProductionJson] = useState<ProductionAreaJson[]>([]);

  // UI / Display Flags
  const [showCoordinates, setShowCoordinates] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Engine Status
  const [engineStatus, setEngineStatus] = useState<EngineStatusInfo>({
    engine: 'Ready',
    geometry: 'Ready',
    textBox: 'Ready',
    serializer: 'Ready',
  });

  // Pipeline instance
  const pipeline = useMemo(() => new FloorplanDetectionPipeline(provider), [provider]);

  /**
   * Internal runner to normalize areas and serialize them into BIONIC production format.
   */
  const recomputeAndSerialize = useCallback((currentAreas: DetectedArea[]) => {
    try {
      // 1. Normalize geometry
      const normalized = currentAreas.map((area) => ({
        ...area,
        polygon: normalizePolygonGeometry(area.polygon),
      }));

      // 2. Serialize to BIONIC Production JSON
      const serialized = pipeline.processDetectedAreas(normalized, {
        autoAssignDefaultNames: true,
      });

      setProductionJson(serialized);

      // Update area names if auto-naming assigned names
      setAreas((prev) =>
        prev.map((a, idx) => ({
          ...a,
          name: serialized[idx] ? serialized[idx].name : a.name,
        }))
      );

      setEngineStatus((prev) => ({
        ...prev,
        geometry: 'Ready',
        textBox: 'Ready',
        serializer: 'Ready',
      }));
    } catch (err) {
      console.error('Failed to serialize floorplan areas:', err);
      setEngineStatus((prev) => ({
        ...prev,
        serializer: 'Error',
      }));
    }
  }, []);

  /**
   * Loads the mock floorplan and executes detection pipeline.
   */
  const loadMockFloorplan = useCallback(async () => {
    setIsProcessing(true);
    setEngineStatus((prev) => ({ ...prev, engine: 'Processing' }));

    try {
      // 1. Set Mock Image Background
      const mockSvgUrl = generateMockFloorplanSvgDataUrl();
      setImageState({
        url: mockSvgUrl,
        dimensions: { width: MOCK_IMAGE_WIDTH, height: MOCK_IMAGE_HEIGHT },
        filename: 'mock-blueprint-floorplan.svg',
        isMock: true,
      });

      // 2. Run Mock Detection
      const rawAreas = await provider.detectAreas(null);
      setAreas(rawAreas);

      // 3. Process through pipeline
      const serialized = pipeline.processDetectedAreas(rawAreas);
      setProductionJson(serialized);

      // Align names from serialization
      setAreas((prev) =>
        prev.map((a, idx) => ({
          ...a,
          name: serialized[idx]?.name || `Area_${String(idx + 1).padStart(3, '0')}`,
        }))
      );

      setSelectedAreaId(rawAreas[0]?.id || null);

      setEngineStatus({
        engine: 'Ready',
        geometry: 'Ready',
        textBox: 'Ready',
        serializer: 'Ready',
      });
    } catch (err) {
      console.error('Mock floorplan loading error:', err);
      setEngineStatus((prev) => ({ ...prev, engine: 'Error' }));
    } finally {
      setIsProcessing(false);
    }
  }, [provider, pipeline]);

  /**
   * Periodically checks Python FastAPI backend health.
   */
  const refreshBackendStatus = useCallback(async (targetPort?: number | string) => {
    const portToTest = targetPort
      ? (typeof targetPort === 'string' ? parseInt(targetPort, 10) : targetPort)
      : backendPort;
    const url = getApiBaseUrl(portToTest);
    const isOnline = await checkBackendHealth(url);

    // Auto-probe convenience: If 8000 is offline and user hasn't explicitly customized port,
    // probe 9000 in case the user started uvicorn on port 9000.
    if (!isOnline && portToTest === 8000 && !localStorage.getItem('bionic_detector_port')) {
      const fallback9000 = await checkBackendHealth(getApiBaseUrl(9000));
      if (fallback9000) {
        setBackendPortState(9000);
        setBackendOnline(true);
        return true;
      }
    }

    setBackendOnline(isOnline);
    return isOnline;
  }, [backendPort]);

  useEffect(() => {
    refreshBackendStatus();
    const interval = setInterval(() => refreshBackendStatus(), 8000);
    return () => clearInterval(interval);
  }, [refreshBackendStatus]);

  /**
   * Handles local image upload via File.
   */
  const handleImageUpload = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      setImageState({
        url: objectUrl,
        dimensions: { width: img.naturalWidth, height: img.naturalHeight },
        filename: file.name,
        isMock: false,
      });
      setUploadedFile(file);
      setErrorMessage(null);
      // Clear previous areas when a new image is loaded
      setAreas([]);
      setProductionJson([]);
      setSelectedAreaId(null);
    };

    img.onerror = () => {
      console.error('Failed to parse uploaded image.');
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  }, []);

  /**
   * Runs detection according to the active mode (Mock vs Python FastAPI).
   */
  const runDetection = useCallback(async () => {
    if (!imageState.url) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setEngineStatus((prev) => ({ ...prev, engine: 'Processing' }));

    try {
      if (detectionMode === 'python-cv') {
        // 1. Verify backend availability
        const isOnline = await checkBackendHealth(apiBaseUrl);
        setBackendOnline(isOnline);
        if (!isOnline) {
          throw new Error(
            `Python FastAPI backend is offline at ${apiBaseUrl}. ` +
            `Start it in terminal: python -m uvicorn api.main:app --port ${backendPort}`
          );
        }

        // 2. Prepare file payload
        let fileToDetect = uploadedFile;
        if (!fileToDetect && imageState.isMock) {
          // Convert mock SVG data url to File object
          const res = await fetch(imageState.url);
          const blob = await res.blob();
          fileToDetect = new File([blob], 'mock_floorplan.svg', { type: 'image/svg+xml' });
        }

        if (!fileToDetect) {
          throw new Error('Please upload an architectural floorplan image (PNG, JPG, WEBP) to run Python CV detection.');
        }

        // 3. Call Python FastAPI backend
        const apiResult = await detectFloorplanApi(fileToDetect, apiBaseUrl);

        // 4. Convert detected polygons into internal DetectedArea model
        const rawDetected: DetectedArea[] = apiResult.areas.map((a) => ({
          id: a.id,
          name: '',
          polygon: a.polygon.map((p) => ({
            id: '',
            x: p.xPx,
            y: p.yPx,
            xPx: p.xPx,
            yPx: p.yPx,
          })),
        }));

        if (rawDetected.length === 0) {
          setErrorMessage('No enclosed rooms detected. Try an image with higher contrast or clear walls.');
        }

        // 5. Process through TypeScript pipeline (Geometry, Auto-naming, Visual Center, Production Serialization)
        const serialized = pipeline.processDetectedAreas(rawDetected, {
          autoAssignDefaultNames: true,
        });

        setAreas(
          rawDetected.map((a, idx) => ({
            ...a,
            name: serialized[idx]?.name || `Area_${String(idx + 1).padStart(3, '0')}`,
          }))
        );
        setProductionJson(serialized);
        setSelectedAreaId(rawDetected[0]?.id || null);
      } else {
        // Mock Detection Mode
        const detected = await provider.detectAreas(imageState.url);
        const serialized = pipeline.processDetectedAreas(detected);

        setAreas(
          detected.map((a, idx) => ({
            ...a,
            name: serialized[idx]?.name || a.name,
          }))
        );
        setProductionJson(serialized);
        setSelectedAreaId(detected[0]?.id || null);
      }

      setEngineStatus((prev) => ({ ...prev, engine: 'Ready' }));
    } catch (err: any) {
      console.error('Detection run failed:', err);
      setErrorMessage(err.message || 'Detection failed');
      setEngineStatus((prev) => ({ ...prev, engine: 'Error' }));
    } finally {
      setIsProcessing(false);
    }
  }, [imageState.url, imageState.isMock, detectionMode, uploadedFile, provider, pipeline]);

  /**
   * Resets the entire workspace.
   */
  const resetWorkspace = useCallback(() => {
    if (imageState.url && !imageState.isMock) {
      URL.revokeObjectURL(imageState.url);
    }
    setImageState({
      url: null,
      dimensions: { width: 0, height: 0 },
      filename: '',
      isMock: false,
    });
    setAreas([]);
    setProductionJson([]);
    setSelectedAreaId(null);
    setHoveredAreaId(null);
  }, [imageState]);

  /**
   * Updates an area's name and immediately regenerates the BIONIC production JSON.
   */
  const updateAreaName = useCallback((id: string, newName: string) => {
    setAreas((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, name: newName } : a));
      // Re-serialize immediately with new names
      const serialized = pipeline.processDetectedAreas(updated, {
        autoAssignDefaultNames: false,
      });
      setProductionJson(serialized);
      return updated;
    });
  }, [pipeline]);

  /**
   * FUTURE-PROOF VERTEX OPERATIONS
   * Designed so manual vertex editing can be plugged into canvas handles in a future phase.
   */
  const updateVertex = useCallback(
    (areaId: string, vertexIndex: number, newPoint: Partial<AreaPoint>) => {
      setAreas((prev) => {
        const updated = prev.map((area) => {
          if (area.id !== areaId) return area;
          const nextPolygon = [...area.polygon];
          if (vertexIndex >= 0 && vertexIndex < nextPolygon.length) {
            const current = nextPolygon[vertexIndex];
            nextPolygon[vertexIndex] = {
              ...current,
              ...newPoint,
              x: newPoint.x !== undefined ? newPoint.x : current.x,
              y: newPoint.y !== undefined ? newPoint.y : current.y,
              xPx: newPoint.xPx !== undefined ? newPoint.xPx : current.xPx,
              yPx: newPoint.yPx !== undefined ? newPoint.yPx : current.yPx,
            };
          }
          return { ...area, polygon: nextPolygon };
        });

        recomputeAndSerialize(updated);
        return updated;
      });
    },
    [recomputeAndSerialize]
  );

  const insertVertex = useCallback(
    (areaId: string, afterIndex: number, point: AreaPoint) => {
      setAreas((prev) => {
        const updated = prev.map((area) => {
          if (area.id !== areaId) return area;
          const nextPolygon = [...area.polygon];
          nextPolygon.splice(afterIndex + 1, 0, point);
          return { ...area, polygon: nextPolygon };
        });

        recomputeAndSerialize(updated);
        return updated;
      });
    },
    [recomputeAndSerialize]
  );

  const deleteVertex = useCallback(
    (areaId: string, vertexIndex: number) => {
      setAreas((prev) => {
        const updated = prev.map((area) => {
          if (area.id !== areaId || area.polygon.length <= 3) return area;
          const nextPolygon = area.polygon.filter((_, idx) => idx !== vertexIndex);
          return { ...area, polygon: nextPolygon };
        });

        recomputeAndSerialize(updated);
        return updated;
      });
    },
    [recomputeAndSerialize]
  );

  /**
   * Pre-computes engineering metrics for each area using the real devtools engine.
   */
  const computedStatsMap = useMemo(() => {
    const map = new Map<string, AreaComputedStats>();

    areas.forEach((area) => {
      if (area.polygon.length < 3) return;

      const bounds = calculateBoundingBox(area.polygon);
      const visualCenter = calculateVisualCenter(area.polygon);

      // Shoelace formula for polygon area in px²
      let areaSum = 0;
      for (let i = 0; i < area.polygon.length; i++) {
        const j = (i + 1) % area.polygon.length;
        areaSum += area.polygon[i].xPx * area.polygon[j].yPx;
        areaSum -= area.polygon[j].xPx * area.polygon[i].yPx;
      }
      const approxAreaSqPx = Math.abs(areaSum) / 2;

      map.set(area.id, {
        id: area.id,
        name: area.name,
        vertexCount: area.polygon.length,
        bounds: {
          ...bounds,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
        },
        visualCenter: {
          posX: Math.round(visualCenter.x),
          posY: Math.round(visualCenter.y),
        },
        approxAreaSqPx,
      });
    });

    return map;
  }, [areas]);

  /**
   * Pre-calculates text box placements for canvas rendering using the real engine.
   */
  const calculatedTextBoxes = useMemo(() => {
    const map = new Map<
      string,
      {
        areaNameTextBox: { posX: number; posY: number; fontSize: number; fontColor: string };
        occupancyNameTextBox: { posX: number; posY: number; fontSize: number; fontColor: string };
      }
    >();

    areas.forEach((area) => {
      if (area.polygon.length >= 3) {
        const textBoxes = calculateBothTextBoxes(area.polygon);
        map.set(area.id, textBoxes);
      }
    });

    return map;
  }, [areas]);

  /**
   * Copies formatted BIONIC production JSON to clipboard.
   */
  const copyJson = useCallback(async () => {
    if (productionJson.length === 0) return;
    const jsonStr = JSON.stringify(productionJson, null, 2);
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  }, [productionJson]);

  /**
   * Downloads formatted BIONIC production JSON file.
   */
  const downloadJson = useCallback(() => {
    if (productionJson.length === 0) return;
    const jsonStr = JSON.stringify(productionJson, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'floorplan-areas.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [productionJson]);

  // Load mock floorplan automatically on first mount for instant visual feedback
  useEffect(() => {
    loadMockFloorplan();
  }, [loadMockFloorplan]);

  return {
    // State
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

    // Actions
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

    // Future-Proof Vertex Handlers
    updateVertex,
    insertVertex,
    deleteVertex,
  };
}
