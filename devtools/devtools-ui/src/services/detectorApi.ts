/**
 * API client for the Python Classical CV Floorplan Detector Service.
 */

export interface DetectedPointApi {
  xPx: number;
  yPx: number;
}

export interface DetectedAreaApi {
  id: string;
  polygon: DetectedPointApi[];
}

export interface DetectionStatsApi {
  candidate_spaces?: number;
  accepted_rooms?: number;
  rejected?: Record<string, number>;
  candidateSpaces?: number;
  acceptedRooms?: number;
  finalValidPolygons?: number;
}

export interface DetectionApiResponse {
  imageWidth: number;
  imageHeight: number;
  areas: DetectedAreaApi[];
  stats: DetectionStatsApi;
}

export function getApiBaseUrl(port: number | string = 8000): string {
  // In browser, prefer same-origin proxy to eliminate any cross-origin CORS or Private Network Access restrictions
  if (typeof window !== 'undefined' && window.location.origin) {
    return `/api-detector/${port}`;
  }
  return `http://localhost:${port}`;
}

export const DEFAULT_API_BASE = getApiBaseUrl(8000);

/**
 * Checks if the Python FastAPI detector service is reachable and healthy.
 */
export async function checkBackendHealth(baseUrl: string = DEFAULT_API_BASE): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    // If relative proxy path failed, try direct localhost connection as fallback
    if (baseUrl.startsWith('/api-detector/')) {
      const port = baseUrl.replace('/api-detector/', '');
      try {
        const directRes = await fetch(`http://localhost:${port}/health`, { method: 'GET' });
        if (directRes.ok) {
          const directData = await directRes.json();
          return directData.status === 'ok';
        }
      } catch {}
    }
    return false;
  }
}

/**
 * Uploads a floorplan image to the Python FastAPI detector and returns detected polygons.
 */
export async function detectFloorplanApi(
  file: File,
  baseUrl: string = DEFAULT_API_BASE,
  wallKernel: number = 35,
  minArea: number = 1200
): Promise<DetectionApiResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${baseUrl}/detect?wall_kernel=${wallKernel}&min_area=${minArea}&auto_scale=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for large images

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Server responded with status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) errorDetail = errorJson.detail;
      } catch {
        // Ignore JSON parse failure on raw error responses
      }
      throw new Error(errorDetail);
    }

    return await response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Detection request timed out (30s). The image might be too large or server busy.');
    }
    // If proxy failed, attempt direct fallback
    if (baseUrl.startsWith('/api-detector/')) {
      const port = baseUrl.replace('/api-detector/', '');
      return detectFloorplanApi(file, `http://localhost:${port}`, wallKernel, minArea);
    }
    throw err;
  }
}
