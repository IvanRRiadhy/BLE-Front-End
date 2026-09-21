import {
  FloorplanFileItem,
  GroundTruthJson,
  DetectorPrediction,
} from '../types/annotation';
import { getApiBaseUrl, detectFloorplanApi } from './detectorApi';

export async function fetchFloorplanDataset(
  port: number = 8000
): Promise<FloorplanFileItem[]> {
  const baseUrl = getApiBaseUrl(port);
  const response = await fetch(`${baseUrl}/datasets/my_floorplan`);
  if (!response.ok) {
    throw new Error(`Failed to load my_floorplan dataset (Status: ${response.status})`);
  }
  const data = await response.json();
  return data.floorplans || [];
}

export function getFloorplanImageUrl(filename: string, port: number = 8000): string {
  const baseUrl = getApiBaseUrl(port);
  return `${baseUrl}/datasets/my_floorplan/image/${encodeURIComponent(filename)}`;
}

export async function fetchGroundTruth(
  filename: string,
  port: number = 8000
): Promise<GroundTruthJson | null> {
  const baseUrl = getApiBaseUrl(port);
  try {
    const response = await fetch(
      `${baseUrl}/datasets/my_floorplan/gt/${encodeURIComponent(filename)}`
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Server returned ${response.status} when fetching GT`);
    }
    return await response.json();
  } catch (err) {
    return null;
  }
}

export async function saveGroundTruth(
  filename: string,
  payload: GroundTruthJson,
  port: number = 8000
): Promise<{ status: string; roomCount: number }> {
  const baseUrl = getApiBaseUrl(port);
  const response = await fetch(
    `${baseUrl}/datasets/my_floorplan/gt/${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload, null, 2),
    }
  );

  if (!response.ok) {
    let errorDetail = `Failed to save ground truth (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * Runs the classical CV detector on a floorplan image from my_floorplan.
 * Fetches the binary image stream from the backend and passes it to the detector endpoint.
 */
export async function runDetectorOnFloorplan(
  filename: string,
  port: number = 8000
): Promise<DetectorPrediction[]> {
  const baseUrl = getApiBaseUrl(port);
  const imgUrl = getFloorplanImageUrl(filename, port);
  const imgResponse = await fetch(imgUrl);
  if (!imgResponse.ok) {
    throw new Error(`Failed to retrieve image for detection (${imgResponse.status})`);
  }

  const blob = await imgResponse.blob();
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  const result = await detectFloorplanApi(file, baseUrl);

  return (result.areas || []).map((area, idx) => ({
    id: `pred_${idx + 1}`,
    polygon: area.polygon.map((p) => ({
      xPx: Math.round(p.xPx),
      yPx: Math.round(p.yPx),
    })),
  }));
}

/**
 * Downloads Ground Truth JSON as a file directly in the browser.
 */
export function exportGroundTruthFile(filename: string, payload: GroundTruthJson): void {
  const baseStem = filename.replace(/\.[^/.]+$/, '');
  const gtFilename = `${baseStem}.gt.json`;
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = gtFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
