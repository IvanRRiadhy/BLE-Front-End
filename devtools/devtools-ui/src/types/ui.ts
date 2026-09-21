import {
  DetectedArea,
  AreaPoint,
  ProductionAreaJson,
  ProductionTextBox,
  IFloorplanDetectionEngine,
} from 'devtools-floorplan-detection';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface FloorplanImageState {
  url: string | null;
  dimensions: ImageDimensions;
  filename: string;
  isMock: boolean;
}

export interface EngineStatusInfo {
  engine: 'Ready' | 'Processing' | 'Error';
  geometry: 'Ready' | 'Error';
  textBox: 'Ready' | 'Error';
  serializer: 'Ready' | 'Error';
}

export interface AreaComputedStats {
  id: string;
  name: string;
  vertexCount: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  visualCenter: {
    posX: number;
    posY: number;
  };
  approxAreaSqPx: number;
}

/**
 * Extensible Detection Provider abstraction.
 * Future CV/AI services (OpenCV, ONNX, Python API) will implement this interface.
 */
export interface IFloorplanDetectionProvider extends IFloorplanDetectionEngine {
  readonly providerName: string;
  detectAreas(imageInput: unknown): Promise<DetectedArea[]> | DetectedArea[];
}

/**
 * Future-proof vertex mutation contracts.
 * Designed so manual polygon vertex editing can be plugged in without refactoring.
 */
export interface PolygonVertexOperations {
  updateVertex: (areaId: string, vertexIndex: number, point: Partial<AreaPoint>) => void;
  insertVertex: (areaId: string, afterIndex: number, point: AreaPoint) => void;
  deleteVertex: (areaId: string, vertexIndex: number) => void;
}
