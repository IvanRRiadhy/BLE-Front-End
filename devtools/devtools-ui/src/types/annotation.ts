/**
 * Ground Truth Annotation Tool Types
 * Strictly aligned with Evaluation Harness schema and DevTools UI.
 */

export interface GroundTruthPoint {
  xPx: number;
  yPx: number;
}

export interface GroundTruthArea {
  id: string;
  label: string;
  polygon: GroundTruthPoint[];
}

export interface GroundTruthAreaUi extends GroundTruthArea {
  isHidden?: boolean;
  color?: string;
}

export interface GroundTruthJson {
  imageId: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  areas: GroundTruthArea[];
}

export interface FloorplanFileItem {
  filename: string;
  imageWidth: number;
  imageHeight: number;
  hasGt: boolean;
  status: 'Not Annotated' | 'In Progress' | 'Annotated';
  roomCount: number;
  gtFilename: string | null;
}

export interface DetectorPrediction {
  id: string;
  polygon: GroundTruthPoint[];
}

export type AnnotationToolMode = 'select' | 'draw' | 'pan';

export interface LayerVisibility {
  floorplan: boolean;
  groundTruth: boolean;
  predictions: boolean;
  vertexHandles: boolean;
  ids: boolean;
}

export interface ValidationError {
  areaId: string;
  message: string;
}

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}
