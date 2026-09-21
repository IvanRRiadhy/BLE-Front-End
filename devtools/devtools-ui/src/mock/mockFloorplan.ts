import { DetectedArea, AreaPoint } from 'devtools-floorplan-detection';
import { IFloorplanDetectionProvider } from '../types/ui';

export const MOCK_IMAGE_WIDTH = 1000;
export const MOCK_IMAGE_HEIGHT = 700;

/**
 * Creates a deterministic 3-room raw detection result.
 * Layout:
 * ┌────────────────────────────────────────┐
 * │                                        │
 * │              ROOM A (Lobby)            │
 * │                                        │
 * ├───────────────────┬────────────────────┤
 * │                   │                    │
 * │   ROOM B (Meeting)│   ROOM C (Storage) │
 * │                   │                    │
 * └───────────────────┴────────────────────┘
 * 
 * Shared partition:
 * - Room A and Room B/C share horizontal wall at Y = 320
 * - Room B and Room C share vertical wall at X = 520
 */
export function getDeterministicMockAreas(): DetectedArea[] {
  // Room A (Upper Lobby)
  const roomAPolygon: AreaPoint[] = [
    { id: '', x: 50, y: 50, xPx: 50, yPx: 50 },
    { id: '', x: 950, y: 50, xPx: 950, yPx: 50 },
    { id: '', x: 950, y: 320, xPx: 950, yPx: 320 },
    { id: '', x: 50, y: 320, xPx: 50, yPx: 320 },
  ];

  // Room B (Lower-Left Meeting Room)
  const roomBPolygon: AreaPoint[] = [
    { id: '', x: 50, y: 320, xPx: 50, yPx: 320 },
    { id: '', x: 520, y: 320, xPx: 520, yPx: 320 },
    { id: '', x: 520, y: 650, xPx: 520, yPx: 650 },
    { id: '', x: 50, y: 650, xPx: 50, yPx: 650 },
  ];

  // Room C (Lower-Right Storage Room)
  const roomCPolygon: AreaPoint[] = [
    { id: '', x: 520, y: 320, xPx: 520, yPx: 320 },
    { id: '', x: 950, y: 320, xPx: 950, yPx: 320 },
    { id: '', x: 950, y: 650, xPx: 950, yPx: 650 },
    { id: '', x: 520, y: 650, xPx: 520, yPx: 650 },
  ];

  return [
    {
      id: 'area-mock-1',
      name: '', // Empty name to test pipeline's auto-naming (Area_001)
      polygon: roomAPolygon,
    },
    {
      id: 'area-mock-2',
      name: '', // Empty name to test pipeline's auto-naming (Area_002)
      polygon: roomBPolygon,
    },
    {
      id: 'area-mock-3',
      name: '', // Empty name to test pipeline's auto-naming (Area_003)
      polygon: roomCPolygon,
    },
  ];
}

/**
 * Procedurally generates a clean CAD blueprint image as a Data URL for the mock floorplan.
 * Provides an immediate visual background without requiring a file upload.
 */
export function generateMockFloorplanSvgDataUrl(): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCK_IMAGE_WIDTH} ${MOCK_IMAGE_HEIGHT}" width="${MOCK_IMAGE_WIDTH}" height="${MOCK_IMAGE_HEIGHT}">
  <defs>
    <!-- Technical Grid Pattern -->
    <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1c2536" stroke-width="0.75"/>
    </pattern>
    <pattern id="majorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#253248" stroke-width="1.2"/>
    </pattern>
  </defs>

  <!-- Background Canvas -->
  <rect width="100%" height="100%" fill="#0e131d"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <rect width="100%" height="100%" fill="url(#majorGrid)"/>

  <!-- Outer Architectural Boundary -->
  <rect x="50" y="50" width="900" height="600" fill="#131b29" stroke="#38bdf8" stroke-width="3" rx="4"/>

  <!-- Interior Architectural Walls -->
  <!-- Horizontal partition: Y = 320 -->
  <line x1="50" y1="320" x2="950" y2="320" stroke="#38bdf8" stroke-width="3" stroke-dasharray="8 4"/>
  
  <!-- Vertical partition: X = 520 -->
  <line x1="520" y1="320" x2="520" y2="650" stroke="#38bdf8" stroke-width="3" stroke-dasharray="8 4"/>

  <!-- Door openings (architectural representation) -->
  <path d="M 450 320 A 40 40 0 0 1 490 360" fill="none" stroke="#60a5fa" stroke-width="1.5"/>
  <line x1="450" y1="320" x2="490" y2="320" stroke="#0e131d" stroke-width="5"/>

  <path d="M 520 450 A 40 40 0 0 1 560 490" fill="none" stroke="#60a5fa" stroke-width="1.5"/>
  <line x1="520" y1="450" x2="520" y2="490" stroke="#0e131d" stroke-width="5"/>

  <!-- Dimension Markers and Annotations -->
  <g fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="12">
    <text x="500" y="38" text-anchor="middle">900 px (90.0m)</text>
    <text x="32" y="350" text-anchor="middle" transform="rotate(-90 32 350)">600 px (60.0m)</text>
    
    <text x="500" y="180" text-anchor="middle" fill="#64748b" font-weight="bold" font-size="14">ZONE A (LOBBY - 900x270)</text>
    <text x="285" y="490" text-anchor="middle" fill="#64748b" font-weight="bold" font-size="14">ZONE B (MEETING - 470x330)</text>
    <text x="735" y="490" text-anchor="middle" fill="#64748b" font-weight="bold" font-size="14">ZONE C (STORAGE - 430x330)</text>
  </g>
</svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Mock Detection Provider implementing the IFloorplanDetectionProvider interface.
 * Returns deterministic areas simulating AI segmentation output.
 */
export class MockFloorplanDetectionProvider implements IFloorplanDetectionProvider {
  public readonly providerName = 'Mock Deterministic Floorplan Provider v1.0';

  public async detectAreas(_imageInput: unknown): Promise<DetectedArea[]> {
    // Simulate brief asynchronous processing latency (e.g. 150ms)
    await new Promise((resolve) => setTimeout(resolve, 150));
    return getDeterministicMockAreas();
  }
}
