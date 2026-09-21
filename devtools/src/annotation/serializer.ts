import { GroundTruthArea, GroundTruthJson, GroundTruthPoint } from './types.js';

/**
 * Serializes areas into normalized BIONIC Evaluation Ground Truth JSON schema.
 */
export function serializeGroundTruthJson(
  imageId: string,
  imagePath: string,
  imageWidth: number,
  imageHeight: number,
  areas: GroundTruthArea[]
): GroundTruthJson {
  return {
    imageId,
    imagePath,
    imageWidth,
    imageHeight,
    areas: areas.map((a, idx) => ({
      id: a.id || `gt_${String(idx + 1).padStart(3, '0')}`,
      label: a.label || 'room',
      polygon: a.polygon.map((p) => ({
        xPx: Math.round(p.xPx),
        yPx: Math.round(p.yPx),
      })),
    })),
  };
}

/**
 * Parses and validates normalized Ground Truth JSON.
 */
export function parseGroundTruthJson(input: string | any): GroundTruthJson {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Ground Truth JSON: expected an object');
  }

  const rawAreas = Array.isArray(data.areas) ? data.areas : [];
  const areas: GroundTruthArea[] = rawAreas.map((a: any, idx: number) => {
    const rawPoly = Array.isArray(a.polygon) ? a.polygon : [];
    const polygon: GroundTruthPoint[] = rawPoly.map((p: any) => ({
      xPx: Number(p.xPx),
      yPx: Number(p.yPx),
    }));
    return {
      id: String(a.id || `gt_${String(idx + 1).padStart(3, '0')}`),
      label: String(a.label || 'room'),
      polygon,
    };
  });

  return {
    imageId: String(data.imageId || ''),
    imagePath: String(data.imagePath || ''),
    imageWidth: Number(data.imageWidth || 0),
    imageHeight: Number(data.imageHeight || 0),
    areas,
  };
}
