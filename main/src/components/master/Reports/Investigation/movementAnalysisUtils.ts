import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { VisualPathPointType } from 'src/store/apps/crud/visitorSession';
import { formatOrRawTime } from 'src/utils/time';

dayjs.extend(duration);

export type DwellPoint = {
  id: string;
  x: number;
  y: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  durationMinutes: number;
  durationFormatted: string;
  area: string;
  floorplanId?: string;
  observationCount: number;
};

export type TimelineEventType = 'moving' | 'stopped' | 'incident' | 'floor_change';

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  time: string;
  timeLabel: string;
  title: string;
  subtitle?: string;
  area: string;
  floorplanId?: string;
  pointIndex: number;
  x?: number;
  y?: number;
  durationFormatted?: string;
};

export type ActivityBucket = {
  timestamp: string;
  timeLabel: string;
  count: number;
  pointIndex: number;
};

/**
 * Calculates Euclidean distance between two 2D points.
 */
export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Format duration into human readable string (e.g. "12 min", "2 hours 15 min", "45 sec").
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} sec`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
};

/**
 * Detects stationary clusters (Dwell / Stops) where a person remains within
 * `radiusThreshold` for at least `minDurationSeconds`.
 */
export const detectDwellPoints = (
  points: VisualPathPointType[],
  radiusThreshold: number = 35,
  minDurationSeconds: number = 60,
): DwellPoint[] => {
  if (!points || points.length < 2) return [];

  const sorted = [...points].sort((a, b) => dayjs(cleanTimeStr(a.time)).valueOf() - dayjs(cleanTimeStr(b.time)).valueOf());
  const dwells: DwellPoint[] = [];

  let currentCluster: VisualPathPointType[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const pt = sorted[i];
    const firstInCluster = currentCluster[0];
    const isFloorplanChange = Boolean(
      pt.floorplanId && firstInCluster.floorplanId && pt.floorplanId !== firstInCluster.floorplanId
    );
    const dist = isFloorplanChange ? Infinity : getDistance(firstInCluster.x, firstInCluster.y, pt.x, pt.y);

    if (dist <= radiusThreshold && !isFloorplanChange) {
      currentCluster.push(pt);
    } else {
      // Check if current cluster qualifies as dwell
      if (currentCluster.length >= 2) {
        const startTime = cleanTimeStr(currentCluster[0].time);
        const endTime = cleanTimeStr(currentCluster[currentCluster.length - 1].time);
        const durSec = Math.max(0, dayjs(endTime).diff(dayjs(startTime), 'second'));

        if (durSec >= minDurationSeconds) {
          const avgX = currentCluster.reduce((sum, p) => sum + p.x, 0) / currentCluster.length;
          const avgY = currentCluster.reduce((sum, p) => sum + p.y, 0) / currentCluster.length;
          dwells.push({
            id: `dwell-${dwells.length}-${startTime}`,
            x: avgX,
            y: avgY,
            startTime,
            endTime,
            durationSeconds: durSec,
            durationMinutes: Math.round(durSec / 60),
            durationFormatted: formatDuration(durSec),
            area: currentCluster[0].area || 'Unknown Area',
            floorplanId: currentCluster[0].floorplanId,
            observationCount: currentCluster.length,
          });
        }
      }
      currentCluster = [pt];
    }
  }

  // Check last cluster
  if (currentCluster.length >= 2) {
    const startTime = cleanTimeStr(currentCluster[0].time);
    const endTime = cleanTimeStr(currentCluster[currentCluster.length - 1].time);
    const durSec = Math.max(0, dayjs(endTime).diff(dayjs(startTime), 'second'));

    if (durSec >= minDurationSeconds) {
      const avgX = currentCluster.reduce((sum, p) => sum + p.x, 0) / currentCluster.length;
      const avgY = currentCluster.reduce((sum, p) => sum + p.y, 0) / currentCluster.length;
      dwells.push({
        id: `dwell-${dwells.length}-${startTime}`,
        x: avgX,
        y: avgY,
        startTime,
        endTime,
        durationSeconds: durSec,
        durationMinutes: Math.round(durSec / 60),
        durationFormatted: formatDuration(durSec),
        area: currentCluster[0].area || 'Unknown Area',
        floorplanId: currentCluster[0].floorplanId,
        observationCount: currentCluster.length,
      });
    }
  }

  return dwells;
};

/**
 * Preprocesses and filters movement points based on a physical distance threshold (in meters).
 * Uses anchor point logic: sets an anchor point and ignores subsequent points within
 * `minDistanceMeters` (e.g. 2m). When a point exceeds this distance or changes area/floorplan,
 * it becomes the new anchor point.
 */
export const preprocessMovementLog = (
  points: VisualPathPointType[],
  meterPerPx: number = 0.05,
  minDistanceMeters: number = 2.0,
): (VisualPathPointType & { dwellDurationSeconds?: number })[] => {
  if (!points || points.length <= 1) return points || [];

  const normalizeTime = (t: string) => {
    if (!t) return t;
    return String(t).trim();
  };

  const normalizedPoints = points.map((p) => ({
    ...p,
    time: normalizeTime(p.time),
  }));

  const sorted = [...normalizedPoints].sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());

  type ProcessedPoint = VisualPathPointType & { dwellDurationSeconds?: number };
  const processed: ProcessedPoint[] = [
    { ...sorted[0], dwellDurationSeconds: 0 },
  ];

  let anchorIdx = 0;
  let currentAnchor = processed[0];

  for (let i = 1; i < sorted.length; i++) {
    const pt = sorted[i];

    const isFloorplanChange = Boolean(
      pt.floorplanId && currentAnchor.floorplanId && pt.floorplanId !== currentAnchor.floorplanId
    );
    const isAreaChange = pt.area !== currentAnchor.area;

    let isFarEnough = false;
    if (!isFloorplanChange) {
      const distPx = getDistance(currentAnchor.x, currentAnchor.y, pt.x, pt.y);
      const distMeters = distPx * (meterPerPx > 0 ? meterPerPx : 0.05);
      isFarEnough = distMeters >= minDistanceMeters;
    }

    if (isFloorplanChange || isAreaChange || isFarEnough) {
      // Calculate dwell time accumulated at current anchor before moving to next point
      const prevAnchorTime = dayjs(currentAnchor.time);
      const currTime = dayjs(pt.time);
      const dwellSec = Math.max(0, currTime.diff(prevAnchorTime, 'second'));
      processed[anchorIdx].dwellDurationSeconds = dwellSec;

      // Add new anchor point preserving all floorplan metadata
      const newAnchor: ProcessedPoint = { ...pt, dwellDurationSeconds: 0 };
      processed.push(newAnchor);
      anchorIdx = processed.length - 1;
      currentAnchor = processed[anchorIdx];
    }
  }

  return processed;
};

/**
 * Simplifies tracking path by collapsing consecutive jitter points while preserving
 * path inflection, area boundaries, and general trajectory shape.
 */
export const simplifyPath = (
  points: VisualPathPointType[],
  distanceTolerance: number = 10,
): VisualPathPointType[] => {
  if (!points || points.length <= 2) return points || [];

  const sorted = [...points].sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());
  const kept: VisualPathPointType[] = [sorted[0]];

  for (let i = 1; i < sorted.length - 1; i++) {
    const prev = kept[kept.length - 1];
    const curr = sorted[i];
    const next = sorted[i + 1];

    // Keep if area changes
    if (curr.area !== prev.area) {
      kept.push(curr);
      continue;
    }

    const distFromPrev = getDistance(prev.x, prev.y, curr.x, curr.y);
    if (distFromPrev >= distanceTolerance) {
      // Check directional change
      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;
      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
      const angle = mag1 * mag2 > 0 ? Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) : 0;

      // Keep if there is a noticeable turn (> 25 deg) or distance is large
      if (angle > 0.4 || distFromPrev > distanceTolerance * 2.5) {
        kept.push(curr);
      }
    }
  }

  // Always keep last point
  kept.push(sorted[sorted.length - 1]);
  return kept;
};

/**
 * Generates an offscreen Canvas representing a smooth movement density heatmap.
 */
export const generateDensityCanvas = (
  points: VisualPathPointType[],
  width: number,
  height: number,
  radius: number = 36,
  meterPerPx?: number,
): HTMLCanvasElement | null => {
  if (!points || points.length === 0 || width <= 0 || height <= 0) return null;

  // Scale density radius using meterPerPx if available (reference standard density radius of ~12 meters for comprehensive coverage)
  const effectiveRadius =
    meterPerPx && meterPerPx > 0
      ? Math.max(60, Math.min(350, (12 / meterPerPx)))
      : Math.max(90, radius * 2.5);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Draw radial gradient alpha stamps for each point
  points.forEach((pt) => {
    if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return;
    const radGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, effectiveRadius);
    radGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
    radGrad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, effectiveRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Colorize alpha channel using a vibrant, smooth thermal color palette
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Pre-generate 256-color gradient ramp
  const paletteCanvas = document.createElement('canvas');
  paletteCanvas.width = 256;
  paletteCanvas.height = 1;
  const pctx = paletteCanvas.getContext('2d');
  if (pctx) {
    const pgrad = pctx.createLinearGradient(0, 0, 256, 0);
    pgrad.addColorStop(0.0, 'rgba(0, 180, 255, 0)');     // Transparent
    pgrad.addColorStop(0.15, 'rgba(0, 210, 255, 0.45)'); // Light Cyan
    pgrad.addColorStop(0.35, 'rgba(30, 220, 120, 0.65)'); // Emerald Green
    pgrad.addColorStop(0.60, 'rgba(255, 215, 0, 0.85)');  // Golden Yellow
    pgrad.addColorStop(0.85, 'rgba(255, 100, 0, 0.92)');  // Warm Orange
    pgrad.addColorStop(1.0, 'rgba(240, 30, 30, 0.98)');   // Deep Crimson Red
    pctx.fillStyle = pgrad;
    pctx.fillRect(0, 0, 256, 1);
    const pdata = pctx.getImageData(0, 0, 256, 1).data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const offset = alpha * 4;
        data[i] = pdata[offset];         // R
        data[i + 1] = pdata[offset + 1]; // G
        data[i + 2] = pdata[offset + 2]; // B
        data[i + 3] = pdata[offset + 3]; // A
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return canvas;
};

export const cleanTimeStr = (t?: string | null): string => {
  if (!t) return '';
  let str = String(t).trim();
  if (str.endsWith('Z') || str.endsWith('z')) {
    str = str.slice(0, -1);
  }
  // Truncate fractional seconds with more than 3 digits to 3 digits (e.g. .6833333 -> .683) for consistent Date/dayjs parsing
  str = str.replace(/(\.\d{3})\d+/, '$1');
  return str;
};

/**
 * Aggregates position observations into chronological time buckets for the Activity Chart.
 */
export const bucketMovementActivity = (
  points: VisualPathPointType[],
  bucketMinutes: number = 10,
): ActivityBucket[] => {
  if (!points || points.length === 0) return [];

  const sorted = [...points].sort((a, b) => dayjs(cleanTimeStr(a.time)).valueOf() - dayjs(cleanTimeStr(b.time)).valueOf());
  const start = dayjs(cleanTimeStr(sorted[0].time)).startOf('minute');
  const end = dayjs(cleanTimeStr(sorted[sorted.length - 1].time)).endOf('minute');

  const totalMinutes = Math.max(bucketMinutes, end.diff(start, 'minute') + 1);
  const numBuckets = Math.min(120, Math.max(1, Math.ceil(totalMinutes / bucketMinutes)));

  const buckets: ActivityBucket[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const bucketStart = start.add(i * bucketMinutes, 'minute');
    buckets.push({
      timestamp: bucketStart.format('YYYY-MM-DDTHH:mm:ss'),
      timeLabel: bucketStart.format('HH:mm'),
      count: 0,
      pointIndex: 0,
    });
  }

  sorted.forEach((pt, idx) => {
    const ptTime = dayjs(cleanTimeStr(pt.time));
    const minFromStart = ptTime.diff(start, 'minute');
    const bucketIdx = Math.min(buckets.length - 1, Math.max(0, Math.floor(minFromStart / bucketMinutes)));
    buckets[bucketIdx].count += 1;
    if (buckets[bucketIdx].count === 1) {
      buckets[bucketIdx].pointIndex = idx;
      buckets[bucketIdx].timestamp = cleanTimeStr(pt.time);
    }
  });

  return buckets;
};

/**
 * Derives chronological events (Moving, Stopped/Dwell, Incident, Floor Change) for the timeline.
 */
export const deriveEventTimeline = (
  points: VisualPathPointType[],
  dwellPoints: DwellPoint[],
  sessions: any[] = [],
): TimelineEvent[] => {
  if (!points || points.length === 0) return [];

  const sorted = [...points].sort(
    (a, b) => dayjs(cleanTimeStr(a.time)).valueOf() - dayjs(cleanTimeStr(b.time)).valueOf(),
  );
  const events: TimelineEvent[] = [];

  // 1. Add Dwell / Stopped events
  dwellPoints.forEach((d) => {
    const cleanDwellStart = cleanTimeStr(d.startTime);
    const ptIdx = sorted.findIndex(
      (p) => cleanTimeStr(p.time) === cleanDwellStart || cleanTimeStr(p.time) >= cleanDwellStart,
    );
    events.push({
      id: d.id,
      type: 'stopped',
      time: cleanDwellStart,
      timeLabel: formatOrRawTime(cleanDwellStart, 'HH:mm:ss'),
      title: `Stopped (${d.durationFormatted})`,
      subtitle: `${d.observationCount} observations`,
      area: d.area,
      floorplanId: d.floorplanId,
      pointIndex: Math.max(0, ptIdx),
      x: d.x,
      y: d.y,
      durationFormatted: d.durationFormatted,
    });
  });

  // 2. Add Area transitions / Floor changes / Moving events
  let lastArea = '';
  let lastFloorplanId = '';
  let lastFloorplanName = '';
  let lastEventTime = 0;

  sorted.forEach((pt, idx) => {
    const ptTimeStr = cleanTimeStr(pt.time);
    const ptTime = dayjs(ptTimeStr).valueOf();
    const ptFloorplanId = pt.floorplanId || '';
    const ptFloorplanName = pt.floorplanName || '';

    const floorplanChanged = Boolean(
      ptFloorplanId && lastFloorplanId && ptFloorplanId !== lastFloorplanId
    );
    const areaChanged = pt.area && pt.area !== lastArea;
    const timeDelta = ptTime - lastEventTime;

    if (floorplanChanged) {
      events.push({
        id: `floor-${idx}-${ptTimeStr}`,
        type: 'floor_change',
        time: ptTimeStr,
        timeLabel: formatOrRawTime(ptTimeStr, 'HH:mm:ss'),
        title: `Floor Change: ${ptFloorplanName || 'New Floor'}`,
        subtitle: lastFloorplanName
          ? `From ${lastFloorplanName} to ${ptFloorplanName}`
          : `Moved to ${ptFloorplanName}`,
        area: pt.area,
        floorplanId: ptFloorplanId,
        pointIndex: idx,
        x: pt.x,
        y: pt.y,
      });
      lastFloorplanId = ptFloorplanId;
      lastFloorplanName = ptFloorplanName;
      lastArea = pt.area;
      lastEventTime = ptTime;
    } else if ((areaChanged || timeDelta > 15 * 60 * 1000) && pt.area) {
      events.push({
        id: `move-${idx}-${ptTimeStr}`,
        type: 'moving',
        time: ptTimeStr,
        timeLabel: formatOrRawTime(ptTimeStr, 'HH:mm:ss'),
        title: 'Moving',
        subtitle: areaChanged && lastArea ? `From ${lastArea} to ${pt.area}` : undefined,
        area: pt.area,
        floorplanId: ptFloorplanId,
        pointIndex: idx,
        x: pt.x,
        y: pt.y,
      });
      lastArea = pt.area;
      lastEventTime = ptTime;
    }

    if (!lastFloorplanId && ptFloorplanId) {
      lastFloorplanId = ptFloorplanId;
      lastFloorplanName = ptFloorplanName;
    }
  });

  // 3. Add Incidents from sessions
  sessions.forEach((s, sIdx) => {
    if (s.hasIncident || s.incident) {
      const incTimeStr = cleanTimeStr(s.enterTime || sorted[0]?.time);
      const ptIdx = sorted.findIndex((p) => cleanTimeStr(p.time) >= incTimeStr);

      let title = 'Incident Detected';
      let subtitle = s.sessionStatus || 'Security Alert';

      if (typeof s.incident === 'string' && s.incident.trim()) {
        title = s.incident;
      } else if (typeof s.incident === 'object' && s.incident !== null) {
        const inc = s.incident as Record<string, any>;
        title =
          inc.investigationResult ||
          inc.alarmStatus ||
          inc.actionStatus ||
          (typeof inc.timelineSummary === 'string' ? inc.timelineSummary : '') ||
          'Incident Detected';

        subtitle =
          s.sessionStatus ||
          (typeof inc.timelineSummary === 'string' ? inc.timelineSummary : '') ||
          (inc.securityName ? `Security: ${inc.securityName}` : '') ||
          inc.actionStatus ||
          'Security Alert';
      }

      events.push({
        id: `incident-${sIdx}-${incTimeStr}`,
        type: 'incident',
        time: incTimeStr,
        timeLabel: formatOrRawTime(incTimeStr, 'HH:mm:ss'),
        title,
        subtitle,
        area: s.areaName || 'Unknown Area',
        pointIndex: Math.max(0, ptIdx),
      });
    }
  });

  // Sort all events chronologically
  return events.sort(
    (a, b) => dayjs(cleanTimeStr(a.time)).valueOf() - dayjs(cleanTimeStr(b.time)).valueOf(),
  );
};

export interface ProcessedFloorplansResult {
  points: (VisualPathPointType & { dwellDurationSeconds?: number })[];
  dwellPoints: DwellPoint[];
}

/**
 * Processes movement points strictly per-floorplan:
 * 1. For each floorplan, filters points using that floor's own meterPerPx scale.
 * 2. Detects stationary/dwell points independently on that floor's coordinate system.
 * 3. Merges and chronologically sorts all resulting points and dwell events into a single unified timeline.
 * 
 * This ensures that changing active floorplan in the UI never triggers recalculations of other floors.
 */
export const processMovementPerFloorplan = (
  floorplansRecord?: Record<
    string,
    {
      floorplanId: string;
      floorplanName?: string;
      floorplanImage?: string;
      meterPerPx?: number;
      points?: VisualPathPointType[];
    }
  > | null,
  floorplanMetaMap?: Map<string, { meterPerPx?: number }> | null,
): ProcessedFloorplansResult => {
  if (!floorplansRecord || Object.keys(floorplansRecord).length === 0) {
    return { points: [], dwellPoints: [] };
  }

  const allProcessedPoints: (VisualPathPointType & { dwellDurationSeconds?: number })[] = [];
  const allDwellPoints: DwellPoint[] = [];

  Object.values(floorplansRecord).forEach((fp) => {
    if (!fp || !fp.points || fp.points.length === 0) return;

    // Get this floorplan's own meterPerPx scale
    const meta = floorplanMetaMap?.get(fp.floorplanId);
    const meterPerPx = meta?.meterPerPx ?? fp.meterPerPx ?? 0.05;

    // Attach floorplan metadata to each raw point
    const rawFpPoints: VisualPathPointType[] = fp.points.map((p) => ({
      ...p,
      floorplanId: fp.floorplanId,
      floorplanName: fp.floorplanName,
      floorplanImage: fp.floorplanImage,
    }));

    // Preprocess points ONLY for this floorplan using its own scale
    const preprocessedFp = preprocessMovementLog(rawFpPoints, meterPerPx, 1.0);

    // Detect dwell points ONLY on this floorplan's coordinate space
    const dwellFp = detectDwellPoints(preprocessedFp, 35, 15);

    allProcessedPoints.push(...preprocessedFp);
    allDwellPoints.push(...dwellFp);
  });

  // Sort integrated points chronologically
  allProcessedPoints.sort(
    (a, b) => dayjs(cleanTimeStr(a.time)).valueOf() - dayjs(cleanTimeStr(b.time)).valueOf(),
  );

  // Sort integrated dwell points chronologically
  allDwellPoints.sort(
    (a, b) => dayjs(cleanTimeStr(a.startTime)).valueOf() - dayjs(cleanTimeStr(b.startTime)).valueOf(),
  );

  return {
    points: allProcessedPoints,
    dwellPoints: allDwellPoints,
  };
};

