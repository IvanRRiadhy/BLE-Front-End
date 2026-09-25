import React, { useState, useMemo, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import {
  Box,
  Card,
  Typography,
  Grid2 as Grid,
  Stack,
  Avatar,
  Chip,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TableSortLabel,
  LinearProgress,
  useTheme,
  Divider,
  CircularProgress,
  TextField,
  MenuItem,
  InputAdornment,
  Tooltip,
  Alert,
  darken,
  lighten,
} from '@mui/material';
import {
  IconClock,
  IconCalendar,
  IconMapPin,
  IconUser,
  IconMail,
  IconPhone,
  IconBuilding,
  IconId,
  IconAlertTriangle,
  IconCreditCard,
  IconBroadcast,
  IconShieldCheck,
  IconShieldX,
  IconBell,
  IconPlus,
  IconMinus,
  IconSearch,
  IconDownload,
  IconInfoCircle,
  IconFilter,
  IconEye,
  IconCopy,
  IconRoute,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useTranslation } from 'react-i18next';
import { PersonOverviewData } from 'src/hooks/useInvestigate';
import { PersonOption } from './NewInvestigateFilter';
import { actionStatus, extraActionStatus, actionStatusColormap } from 'src/types/crud/input';
import { BASE_URL } from 'src/utils/axios';
import BeaconRenderer from 'src/components/dashboards/monitoring/Renderer/BeaconRenderer';
import InvestigateContent from 'src/components/master/Reports/Investigation/InvestigateContent';
import { VisitorSessionResponseType } from 'src/store/apps/crud/visitorSession';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { safeParseAreaShape } from 'src/utils/isJsonObject';
import { toLocalDate, formatOrRawTime } from 'src/utils/time';

const AREA_COLORS = ['#1877F2', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#00B8D9'];

const normalizeImageUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

function getAreaPoints(
  area: MaskedAreaType | null | undefined,
  canvasWidth: number,
  canvasHeight: number,
  originalWidth: number,
  originalHeight: number
): number[] {
  if (!area) return [];
  let nodes: any[] = [];
  if (typeof area.areaShape === 'string' && area.areaShape.trim()) {
    try {
      const parsed = JSON.parse(area.areaShape);
      if (Array.isArray(parsed) && parsed.length > 0) {
        nodes = parsed;
      }
    } catch {
      nodes = safeParseAreaShape(area.areaShape);
    }
  }
  if ((!nodes || nodes.length === 0) && Array.isArray(area.nodes) && area.nodes.length > 0) {
    nodes = area.nodes;
  }

  if (!nodes || nodes.length < 3) return [];

  const origW = originalWidth > 0 ? originalWidth : canvasWidth;
  const origH = originalHeight > 0 ? originalHeight : canvasHeight;

  return nodes.flatMap((node: any) => {
    let px = 0;
    let py = 0;
    if (typeof node.x_px === 'number' && typeof node.y_px === 'number') {
      px = (node.x_px / origW) * canvasWidth;
      py = (node.y_px / origH) * canvasHeight;
    } else if (typeof node.x === 'number' && typeof node.y === 'number') {
      if (node.x <= 1 && node.y <= 1 && node.x >= 0 && node.y >= 0 && origW > 1) {
        px = node.x * canvasWidth;
        py = node.y * canvasHeight;
      } else {
        px = (node.x / origW) * canvasWidth;
        py = (node.y / origH) * canvasHeight;
      }
    }
    return [px, py];
  });
}

/**
 * Ray-casting algorithm to test if a point is strictly inside a polygon.
 */
function isPointInPolygon(x: number, y: number, pts: { x: number; y: number }[]): boolean {
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes the Center of Gravity (Centroid) of a 2D planar polygon using Gauss's area formula:
 *   Area: A = 0.5 * sum_{i=0}^{n-1} (x_i * y_{i+1} - x_{i+1} * y_i)
 *   C_x = (1 / (6 * A)) * sum_{i=0}^{n-1} (x_i + x_{i+1}) * (x_i * y_{i+1} - x_{i+1} * y_i)
 *   C_y = (1 / (6 * A)) * sum_{i=0}^{n-1} (y_i + y_{i+1}) * (x_i * y_{i+1} - x_{i+1} * y_i)
 *
 * If the center of gravity falls outside the boundary (e.g. for non-convex L-shaped or U-shaped rooms),
 * it selects the interior point closest to the center of gravity to ensure the pin stays inside the shape.
 */
function getPointsCenter(points: number[]): { x: number; y: number } | null {
  if (!points || points.length < 2) return null;
  if (points.length === 2) return { x: points[0], y: points[1] };
  if (points.length < 6) {
    return {
      x: (points[0] + points[2]) / 2,
      y: (points[1] + points[3]) / 2,
    };
  }

  // Extract vertices
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i += 2) {
    pts.push({ x: points[i], y: points[i + 1] });
  }

  // Remove duplicate closing point if present
  if (
    pts.length > 2 &&
    Math.abs(pts[pts.length - 1].x - pts[0].x) < 1e-6 &&
    Math.abs(pts[pts.length - 1].y - pts[0].y) < 1e-6
  ) {
    pts.pop();
  }

  const n = pts.length;
  if (n < 3) {
    let sumX = 0;
    let sumY = 0;
    for (const p of pts) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / n, y: sumY / n };
  }

  // Center of gravity calculation
  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];

    const cross = p0.x * p1.y - p1.x * p0.y;
    signedArea += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }

  signedArea *= 0.5;

  // Fallback for near-zero area / collinear points
  if (Math.abs(signedArea) < 1e-7) {
    let sumX = 0;
    let sumY = 0;
    for (const p of pts) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / n, y: sumY / n };
  }

  cx = cx / (6 * signedArea);
  cy = cy / (6 * signedArea);

  // If the center of gravity is inside the polygon, use it
  if (isPointInPolygon(cx, cy, pts)) {
    return { x: cx, y: cy };
  }

  // For concave shapes (like L-shapes) where the centroid lies in a cutout,
  // find the closest interior point to the center of gravity
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const stepX = (maxX - minX) / 32;
  const stepY = (maxY - minY) / 32;
  let bestPoint: { x: number; y: number } | null = null;
  let bestDist = Infinity;

  for (let x = minX + stepX / 2; x < maxX; x += stepX) {
    for (let y = minY + stepY / 2; y < maxY; y += stepY) {
      if (isPointInPolygon(x, y, pts)) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < bestDist) {
          bestDist = d;
          bestPoint = { x, y };
        }
      }
    }
  }

  return bestPoint || { x: cx, y: cy };
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  stayonarea: '#00cfff',
  boundary: '#5d3fd3',
  overpopulating: '#d633ff',
  cardaccess: '#b22222',
  wrongzone: '#5d3fd3',
  blacklist: '#ff7a00',
  geofence: '#ffcc00',
  help: '#e91e63',
  panic: '#f44336',
  tamper: '#9c27b0',
  loitering: '#ff9800',
  fall: '#e91e63',
};

const PALETTE_FALLBACK = [
  '#b22222', '#ff7a00', '#ffcc00', '#00cfff', '#5d3fd3',
  '#d633ff', '#00c853', '#1877f2', '#e91e63', '#9c27b0'
];

function getCategoryColor(category?: string, alarmColor?: string, index = 0): string {
  if (alarmColor && alarmColor.startsWith('#')) return alarmColor;
  const key = (category || '').toLowerCase().trim();
  if (DEFAULT_CATEGORY_COLORS[key]) return DEFAULT_CATEGORY_COLORS[key];
  return PALETTE_FALLBACK[index % PALETTE_FALLBACK.length];
}

// Map MUI color tokens from actionStatusColormap to specific chip color palettes
const COLOR_TOKEN_MAP: Record<string, { bgcolor: string; color: string }> = {
  'success.main': { bgcolor: '#E8F5E9', color: '#00C853' },
  'warning.main': { bgcolor: '#FFF4E5', color: '#FF9800' },
  'primary.main': { bgcolor: '#E8F2FE', color: '#1877F2' },
  'error.main': { bgcolor: '#FFEBEE', color: '#D32F2F' },
  'grey': { bgcolor: '#F1F5F9', color: '#64748B' },
};

function getStatusChipStyle(status?: string): { bgcolor: string; color: string; label: string } {
  if (!status) {
    return { bgcolor: '#FFEBEE', color: '#D32F2F', label: 'Active' };
  }

  const raw = status.trim();
  const lower = raw.toLowerCase().replace(/[\s_-]+/g, '');

  // 1. Look up human-friendly label from actionStatus and extraActionStatus in input.ts
  const allStatusDefinitions = [...actionStatus, ...extraActionStatus];
  const matchedDef = allStatusDefinitions.find((item) => {
    const valKey = (item.value || '').toLowerCase().replace(/[\s_-]+/g, '');
    const lblKey = (item.label || '').toLowerCase().replace(/[\s_-]+/g, '');
    return valKey === lower || lblKey === lower;
  });
  const label = matchedDef?.label || raw;

  // 2. Look up color from actionStatusColormap in input.ts
  let muiColorKey: string | undefined = undefined;
  for (const [key, val] of Object.entries(actionStatusColormap)) {
    if (key.toLowerCase().replace(/[\s_-]+/g, '') === lower) {
      muiColorKey = val;
      break;
    }
  }

  // Fallback for synonyms like 'resolved', 'closed', or 'active'
  if (!muiColorKey) {
    if (['resolved', 'done', 'doneinvestigated', 'closed'].includes(lower)) {
      muiColorKey = 'success.main';
    } else if (['acknowledged', 'accepted', 'investigated', 'arrived'].includes(lower)) {
      muiColorKey = 'primary.main';
    } else if (['dispatched', 'dispatch', 'waiting', 'postponeinvestigated'].includes(lower)) {
      muiColorKey = 'warning.main';
    } else {
      muiColorKey = 'error.main';
    }
  }

  const colors = COLOR_TOKEN_MAP[muiColorKey] || { bgcolor: '#FFEBEE', color: '#D32F2F' };
  return {
    bgcolor: colors.bgcolor,
    color: colors.color,
    label,
  };
}

interface NewInvestigateContentProps {
  data?: PersonOverviewData | null;
  isLoading?: boolean;
  selectedPerson?: PersonOption | null;
  fromDate?: string | null;
  toDate?: string | null;
  isExporting?: boolean;
  visitorSessionData?: VisitorSessionResponseType | null;
  isVisitorSessionLoading?: boolean;
}

const NewInvestigateContent: React.FC<NewInvestigateContentProps> = ({
  data,
  isLoading,
  selectedPerson,
  fromDate,
  toDate,
  isExporting = false,
  visitorSessionData,
  isVisitorSessionLoading = false,
}) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').startsWith('id') ? 'id' : 'en';
  const [activeTab, setActiveTab] = useState<'timeline' | 'movement' | 'area' | 'compliance' | 'incidents' | 'cardHistory'>('timeline');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedAlarmId, setSelectedAlarmId] = useState<string | null>(null);



  // Data Normalization
  const personName = data?.personInfo?.name || selectedPerson?.name || '-';
  const personType = data?.personInfo?.personType || selectedPerson?.type || 'Member';
  const identityId = data?.personInfo?.identityId || selectedPerson?.identityId || '-';
  const cardNumber = data?.currentState?.activeCardNumber || '-';
  const organization = data?.personInfo?.organization || '-';
  const department = data?.personInfo?.department || '-';
  const email = data?.personInfo?.email || '-';
  const phone = data?.personInfo?.phone || '-';

  const totalPresenceFormatted = data?.stayDurationAnalysis?.totalPresenceFormatted || '0 min';
  const totalAreasVisited = data?.accessCompliance?.totalAreasVisited ?? 0;
  const authorizedAreasVisited = data?.accessCompliance?.authorizedAreasVisited ?? 0;
  const unauthorizedAreasVisited = data?.accessCompliance?.unauthorizedAreasVisited ?? 0;
  const totalIncidents = data?.incidentSummary?.totalIncidents ?? 0;
  const activeIncidents = data?.incidentSummary?.activeIncidents ?? 0;
  const bleMac = data?.currentState?.activeBleMac || '-';
  const cardBattery = data?.currentState?.cardBattery ?? 0;

  const complianceScore = data?.accessCompliance?.complianceScore ?? 100;
  const isViolation = complianceScore < 100 || (data?.accessCompliance?.complianceStatus?.toLowerCase() === 'violation');

  const formattedFrom = fromDate ? dayjs(fromDate).format('MMM D, YYYY') : '-';
  const formattedTo = toDate ? dayjs(toDate).format('MMM D, YYYY') : '-';

  // Current State
  const presenceStatus = data?.currentState?.presenceStatus || 'Inactive';
  const currentBuilding = data?.currentState?.currentBuilding || '-';
  const currentFloor = data?.currentState?.currentFloor || '-';
  const currentArea = data?.currentState?.currentArea || '-';
  const lastSeenTimeStr = formatOrRawTime(data?.currentState?.lastSeenTime, 'MMM D, YYYY HH:mm');

  // Fetch all masked areas and floorplans
  const { data: allMaskedAreas = [] } = useAllMaskedAreas();
  const { data: allFloorplans = [] } = useAllFloorplans();

  // Find Masked Area for Current Location
  const currentMaskedArea = useMemo(() => {
    if (!allMaskedAreas || allMaskedAreas.length === 0) return null;
    const targetId = data?.currentState?.currentAreaId;
    const targetName = data?.currentState?.currentArea;

    if (targetId) {
      const found = allMaskedAreas.find(
        (a) => a.id === targetId || a.id?.toLowerCase() === targetId.toLowerCase()
      );
      if (found) return found;
    }
    if (targetName && targetName !== '-') {
      const trimmed = targetName.trim().toLowerCase();
      const found = allMaskedAreas.find(
        (a) =>
          (a.name && a.name.trim().toLowerCase() === trimmed) ||
          (a.areaName && a.areaName.trim().toLowerCase() === trimmed) ||
          (a.maskedAreaName && a.maskedAreaName.trim().toLowerCase() === trimmed)
      );
      if (found) return found;
    }
    return null;
  }, [allMaskedAreas, data?.currentState?.currentAreaId, data?.currentState?.currentArea]);

  // Floorplan image setup
  const floorplanImageUrl = useMemo(() => {
    if (data?.currentState?.floorplanImage) {
      return normalizeImageUrl(data.currentState.floorplanImage);
    }
    if (currentMaskedArea?.floorplan?.floorplanImage) {
      return normalizeImageUrl(currentMaskedArea.floorplan.floorplanImage);
    }
    if (currentMaskedArea?.floorplanId && allFloorplans.length > 0) {
      const fp = allFloorplans.find((f: any) => f.id === currentMaskedArea.floorplanId);
      if (fp?.floorplanImage) return normalizeImageUrl(fp.floorplanImage);
    }
    return null;
  }, [data, currentMaskedArea, allFloorplans]);

  const [floorplanImgObj, setFloorplanImgObj] = useState<HTMLImageElement | null>(null);
  const [imgDim, setImgDim] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (!floorplanImageUrl) {
      setFloorplanImgObj(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = floorplanImageUrl;
    img.onload = () => {
      setFloorplanImgObj(img);
      setImgDim({ width: img.width || 600, height: img.height || 400 });
    };
    img.onerror = () => {
      setFloorplanImgObj(null);
    };
  }, [floorplanImageUrl]);

  const stageScale = Math.min(420 / (imgDim.width || 1), 220 / (imgDim.height || 1));
  const stageWidth = Math.max(280, imgDim.width * stageScale);
  const stageHeight = Math.max(180, imgDim.height * stageScale);

  // Scaled Area Shape Points for Current Location
  const currentAreaPoints = useMemo(() => {
    return getAreaPoints(
      currentMaskedArea,
      stageWidth,
      stageHeight,
      imgDim.width,
      imgDim.height
    );
  }, [currentMaskedArea, stageWidth, stageHeight, imgDim]);

  const currentCenter = useMemo(() => {
    return getPointsCenter(currentAreaPoints);
  }, [currentAreaPoints]);

  const currentBeaconX = currentCenter?.x ?? (stageWidth * 0.45);
  const currentBeaconY = currentCenter?.y ?? (stageHeight * 0.45);

  // Filtered time boundaries (ms)
  const filterMinTime = useMemo(() => {
    if (fromDate) {
      const ms = dayjs(fromDate).valueOf();
      if (!isNaN(ms)) return ms;
    }
    if (data?.stayDurationAnalysis?.firstDetected) {
      const str = String(data.stayDurationAnalysis.firstDetected).trim();
      const ms = str.endsWith('Z') || str.endsWith('z')
        ? dayjs(toLocalDate(str)!).valueOf()
        : dayjs(str).valueOf();
      if (!isNaN(ms)) return ms;
    }
    return undefined;
  }, [fromDate, data?.stayDurationAnalysis?.firstDetected]);

  const filterMaxTime = useMemo(() => {
    if (toDate) {
      const ms = dayjs(toDate).valueOf();
      if (!isNaN(ms)) return ms;
    }
    if (data?.stayDurationAnalysis?.lastDetected) {
      const str = String(data.stayDurationAnalysis.lastDetected).trim();
      const ms = str.endsWith('Z') || str.endsWith('z')
        ? dayjs(toLocalDate(str)!).valueOf()
        : dayjs(str).valueOf();
      if (!isNaN(ms)) return ms;
    }
    return undefined;
  }, [toDate, data?.stayDurationAnalysis?.lastDetected]);

  // Presence Over Time ApexChart (Timeline / RangeBar Chart)
  const presenceTimelineSeries = useMemo(() => {
    if (!data?.chronologicalTimeline || data.chronologicalTimeline.length === 0) return [];
    
    const breakdown = data?.stayDurationAnalysis?.areaBreakdown || [];
    const grouped: Record<string, { x: string; y: [number, number] }[]> = {};
    const timeline = data.chronologicalTimeline;

    // Sort breakdown by areaName length descending so longer/more specific names (e.g. "Ruangan Programmer B") match first
    const sortedBreakdown = [...breakdown].sort(
      (a, b) => (b.areaName?.length || 0) - (a.areaName?.length || 0)
    );

    for (let i = 0; i < timeline.length; i++) {
      const item = timeline[i];
      const nextItem = timeline[i + 1];

      const parseTs = (ts?: string | null): number => {
        if (!ts) return NaN;
        const str = String(ts).trim();
        if (str.endsWith('Z') || str.endsWith('z')) {
          return toLocalDate(str)?.getTime() ?? NaN;
        }
        return dayjs(str).valueOf();
      };

      const rawStart = parseTs(item.timestamp);
      const rawEnd = nextItem ? parseTs(nextItem.timestamp) : new Date().getTime();

      if (isNaN(rawStart) || isNaN(rawEnd)) continue;

      let startTime = rawStart;
      let endTime = rawEnd;

      // Clamp to user filtered boundaries so chart data cannot exceed filter range
      if (filterMinTime !== undefined) {
        startTime = Math.max(startTime, filterMinTime);
      }
      if (filterMaxTime !== undefined) {
        endTime = Math.min(endTime, filterMaxTime);
      }

      if (endTime > startTime) {
        const locLower = (item.location || '').toLowerCase();
        const titleLower = (item.title || '').toLowerCase();

        const matchedArea = sortedBreakdown.find((b) => {
          const bName = (b.areaName || '').toLowerCase();
          return (locLower && locLower.includes(bName)) || (titleLower && titleLower.includes(bName));
        });
        const areaName = matchedArea?.areaName || item.location || 'Unknown Area';

        if (!grouped[areaName]) {
          grouped[areaName] = [];
        }
        grouped[areaName].push({
          x: areaName,
          y: [startTime, endTime],
        });
      }
    }

    // Preserve the exact order and colors from areaBreakdown
    const breakdownNames = breakdown.map((b) => b.areaName);
    const seriesList: { name: string; data: { x: string; y: [number, number] }[] }[] = [];

    breakdown.forEach((b) => {
      seriesList.push({
        name: b.areaName,
        data: grouped[b.areaName] || [],
      });
    });

    // Also append any other areas detected that were not in areaBreakdown
    Object.keys(grouped).forEach((areaName) => {
      if (!breakdownNames.includes(areaName)) {
        seriesList.push({
          name: areaName,
          data: grouped[areaName],
        });
      }
    });

    return seriesList;
  }, [data?.chronologicalTimeline, data?.stayDurationAnalysis?.areaBreakdown, filterMinTime, filterMaxTime]);

  const presenceTimelineOptions: ApexCharts.ApexOptions = useMemo(() => {
    return {
      chart: {
        type: 'rangeBar',
        height: 220,
        toolbar: {
          show: !isExporting,
          tools: {
            download: false,
            selection: false,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
          autoSelected: 'pan',
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: false,
        },
        events: {
          beforeZoom: (chartContext, { xaxis }) => {
            let min = xaxis.min;
            let max = xaxis.max;
            if (filterMinTime !== undefined && min < filterMinTime) {
              min = filterMinTime;
            }
            if (filterMaxTime !== undefined && max > filterMaxTime) {
              max = filterMaxTime;
            }
            return {
              xaxis: {
                min,
                max,
              },
            };
          },
          beforeResetZoom: () => {
            return {
              xaxis: {
                min: filterMinTime,
                max: filterMaxTime,
              },
            };
          },
          zoomed: (chartContext, { xaxis }) => {
            if (filterMinTime !== undefined && filterMaxTime !== undefined) {
              const clampedMin = Math.max(xaxis.min, filterMinTime);
              const clampedMax = Math.min(xaxis.max, filterMaxTime);
              if (xaxis.min < filterMinTime || xaxis.max > filterMaxTime) {
                chartContext.zoomX(clampedMin, clampedMax);
              }
            }
          },
          scrolled: (chartContext, { xaxis }) => {
            if (filterMinTime !== undefined && filterMaxTime !== undefined) {
              const clampedMin = Math.max(xaxis.min, filterMinTime);
              const clampedMax = Math.min(xaxis.max, filterMaxTime);
              if (xaxis.min < filterMinTime || xaxis.max > filterMaxTime) {
                chartContext.zoomX(clampedMin, clampedMax);
              }
            }
          },
        },
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '40%',
          rangeBarGroupRows: true,
        },
      },
      colors: AREA_COLORS,
      fill: { type: 'solid' },
      xaxis: {
        type: 'datetime',
        min: filterMinTime,
        max: filterMaxTime,
        labels: {
          datetimeFormatter: {
            year: 'yyyy',
            month: "MMM 'yy",
            day: 'MMM d',
            hour: 'HH:mm',
          },
        },
      },
      legend: { show: false },
      tooltip: {
        x: { format: 'MMM d, HH:mm' },
      },
      grid: {
        borderColor: theme.palette.divider,
        strokeDashArray: 3,
      },
    };
  }, [theme, filterMinTime, filterMaxTime, isExporting]);

  // Radial Bar for Access Compliance
  const complianceChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'radialBar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '65%',
        },
        track: {
          background: '#F1F5F9',
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            offsetY: 8,
            color: isViolation ? '#D32F2F' : '#00C853',
            fontSize: '20px',
            fontWeight: '700',
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
    colors: [isViolation ? '#FF4842' : '#00C853'],
    labels: ['Compliance Score'],
  };



  // Fetch members and visitors for robust fallback image matching
  const { data: allMembers = [] } = useAllMembers();
  const { data: allVisitors = [] } = useAllVisitor();

  const matchedPerson = useMemo(() => {
    const targetId = data?.personInfo?.personId || selectedPerson?.id;
    const targetIdentity = data?.personInfo?.identityId || selectedPerson?.identityId;
    if (targetId) {
      const m = allMembers.find((item: any) => item.id === targetId || item.personId === targetId);
      if (m) return m;
      const v = allVisitors.find((item: any) => item.id === targetId || item.personId === targetId);
      if (v) return v;
    }
    if (targetIdentity && targetIdentity !== '-') {
      const m = allMembers.find((item: any) => item.identityId === targetIdentity);
      if (m) return m;
      const v = allVisitors.find((item: any) => item.identityId === targetIdentity);
      if (v) return v;
    }
    return null;
  }, [allMembers, allVisitors, data?.personInfo, selectedPerson]);

  const rawPersonImage =
    (data?.personInfo as any)?.faceImageUrl ||
    data?.personInfo?.faceImage ||
    (matchedPerson as any)?.faceImageUrl ||
    (matchedPerson as any)?.faceImage ||
    selectedPerson?.avatarUrl ||
    null;

  const personAvatarUrl = normalizeImageUrl(rawPersonImage);

  // Avatar Initials
  const initials = personName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Area Breakdown list
  const areaBreakdownList = data?.stayDurationAnalysis?.areaBreakdown || [];

  // Timeline List
  const chronologicalTimelineList = data?.chronologicalTimeline || [];

  // Computed Area Visits list dynamically derived from API response
  const areaVisitsList = useMemo(() => {
    if (!areaBreakdownList || areaBreakdownList.length === 0) return [];

    const timeline = data?.chronologicalTimeline || [];
    const areaMovementEvents = timeline.filter(
      (t) =>
        t.eventType === 'AREA_ENTER' ||
        t.eventType === 'AREA_TRANSITION' ||
        t.title?.toLowerCase().startsWith('entered') ||
        t.title?.toLowerCase().startsWith('moved to')
    );

    return areaBreakdownList.map((area, idx) => {
      // If API provides visits or visitCount, use it directly
      const directVisits = area.visits ?? area.visitCount;
      if (typeof directVisits === 'number' && directVisits > 0) {
        return {
          id: area.areaId || String(idx),
          name: area.areaName,
          count: directVisits,
          color: AREA_COLORS[idx % AREA_COLORS.length],
        };
      }

      // Otherwise compute visits by counting matching timeline movement events
      const sortedAreas = [...areaBreakdownList].sort(
        (a, b) => (b.areaName?.length || 0) - (a.areaName?.length || 0)
      );
      const matchedEvents = areaMovementEvents.filter((ev) => {
        const loc = (ev.location || '').toLowerCase();
        const title = (ev.title || '').toLowerCase();
        const bestMatched = sortedAreas.find((b) => {
          const bName = (b.areaName || '').toLowerCase();
          return (loc && loc.includes(bName)) || (title && title.includes(bName));
        });
        return bestMatched?.areaName === area.areaName;
      });

      const count = matchedEvents.length > 0 ? matchedEvents.length : 1;

      return {
        id: area.areaId || String(idx),
        name: area.areaName,
        count,
        color: AREA_COLORS[idx % AREA_COLORS.length],
      };
    });
  }, [areaBreakdownList, data?.chronologicalTimeline]);

  const maxVisits = useMemo(() => {
    if (areaVisitsList.length === 0) return 1;
    return Math.max(...areaVisitsList.map((a) => a.count), 1);
  }, [areaVisitsList]);

  const areaVisitsMap = useMemo(() => {
    const map: Record<string, number> = {};
    areaVisitsList.forEach((item) => {
      map[item.name] = item.count;
      if (item.id) map[item.id] = item.count;
    });
    return map;
  }, [areaVisitsList]);

  // Breaches List
  const breachesList = data?.accessCompliance?.unauthorizedBreaches || [];

  // Alarms List
  const alarmsList = data?.incidentSummary?.alarms || [];

  // Card History List
  const cardHistoryList = data?.cardHistory || [];

  // Assigned Access Groups & Allowed Areas
  const assignedAccessGroups = data?.accessCompliance?.assignedAccessGroups || [];
  const allowedAreaList = data?.accessCompliance?.allowedAreaList || [];

  // Compliance Breakdown counts
  const normalAreasCount = useMemo(() => {
    return areaBreakdownList.filter((a) => !a.isRestrictedArea).length;
  }, [areaBreakdownList]);

  const restrictedAreasCount = useMemo(() => {
    return areaBreakdownList.filter((a) => a.isRestrictedArea).length;
  }, [areaBreakdownList]);

  const acknowledgedIncidents = useMemo(() => {
    return alarmsList.filter((a: any) => {
      const chipInfo = getStatusChipStyle(a.status);
      return chipInfo.label.toLowerCase() === 'acknowledged' || chipInfo.label.toLowerCase() === 'acknowledge';
    }).length;
  }, [alarmsList]);

  const resolvedIncidents = useMemo(() => {
    return alarmsList.filter((a: any) => {
      const st = a.status?.toLowerCase();
      return st === 'resolved' || st === 'done' || st === 'done_investigated' || st === 'closed';
    }).length;
  }, [alarmsList]);

  // Active Incidents: non-resolved alarms (matches backend incidentSummary.activeIncidents)
  const activeIncidentsComputed = useMemo(() => {
    if (data?.incidentSummary?.activeIncidents !== undefined) {
      return data.incidentSummary.activeIncidents;
    }
    return alarmsList.filter((a: any) => {
      const st = a.status?.toLowerCase();
      return st !== 'resolved' && st !== 'done' && st !== 'done_investigated' && st !== 'closed';
    }).length;
  }, [data?.incidentSummary?.activeIncidents, alarmsList]);

  const incidentsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    const categoryColorMap: Record<string, string> = {};

    alarmsList.forEach((a: any) => {
      const rawCat = a.category || 'Other';
      const formatted = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
      counts[formatted] = (counts[formatted] || 0) + 1;
      if (!categoryColorMap[formatted] && a.alarmColor) {
        categoryColorMap[formatted] = a.alarmColor;
      }
    });

    const labels = Object.keys(counts);
    const series = Object.values(counts);
    const colors = labels.map((cat, idx) => {
      return getCategoryColor(cat, categoryColorMap[cat], idx);
    });

    return {
      labels: labels.length > 0 ? labels : ['None'],
      series: series.length > 0 ? series : [0],
      colors: colors.length > 0 ? colors : ['#1877F2'],
      total: alarmsList.length,
    };
  }, [alarmsList]);

  const incidentsByStatus = useMemo(() => {
    // Dynamically categorize each alarm by its actual action status
    // Every alarm must belong to exactly ONE mutually exclusive category so the chart sum equals total
    const counts: Record<string, number> = {};

    alarmsList.forEach((a: any) => {
      const chipInfo = getStatusChipStyle(a.status);
      const label = chipInfo.label;
      counts[label] = (counts[label] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const series = Object.values(counts);
    const colors = labels.map((lbl) => getStatusChipStyle(lbl).color);
    const total = alarmsList.length;

    return {
      counts,
      labels: labels.length > 0 ? labels : ['None'],
      series: series.length > 0 ? series : [0],
      colors: colors.length > 0 ? colors : ['#00C853'],
      total,
    };
  }, [alarmsList]);

  // Primary / Selected Incident for detail display
  const primaryAlarm = useMemo(() => {
    if (selectedAlarmId) {
      const found = alarmsList.find((a: any) => (a.alarmId || a.id) === selectedAlarmId);
      if (found) return found;
    }
    return alarmsList.length > 0 ? alarmsList[0] : null;
  }, [alarmsList, selectedAlarmId]);

  // Masked Area for the selected Incident
  const incidentMaskedArea = useMemo(() => {
    if (!allMaskedAreas || allMaskedAreas.length === 0 || !primaryAlarm) return null;
    const targetId = primaryAlarm.areaId;
    const targetName = primaryAlarm.areaName || primaryAlarm.area;

    if (targetId) {
      const found = allMaskedAreas.find(
        (a) => a.id === targetId || a.id?.toLowerCase() === targetId.toLowerCase()
      );
      if (found) return found;
    }
    if (targetName && targetName !== '-') {
      const trimmed = targetName.trim().toLowerCase();
      const found = allMaskedAreas.find(
        (a) =>
          (a.name && a.name.trim().toLowerCase() === trimmed) ||
          (a.areaName && a.areaName.trim().toLowerCase() === trimmed) ||
          (a.maskedAreaName && a.maskedAreaName.trim().toLowerCase() === trimmed)
      );
      if (found) return found;
    }
    return null;
  }, [allMaskedAreas, primaryAlarm]);

  // Incident Floorplan Image URL
  const incidentFloorplanUrl = useMemo(() => {
    let path = primaryAlarm?.floorplanImage;
    if (!path && incidentMaskedArea?.floorplan?.floorplanImage) {
      path = incidentMaskedArea.floorplan.floorplanImage;
    }
    if (!path && incidentMaskedArea?.floorplanId && allFloorplans.length > 0) {
      const fp = allFloorplans.find((f: any) => f.id === incidentMaskedArea.floorplanId);
      if (fp?.floorplanImage) path = fp.floorplanImage;
    }
    if (!path && data?.currentState?.floorplanImage) {
      if (!primaryAlarm?.floorName || primaryAlarm.floorName === currentFloor) {
        path = data.currentState.floorplanImage;
      }
    }
    return normalizeImageUrl(path);
  }, [primaryAlarm, incidentMaskedArea, allFloorplans, data?.currentState?.floorplanImage, currentFloor]);

  const [incidentImgObj, setIncidentImgObj] = useState<HTMLImageElement | null>(null);
  const [incidentImgDim, setIncidentImgDim] = useState({ width: 600, height: 400 });
  const [incidentZoomLevel, setIncidentZoomLevel] = useState(1);

  useEffect(() => {
    if (!incidentFloorplanUrl) {
      setIncidentImgObj(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = incidentFloorplanUrl;
    img.onload = () => {
      setIncidentImgObj(img);
      setIncidentImgDim({ width: img.width || 600, height: img.height || 400 });
    };
    img.onerror = () => {
      setIncidentImgObj(null);
    };
  }, [incidentFloorplanUrl]);

  const incidentStageScale = Math.min(420 / (incidentImgDim.width || 1), 240 / (incidentImgDim.height || 1));
  const incidentStageWidth = Math.max(280, incidentImgDim.width * incidentStageScale);
  const incidentStageHeight = Math.max(180, incidentImgDim.height * incidentStageScale);

  const incidentAreaPoints = useMemo(() => {
    return getAreaPoints(
      incidentMaskedArea,
      incidentStageWidth,
      incidentStageHeight,
      incidentImgDim.width,
      incidentImgDim.height
    );
  }, [incidentMaskedArea, incidentStageWidth, incidentStageHeight, incidentImgDim]);

  const incidentCenter = useMemo(() => {
    return getPointsCenter(incidentAreaPoints);
  }, [incidentAreaPoints]);

  const incidentMarkerX = incidentCenter?.x ?? (incidentStageWidth * 0.5);
  const incidentMarkerY = incidentCenter?.y ?? (incidentStageHeight * 0.5);

  // --- Table 1: Area Detail (activeTab === 'area') ---
  const [areaDetailSearch, setAreaDetailSearch] = useState('');
  const [areaDetailPage, setAreaDetailPage] = useState(0);
  const [areaDetailRowsPerPage, setAreaDetailRowsPerPage] = useState(5);
  const [areaDetailOrderBy, setAreaDetailOrderBy] = useState<string>('areaName');
  const [areaDetailOrder, setAreaDetailOrder] = useState<'asc' | 'desc'>('asc');

  const filteredSortedAreaDetail = useMemo(() => {
    let list = [...areaBreakdownList];
    if (areaDetailSearch.trim()) {
      const q = areaDetailSearch.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.areaName && item.areaName.toLowerCase().includes(q)) ||
          (item.buildingName && item.buildingName.toLowerCase().includes(q)) ||
          (item.floorName && item.floorName.toLowerCase().includes(q))
      );
    }
    list.sort((a: any, b: any) => {
      let aVal: any = '';
      let bVal: any = '';
      if (areaDetailOrderBy === 'areaName') {
        aVal = a.areaName || '';
        bVal = b.areaName || '';
      } else if (areaDetailOrderBy === 'buildingFloor') {
        aVal = `${a.buildingName || ''} ${a.floorName || ''}`;
        bVal = `${b.buildingName || ''} ${b.floorName || ''}`;
      } else if (areaDetailOrderBy === 'visits') {
        aVal = areaVisitsMap[a.areaName] ?? areaVisitsMap[a.areaId] ?? a.visits ?? a.visitCount ?? 1;
        bVal = areaVisitsMap[b.areaName] ?? areaVisitsMap[b.areaId] ?? b.visits ?? b.visitCount ?? 1;
      } else if (areaDetailOrderBy === 'duration') {
        aVal = a.durationSeconds ?? a.durationMinutes ?? 0;
        bVal = b.durationSeconds ?? b.durationMinutes ?? 0;
      } else if (areaDetailOrderBy === 'percentage') {
        aVal = a.percentage ?? 0;
        bVal = b.percentage ?? 0;
      } else if (areaDetailOrderBy === 'isRestrictedArea') {
        aVal = a.isRestrictedArea ? 1 : 0;
        bVal = b.isRestrictedArea ? 1 : 0;
      } else if (areaDetailOrderBy === 'isAllowedByAccess') {
        aVal = a.isAllowedByAccess ? 1 : 0;
        bVal = b.isAllowedByAccess ? 1 : 0;
      }
      if (typeof aVal === 'string') {
        return areaDetailOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return areaDetailOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [areaBreakdownList, areaDetailSearch, areaDetailOrderBy, areaDetailOrder, areaVisitsMap]);

  const pagedAreaDetail = useMemo(() => {
    const start = areaDetailPage * areaDetailRowsPerPage;
    return filteredSortedAreaDetail.slice(start, start + areaDetailRowsPerPage);
  }, [filteredSortedAreaDetail, areaDetailPage, areaDetailRowsPerPage]);

  // --- Table 2: Unauthorized Access Breaches (Timeline tab & Compliance tab) ---
  const [breachesPage, setBreachesPage] = useState(0);
  const [breachesRowsPerPage, setBreachesRowsPerPage] = useState(5);
  const [breachesOrderBy, setBreachesOrderBy] = useState<string>('enteredAt');
  const [breachesOrder, setBreachesOrder] = useState<'asc' | 'desc'>('desc');

  const sortedBreaches = useMemo(() => {
    const list = [...breachesList];
    list.sort((a: any, b: any) => {
      let aVal: any = '';
      let bVal: any = '';
      if (breachesOrderBy === 'area') {
        aVal = a.areaName || a.area || a.name || '';
        bVal = b.areaName || b.area || b.name || '';
      } else if (breachesOrderBy === 'buildingFloor') {
        aVal = `${a.buildingName || a.building || ''} ${a.floorName || a.floor || ''}`;
        bVal = `${b.buildingName || b.building || ''} ${b.floorName || b.floor || ''}`;
      } else if (breachesOrderBy === 'enteredAt') {
        aVal = new Date(a.enteredAt || a.timestamp || a.time || 0).getTime();
        bVal = new Date(b.enteredAt || b.timestamp || b.time || 0).getTime();
      } else if (breachesOrderBy === 'duration') {
        aVal = a.durationMinutes ?? a.durationSeconds ?? 0;
        bVal = b.durationMinutes ?? b.durationSeconds ?? 0;
      } else if (breachesOrderBy === 'alarm') {
        aVal = a.alarmTriggered || a.hasAlarm || a.alarm ? 1 : 0;
        bVal = b.alarmTriggered || b.hasAlarm || b.alarm ? 1 : 0;
      } else if (breachesOrderBy === 'category') {
        aVal = a.alarmCategory || a.category || '';
        bVal = b.alarmCategory || b.category || '';
      } else if (breachesOrderBy === 'reason') {
        aVal = a.reason || '';
        bVal = b.reason || '';
      }
      if (typeof aVal === 'string') {
        return breachesOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return breachesOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [breachesList, breachesOrderBy, breachesOrder]);

  const pagedBreaches = useMemo(() => {
    const start = breachesPage * breachesRowsPerPage;
    return sortedBreaches.slice(start, start + breachesRowsPerPage);
  }, [sortedBreaches, breachesPage, breachesRowsPerPage]);

  // --- Table 3: Incident & Alarm List (activeTab === 'incidents') ---
  const [alarmSearch, setAlarmSearch] = useState('');
  const [alarmPage, setAlarmPage] = useState(0);
  const [alarmRowsPerPage, setAlarmRowsPerPage] = useState(5);
  const [alarmOrderBy, setAlarmOrderBy] = useState<string>('triggeredTime');
  const [alarmOrder, setAlarmOrder] = useState<'asc' | 'desc'>('desc');

  const filteredSortedAlarms = useMemo(() => {
    let list = [...alarmsList];
    if (alarmSearch.trim()) {
      const q = alarmSearch.toLowerCase().trim();
      list = list.filter((item: any) => {
        const cat = (item.category || '').toLowerCase();
        const area = (item.areaName || item.area || '').toLowerCase();
        const st = (item.status || '').toLowerCase();
        const bld = (item.buildingName || '').toLowerCase();
        const flr = (item.floorName || '').toLowerCase();
        const ack = (item.acknowledgedBy || '').toLowerCase();
        return cat.includes(q) || area.includes(q) || st.includes(q) || bld.includes(q) || flr.includes(q) || ack.includes(q);
      });
    }
    list.sort((a: any, b: any) => {
      let aVal: any = '';
      let bVal: any = '';
      if (alarmOrderBy === 'triggeredTime') {
        aVal = new Date(a.triggeredTime || a.timestamp || a.time || 0).getTime();
        bVal = new Date(b.triggeredTime || b.timestamp || b.time || 0).getTime();
      } else if (alarmOrderBy === 'category') {
        aVal = a.category || '';
        bVal = b.category || '';
      } else if (alarmOrderBy === 'area') {
        aVal = a.areaName || a.area || '';
        bVal = b.areaName || b.area || '';
      } else if (alarmOrderBy === 'buildingFloor') {
        aVal = `${a.buildingName || ''} ${a.floorName || ''}`;
        bVal = `${b.buildingName || ''} ${b.floorName || ''}`;
      } else if (alarmOrderBy === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      } else if (alarmOrderBy === 'acknowledgedBy') {
        aVal = a.acknowledgedBy || '';
        bVal = b.acknowledgedBy || '';
      } else if (alarmOrderBy === 'acknowledgedTime') {
        aVal = new Date(a.acknowledgedTime || 0).getTime();
        bVal = new Date(b.acknowledgedTime || 0).getTime();
      }
      if (typeof aVal === 'string') {
        return alarmOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return alarmOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [alarmsList, alarmSearch, alarmOrderBy, alarmOrder]);

  const pagedAlarms = useMemo(() => {
    const start = alarmPage * alarmRowsPerPage;
    return filteredSortedAlarms.slice(start, start + alarmRowsPerPage);
  }, [filteredSortedAlarms, alarmPage, alarmRowsPerPage]);

  // --- Table 4: Card Assignment & Activity Log (activeTab === 'cardHistory') ---
  const [cardHistoryPage, setCardHistoryPage] = useState(0);
  const [cardHistoryRowsPerPage, setCardHistoryRowsPerPage] = useState(5);
  const [cardHistoryOrderBy, setCardHistoryOrderBy] = useState<string>('checkinAt');
  const [cardHistoryOrder, setCardHistoryOrder] = useState<'asc' | 'desc'>('desc');

  const sortedCardHistory = useMemo(() => {
    const list = [...cardHistoryList];
    list.sort((a: any, b: any) => {
      let aVal: any = '';
      let bVal: any = '';
      if (cardHistoryOrderBy === 'checkinAt') {
        aVal = new Date(a.checkinAt || a.timestamp || a.date || 0).getTime();
        bVal = new Date(b.checkinAt || b.timestamp || b.date || 0).getTime();
      } else if (cardHistoryOrderBy === 'cardNumber') {
        aVal = a.cardNumber || '';
        bVal = b.cardNumber || '';
      } else if (cardHistoryOrderBy === 'bleCardNumber') {
        aVal = a.bleCardNumber || '';
        bVal = b.bleCardNumber || '';
      } else if (cardHistoryOrderBy === 'event') {
        aVal = a.isActive ? 1 : 0;
        bVal = b.isActive ? 1 : 0;
      } else if (cardHistoryOrderBy === 'status') {
        aVal = a.isActive ? 1 : 0;
        bVal = b.isActive ? 1 : 0;
      } else if (cardHistoryOrderBy === 'issuedBy') {
        aVal = a.checkinBy || '';
        bVal = b.checkinBy || '';
      }
      if (typeof aVal === 'string') {
        return cardHistoryOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return cardHistoryOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [cardHistoryList, cardHistoryOrderBy, cardHistoryOrder]);

  const pagedCardHistory = useMemo(() => {
    const start = cardHistoryPage * cardHistoryRowsPerPage;
    return sortedCardHistory.slice(start, start + cardHistoryRowsPerPage);
  }, [sortedCardHistory, cardHistoryPage, cardHistoryRowsPerPage]);

  if (!selectedPerson && !data && !visitorSessionData) {
    return (
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          p: 6,
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Stack alignItems="center" justifyContent="center" spacing={2}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: '#E8F2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1877F2',
            }}
          >
            <IconUser size={32} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
              Select a Person to Investigate
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a person from the filter above to view their detailed timeline, location, and access analysis.
            </Typography>
          </Box>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* 1. Header Profile Banner Card */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          p: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
          {/* Avatar */}
          <Avatar
            src={personAvatarUrl || undefined}
            alt={personName}
            sx={{
              width: 72,
              height: 72,
              bgcolor: personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
              color: personType === 'Member' ? '#1877F2' : '#B06000',
              fontWeight: 700,
              fontSize: '24px',
              border: '2px solid',
              borderColor: personType === 'Member' ? 'primary.light' : '#FFD599',
            }}
          >
            {initials}
          </Avatar>

          {/* Name & Identifiers */}
          <Box sx={{ minWidth: 200, flexShrink: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                {personName}
              </Typography>
              <Chip
                label={<span style={{ color: personType === 'Member' ? '#1877F2' : '#B06000', fontWeight: 600, fontSize: '12px' }}>{personType}</span>}
                size="small"
                sx={{
                  bgcolor: personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
                  borderRadius: '12px',
                }}
              />
            </Stack>

            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconUser size={16} color={theme.palette.text.secondary} />
                <Typography variant="caption" color="text.secondary">
                  Identity ID
                </Typography>
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {identityId}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <IconId size={16} color={theme.palette.text.secondary} />
                <Typography variant="caption" color="text.secondary">
                  Card
                </Typography>
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {cardNumber}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Organization & Dept */}
          <Box sx={{ minWidth: 180 }}>
            <Stack spacing={1}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Organization
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {organization}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Department
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {department}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Contact Details */}
          <Box sx={{ minWidth: 220 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconMail size={16} color={theme.palette.text.secondary} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Email
                  </Typography>
                  <Typography variant="body2" fontWeight={500} color="text.primary">
                    {email}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconPhone size={16} color={theme.palette.text.secondary} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Phone
                  </Typography>
                  <Typography variant="body2" fontWeight={500} color="text.primary">
                    {phone}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Status (Current) */}
          <Box sx={{ minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Status (Current)
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" my={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00C853' }} />
              <Typography variant="subtitle1" fontWeight={700} color="#00C853">
                {presenceStatus}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Since {lastSeenTimeStr.split(' ').pop()}
            </Typography>
          </Box>

          {/* Access Compliance Banner Card */}
          <Box
            sx={{
              ml: 'auto',
              p: 2,
              borderRadius: '12px',
              bgcolor: isViolation ? '#FDF2F2' : '#E6F4EA',
              border: '1px solid',
              borderColor: isViolation ? '#FFCDD2' : '#C8E6C9',
              minWidth: 180,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: isViolation ? '#FFEBEE' : '#E8F5E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isViolation ? <IconShieldX size={20} color="#D32F2F" /> : <IconShieldCheck size={20} color="#00C853" />}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Access Compliance
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} color={isViolation ? '#D32F2F' : '#00C853'}>
                  {isViolation ? 'Violation' : 'Compliant'}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Score {complianceScore}%
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* 2. Top Summary KPI Cards (5 Cards) */}
      <Grid container spacing={2}>
        {/* Total Presence */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconClock size={22} color="#1877F2" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Presence
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {totalPresenceFormatted}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {formattedFrom} – {formattedTo}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Areas Visited */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconMapPin size={22} color="#1877F2" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Areas Visited
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {totalAreasVisited}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {authorizedAreasVisited} allowed / {unauthorizedAreasVisited} unauthorized
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Total Incidents */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#FFEBEE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconAlertTriangle size={22} color="#D32F2F" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Incidents
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {totalIncidents}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {activeIncidentsComputed} active incident{activeIncidentsComputed === 1 ? '' : 's'}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Active Card */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconCreditCard size={22} color="#1877F2" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Active Card
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                  {cardNumber}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.2}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                    Battery {cardBattery}%
                  </Typography>
                  <Box sx={{ width: 20, height: 8, bgcolor: '#00C853', borderRadius: '2px' }} />
                </Stack>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Active BLE MAC */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconBroadcast size={22} color="#1877F2" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Active BLE MAC
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                  {bleMac}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                    Good Signal
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Sub Navigation Bar (Tabs) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1}>
          {[
            { id: 'timeline', label: 'Timeline', icon: IconClock },
            { id: 'movement', label: 'Movement Replay', icon: IconRoute },
            { id: 'area', label: 'Area Analysis', icon: IconMapPin },
            { id: 'compliance', label: 'Access Compliance', icon: IconShieldCheck },
            { id: 'incidents', label: 'Incidents & Alarms', icon: IconBell },
            { id: 'cardHistory', label: 'Card History', icon: IconCreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                startIcon={<Icon size={18} />}
                sx={{
                  py: 1,
                  px: 2,
                  textTransform: 'none',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  borderBottom: isActive ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  borderRadius: 0,
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Stack>
      </Box>

      {/* 4. Tab Content */}
      {activeTab === 'timeline' && (
        <>
          {/* Presence Over Time & Current Location Cards */}
          <Grid container spacing={2.5}>
            {/* Presence Over Time */}
            <Grid size={{ xs: 12, md: isExporting ? 12 : 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Presence Over Time
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Timeline of this person's presence in the selected period
                  </Typography>
                </Box>

                <Box sx={{ height: 210, width: '100%' }}>
                  <Chart options={presenceTimelineOptions} series={presenceTimelineSeries} type="rangeBar" height={200} width="100%" />
                </Box>

                {/* Custom Legend */}
                {presenceTimelineSeries.length > 0 && (
                  <Stack direction="row" spacing={2} justifyContent="flex-start" mt={1} flexWrap="wrap">
                    {presenceTimelineSeries.map((s, idx) => (
                      <Stack key={s.name || idx} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: AREA_COLORS[idx % AREA_COLORS.length] }} />
                        <Typography variant="caption" fontWeight={600}>
                          {s.name}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Card>
            </Grid>

            {/* Current Location (Excluded in Export) */}
            {!isExporting && (
              <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Current Location
                  </Typography>
                  <Chip
                    label={<span style={{ color: '#00C853', fontWeight: 600, fontSize: '12px' }}>Active</span>}
                    size="small"
                    icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853', ml: 1 }} />}
                    sx={{ bgcolor: '#E6F4EA', borderRadius: '12px' }}
                  />
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <IconBuilding size={20} color={theme.palette.text.secondary} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                      {currentBuilding} – {currentFloor}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentArea}
                    </Typography>
                  </Box>
                </Stack>

                {/* Floorplan Preview Canvas */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 220,
                    borderRadius: '12px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {floorplanImgObj ? (
                    <Box sx={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s linear' }}>
                      <Stage width={stageWidth} height={stageHeight}>
                        <Layer>
                          <KonvaImage image={floorplanImgObj} width={stageWidth} height={stageHeight} />
                          {currentAreaPoints.length >= 6 && (
                            <Line
                              points={currentAreaPoints}
                              stroke={currentMaskedArea?.colorArea ? darken(currentMaskedArea.colorArea, 0.4) : '#1877F2'}
                              strokeWidth={3}
                              lineJoin="round"
                              lineCap="round"
                              closed
                              fill={currentMaskedArea?.colorArea || 'rgba(24, 119, 242, 0.3)'}
                              opacity={0.5}
                              listening={false}
                            />
                          )}
                          <BeaconRenderer
                            id="current-investigate-beacon"
                            x={currentBeaconX}
                            y={currentBeaconY}
                            beaconSize={1.1}
                            clickable={false}
                            label={personName}
                            isSecurity={personType === 'Security'}
                            isMember={personType === 'Member'}
                            isVisitor={personType === 'Visitor'}
                            iconType="photo"
                            faceImage={personAvatarUrl || undefined}
                            area={currentArea}
                            floorplan={currentFloor}
                            time={lastSeenTimeStr}
                          />
                        </Layer>
                      </Stage>
                    </Box>
                  ) : (
                    <Stack alignItems="center" spacing={1} py={4}>
                      <CircularProgress size={24} />
                      <Typography variant="caption" color="text.secondary">
                        Loading floorplan image...
                      </Typography>
                    </Stack>
                  )}

                  {/* Map Zoom Controls */}
                  <Stack
                    spacing={0.5}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      bgcolor: 'background.paper',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.5,
                      zIndex: 5,
                    }}
                  >
                    <IconButton size="small" onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.8))}>
                      <IconPlus size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.6))}>
                      <IconMinus size={16} />
                    </IconButton>
                  </Stack>

                  {/* Floor Chip */}
                  <Chip
                    label={currentFloor}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      fontWeight: 600,
                      zIndex: 5,
                    }}
                  />
                </Box>
              </Card>
            </Grid>
          )}
          </Grid>

          {/* Bottom Section Grid */}
          <Grid container spacing={2.5}>
            {/* Left Column: Chronological Timeline */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Box sx={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', height: '100%' }}>
                <Card
                  elevation={0}
                  sx={{
                    position: { xs: 'relative', md: 'absolute' },
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '16px',
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: { xs: 520, md: 'none' },
                  }}
                >
                  <Box mb={2} sx={{ flexShrink: 0 }}>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Chronological Timeline
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Complete history of movement and security events
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}>
                  <Stack
                    spacing={2.5}
                    sx={{
                      position: 'relative',
                      pl: 3,
                      py: 0.5,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 8,
                        top: 8,
                        bottom: 8,
                        width: 2,
                        bgcolor: 'divider',
                      },
                    }}
                  >
                    {chronologicalTimelineList.map((item, idx) => {
                      const isAlarm = item.badge === 'Danger' || item.eventType === 'ALARM';
                      const isPrimary = item.badge === 'Primary' || item.eventType === 'CURRENT_POSITION';
                      const nodeColor = isAlarm ? '#D32F2F' : isPrimary ? '#1877F2' : '#00C853';
                      const badgeBg = isAlarm ? '#FFEBEE' : isPrimary ? '#E8F2FE' : '#E6F4EA';
                      const badgeTextColor = isAlarm ? '#D32F2F' : isPrimary ? '#1877F2' : '#00C853';
                      // Format date and time according to current language
                      let dateStr = '';
                      let timeStr = '18:28';
                      if (item.timestamp) {
                        const parsedDate = toLocalDate(item.timestamp);
                        if (parsedDate && !isNaN(parsedDate.getTime())) {
                          const d = dayjs(parsedDate).locale(currentLang);
                          dateStr = d.format('ddd, DD MMM YYYY');
                          timeStr = d.format('HH:mm');
                        } else {
                          const d = dayjs(item.timestamp).locale(currentLang);
                          if (d.isValid()) {
                            dateStr = d.format('ddd, DD MMM YYYY');
                            timeStr = d.format('HH:mm');
                          } else {
                            timeStr = String(item.timestamp);
                          }
                        }
                      }

                      return (
                        <Box key={idx} sx={{ position: 'relative' }}>
                          {/* Node Dot */}
                          <Box
                            sx={{
                              position: 'absolute',
                              left: -24,
                              top: 2,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              bgcolor: nodeColor,
                              border: '3px solid #fff',
                              boxShadow: 1,
                            }}
                          />

                          <Grid container spacing={1.5} alignItems="flex-start">
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Typography variant="caption" fontWeight={700} color="text.primary" display="block" sx={{ lineHeight: 1.25 }}>
                                {timeStr}
                              </Typography>
                              {dateStr && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '11px', mt: 0.25, lineHeight: 1.2 }}>
                                  {dateStr}
                                </Typography>
                              )}
                            </Grid>

                            <Grid size={{ xs: 8, sm: 5.5 }}>
                              <Typography variant="body2" fontWeight={700} color="text.primary">
                                {item.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.description}
                              </Typography>
                              <Typography variant="caption" fontWeight={600} color="text.primary">
                                {item.location}
                              </Typography>
                            </Grid>

                            <Grid size={{ xs: 4, sm: 2.5 }} sx={{ textAlign: 'right' }}>
                              <Chip
                                label={item.badge}
                                size="small"
                                sx={{
                                  height: 20,
                                  bgcolor: badgeBg,
                                  color: badgeTextColor,
                                  fontWeight: 700,
                                  fontSize: '10px',
                                  borderRadius: '10px',
                                }}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Card>
            </Box>
          </Grid>

            {/* Right Column: Area Analysis, Access Compliance, Unauthorized Breaches */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                {/* Card 1: Area Stay Analysis */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
                  <Box mb={2}>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Area Stay Analysis
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total time spent in each area during the selected period
                    </Typography>
                  </Box>

                  <TableContainer sx={{ maxHeight: 320, overflowY: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {areaBreakdownList.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{row.areaName}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                              {row.buildingName} {row.floorName}
                            </TableCell>
                            <TableCell>{row.durationFormatted}</TableCell>
                            <TableCell sx={{ width: 120 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" fontWeight={600}>
                                  {row.percentage}%
                                </Typography>
                                <Box sx={{ flex: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={row.percentage}
                                    sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9' }}
                                  />
                                </Box>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>

                {/* Card 2: Access Compliance */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Access Compliance
                    </Typography>
                    <Chip
                      label={isViolation ? 'Violation' : 'Compliant'}
                      size="small"
                      icon={isViolation ? <IconShieldX size={14} color="#D32F2F" /> : <IconShieldCheck size={14} color="#00C853" />}
                      sx={{
                        bgcolor: isViolation ? '#FFEBEE' : '#E8F5E9',
                        color: isViolation ? '#D32F2F' : '#00C853',
                        fontWeight: 700,
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={3} alignItems="center">
                    <Box sx={{ width: 140, height: 140 }}>
                      <Chart options={complianceChartOptions} series={[complianceScore]} type="radialBar" height={150} />
                    </Box>

                    <Stack spacing={1.5} sx={{ flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1877F2' }} />
                          <Typography variant="body2" color="text.secondary">
                            Total Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {totalAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853' }} />
                          <Typography variant="body2" color="text.secondary">
                            Authorized Areas
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {authorizedAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D32F2F' }} />
                          <Typography variant="body2" color="text.secondary">
                            Unauthorized Areas
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {unauthorizedAreasVisited}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>

                {/* Card 3: Unauthorized Access Breaches */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
                  <Box mb={2}>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Unauthorized Access Breaches
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      List of areas accessed without proper authorization
                    </Typography>
                  </Box>

                  <TableContainer sx={{ maxHeight: 320, overflowY: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={breachesOrderBy === 'area'}
                              direction={breachesOrderBy === 'area' ? breachesOrder : 'asc'}
                              onClick={() => {
                                const isAsc = breachesOrderBy === 'area' && breachesOrder === 'asc';
                                setBreachesOrder(isAsc ? 'desc' : 'asc');
                                setBreachesOrderBy('area');
                              }}
                            >
                              Area
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={breachesOrderBy === 'buildingFloor'}
                              direction={breachesOrderBy === 'buildingFloor' ? breachesOrder : 'asc'}
                              onClick={() => {
                                const isAsc = breachesOrderBy === 'buildingFloor' && breachesOrder === 'asc';
                                setBreachesOrder(isAsc ? 'desc' : 'asc');
                                setBreachesOrderBy('buildingFloor');
                              }}
                            >
                              Building / Floor
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={breachesOrderBy === 'enteredAt'}
                              direction={breachesOrderBy === 'enteredAt' ? breachesOrder : 'asc'}
                              onClick={() => {
                                const isAsc = breachesOrderBy === 'enteredAt' && breachesOrder === 'asc';
                                setBreachesOrder(isAsc ? 'desc' : 'asc');
                                setBreachesOrderBy('enteredAt');
                              }}
                            >
                              Entered At
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={breachesOrderBy === 'duration'}
                              direction={breachesOrderBy === 'duration' ? breachesOrder : 'asc'}
                              onClick={() => {
                                const isAsc = breachesOrderBy === 'duration' && breachesOrder === 'asc';
                                setBreachesOrder(isAsc ? 'desc' : 'asc');
                                setBreachesOrderBy('duration');
                              }}
                            >
                              Duration
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <TableSortLabel
                              active={breachesOrderBy === 'alarm'}
                              direction={breachesOrderBy === 'alarm' ? breachesOrder : 'asc'}
                              onClick={() => {
                                const isAsc = breachesOrderBy === 'alarm' && breachesOrder === 'asc';
                                setBreachesOrder(isAsc ? 'desc' : 'asc');
                                setBreachesOrderBy('alarm');
                              }}
                            >
                              Alarm
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedBreaches.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              No unauthorized access breaches recorded
                            </TableCell>
                          </TableRow>
                        ) : (
                          pagedBreaches.map((row: any, idx: number) => {
                            const actualIdx = breachesPage * breachesRowsPerPage + idx;
                            const areaName = row.areaName || row.area || row.name || '-';
                            const building = row.buildingName || row.building;
                            const floor = row.floorName || row.floor;
                            const buildingFloor =
                              building || floor
                                ? `${building || '-'}${floor ? ` (${floor})` : ''}`
                                : row.buildingFloor || '-';

                            const durationStr =
                              row.durationFormatted ||
                              (row.durationMinutes != null
                                ? row.durationMinutes >= 60
                                  ? `${Math.floor(row.durationMinutes / 60)}h ${row.durationMinutes % 60}m`
                                  : `${row.durationMinutes} min`
                                : row.duration || '-');

                            const enteredAtStr = formatOrRawTime(
                              row.enteredAt || row.timestamp || row.time,
                              'MMM D, YYYY HH:mm:ss'
                            );

                            const isAlarmTriggered = Boolean(
                              row.alarmTriggered || row.hasAlarm || row.alarm
                            );

                            return (
                              <TableRow key={row.areaId || row.id || actualIdx}>
                                <TableCell>{actualIdx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{areaName}</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                                  {buildingFloor}
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px' }}>{enteredAtStr}</TableCell>
                                <TableCell>{durationStr}</TableCell>
                                <TableCell>
                                  {isAlarmTriggered ? (
                                    <Tooltip title={row.reason || (row.alarmCategory ? `Alarm: ${row.alarmCategory}` : 'Alarm Triggered')}>
                                      <IconButton size="small" color="error" sx={{ bgcolor: '#FFEBEE', p: 0.5 }}>
                                        <IconBell size={16} />
                                      </IconButton>
                                    </Tooltip>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sortedBreaches.length}
                    rowsPerPage={breachesRowsPerPage}
                    page={breachesPage}
                    onPageChange={(_, newPage) => setBreachesPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setBreachesRowsPerPage(parseInt(e.target.value, 10));
                      setBreachesPage(0);
                    }}
                    sx={{
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      '.MuiTablePagination-toolbar': { minHeight: 40, px: 1 },
                      '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '12px', mb: 0 },
                    }}
                  />
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}

      {/* Area Analysis Tab View */}
      {activeTab === 'area' && (
        <Stack spacing={3}>
          {/* Top Row: Time Spent by Area & Area Visits */}
          <Grid container spacing={2.5}>
            {/* Time Spent by Area */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Time Spent by Area
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distribution of this person's presence duration in each area
                  </Typography>
                </Box>
                <Stack spacing={2.5} mt={3} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
                  {areaBreakdownList.map((row, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>
                          {row.areaName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={700}>
                            {row.durationFormatted}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ width: 45, textAlign: 'right' }}>
                            {row.percentage}%
                          </Typography>
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={row.percentage}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: '#F1F5F9',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: AREA_COLORS[idx % AREA_COLORS.length],
                            borderRadius: 5,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Area Visits */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Visits
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Number of visits to each area
                  </Typography>
                </Box>
                {areaVisitsList.length === 0 ? (
                  <Box py={4} textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      No area visits recorded
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2.5} mt={3} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
                    {areaVisitsList.map((item, idx) => (
                      <Box key={item.id || idx}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {item.count}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={(item.count / maxVisits) * 100}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: '#F1F5F9',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: item.color,
                              borderRadius: 5,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Card>
            </Grid>
          </Grid>

          {/* Middle Row: Area Presence Over Time & Floorplan View */}
          <Grid container spacing={2.5}>
            {/* Area Presence Over Time */}
            <Grid size={{ xs: 12, md: isExporting ? 12 : 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Presence Over Time
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Shows where the person was located across the selected period
                  </Typography>
                </Box>

                <Box sx={{ height: 220, width: '100%' }}>
                  <Chart options={presenceTimelineOptions} series={presenceTimelineSeries} type="rangeBar" height={210} width="100%" />
                </Box>

                {/* Legend */}
                <Stack direction="row" spacing={2} justifyContent="flex-start" flexWrap="wrap" gap={1.5} mt={1.5}>
                  {areaBreakdownList.map((row, idx) => (
                    <Stack key={row.areaId || idx} direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: AREA_COLORS[idx % AREA_COLORS.length] }} />
                      <Typography variant="caption" fontWeight={600}>
                        {row.areaName}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Floorplan View (Excluded in Export) */}
            {!isExporting && (
              <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Floorplan View
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last known location and areas visited
                    </Typography>
                  </Box>
                  <TextField
                    select
                    size="small"
                    defaultValue="gedung-buni-lantai-2"
                    sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' } }}
                  >
                    <MenuItem value="gedung-buni-lantai-2">Gedung Buni - Lantai 2 Buni</MenuItem>
                    <MenuItem value="gedung-buni-lantai-1">Gedung Buni - Lantai 1</MenuItem>
                  </TextField>
                </Stack>

                {/* Floorplan Map Canvas */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 220,
                    borderRadius: '12px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {floorplanImgObj ? (
                    <Box sx={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s linear' }}>
                      <Stage width={stageWidth} height={stageHeight}>
                        <Layer>
                          <KonvaImage image={floorplanImgObj} width={stageWidth} height={stageHeight} />
                          {currentAreaPoints.length >= 6 && (
                            <Line
                              points={currentAreaPoints}
                              stroke={currentMaskedArea?.colorArea ? darken(currentMaskedArea.colorArea, 0.4) : '#1877F2'}
                              strokeWidth={3}
                              lineJoin="round"
                              lineCap="round"
                              closed
                              fill={currentMaskedArea?.colorArea || 'rgba(24, 119, 242, 0.3)'}
                              opacity={0.5}
                              listening={false}
                            />
                          )}
                          <BeaconRenderer
                            id="area-investigate-beacon"
                            x={currentBeaconX}
                            y={currentBeaconY}
                            beaconSize={1.1}
                            clickable={false}
                            label={personName}
                            isSecurity={personType === 'Security'}
                            isMember={personType === 'Member'}
                            isVisitor={personType === 'Visitor'}
                            iconType="photo"
                            faceImage={personAvatarUrl || undefined}
                            area={currentArea}
                            floorplan={currentFloor}
                            time={lastSeenTimeStr}
                          />
                        </Layer>
                      </Stage>
                    </Box>
                  ) : (
                    <Stack alignItems="center" spacing={1} py={4}>
                      <CircularProgress size={24} />
                      <Typography variant="caption" color="text.secondary">
                        Loading floorplan image...
                      </Typography>
                    </Stack>
                  )}

                  {/* Zoom Controls */}
                  <Stack
                    spacing={0.5}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      bgcolor: 'background.paper',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.5,
                      zIndex: 5,
                    }}
                  >
                    <IconButton size="small" onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.8))}>
                      <IconPlus size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.6))}>
                      <IconMinus size={16} />
                    </IconButton>
                  </Stack>
                </Box>

                {/* Map Footer Legend */}
                <Stack direction="row" spacing={2} justifyContent="flex-start" mt={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1877F2' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Current Location
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4FC3F7' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Visited Area
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#9C27B0' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Other Visited Area
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          )}
          </Grid>

          {/* Bottom Table: Area Detail */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Area Detail
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Detailed breakdown of time spent in each area
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  placeholder="Search area..."
                  size="small"
                  value={areaDetailSearch}
                  onChange={(e) => {
                    setAreaDetailSearch(e.target.value);
                    setAreaDetailPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={16} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <Button variant="outlined" color="inherit" size="small" startIcon={<IconDownload size={16} />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                  Export
                </Button>
              </Stack>
            </Stack>

            <TableContainer sx={{ maxHeight: 420, overflowY: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={areaDetailOrderBy === 'areaName'}
                        direction={areaDetailOrderBy === 'areaName' ? areaDetailOrder : 'asc'}
                        onClick={() => {
                          const isAsc = areaDetailOrderBy === 'areaName' && areaDetailOrder === 'asc';
                          setAreaDetailOrder(isAsc ? 'desc' : 'asc');
                          setAreaDetailOrderBy('areaName');
                        }}
                      >
                        Area
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={areaDetailOrderBy === 'buildingFloor'}
                        direction={areaDetailOrderBy === 'buildingFloor' ? areaDetailOrder : 'asc'}
                        onClick={() => {
                          const isAsc = areaDetailOrderBy === 'buildingFloor' && areaDetailOrder === 'asc';
                          setAreaDetailOrder(isAsc ? 'desc' : 'asc');
                          setAreaDetailOrderBy('buildingFloor');
                        }}
                      >
                        Building / Floor
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={areaDetailOrderBy === 'visits'}
                        direction={areaDetailOrderBy === 'visits' ? areaDetailOrder : 'asc'}
                        onClick={() => {
                          const isAsc = areaDetailOrderBy === 'visits' && areaDetailOrder === 'asc';
                          setAreaDetailOrder(isAsc ? 'desc' : 'asc');
                          setAreaDetailOrderBy('visits');
                        }}
                      >
                        Visits
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={areaDetailOrderBy === 'duration'}
                        direction={areaDetailOrderBy === 'duration' ? areaDetailOrder : 'asc'}
                        onClick={() => {
                          const isAsc = areaDetailOrderBy === 'duration' && areaDetailOrder === 'asc';
                          setAreaDetailOrder(isAsc ? 'desc' : 'asc');
                          setAreaDetailOrderBy('duration');
                        }}
                      >
                        Total Duration
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={areaDetailOrderBy === 'percentage'}
                        direction={areaDetailOrderBy === 'percentage' ? areaDetailOrder : 'asc'}
                        onClick={() => {
                          const isAsc = areaDetailOrderBy === 'percentage' && areaDetailOrder === 'asc';
                          setAreaDetailOrder(isAsc ? 'desc' : 'asc');
                          setAreaDetailOrderBy('percentage');
                        }}
                      >
                        Percentage
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={areaDetailOrderBy === 'isRestrictedArea'}
                        direction={areaDetailOrderBy === 'isRestrictedArea' ? areaDetailOrder : 'asc'}
                        onClick={() => {
                          const isAsc = areaDetailOrderBy === 'isRestrictedArea' && areaDetailOrder === 'asc';
                          setAreaDetailOrder(isAsc ? 'desc' : 'asc');
                          setAreaDetailOrderBy('isRestrictedArea');
                        }}
                      >
                        Restricted Area
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={areaDetailOrderBy === 'isAllowedByAccess'}
                        direction={areaDetailOrderBy === 'isAllowedByAccess' ? areaDetailOrder : 'asc'}
                        onClick={() => {
                          const isAsc = areaDetailOrderBy === 'isAllowedByAccess' && areaDetailOrder === 'asc';
                          setAreaDetailOrder(isAsc ? 'desc' : 'asc');
                          setAreaDetailOrderBy('isAllowedByAccess');
                        }}
                      >
                        Allowed by Access
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSortedAreaDetail.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No area detail records available
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedAreaDetail.map((row, idx) => {
                      const actualIdx = areaDetailPage * areaDetailRowsPerPage + idx;
                      return (
                        <TableRow key={row.areaId || actualIdx}>
                          <TableCell>{actualIdx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.areaName || '-'}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                            {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {areaVisitsMap[row.areaName] ?? areaVisitsMap[row.areaId] ?? row.visits ?? row.visitCount ?? 1}
                          </TableCell>
                          <TableCell>{row.durationFormatted || (row.durationMinutes ? `${row.durationMinutes} min` : '-')}</TableCell>
                          <TableCell sx={{ width: 140 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" fontWeight={600} sx={{ width: 40 }}>
                                {row.percentage}%
                              </Typography>
                              <Box sx={{ flex: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={row.percentage}
                                  sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9' }}
                                />
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>{row.isRestrictedArea ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            {row.isAllowedByAccess ? (
                              <Chip label="Yes" size="small" icon={<IconShieldCheck size={14} color="#00C853" />} sx={{ bgcolor: '#E8F5E9', color: '#00C853', fontWeight: 700 }} />
                            ) : (
                              <Chip label="No" size="small" icon={<IconShieldX size={14} color="#D32F2F" />} sx={{ bgcolor: '#FFEBEE', color: '#D32F2F', fontWeight: 700 }} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredSortedAreaDetail.length}
              rowsPerPage={areaDetailRowsPerPage}
              page={areaDetailPage}
              onPageChange={(_, newPage) => setAreaDetailPage(newPage)}
              onRowsPerPageChange={(e) => {
                setAreaDetailRowsPerPage(parseInt(e.target.value, 10));
                setAreaDetailPage(0);
              }}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                '.MuiTablePagination-toolbar': { minHeight: 40, px: 1 },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '12px', mb: 0 },
              }}
            />
          </Card>
        </Stack>
      )}

      {/* Movement Replay Tab View (Excluded in Export) */}
      {activeTab === 'movement' && !isExporting && (() => {
        // Calculate the 1-day date target:
        // If range covers today or extends past today, use today.
        // If whole range is in the past, use the last day of the range (toDate).
        const now = dayjs();
        const startDay = fromDate ? dayjs(fromDate).startOf('day') : null;
        const endDay = toDate ? dayjs(toDate).endOf('day') : null;

        let targetDay = now;
        if (startDay && endDay) {
          if (now.isAfter(endDay)) {
            targetDay = dayjs(toDate);
          } else if (now.isBefore(startDay)) {
            targetDay = dayjs(fromDate);
          } else {
            targetDay = now;
          }
        } else if (endDay && now.isAfter(endDay)) {
          targetDay = dayjs(toDate);
        } else {
          targetDay = now;
        }

        const displayDayStr = targetDay.locale(currentLang).format('dddd, DD MMMM YYYY');
        const movementFromIso = targetDay.startOf('day').toISOString();
        const movementToIso = targetDay.endOf('day').toISOString();

        return (
          <Box sx={{ width: '100%' }}>
            {/* Warning Box at the top */}
            <Alert
              severity="warning"
              icon={<IconAlertTriangle size={20} />}
              sx={{
                mb: 2.5,
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '13.5px',
                border: '1px solid',
                borderColor: '#FFE082',
                bgcolor: '#FFF8E1',
                color: '#B78103',
                '& .MuiAlert-icon': {
                  color: '#F59E0B',
                },
              }}
            >
              Movement displayed only for 1 day ({displayDayStr})
            </Alert>

            <InvestigateContent
              initialSessionData={visitorSessionData}
              showHeader={false}
              selectedPersonOption={selectedPerson}
              fromDate={movementFromIso}
              toDate={movementToIso}
              isLoading={isVisitorSessionLoading}
            />
          </Box>
        );
      })()}

      {/* Access Compliance Tab View */}
      {activeTab === 'compliance' && (
        <Stack spacing={3}>
          {/* Top Row: Access Compliance Overview & Access Rights */}
          <Grid container spacing={2.5}>
            {/* Access Compliance Overview */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Access Compliance Overview
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Analysis of this person's access rights and area visits in the selected period
                  </Typography>
                </Box>

                <Stack direction="row" spacing={3} alignItems="center" mt={2}>
                  <Box sx={{ width: 150, height: 150, flexShrink: 0 }}>
                    <Chart options={complianceChartOptions} series={[complianceScore]} type="radialBar" height={160} />
                  </Box>

                  <Stack spacing={2} sx={{ flex: 1 }}>
                    <Box sx={{ bgcolor: isViolation ? '#FFF2F2' : '#F0FDF4', border: '1px solid', borderColor: isViolation ? '#FFCDD2' : '#BBF7D0', borderRadius: '12px', p: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        {isViolation ? <IconShieldX size={18} color="#D32F2F" /> : <IconShieldCheck size={18} color="#00C853" />}
                        <Typography variant="subtitle2" fontWeight={700} color={isViolation ? '#D32F2F' : '#00C853'}>
                          {isViolation ? 'Violation' : 'Compliant'}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {isViolation ? 'Person has accessed unauthorized area(s)' : 'All area visits are properly authorized'}
                      </Typography>
                    </Box>

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconCreditCard size={16} color={theme.palette.text.secondary} />
                          <Typography variant="body2" color="text.secondary">
                            Total Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {totalAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconShieldCheck size={16} color="#00C853" />
                          <Typography variant="body2" color="text.secondary">
                            Authorized Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {authorizedAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconAlertTriangle size={16} color="#D32F2F" />
                          <Typography variant="body2" color="text.secondary">
                            Unauthorized Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {unauthorizedAreasVisited}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
              </Card>
            </Grid>

            {/* Access Rights */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Access Rights
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Assigned access groups and permissions
                    </Typography>
                  </Box>
                  <Chip
                    label={assignedAccessGroups.length > 0 ? `${assignedAccessGroups.length} Access Group${assignedAccessGroups.length > 1 ? 's' : ''}` : 'No Group'}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      borderRadius: '8px',
                      fontSize: '11px',
                      bgcolor: assignedAccessGroups.length > 0 ? '#E8F2FE' : '#F1F5F9',
                      color: assignedAccessGroups.length > 0 ? '#1877F2' : 'text.secondary',
                    }}
                  />
                </Stack>

                {/* Main Content Area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  {assignedAccessGroups.length > 0 ? (
                    assignedAccessGroups.map((group: any, idx: number) => {
                      const groupName = group.accessName || group.name || 'Access Group';
                      return (
                        <Box
                          key={idx}
                          sx={{
                            border: '1px solid',
                            borderColor: '#BEDBFF',
                            borderRadius: '12px',
                            p: 2,
                            bgcolor: '#F4F8FF',
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                            <Box
                              sx={{
                                width: 38,
                                height: 38,
                                borderRadius: '10px',
                                bgcolor: '#1877F2',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(24, 119, 242, 0.25)',
                              }}
                            >
                              <IconShieldCheck size={22} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                                {groupName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Assigned Access Profile
                              </Typography>
                            </Box>
                            <Chip
                              label={`${allowedAreaList.length || group.allowedAreasCount || 0} Allowed Areas`}
                              size="small"
                              sx={{ bgcolor: '#E8F2FE', color: '#1877F2', fontWeight: 700, fontSize: '11px', border: '1px solid #BEDBFF' }}
                            />
                          </Stack>

                          {/* Allowed Areas Chips */}
                          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                            Permitted Areas:
                          </Typography>
                          {allowedAreaList.length > 0 ? (
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                              {allowedAreaList.map((area: string, aIdx: number) => (
                                <Chip
                                  key={aIdx}
                                  icon={<IconShieldCheck size={14} color="#00C853" />}
                                  label={area}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    bgcolor: '#FFFFFF',
                                    borderColor: '#BBF7D0',
                                    color: 'text.primary',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    py: 0.5,
                                    '& .MuiChip-icon': { ml: 0.8 },
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontStyle="italic">
                              {group.allowedAreasCount ? `${group.allowedAreasCount} areas configured in group` : 'No specific areas listed'}
                            </Typography>
                          )}
                        </Box>
                      );
                    })
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#F8FAFC',
                        borderRadius: '12px',
                        p: 3,
                        border: '1px dashed',
                        borderColor: 'divider',
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1.5,
                          color: 'text.secondary',
                        }}
                      >
                        <IconShieldX size={24} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary" textAlign="center">
                        No Access Group Assigned
                      </Typography>
                      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: 360, mt: 0.5 }}>
                        This person does not have an assigned access group. All area visits will be validated against default rules.
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    bgcolor: unauthorizedAreasVisited > 0 ? '#FFF5F5' : '#EBF5FF',
                    border: '1px solid',
                    borderColor: unauthorizedAreasVisited > 0 ? '#FFCDD2' : '#BEDBFF',
                    borderRadius: '10px',
                    p: 1.5,
                    mt: 'auto',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    {unauthorizedAreasVisited > 0 ? (
                      <IconAlertTriangle size={20} color="#D32F2F" style={{ flexShrink: 0, marginTop: 2 }} />
                    ) : (
                      <IconInfoCircle size={20} color="#1877F2" style={{ flexShrink: 0, marginTop: 2 }} />
                    )}
                    <Box>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={unauthorizedAreasVisited > 0 ? '#D32F2F' : '#1877F2'}
                        display="block"
                      >
                        {unauthorizedAreasVisited > 0 ? 'Violation Notice' : 'Note'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {unauthorizedAreasVisited > 0
                          ? `This person accessed ${unauthorizedAreasVisited} area(s) that are not in the allowed list.`
                          : 'All area visits by this person are properly authorized.'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Middle Row: Area Access Comparison, Access Status by Area, Area Type */}
          <Grid container spacing={2.5}>
            {/* Area Access Comparison */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Access Comparison
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Breakdown of visited areas based on access permission
                  </Typography>
                </Box>

                <Stack spacing={2} mt={3}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Authorized Areas</Typography>
                      <Typography variant="body2" fontWeight={700}>{authorizedAreasVisited}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={totalAreasVisited > 0 ? (authorizedAreasVisited / totalAreasVisited) * 100 : 0}
                      sx={{ height: 14, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#00C853' } }}
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Unauthorized Areas</Typography>
                      <Typography variant="body2" fontWeight={700}>{unauthorizedAreasVisited}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={totalAreasVisited > 0 ? (unauthorizedAreasVisited / totalAreasVisited) * 100 : 0}
                      sx={{ height: 14, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#FF5630' } }}
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Restricted Areas</Typography>
                      <Typography variant="body2" fontWeight={700}>{restrictedAreasCount}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={totalAreasVisited > 0 ? (restrictedAreasCount / totalAreasVisited) * 100 : 0}
                      sx={{ height: 14, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#FF5630' } }}
                    />
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={4}>
                  Number of Areas
                </Typography>
              </Card>
            </Grid>

            {/* Access Status by Area */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Access Status by Area
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Access permission status for each visited area
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    options={{
                      chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                      colors: ['#00C853', '#FF5630'],
                      labels: ['Authorized', 'Unauthorized'], 
                      legend: { show: false },
                      dataLabels: { enabled: false },
                      plotOptions: {
                        pie: {
                          donut: {
                            size: '75%',
                            labels: {
                              show: true,
                              total: {
                                show: true,
                                label: 'Areas Visited',
                                fontSize: '12px',
                                color: '#64748B',
                                formatter: () => `${totalAreasVisited}`,
                              },
                            },
                          },
                        },
                      },
                    }}
                    series={[authorizedAreasVisited, unauthorizedAreasVisited]}
                    type="donut"
                    width="100%"
                    height={180}
                  />
                </Box>

                <Stack spacing={1} mt={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00C853' }} />
                      <Typography variant="caption" color="text.secondary">Authorized</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {authorizedAreasVisited} ({totalAreasVisited > 0 ? ((authorizedAreasVisited / totalAreasVisited) * 100).toFixed(1) : 0}%)
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF5630' }} />
                      <Typography variant="caption" color="text.secondary">Unauthorized</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {unauthorizedAreasVisited} ({totalAreasVisited > 0 ? ((unauthorizedAreasVisited / totalAreasVisited) * 100).toFixed(1) : 0}%)
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>

            {/* Area Type */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Type
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Classification of visited areas
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    options={{
                      chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                      colors: ['#00C853', '#FF5630'],
                      labels: ['Normal', 'Restricted'], 
                      legend: { show: false },
                      dataLabels: { enabled: false },
                      plotOptions: {
                        pie: {
                          donut: {
                            size: '75%',
                            labels: {
                              show: true,
                              total: {
                                show: true,
                                label: 'Areas Visited',
                                fontSize: '12px',
                                color: '#64748B',
                                formatter: () => `${normalAreasCount + restrictedAreasCount}`,
                              },
                            },
                          },
                        },
                      },
                    }}
                    series={[normalAreasCount, restrictedAreasCount]}
                    type="donut"
                    width="100%"
                    height={180}
                  />
                </Box>

                <Stack spacing={1} mt={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00C853' }} />
                      <Typography variant="caption" color="text.secondary">Normal Area</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {normalAreasCount} ({(normalAreasCount + restrictedAreasCount > 0 ? (normalAreasCount / (normalAreasCount + restrictedAreasCount)) * 100 : 0).toFixed(1)}%)
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF5630' }} />
                      <Typography variant="caption" color="text.secondary">Restricted Area</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {restrictedAreasCount} ({(normalAreasCount + restrictedAreasCount > 0 ? (restrictedAreasCount / (normalAreasCount + restrictedAreasCount)) * 100 : 0).toFixed(1)}%)
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Bottom Table: Unauthorized Access Breaches */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Unauthorized Access Breaches
              </Typography>
              <Typography variant="caption" color="text.secondary">
                List of areas accessed without proper authorization
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 420, overflowY: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={breachesOrderBy === 'area'}
                        direction={breachesOrderBy === 'area' ? breachesOrder : 'asc'}
                        onClick={() => {
                          const isAsc = breachesOrderBy === 'area' && breachesOrder === 'asc';
                          setBreachesOrder(isAsc ? 'desc' : 'asc');
                          setBreachesOrderBy('area');
                        }}
                      >
                        Area
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={breachesOrderBy === 'buildingFloor'}
                        direction={breachesOrderBy === 'buildingFloor' ? breachesOrder : 'asc'}
                        onClick={() => {
                          const isAsc = breachesOrderBy === 'buildingFloor' && breachesOrder === 'asc';
                          setBreachesOrder(isAsc ? 'desc' : 'asc');
                          setBreachesOrderBy('buildingFloor');
                        }}
                      >
                        Building / Floor
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={breachesOrderBy === 'enteredAt'}
                        direction={breachesOrderBy === 'enteredAt' ? breachesOrder : 'asc'}
                        onClick={() => {
                          const isAsc = breachesOrderBy === 'enteredAt' && breachesOrder === 'asc';
                          setBreachesOrder(isAsc ? 'desc' : 'asc');
                          setBreachesOrderBy('enteredAt');
                        }}
                      >
                        Entered At
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={breachesOrderBy === 'duration'}
                        direction={breachesOrderBy === 'duration' ? breachesOrder : 'asc'}
                        onClick={() => {
                          const isAsc = breachesOrderBy === 'duration' && breachesOrder === 'asc';
                          setBreachesOrder(isAsc ? 'desc' : 'asc');
                          setBreachesOrderBy('duration');
                        }}
                      >
                        Duration
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={breachesOrderBy === 'category'}
                        direction={breachesOrderBy === 'category' ? breachesOrder : 'asc'}
                        onClick={() => {
                          const isAsc = breachesOrderBy === 'category' && breachesOrder === 'asc';
                          setBreachesOrder(isAsc ? 'desc' : 'asc');
                          setBreachesOrderBy('category');
                        }}
                      >
                        Category
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={breachesOrderBy === 'reason'}
                        direction={breachesOrderBy === 'reason' ? breachesOrder : 'asc'}
                        onClick={() => {
                          const isAsc = breachesOrderBy === 'reason' && breachesOrder === 'asc';
                          setBreachesOrder(isAsc ? 'desc' : 'asc');
                          setBreachesOrderBy('reason');
                        }}
                      >
                        Reason
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedBreaches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No unauthorized access breaches recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedBreaches.map((row: any, idx: number) => {
                      const actualIdx = breachesPage * breachesRowsPerPage + idx;
                      return (
                        <TableRow key={row.areaId || actualIdx}>
                          <TableCell>{actualIdx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.areaName || row.area || '-'}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                            {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {formatOrRawTime(row.enteredAt, 'MMM D, YYYY HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            {row.durationFormatted ||
                              (row.durationMinutes != null
                                ? row.durationMinutes >= 60
                                  ? `${Math.floor(row.durationMinutes / 60)}h ${row.durationMinutes % 60}m`
                                  : `${row.durationMinutes} min`
                                : row.duration || '-')}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.alarmCategory || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.reason || '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={sortedBreaches.length}
              rowsPerPage={breachesRowsPerPage}
              page={breachesPage}
              onPageChange={(_, newPage) => setBreachesPage(newPage)}
              onRowsPerPageChange={(e) => {
                setBreachesRowsPerPage(parseInt(e.target.value, 10));
                setBreachesPage(0);
              }}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                '.MuiTablePagination-toolbar': { minHeight: 40, px: 1 },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '12px', mb: 0 },
              }}
            />
          </Card>
        </Stack>
      )}

      {/* Incidents & Alarms Tab View */}
      {activeTab === 'incidents' && (
        <Stack spacing={3}>
          {/* Section 1: Incident Overview */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2.5}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Incident Overview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Summary of security incidents and alarms related to this person in the selected period
              </Typography>
            </Box>

            {/* 4 Stat Cards */}
            <Grid container spacing={2} mb={3}>
              {/* Total Incidents */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#FFF5F5' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F', flexShrink: 0 }}>
                      <IconAlertTriangle size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Total Incidents
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        {totalIncidents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        Security incidents triggered
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              {/* Active Incidents */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#FFF5F5' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F', flexShrink: 0 }}>
                      <IconAlertTriangle size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Active Incidents
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        {activeIncidentsComputed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        Requires attention
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              {/* Acknowledged */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#F4F8FF' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#E8F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2', flexShrink: 0 }}>
                      <IconBell size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Acknowledged
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        {acknowledgedIncidents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        Has been acknowledged
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              {/* Resolved */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#F0FDF4' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C853', flexShrink: 0 }}>
                      <IconShieldCheck size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Resolved
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        {resolvedIncidents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        {resolvedIncidents > 0 ? 'Resolved incidents' : 'No resolved incidents'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            {/* 2 Charts Side-by-Side */}
            <Grid container spacing={2.5}>
              {/* Incidents by Category */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2.5, height: '100%' }}>
                  <Box mb={1}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      Incidents by Category
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Distribution of incidents based on alarm category
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mt={2}>
                    <Box sx={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Chart
                        options={{
                          chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                          colors: incidentsByCategory.colors,
                          labels: incidentsByCategory.labels,
                          legend: { show: false },
                          dataLabels: { enabled: false },
                          plotOptions: {
                            pie: {
                              donut: {
                                size: '75%',
                                labels: {
                                  show: true,
                                  total: {
                                    show: true,
                                    label: 'Incidents',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    formatter: () => `${incidentsByCategory.total}`,
                                  },
                                },
                              },
                            },
                          },
                        }}
                        series={incidentsByCategory.series}
                        type="donut"
                        width="100%"
                        height={180}
                      />
                    </Box>

                    <Stack spacing={1} sx={{ flex: 1 }}>
                      {incidentsByCategory.labels.map((catLabel, idx) => {
                        const count = incidentsByCategory.series[idx] || 0;
                        const pct = incidentsByCategory.total > 0 ? ((count / incidentsByCategory.total) * 100).toFixed(1) : '0';
                        const color = incidentsByCategory.colors[idx] || '#1877F2';
                        return (
                          <Stack key={catLabel} direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                              <Typography variant="caption" color="text.secondary">{catLabel}</Typography>
                            </Stack>
                            <Typography variant="caption" fontWeight={700}>{count} ({pct}%)</Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Card>
              </Grid>

              {/* Incident Status */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2.5, height: '100%' }}>
                  <Box mb={1}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      Incident Status
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Current status of incidents
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mt={2}>
                    <Box sx={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Chart
                        options={{
                          chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                          colors: incidentsByStatus.colors,
                          labels: incidentsByStatus.labels,
                          legend: { show: false },
                          dataLabels: { enabled: false },
                          plotOptions: {
                            pie: {
                              donut: {
                                size: '75%',
                                labels: {
                                  show: true,
                                  total: {
                                    show: true,
                                    label: 'Incidents',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    formatter: () => `${incidentsByStatus.total}`,
                                  },
                                },
                              },
                            },
                          },
                        }}
                        series={incidentsByStatus.series}
                        type="donut"
                        width="100%"
                        height={180}
                      />
                    </Box>

                    <Stack spacing={1} sx={{ flex: 1 }}>
                      {incidentsByStatus.labels.map((statusLabel, idx) => {
                        const count = incidentsByStatus.series[idx] || 0;
                        const pct = incidentsByStatus.total > 0 ? ((count / incidentsByStatus.total) * 100).toFixed(1) : '0';
                        const color = incidentsByStatus.colors[idx] || '#00C853';
                        return (
                          <Stack key={statusLabel} direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                              <Typography variant="caption" color="text.secondary">{statusLabel}</Typography>
                            </Stack>
                            <Typography variant="caption" fontWeight={700}>
                              {count} ({pct}%)
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Card>

          {/* Section 2: Incident & Alarm List */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Incident & Alarm List
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  List of security incidents and alarms triggered for this person
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  placeholder="Search area, category, or status..."
                  size="small"
                  value={alarmSearch}
                  onChange={(e) => {
                    setAlarmSearch(e.target.value);
                    setAlarmPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={16} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <Button variant="outlined" color="inherit" size="small" startIcon={<IconFilter size={16} />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                  Filter
                </Button>
              </Stack>
            </Stack>

            <TableContainer sx={{ maxHeight: 420, overflowY: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={alarmOrderBy === 'triggeredTime'}
                        direction={alarmOrderBy === 'triggeredTime' ? alarmOrder : 'asc'}
                        onClick={() => {
                          const isAsc = alarmOrderBy === 'triggeredTime' && alarmOrder === 'asc';
                          setAlarmOrder(isAsc ? 'desc' : 'asc');
                          setAlarmOrderBy('triggeredTime');
                        }}
                      >
                        Triggered Time
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={alarmOrderBy === 'category'}
                        direction={alarmOrderBy === 'category' ? alarmOrder : 'asc'}
                        onClick={() => {
                          const isAsc = alarmOrderBy === 'category' && alarmOrder === 'asc';
                          setAlarmOrder(isAsc ? 'desc' : 'asc');
                          setAlarmOrderBy('category');
                        }}
                      >
                        Category
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={alarmOrderBy === 'area'}
                        direction={alarmOrderBy === 'area' ? alarmOrder : 'asc'}
                        onClick={() => {
                          const isAsc = alarmOrderBy === 'area' && alarmOrder === 'asc';
                          setAlarmOrder(isAsc ? 'desc' : 'asc');
                          setAlarmOrderBy('area');
                        }}
                      >
                        Area
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={alarmOrderBy === 'buildingFloor'}
                        direction={alarmOrderBy === 'buildingFloor' ? alarmOrder : 'asc'}
                        onClick={() => {
                          const isAsc = alarmOrderBy === 'buildingFloor' && alarmOrder === 'asc';
                          setAlarmOrder(isAsc ? 'desc' : 'asc');
                          setAlarmOrderBy('buildingFloor');
                        }}
                      >
                        Building / Floor
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={alarmOrderBy === 'status'}
                        direction={alarmOrderBy === 'status' ? alarmOrder : 'asc'}
                        onClick={() => {
                          const isAsc = alarmOrderBy === 'status' && alarmOrder === 'asc';
                          setAlarmOrder(isAsc ? 'desc' : 'asc');
                          setAlarmOrderBy('status');
                        }}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={alarmOrderBy === 'acknowledgedBy'}
                        direction={alarmOrderBy === 'acknowledgedBy' ? alarmOrder : 'asc'}
                        onClick={() => {
                          const isAsc = alarmOrderBy === 'acknowledgedBy' && alarmOrder === 'asc';
                          setAlarmOrder(isAsc ? 'desc' : 'asc');
                          setAlarmOrderBy('acknowledgedBy');
                        }}
                      >
                        Acknowledged By
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={alarmOrderBy === 'acknowledgedTime'}
                        direction={alarmOrderBy === 'acknowledgedTime' ? alarmOrder : 'asc'}
                        onClick={() => {
                          const isAsc = alarmOrderBy === 'acknowledgedTime' && alarmOrder === 'asc';
                          setAlarmOrder(isAsc ? 'desc' : 'asc');
                          setAlarmOrderBy('acknowledgedTime');
                        }}
                      >
                        Acknowledged Time
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSortedAlarms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No incidents or alarms recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedAlarms.map((row: any, idx: number) => {
                      const actualIdx = alarmPage * alarmRowsPerPage + idx;
                      const rowId = row.alarmId || row.id || String(actualIdx);
                      const isSelected = (primaryAlarm?.alarmId || primaryAlarm?.id) === rowId;
                      return (
                        <TableRow
                          key={rowId}
                          hover
                          onClick={() => setSelectedAlarmId(rowId)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isSelected ? 'rgba(24, 119, 242, 0.08)' : 'inherit',
                            transition: 'background-color 0.2s ease',
                            '&:hover': {
                              bgcolor: isSelected ? 'rgba(24, 119, 242, 0.12) !important' : undefined,
                            },
                          }}
                        >
                          <TableCell>{actualIdx + 1}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {formatOrRawTime(row.triggeredTime)}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const catColor = getCategoryColor(row.category, row.alarmColor);
                              return (
                                <Chip
                                  label={row.category || 'cardaccess'}
                                  size="small"
                                  sx={{
                                    bgcolor: `${catColor}1A`,
                                    color: catColor,
                                    border: `1px solid ${catColor}33`,
                                    fontWeight: 700,
                                    fontSize: '11px',
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.areaName || '-'}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                            {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const statusStyle = getStatusChipStyle(row.status);
                              return (
                                <Chip
                                  label={statusStyle.label}
                                  size="small"
                                  sx={{
                                    bgcolor: statusStyle.bgcolor,
                                    color: statusStyle.color,
                                    fontWeight: 600,
                                    fontSize: '11px',
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>{row.acknowledgedBy || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {formatOrRawTime(row.acknowledgedTime)}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={isSelected ? 'Currently selected' : 'View incident detail & location'}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAlarmId(rowId);
                                  const target = document.getElementById('incident-detail-section');
                                  if (target) {
                                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                }}
                                sx={{
                                  color: isSelected ? '#FFFFFF' : '#1877F2',
                                  bgcolor: isSelected ? '#1877F2' : '#F1F5F9',
                                  boxShadow: isSelected ? '0 2px 6px rgba(24, 119, 242, 0.35)' : 'none',
                                  '&:hover': {
                                    bgcolor: isSelected ? '#1565C0' : '#E2E8F0',
                                  },
                                }}
                              >
                                <IconEye size={16} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredSortedAlarms.length}
              rowsPerPage={alarmRowsPerPage}
              page={alarmPage}
              onPageChange={(_, newPage) => setAlarmPage(newPage)}
              onRowsPerPageChange={(e) => {
                setAlarmRowsPerPage(parseInt(e.target.value, 10));
                setAlarmPage(0);
              }}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                '.MuiTablePagination-toolbar': { minHeight: 40, px: 1 },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '12px', mb: 0 },
              }}
            />
          </Card>

          {/* Section 3: Incident Detail & Incident Location */}
          <Grid container spacing={2.5} id="incident-detail-section">
            {/* Incident Detail */}
            <Grid size={{ xs: 12, md: isExporting ? 12 : 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Incident Detail
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Detailed information about the selected incident
                  </Typography>
                </Box>

                {/* Banner Alert */}
                <Box sx={{ bgcolor: primaryAlarm ? '#FFF5F5' : '#F8FAFC', border: '1px solid', borderColor: primaryAlarm ? '#FFCDD2' : 'divider', borderRadius: '12px', p: 2, mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: primaryAlarm ? '#FFEBEE' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: primaryAlarm ? '#D32F2F' : '#64748B' }}>
                        <IconAlertTriangle size={20} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} color={primaryAlarm ? '#D32F2F' : 'text.primary'}>
                          {primaryAlarm ? `${(primaryAlarm.category || 'Incident').toUpperCase()} Incident` : 'No Incident Selected'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {primaryAlarm?.reason || primaryAlarm?.description || (alarmsList.length > 0 ? 'Security incident detected by tracking engine' : 'No incidents or alarms detected in selected period')}
                        </Typography>
                      </Box>
                    </Stack>
                    {primaryAlarm && (() => {
                      const statusStyle = getStatusChipStyle(primaryAlarm.status);
                      return (
                        <Chip
                          label={statusStyle.label}
                          size="small"
                          sx={{
                            bgcolor: statusStyle.bgcolor,
                            color: statusStyle.color,
                            fontWeight: 600,
                            fontSize: '11px',
                          }}
                        />
                      );
                    })()}
                  </Stack>
                </Box>

                {/* Metadata List */}
                <Stack spacing={1.2}>
                  {[
                    { label: 'Incident ID', value: primaryAlarm?.alarmId || primaryAlarm?.id || '-', copyable: Boolean(primaryAlarm?.alarmId || primaryAlarm?.id) },
                    { label: 'Category', value: primaryAlarm?.category || '-' },
                    { label: 'Area', value: primaryAlarm?.areaName || primaryAlarm?.area || '-' },
                    { label: 'Building / Floor', value: `${primaryAlarm?.buildingName || '-'} ${primaryAlarm?.floorName ? `(${primaryAlarm.floorName})` : ''}` },
                    { label: 'Triggered Time', value: formatOrRawTime(primaryAlarm?.triggeredTime) },
                    { label: 'Status', value: primaryAlarm?.status || '-' },
                    { label: 'Acknowledged By', value: primaryAlarm?.acknowledgedBy || '-' },
                    { label: 'Acknowledged Time', value: formatOrRawTime(primaryAlarm?.acknowledgedTime) },
                    { label: 'Dispatched To', value: primaryAlarm?.dispatchedTo || '-' },
                    { label: 'Investigated By', value: primaryAlarm?.investigatedBy || '-' },
                    { label: 'Investigation Result', value: primaryAlarm?.investigationResult || '-' },
                  ].map((item, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                        {item.label}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight={item.label === 'Area' || item.label === 'Category' ? 600 : 400} color="text.primary">
                          {item.value}
                        </Typography>
                        {item.copyable && (
                          <IconButton size="small" sx={{ p: 0.2 }}>
                            <IconCopy size={14} color="#64748B" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Incident Location (Excluded in Export) */}
            {!isExporting && (
              <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Incident Location
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Location of the incident on floorplan
                    </Typography>
                  </Box>
                  <TextField
                    select
                    size="small"
                    value="incident-floor"
                    sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' } }}
                  >
                    <MenuItem value="incident-floor">
                      {primaryAlarm ? `${primaryAlarm.buildingName || 'Building'} - ${primaryAlarm.floorName || 'Floor'}` : 'Default Floor'}
                    </MenuItem>
                  </TextField>
                </Stack>

                {/* Map Canvas */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 250,
                    borderRadius: '12px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {incidentFloorplanUrl && !incidentImgObj ? (
                    <Stack alignItems="center" spacing={1} py={4}>
                      <CircularProgress size={24} />
                      <Typography variant="caption" color="text.secondary">
                        Loading incident floorplan...
                      </Typography>
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        transform: `scale(${incidentZoomLevel})`,
                        transition: 'transform 0.2s linear',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Stage width={incidentStageWidth} height={incidentStageHeight}>
                        <Layer>
                          {incidentImgObj ? (
                            <KonvaImage image={incidentImgObj} width={incidentStageWidth} height={incidentStageHeight} />
                          ) : null}

                          {incidentAreaPoints.length >= 6 && (
                            <Line
                              points={incidentAreaPoints}
                              stroke="#D32F2F"
                              strokeWidth={3}
                              lineJoin="round"
                              lineCap="round"
                              closed
                              fill="rgba(211, 47, 47, 0.35)"
                              opacity={0.65}
                              listening={false}
                            />
                          )}
                        </Layer>
                      </Stage>

                      {/* Incident Marker / Label overlay */}
                      {primaryAlarm && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: incidentMarkerX,
                            top: incidentMarkerY,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            pointerEvents: 'none',
                            zIndex: 4,
                          }}
                        >
                          <Box
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #D32F2F',
                              borderRadius: '6px',
                              px: 1,
                              py: 0.25,
                              mb: 0.5,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            }}
                          >
                            <Typography variant="caption" fontWeight={700} color="#D32F2F" sx={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                              {primaryAlarm?.areaName || incidentMaskedArea?.name || incidentMaskedArea?.areaName || 'Incident Area'}
                            </Typography>
                          </Box>
                          {/* Incident Location Pin with Person Photo & Flashing Pulsing Aura */}
                          <Box
                            sx={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {/* Flashing Aura Effect */}
                            <Box
                              sx={{
                                position: 'absolute',
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                bgcolor: 'rgba(211, 47, 47, 0.35)',
                                '@keyframes incidentPulse': {
                                  '0%': {
                                    transform: 'scale(0.8)',
                                    opacity: 0.95,
                                    boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.85)',
                                  },
                                  '70%': {
                                    transform: 'scale(1.45)',
                                    opacity: 0,
                                    boxShadow: '0 0 0 16px rgba(211, 47, 47, 0)',
                                  },
                                  '100%': {
                                    transform: 'scale(0.8)',
                                    opacity: 0,
                                    boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)',
                                  },
                                },
                                animation: 'incidentPulse 1.8s infinite ease-out',
                                pointerEvents: 'none',
                              }}
                            />

                            {/* Main Pin Container holding the Person's Image */}
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                bgcolor: '#D32F2F',
                                border: '2.5px solid #FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
                                position: 'relative',
                                zIndex: 1,
                              }}
                            >
                              <Avatar
                                src={personAvatarUrl || undefined}
                                alt={personName}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  bgcolor: '#FFEBEE',
                                  color: '#D32F2F',
                                }}
                              >
                                {initials}
                              </Avatar>

                              {/* Alert Warning Badge attached to the pin */}
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: -3,
                                  right: -3,
                                  width: 15,
                                  height: 15,
                                  borderRadius: '50%',
                                  bgcolor: '#D32F2F',
                                  border: '1.5px solid #FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#FFFFFF',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                                }}
                              >
                                <IconAlertTriangle size={9} />
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Zoom controls */}
                  <Stack
                    spacing={0.5}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      bgcolor: 'background.paper',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.5,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      zIndex: 5,
                    }}
                  >
                    <IconButton size="small" onClick={() => setIncidentZoomLevel((z) => Math.min(z + 0.15, 1.8))}>
                      <IconPlus size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setIncidentZoomLevel((z) => Math.max(z - 0.15, 0.6))}>
                      <IconMinus size={16} />
                    </IconButton>
                  </Stack>

                  {/* Floor Label Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      bgcolor: 'background.paper',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      zIndex: 5,
                    }}
                  >
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      {incidentMaskedArea?.floor?.name || primaryAlarm?.floorName || 'Floor Plan'}
                    </Typography>
                  </Box>
                </Box>

                {/* Map Footer Legend */}
                <Stack direction="row" spacing={2.5} justifyContent="flex-start" mt={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#D32F2F' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Incident Location
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1877F2' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Area Boundary
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4FC3F7' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Other Area
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          )}
          </Grid>
        </Stack>
      )}

      {/* Card History Tab View */}
      {activeTab === 'cardHistory' && (
        <Stack spacing={3}>
          {/* Top Summary Card */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Card & Device Summary
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Information about active BLE beacon card assigned to this person
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Card Number</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">{cardNumber}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">BLE MAC Address</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">{bleMac}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Battery Level</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color={cardBattery < 20 ? '#D32F2F' : '#00C853'}>
                    {cardBattery}% {cardBattery >= 20 ? '(Good)' : '(Low)'}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Status</Typography>
                  <Chip
                    label={data?.currentState?.activeCardNumber ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{
                      bgcolor: data?.currentState?.activeCardNumber ? '#E8F5E9' : '#F1F5F9',
                      color: data?.currentState?.activeCardNumber ? '#00C853' : '#64748B',
                      fontWeight: 700,
                      mt: 0.5,
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Table Card */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Card Assignment & Activity Log
              </Typography>
              <Typography variant="caption" color="text.secondary">
                History of card issuance, battery status updates, and assignment logs
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 420, overflowY: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 50 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={cardHistoryOrderBy === 'checkinAt'}
                        direction={cardHistoryOrderBy === 'checkinAt' ? cardHistoryOrder : 'asc'}
                        onClick={() => {
                          const isAsc = cardHistoryOrderBy === 'checkinAt' && cardHistoryOrder === 'asc';
                          setCardHistoryOrder(isAsc ? 'desc' : 'asc');
                          setCardHistoryOrderBy('checkinAt');
                        }}
                      >
                        Date & Time
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={cardHistoryOrderBy === 'cardNumber'}
                        direction={cardHistoryOrderBy === 'cardNumber' ? cardHistoryOrder : 'asc'}
                        onClick={() => {
                          const isAsc = cardHistoryOrderBy === 'cardNumber' && cardHistoryOrder === 'asc';
                          setCardHistoryOrder(isAsc ? 'desc' : 'asc');
                          setCardHistoryOrderBy('cardNumber');
                        }}
                      >
                        Card Number
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={cardHistoryOrderBy === 'bleCardNumber'}
                        direction={cardHistoryOrderBy === 'bleCardNumber' ? cardHistoryOrder : 'asc'}
                        onClick={() => {
                          const isAsc = cardHistoryOrderBy === 'bleCardNumber' && cardHistoryOrder === 'asc';
                          setCardHistoryOrder(isAsc ? 'desc' : 'asc');
                          setCardHistoryOrderBy('bleCardNumber');
                        }}
                      >
                        BLE MAC
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={cardHistoryOrderBy === 'event'}
                        direction={cardHistoryOrderBy === 'event' ? cardHistoryOrder : 'asc'}
                        onClick={() => {
                          const isAsc = cardHistoryOrderBy === 'event' && cardHistoryOrder === 'asc';
                          setCardHistoryOrder(isAsc ? 'desc' : 'asc');
                          setCardHistoryOrderBy('event');
                        }}
                      >
                        Event / Action
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={cardHistoryOrderBy === 'status'}
                        direction={cardHistoryOrderBy === 'status' ? cardHistoryOrder : 'asc'}
                        onClick={() => {
                          const isAsc = cardHistoryOrderBy === 'status' && cardHistoryOrder === 'asc';
                          setCardHistoryOrder(isAsc ? 'desc' : 'asc');
                          setCardHistoryOrderBy('status');
                        }}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <TableSortLabel
                        active={cardHistoryOrderBy === 'issuedBy'}
                        direction={cardHistoryOrderBy === 'issuedBy' ? cardHistoryOrder : 'asc'}
                        onClick={() => {
                          const isAsc = cardHistoryOrderBy === 'issuedBy' && cardHistoryOrder === 'asc';
                          setCardHistoryOrder(isAsc ? 'desc' : 'asc');
                          setCardHistoryOrderBy('issuedBy');
                        }}
                      >
                        Issued By / Notes
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedCardHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No card assignment history recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedCardHistory.map((row: any, idx: number) => {
                      const actualIdx = cardHistoryPage * cardHistoryRowsPerPage + idx + 1;
                      return (
                        <TableRow key={row.cardId || idx}>
                          <TableCell>{actualIdx}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {formatOrRawTime(row.checkinAt)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.cardNumber || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.bleCardNumber || '-'}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.isActive ? 'Card Assigned' : 'Card Unassigned'}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              sx={{
                                bgcolor: row.isActive ? '#E8F5E9' : '#F1F5F9',
                                color: row.isActive ? '#00C853' : '#64748B',
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>
                            Assigned by: {row.checkinBy || 'System'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={sortedCardHistory.length}
              rowsPerPage={cardHistoryRowsPerPage}
              page={cardHistoryPage}
              onPageChange={(_, newPage) => setCardHistoryPage(newPage)}
              onRowsPerPageChange={(e) => {
                setCardHistoryRowsPerPage(parseInt(e.target.value, 10));
                setCardHistoryPage(0);
              }}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                '.MuiTablePagination-toolbar': { minHeight: 40, px: 1 },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '12px', mb: 0 },
              }}
            />
          </Card>
        </Stack>
      )}

      {/* EXPORT LOADING OVERLAY BACKDROP */}
      {isExporting && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}
        >
          <CircularProgress size={64} thickness={4} sx={{ color: '#1877F2', mb: 3 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Generating Complete PDF Report...
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, maxWidth: 500, textAlign: 'center', px: 2 }}>
            Combining profile details, movement timeline, floorplan map, area metrics, access compliance, security incidents, and card history.
          </Typography>
        </Box>
      )}

      {/* FULL PDF EXPORT STACKED CONTAINER */}
      <Box
        id="investigate-full-pdf-export-content"
        sx={{
          position: isExporting ? 'fixed' : 'absolute',
          top: isExporting ? 0 : -99999,
          left: isExporting ? 0 : -99999,
          width: '1200px',
          bgcolor: '#FFFFFF',
          color: '#1E293B',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 3.5,
          zIndex: isExporting ? 99999 : -1,
          opacity: isExporting ? 1 : 0,
          pointerEvents: 'none',
        }}
      >
        {/* Document Header Banner */}
        <Box sx={{ borderBottom: '3px solid #1877F2', pb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
            <Box>
              <Typography variant="h4" fontWeight={800} color="#1877F2" sx={{ letterSpacing: '-0.5px' }}>
                DETAILED SECURITY INVESTIGATION DOSSIER
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" mt={0.5}>
                Target Person: <strong>{personName}</strong> (ID: {identityId})  |  Investigation Period: {formattedFrom} – {formattedTo}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Generated: {dayjs().format('MMMM DD, YYYY HH:mm:ss')}
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#1877F2">
                CONFIDENTIAL SECURITY REPORT
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* 1. Person Profile & Contact Dossier Card */}
        <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 3, bgcolor: '#F8FAFC' }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar
              src={personAvatarUrl || undefined}
              sx={{ width: 80, height: 80, bgcolor: '#E8F2FE', color: '#1877F2', fontWeight: 700, fontSize: '28px', border: '3px solid #1877F2' }}
            >
              {initials}
            </Avatar>

            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                <Typography variant="h5" fontWeight={800} color="text.primary">
                  {personName}
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.4,
                    borderRadius: '12px',
                    bgcolor: personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
                    color: personType === 'Member' ? '#1877F2' : '#B06000',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  {personType}
                </Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.4,
                    borderRadius: '12px',
                    bgcolor: isViolation ? '#FFEBEE' : '#E8F5E9',
                    color: isViolation ? '#D32F2F' : '#00C853',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  {isViolation ? 'Compliance Violation' : 'Compliant'}
                </Box>
              </Stack>

              <Grid container spacing={2} mt={0.5}>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Identity ID</Typography>
                  <Typography variant="body2" fontWeight={700}>{identityId}</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Assigned Card / BLE MAC</Typography>
                  <Typography variant="body2" fontWeight={700}>{cardNumber} ({bleMac})</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Organization & Dept</Typography>
                  <Typography variant="body2" fontWeight={700}>{organization} ({department})</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Contact Information</Typography>
                  <Typography variant="body2" fontWeight={700}>{email} | {phone}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Card>

        {/* 2. Executive KPI Highlights Grid */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Total Stay Duration</Typography>
              <Typography variant="h5" fontWeight={800} color="#1877F2" mt={0.5}>{totalPresenceFormatted}</Typography>
              <Typography variant="caption" color="text.secondary">Recorded inside facility</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Areas Visited</Typography>
              <Typography variant="h5" fontWeight={800} color="text.primary" mt={0.5}>{totalAreasVisited} Areas</Typography>
              <Typography variant="caption" color="text.secondary">{authorizedAreasVisited} Authorized / {unauthorizedAreasVisited} Restricted</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Incidents & Alarms</Typography>
              <Typography variant="h5" fontWeight={800} color={totalIncidents > 0 ? '#D32F2F' : '#00C853'} mt={0.5}>
                {totalIncidents} Incidents
              </Typography>
              <Typography variant="caption" color="text.secondary">{activeIncidentsComputed} Unresolved / Active</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Last Known Location</Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary" mt={0.5} noWrap>{currentArea}</Typography>
              <Typography variant="caption" color="text.secondary">{currentBuilding} - {currentFloor} ({lastSeenTimeStr})</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* SECTION 1: TIMELINE ANALYSIS */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            1. Timeline & Movement Analysis
          </Typography>
          <Grid container spacing={2.5}>
            {/* Timeline Chart - Fullwidth in PDF Export */}
            <Grid size={{ xs: 12 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Presence Over Time (Graph)</Typography>
                <Box sx={{ height: 220 }}>
                  <Chart options={presenceTimelineOptions} series={presenceTimelineSeries} type="rangeBar" height={210} width="100%" />
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Chronological Timeline Log Table */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, mt: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>Chronological Activity Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Activity Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chronologicalTimelineList.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>{formatOrRawTime(row.timestamp)}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1.5,
                            py: 0.4,
                            borderRadius: '12px',
                            bgcolor: row.badge === 'Danger' ? '#FFEBEE' : row.badge === 'Primary' ? '#E8F2FE' : '#E8F5E9',
                            color: row.badge === 'Danger' ? '#D32F2F' : row.badge === 'Primary' ? '#1877F2' : '#00C853',
                            fontWeight: 700,
                            fontSize: '11px',
                            lineHeight: 1.2,
                          }}
                        >
                          {row.eventType}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '12px' }}>
                        {row.title} - <span style={{ color: '#64748B', fontWeight: 400 }}>{row.description}</span>
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.location}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* SECTION 2: AREA ANALYSIS */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            2. Area Access & Dwell Time Analysis
          </Typography>
          <Grid container spacing={2.5}>
            {/* Time Spent Breakdown List - Fullwidth in PDF Export */}
            <Grid size={{ xs: 12 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Time Spent by Area</Typography>
                <Stack spacing={2} mt={1.5}>
                  {areaBreakdownList.map((row, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={700}>{row.areaName} ({row.buildingName})</Typography>
                        <Typography variant="body2" fontWeight={800} color="#1877F2">{row.durationFormatted} ({row.percentage}%)</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={row.percentage} sx={{ height: 8, borderRadius: 4, mt: 0.5, bgcolor: '#E2E8F0' }} />
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Area Visit Log Table */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, mt: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>Area Entry & Dwell Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Building & Floor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Entry Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dwell Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Access Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breachesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                        No breach records
                      </TableCell>
                    </TableRow>
                  ) : (
                    breachesList.map((row: any, idx: number) => {
                      const areaName = row.areaName || row.area || row.name || '-';
                      const building = row.buildingName || row.building;
                      const floor = row.floorName || row.floor;
                      const buildingFloor =
                        building || floor
                          ? `${building || '-'}${floor ? ` (${floor})` : ''}`
                          : row.buildingFloor || '-';

                      const durationStr =
                        row.durationFormatted ||
                        (row.durationMinutes != null
                          ? row.durationMinutes >= 60
                            ? `${Math.floor(row.durationMinutes / 60)}h ${row.durationMinutes % 60}m`
                            : `${row.durationMinutes} min`
                          : row.duration || '-');

                      const enteredAtStr = formatOrRawTime(
                        row.enteredAt || row.timestamp || row.time,
                        'MMM D, YYYY HH:mm:ss'
                      );

                      return (
                        <TableRow key={row.areaId || row.id || idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{areaName}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>{buildingFloor}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>{enteredAtStr}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#D32F2F' }}>{durationStr}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 1.5,
                                py: 0.4,
                                borderRadius: '12px',
                                bgcolor: '#FFEBEE',
                                color: '#D32F2F',
                                fontWeight: 700,
                                fontSize: '11px',
                              }}
                            >
                              Unauthorized
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* SECTION 3: ACCESS COMPLIANCE */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            3. Access Compliance & Permissions
          </Typography>

          {/* Top Row: Access Compliance Overview & Access Rights */}
          <Grid container spacing={2.5} mb={2.5}>
            {/* Access Compliance Overview */}
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Access Compliance Overview
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Analysis of this person's access rights and area visits in the selected period
                  </Typography>
                </Box>

                <Stack direction="row" spacing={3} alignItems="center" mt={1}>
                  <Box sx={{ width: 140, height: 140, flexShrink: 0 }}>
                    <Chart options={complianceChartOptions} series={[complianceScore]} type="radialBar" height={150} />
                  </Box>

                  <Stack spacing={1.5} sx={{ flex: 1 }}>
                    <Box sx={{ bgcolor: isViolation ? '#FFF2F2' : '#F0FDF4', border: '1px solid', borderColor: isViolation ? '#FFCDD2' : '#BBF7D0', borderRadius: '12px', p: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        {isViolation ? <IconShieldX size={18} color="#D32F2F" /> : <IconShieldCheck size={18} color="#00C853" />}
                        <Typography variant="subtitle2" fontWeight={700} color={isViolation ? '#D32F2F' : '#00C853'}>
                          {isViolation ? 'Violation' : 'Compliant'}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {isViolation ? 'Person has accessed unauthorized area(s)' : 'All area visits are properly authorized'}
                      </Typography>
                    </Box>

                    <Stack spacing={0.8}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconCreditCard size={15} color={theme.palette.text.secondary} />
                          <Typography variant="caption" color="text.secondary">Total Areas Visited</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}>{totalAreasVisited}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconShieldCheck size={15} color="#00C853" />
                          <Typography variant="caption" color="text.secondary">Authorized Areas Visited</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}>{authorizedAreasVisited}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconAlertTriangle size={15} color="#D32F2F" />
                          <Typography variant="caption" color="text.secondary">Unauthorized Areas Visited</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}>{unauthorizedAreasVisited}</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
              </Card>
            </Grid>

            {/* Access Rights */}
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Access Rights
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Assigned access groups and permissions
                    </Typography>
                  </Box>
                  <Chip
                    label={assignedAccessGroups.length > 0 ? `${assignedAccessGroups.length} Access Group${assignedAccessGroups.length > 1 ? 's' : ''}` : 'No Group'}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      borderRadius: '8px',
                      fontSize: '11px',
                      bgcolor: assignedAccessGroups.length > 0 ? '#E8F2FE' : '#F1F5F9',
                      color: assignedAccessGroups.length > 0 ? '#1877F2' : 'text.secondary',
                    }}
                  />
                </Stack>

                {/* Main Content Area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1.5 }}>
                  {assignedAccessGroups.length > 0 ? (
                    assignedAccessGroups.map((group: any, idx: number) => {
                      const groupName = group.accessName || group.name || 'Access Group';
                      return (
                        <Box
                          key={idx}
                          sx={{
                            border: '1px solid #BEDBFF',
                            borderRadius: '12px',
                            p: 1.5,
                            bgcolor: '#F4F8FF',
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '8px',
                                bgcolor: '#1877F2',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <IconShieldCheck size={20} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                                {groupName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Assigned Access Profile
                              </Typography>
                            </Box>
                            <Chip
                              label={`${allowedAreaList.length || group.allowedAreasCount || 0} Allowed Areas`}
                              size="small"
                              sx={{ bgcolor: '#E8F2FE', color: '#1877F2', fontWeight: 700, fontSize: '10px', border: '1px solid #BEDBFF' }}
                            />
                          </Stack>

                          {/* Allowed Areas Chips */}
                          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                            Permitted Areas:
                          </Typography>
                          {allowedAreaList.length > 0 ? (
                            <Stack direction="row" flexWrap="wrap" gap={0.8}>
                              {allowedAreaList.map((area: string, aIdx: number) => (
                                <Chip
                                  key={aIdx}
                                  icon={<IconShieldCheck size={13} color="#00C853" />}
                                  label={area}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    bgcolor: '#FFFFFF',
                                    borderColor: '#BBF7D0',
                                    color: 'text.primary',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    '& .MuiChip-icon': { ml: 0.6 },
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontStyle="italic">
                              {group.allowedAreasCount ? `${group.allowedAreasCount} areas configured in group` : 'No specific areas listed'}
                            </Typography>
                          )}
                        </Box>
                      );
                    })
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#F8FAFC',
                        borderRadius: '12px',
                        p: 2,
                        border: '1px dashed #CBD5E1',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary" textAlign="center">
                        No Access Group Assigned
                      </Typography>
                      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: 360, mt: 0.5 }}>
                        This person does not have an assigned access group. All area visits will be validated against default rules.
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    bgcolor: unauthorizedAreasVisited > 0 ? '#FFF5F5' : '#EBF5FF',
                    border: '1px solid',
                    borderColor: unauthorizedAreasVisited > 0 ? '#FFCDD2' : '#BEDBFF',
                    borderRadius: '10px',
                    p: 1.2,
                    mt: 'auto',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    {unauthorizedAreasVisited > 0 ? (
                      <IconAlertTriangle size={18} color="#D32F2F" style={{ flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <IconInfoCircle size={18} color="#1877F2" style={{ flexShrink: 0, marginTop: 1 }} />
                    )}
                    <Box>
                      <Typography variant="caption" fontWeight={700} color={unauthorizedAreasVisited > 0 ? '#D32F2F' : '#1877F2'} display="block">
                        {unauthorizedAreasVisited > 0 ? 'Violation Notice' : 'Note'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {unauthorizedAreasVisited > 0
                          ? `This person accessed ${unauthorizedAreasVisited} area(s) that are not in the allowed list.`
                          : 'All area visits by this person are properly authorized.'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Middle Row: Area Access Comparison, Access Status by Area, Area Type */}
          <Grid container spacing={2.5} mb={2.5}>
            {/* Area Access Comparison */}
            <Grid size={{ xs: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Area Access Comparison
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Breakdown of visited areas based on access permission
                  </Typography>
                </Box>

                <Stack spacing={2} mt={2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Authorized Areas</Typography>
                      <Typography variant="caption" fontWeight={700}>{authorizedAreasVisited}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={totalAreasVisited > 0 ? (authorizedAreasVisited / totalAreasVisited) * 100 : 0}
                      sx={{ height: 12, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#00C853' } }}
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Unauthorized Areas</Typography>
                      <Typography variant="caption" fontWeight={700}>{unauthorizedAreasVisited}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={totalAreasVisited > 0 ? (unauthorizedAreasVisited / totalAreasVisited) * 100 : 0}
                      sx={{ height: 12, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#FF5630' } }}
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Restricted Areas</Typography>
                      <Typography variant="caption" fontWeight={700}>{restrictedAreasCount}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={totalAreasVisited > 0 ? (restrictedAreasCount / totalAreasVisited) * 100 : 0}
                      sx={{ height: 12, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#FF5630' } }}
                    />
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={3}>
                  Number of Areas
                </Typography>
              </Card>
            </Grid>

            {/* Access Status by Area */}
            <Grid size={{ xs: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Access Status by Area
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Access permission status for each visited area
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    options={{
                      chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                      colors: ['#00C853', '#FF5630'],
                      labels: ['Authorized', 'Unauthorized'], 
                      legend: { show: false },
                      dataLabels: { enabled: false },
                      plotOptions: {
                        pie: {
                          donut: {
                            size: '75%',
                            labels: {
                              show: true,
                              total: {
                                show: true,
                                label: 'Areas Visited',
                                fontSize: '11px',
                                color: '#64748B',
                                formatter: () => `${totalAreasVisited}`,
                              },
                            },
                          },
                        },
                      },
                    }}
                    series={[authorizedAreasVisited, unauthorizedAreasVisited]}
                    type="donut"
                    width="100%"
                    height={160}
                  />
                </Box>

                <Stack spacing={0.8} mt={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853' }} />
                      <Typography variant="caption" color="text.secondary">Authorized</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {authorizedAreasVisited} ({totalAreasVisited > 0 ? ((authorizedAreasVisited / totalAreasVisited) * 100).toFixed(1) : 0}%)
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FF5630' }} />
                      <Typography variant="caption" color="text.secondary">Unauthorized</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {unauthorizedAreasVisited} ({totalAreasVisited > 0 ? ((unauthorizedAreasVisited / totalAreasVisited) * 100).toFixed(1) : 0}%)
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>

            {/* Area Type */}
            <Grid size={{ xs: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Area Type
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Classification of visited areas
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    options={{
                      chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                      colors: ['#00C853', '#FF5630'],
                      labels: ['Normal Area', 'Restricted Area'], 
                      legend: { show: false },
                      dataLabels: { enabled: false },
                      plotOptions: {
                        pie: {
                          donut: {
                            size: '75%',
                            labels: {
                              show: true,
                              total: {
                                show: true,
                                label: 'Areas Visited',
                                fontSize: '11px',
                                color: '#64748B',
                                formatter: () => `${normalAreasCount + restrictedAreasCount}`,
                              },
                            },
                          },
                        },
                      },
                    }}
                    series={[normalAreasCount, restrictedAreasCount]}
                    type="donut"
                    width="100%"
                    height={160}
                  />
                </Box>

                <Stack spacing={0.8} mt={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853' }} />
                      <Typography variant="caption" color="text.secondary">Normal Area</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {normalAreasCount} ({(normalAreasCount + restrictedAreasCount > 0 ? (normalAreasCount / (normalAreasCount + restrictedAreasCount)) * 100 : 0).toFixed(1)}%)
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FF5630' }} />
                      <Typography variant="caption" color="text.secondary">Restricted Area</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>
                      {restrictedAreasCount} ({(normalAreasCount + restrictedAreasCount > 0 ? (restrictedAreasCount / (normalAreasCount + restrictedAreasCount)) * 100 : 0).toFixed(1)}%)
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Bottom Table: Unauthorized Access Breaches */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Unauthorized Access Breaches
              </Typography>
              <Typography variant="caption" color="text.secondary">
                List of areas accessed without proper authorization
              </Typography>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Entered At</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breachesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No unauthorized access breaches recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    breachesList.map((row: any, idx: number) => (
                      <TableRow key={row.areaId || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.areaName || row.area || '-'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                          {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>
                          {formatOrRawTime(row.enteredAt, 'MMM D, YYYY HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          {row.durationFormatted ||
                            (row.durationMinutes != null
                              ? row.durationMinutes >= 60
                                ? `${Math.floor(row.durationMinutes / 60)}h ${row.durationMinutes % 60}m`
                                : `${row.durationMinutes} min`
                              : row.duration || '-')}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.alarmCategory || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* SECTION 4: SECURITY INCIDENTS & ALARMS */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            4. Security Incidents & Alarms
          </Typography>

          {/* Incident Overview Card */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, mb: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Incident Overview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Summary of security incidents and alarms related to this person in the selected period
              </Typography>
            </Box>

            {/* 4 Stat KPI Cards */}
            <Grid container spacing={2} mb={2.5}>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 1.5, bgcolor: '#FFF5F5' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F', flexShrink: 0 }}>
                      <IconAlertTriangle size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Total Incidents</Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>{totalIncidents}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>Security incidents triggered</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 1.5, bgcolor: '#FFF5F5' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F', flexShrink: 0 }}>
                      <IconAlertTriangle size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Active Incidents</Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>{activeIncidentsComputed}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>Requires attention</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 1.5, bgcolor: '#F4F8FF' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#E8F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2', flexShrink: 0 }}>
                      <IconBell size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Acknowledged</Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>{acknowledgedIncidents}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>Has been acknowledged</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 1.5, bgcolor: '#F0FDF4' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C853', flexShrink: 0 }}>
                      <IconShieldCheck size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Resolved</Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>{resolvedIncidents}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>{resolvedIncidents > 0 ? 'Resolved incidents' : 'No resolved incidents'}</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            {/* 2 Charts Side-by-Side */}
            <Grid container spacing={2}>
              {/* Incidents by Category */}
              <Grid size={{ xs: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, height: '100%' }}>
                  <Box mb={1}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">Incidents by Category</Typography>
                    <Typography variant="caption" color="text.secondary">Distribution of incidents based on alarm category</Typography>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mt={1}>
                    <Box sx={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Chart
                        options={{
                          chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                          colors: incidentsByCategory.colors,
                          labels: incidentsByCategory.labels,
                          legend: { show: false },
                          dataLabels: { enabled: false },
                          plotOptions: {
                            pie: {
                              donut: {
                                size: '75%',
                                labels: {
                                  show: true,
                                  total: {
                                    show: true,
                                    label: 'Incidents',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    formatter: () => `${incidentsByCategory.total}`,
                                  },
                                },
                              },
                            },
                          },
                        }}
                        series={incidentsByCategory.series}
                        type="donut"
                        width="100%"
                        height={170}
                      />
                    </Box>

                    <Stack spacing={0.8} sx={{ flex: 1 }}>
                      {incidentsByCategory.labels.map((catLabel, idx) => {
                        const count = incidentsByCategory.series[idx] || 0;
                        const pct = incidentsByCategory.total > 0 ? ((count / incidentsByCategory.total) * 100).toFixed(1) : '0';
                        const color = incidentsByCategory.colors[idx] || '#1877F2';
                        return (
                          <Stack key={catLabel} direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                              <Typography variant="caption" color="text.secondary">{catLabel}</Typography>
                            </Stack>
                            <Typography variant="caption" fontWeight={700}>{count} ({pct}%)</Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Card>
              </Grid>

              {/* Incident Status */}
              <Grid size={{ xs: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, height: '100%' }}>
                  <Box mb={1}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">Incident Status</Typography>
                    <Typography variant="caption" color="text.secondary">Current status of incidents</Typography>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mt={1}>
                    <Box sx={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Chart
                        options={{
                          chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                          colors: incidentsByStatus.colors,
                          labels: incidentsByStatus.labels,
                          legend: { show: false },
                          dataLabels: { enabled: false },
                          plotOptions: {
                            pie: {
                              donut: {
                                size: '75%',
                                labels: {
                                  show: true,
                                  total: {
                                    show: true,
                                    label: 'Incidents',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    formatter: () => `${incidentsByStatus.total}`,
                                  },
                                },
                              },
                            },
                          },
                        }}
                        series={incidentsByStatus.series}
                        type="donut"
                        width="100%"
                        height={170}
                      />
                    </Box>

                    <Stack spacing={1} sx={{ flex: 1 }}>
                      {incidentsByStatus.labels.map((statusLabel, idx) => {
                        const count = incidentsByStatus.series[idx] || 0;
                        const pct = incidentsByStatus.total > 0 ? ((count / incidentsByStatus.total) * 100).toFixed(1) : '0';
                        const color = incidentsByStatus.colors[idx] || '#00C853';
                        return (
                          <Stack key={statusLabel} direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                              <Typography variant="caption" color="text.secondary">{statusLabel}</Typography>
                            </Stack>
                            <Typography variant="caption" fontWeight={700}>
                              {count} ({pct}%)
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Card>

          {/* Incident & Alarm List Table */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Incident & Alarm List
              </Typography>
              <Typography variant="caption" color="text.secondary">
                List of security incidents and alarms triggered for this person
              </Typography>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Triggered Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Acknowledged By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Acknowledged Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alarmsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No incidents or alarms recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    alarmsList.map((row: any, idx: number) => {
                      const rowId = row.alarmId || row.id || String(idx);
                      return (
                        <TableRow key={rowId}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {formatOrRawTime(row.triggeredTime)}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const catColor = getCategoryColor(row.category, row.alarmColor);
                              return (
                                <Chip
                                  label={row.category || 'cardaccess'}
                                  size="small"
                                  sx={{
                                    bgcolor: `${catColor}1A`,
                                    color: catColor,
                                    border: `1px solid ${catColor}33`,
                                    fontWeight: 700,
                                    fontSize: '11px',
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.areaName || '-'}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                            {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const statusStyle = getStatusChipStyle(row.status);
                              return (
                                <Chip
                                  label={statusStyle.label}
                                  size="small"
                                  sx={{
                                    bgcolor: statusStyle.bgcolor,
                                    color: statusStyle.color,
                                    fontWeight: 600,
                                    fontSize: '11px',
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>{row.acknowledgedBy || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {formatOrRawTime(row.acknowledgedTime)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* SECTION 5: CARD HISTORY & DEVICE TELEMETRY */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            5. Card History & Device Telemetry
          </Typography>

          {/* Card Summary Card */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Card Number</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>{cardNumber}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">BLE MAC Address</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>{bleMac}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Battery Telemetry</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color={cardBattery < 20 ? '#D32F2F' : '#00C853'}>
                    {cardBattery}% {cardBattery >= 20 ? '(Good)' : '(Low)'}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Device Status</Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1.5,
                      py: 0.4,
                      borderRadius: '12px',
                      bgcolor: data?.currentState?.activeCardNumber ? '#E8F5E9' : '#F1F5F9',
                      color: data?.currentState?.activeCardNumber ? '#00C853' : '#64748B',
                      fontWeight: 700,
                      fontSize: '11px',
                      mt: 0.2,
                    }}
                  >
                    {data?.currentState?.activeCardNumber ? 'Active' : 'Inactive'}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Card Assignment & Log Table */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>Card Assignment & Activity Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Card Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>BLE MAC</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event / Action</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Issued By / Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.cardHistory || []).map((row: any, idx: number) => {
                    const id = row.cardId || row.id || idx + 1;
                    const dateTime = formatOrRawTime(row.checkinAt || row.dateTime);
                    const cardNo = row.cardNumber || row.cardNo || '-';
                    const mac = row.bleCardNumber || row.mac || '-';
                    const event = row.isActive !== undefined ? (row.isActive ? 'Card Assigned' : 'Card Unassigned') : (row.event || '-');
                    const status = row.isActive !== undefined ? (row.isActive ? 'Active' : 'Inactive') : (row.status || 'Active');
                    const notes = row.checkinBy ? `Assigned by: ${row.checkinBy}` : (row.notes || '-');
                    const isActive = status === 'Active';
                    return (
                      <TableRow key={id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>{dateTime}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{cardNo}</TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{mac}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{event}</TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              px: 1.5,
                              py: 0.4,
                              borderRadius: '12px',
                              bgcolor: isActive ? '#E8F5E9' : '#F1F5F9',
                              color: isActive ? '#00C853' : '#64748B',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            {status}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{notes}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      </Box>
    </Stack>
  );
};

export default NewInvestigateContent;
