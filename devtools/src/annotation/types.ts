/**
 * Ground Truth Annotation Models
 * Compatible with BIONIC Evaluation Harness Schema.
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

export interface GroundTruthJson {
  imageId: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  areas: GroundTruthArea[];
}

export interface GroundTruthValidationError {
  areaId: string;
  message: string;
}
