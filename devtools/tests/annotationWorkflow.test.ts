import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculatePolygonArea,
  calculateGroundTruthCentroid,
  hasSelfIntersection,
  doSegmentsIntersect,
  pointToSegmentDistance,
  mergeTwoPolygons,
  validateGroundTruthArea,
  validateAllGroundTruthAreas,
  serializeGroundTruthJson,
  parseGroundTruthJson,
  type GroundTruthArea,
  type GroundTruthPoint,
  type GroundTruthJson,
} from '../dist/index.js';

describe('BIONIC Ground Truth Annotation Workflow Test Suite', () => {
  // Test 1: Pixel Coordinate Transformation
  describe('1. Pixel Coordinate Transformation', () => {
    it('should accurately transform screen coordinates to image pixel space and clamp within image bounds', () => {
      // Simulating a 1920x1080 image viewed with zoom 2.0 and pan offset (100, 50)
      const zoom = 2.0;
      const panX = 100;
      const panY = 50;
      const imageWidth = 1920;
      const imageHeight = 1080;

      function transform(screenX: number, screenY: number): GroundTruthPoint {
        const x = Math.round((screenX - panX) / zoom);
        const y = Math.round((screenY - panY) / zoom);
        return {
          xPx: Math.max(0, Math.min(imageWidth, x)),
          yPx: Math.max(0, Math.min(imageHeight, y)),
        };
      }

      // Point inside image: screen (500, 450) -> ( (500-100)/2, (450-50)/2 ) = (200, 200)
      const pt1 = transform(500, 450);
      assert.strictEqual(pt1.xPx, 200);
      assert.strictEqual(pt1.yPx, 200);

      // Point outside left-top: screen (-50, -50) -> should clamp to (0, 0)
      const pt2 = transform(-50, -50);
      assert.strictEqual(pt2.xPx, 0);
      assert.strictEqual(pt2.yPx, 0);

      // Point outside right-bottom: screen (10000, 10000) -> should clamp to (1920, 1080)
      const pt3 = transform(10000, 10000);
      assert.strictEqual(pt3.xPx, 1920);
      assert.strictEqual(pt3.yPx, 1080);
    });
  });

  // Test 2: Polygon Creation
  describe('2. Polygon Creation', () => {
    it('should create a closed polygon with minimum 3 vertices and correct area in square pixels', () => {
      const squarePoints: GroundTruthPoint[] = [
        { xPx: 100, yPx: 100 },
        { xPx: 300, yPx: 100 },
        { xPx: 300, yPx: 300 },
        { xPx: 100, yPx: 300 },
      ];

      const area = calculatePolygonArea(squarePoints);
      assert.strictEqual(area, 40000); // 200 x 200 = 40,000 px²

      const centroid = calculateGroundTruthCentroid(squarePoints);
      assert.strictEqual(centroid.xPx, 200);
      assert.strictEqual(centroid.yPx, 200);
    });
  });

  // Test 3: Polygon Editing
  describe('3. Polygon Editing', () => {
    it('should move vertex, insert vertex on edge, and translate polygon correctly', () => {
      const initialPolygon: GroundTruthPoint[] = [
        { xPx: 0, yPx: 0 },
        { xPx: 100, yPx: 0 },
        { xPx: 100, yPx: 100 },
        { xPx: 0, yPx: 100 },
      ];

      // 3.1 Move vertex at index 1
      const editedPoly = [...initialPolygon];
      editedPoly[1] = { xPx: 150, yPx: 0 };
      assert.strictEqual(editedPoly[1].xPx, 150);

      // 3.2 Insert vertex on edge (0 -> 1)
      const edgeQuery = pointToSegmentDistance(
        { xPx: 50, yPx: 1 },
        editedPoly[0],
        editedPoly[1]
      );
      assert.strictEqual(edgeQuery.closestPoint.xPx, 50);
      assert.strictEqual(edgeQuery.closestPoint.yPx, 0);

      editedPoly.splice(1, 0, edgeQuery.closestPoint);
      assert.strictEqual(editedPoly.length, 5);
      assert.deepStrictEqual(editedPoly[1], { xPx: 50, yPx: 0 });

      // 3.3 Translate entire polygon by (+10, +20)
      const translated = editedPoly.map((p) => ({
        xPx: p.xPx + 10,
        yPx: p.yPx + 20,
      }));
      assert.deepStrictEqual(translated[0], { xPx: 10, yPx: 20 });
      assert.deepStrictEqual(translated[1], { xPx: 60, yPx: 20 });
    });
  });

  // Test 4: Polygon Validation
  describe('4. Polygon Validation', () => {
    it('should detect invalid polygons (<3 vertices, zero area, self-intersection, duplicate points, out of bounds)', () => {
      const validArea: GroundTruthArea = {
        id: 'gt_001',
        label: 'room',
        polygon: [
          { xPx: 10, yPx: 10 },
          { xPx: 100, yPx: 10 },
          { xPx: 100, yPx: 100 },
          { xPx: 10, yPx: 100 },
        ],
      };
      assert.strictEqual(validateGroundTruthArea(validArea, 1000, 1000), null);

      // < 3 vertices
      const tooFew: GroundTruthArea = {
        id: 'gt_002',
        label: 'room',
        polygon: [{ xPx: 10, yPx: 10 }, { xPx: 100, yPx: 10 }],
      };
      assert.notStrictEqual(validateGroundTruthArea(tooFew, 1000, 1000), null);

      // Self-intersecting bowtie polygon: (0,0) -> (100,100) -> (100,0) -> (0,100)
      const bowtie: GroundTruthArea = {
        id: 'gt_003',
        label: 'room',
        polygon: [
          { xPx: 0, yPx: 0 },
          { xPx: 100, yPx: 100 },
          { xPx: 100, yPx: 0 },
          { xPx: 0, yPx: 100 },
        ],
      };
      const selfIntersectErr = validateGroundTruthArea(bowtie, 1000, 1000);
      assert.notStrictEqual(selfIntersectErr, null);
      assert.match(selfIntersectErr!.message, /self-intersects/);

      // Duplicate consecutive points
      const duplicate: GroundTruthArea = {
        id: 'gt_004',
        label: 'room',
        polygon: [
          { xPx: 10, yPx: 10 },
          { xPx: 10, yPx: 10 },
          { xPx: 100, yPx: 10 },
          { xPx: 100, yPx: 100 },
        ],
      };
      assert.notStrictEqual(validateGroundTruthArea(duplicate, 1000, 1000), null);

      // Out of bounds
      const outOfBounds: GroundTruthArea = {
        id: 'gt_005',
        label: 'room',
        polygon: [
          { xPx: -50, yPx: 10 },
          { xPx: 100, yPx: 10 },
          { xPx: 100, yPx: 100 },
        ],
      };
      assert.notStrictEqual(validateGroundTruthArea(outOfBounds, 1000, 1000), null);
    });
  });

  // Test 5: Save/Load GT JSON
  describe('5. Save and Load GT JSON Format Compatibility', () => {
    it('should roundtrip serialize and deserialize normalized Ground Truth JSON strictly matching schema', () => {
      const original: GroundTruthJson = {
        imageId: 'floorplan_01',
        imagePath: 'floorplan_01.png',
        imageWidth: 1920,
        imageHeight: 1080,
        areas: [
          {
            id: 'gt_001',
            label: 'room',
            polygon: [
              { xPx: 120, yPx: 100 },
              { xPx: 500, yPx: 100 },
              { xPx: 500, yPx: 400 },
              { xPx: 120, yPx: 400 },
            ],
          },
          {
            id: 'gt_002',
            label: 'room',
            polygon: [
              { xPx: 520, yPx: 100 },
              { xPx: 800, yPx: 100 },
              { xPx: 800, yPx: 400 },
              { xPx: 520, yPx: 400 },
            ],
          },
        ],
      };

      const serialized = serializeGroundTruthJson(
        original.imageId,
        original.imagePath,
        original.imageWidth,
        original.imageHeight,
        original.areas
      );

      const jsonString = JSON.stringify(serialized, null, 2);
      const parsed = parseGroundTruthJson(jsonString);

      assert.strictEqual(parsed.imageId, 'floorplan_01');
      assert.strictEqual(parsed.imagePath, 'floorplan_01.png');
      assert.strictEqual(parsed.imageWidth, 1920);
      assert.strictEqual(parsed.imageHeight, 1080);
      assert.strictEqual(parsed.areas.length, 2);
      assert.deepStrictEqual(parsed.areas[0], original.areas[0]);
      assert.deepStrictEqual(parsed.areas[1], original.areas[1]);
    });
  });

  // Test 6: Image Dimensions & Bounds
  describe('6. Image Dimensions & Scale Consistency', () => {
    it('should verify image dimensions and ensure pixel coordinates remain intact regardless of zoom/scale', () => {
      const imgWidth = 2560;
      const imgHeight = 1440;

      const area: GroundTruthArea = {
        id: 'gt_001',
        label: 'room',
        polygon: [
          { xPx: 200, yPx: 300 },
          { xPx: 800, yPx: 300 },
          { xPx: 800, yPx: 900 },
          { xPx: 200, yPx: 900 },
        ],
      };

      // Even if display viewport is 800x450 (scaled by 0.3125), original coords must stay (200, 300) -> (800, 900)
      const validation = validateGroundTruthArea(area, imgWidth, imgHeight);
      assert.strictEqual(validation, null);

      const serialized = serializeGroundTruthJson('sample', 'sample.png', imgWidth, imgHeight, [area]);
      assert.strictEqual(serialized.imageWidth, 2560);
      assert.strictEqual(serialized.imageHeight, 1440);
      assert.strictEqual(serialized.areas[0].polygon[0].xPx, 200);
      assert.strictEqual(serialized.areas[0].polygon[0].yPx, 300);
    });
  });

  // Test 7: Zoom/Pan Coordinate Correctness
  describe('7. Zoom and Pan Coordinate Correctness', () => {
    it('should guarantee bidirectional mathematical invariance: screen -> pixel -> screen', () => {
      const zoom = 1.75;
      const panX = 140;
      const panY = -80;

      // An actual pixel point on the floorplan
      const originalPx: GroundTruthPoint = { xPx: 640, yPx: 480 };

      // Forward transform: pixel -> screen client
      const screenX = originalPx.xPx * zoom + panX;
      const screenY = originalPx.yPx * zoom + panY;

      // Inverse transform: screen -> pixel
      const recoveredX = Math.round((screenX - panX) / zoom);
      const recoveredY = Math.round((screenY - panY) / zoom);

      assert.strictEqual(recoveredX, originalPx.xPx);
      assert.strictEqual(recoveredY, originalPx.yPx);
    });
  });

  // Test 8: Detector Prediction -> GT Draft Conversion
  describe('8. Detector Prediction to GT Draft Conversion', () => {
    it('should convert raw detector predictions into editable GT candidates with sequential gt_xxx IDs', () => {
      const rawDetectorAreas = [
        {
          id: 'room_1',
          polygon: [
            { xPx: 50.4, yPx: 50.1 },
            { xPx: 150.2, yPx: 50.1 },
            { xPx: 150.2, yPx: 150.8 },
            { xPx: 50.4, yPx: 150.8 },
          ],
        },
        {
          id: 'room_2',
          polygon: [
            { xPx: 200.1, yPx: 50.1 },
            { xPx: 300.9, yPx: 50.1 },
            { xPx: 300.9, yPx: 150.1 },
            { xPx: 200.1, yPx: 150.1 },
          ],
        },
      ];

      // Conversion function mimicking usePredictionsAsDraft
      const draftGtAreas: GroundTruthArea[] = rawDetectorAreas.map((pred, idx) => ({
        id: `gt_${String(idx + 1).padStart(3, '0')}`,
        label: 'room',
        polygon: pred.polygon.map((p) => ({
          xPx: Math.round(p.xPx),
          yPx: Math.round(p.yPx),
        })),
      }));

      assert.strictEqual(draftGtAreas.length, 2);
      assert.strictEqual(draftGtAreas[0].id, 'gt_001');
      assert.strictEqual(draftGtAreas[1].id, 'gt_002');
      assert.deepStrictEqual(draftGtAreas[0].polygon[0], { xPx: 50, yPx: 50 });
      assert.deepStrictEqual(draftGtAreas[1].polygon[1], { xPx: 301, yPx: 50 });
    });
  });

  // Test 9: Merge Operation
  describe('9. Merge Operation', () => {
    it('should merge two adjacent rectangular polygons into a unified convex boundary', () => {
      // Room A: [0, 0] to [100, 100]
      const roomA: GroundTruthPoint[] = [
        { xPx: 0, yPx: 0 },
        { xPx: 100, yPx: 0 },
        { xPx: 100, yPx: 100 },
        { xPx: 0, yPx: 100 },
      ];

      // Room B: [100, 0] to [200, 100]
      const roomB: GroundTruthPoint[] = [
        { xPx: 100, yPx: 0 },
        { xPx: 200, yPx: 0 },
        { xPx: 200, yPx: 100 },
        { xPx: 100, yPx: 100 },
      ];

      const merged = mergeTwoPolygons(roomA, roomB);
      assert.strictEqual(merged.length, 4); // A unified rectangle [0,0] to [200,100]
      const mergedArea = calculatePolygonArea(merged);
      assert.strictEqual(mergedArea, 20000); // 200 x 100 = 20,000 px²
    });
  });

  // Test 10: Dataset Discovery
  describe('10. Dataset Discovery & Annotation Status Logic', () => {
    it('should classify floorplan status as Annotated, In Progress, or Not Annotated', () => {
      function computeStatus(hasGt: boolean, roomCount: number): 'Annotated' | 'In Progress' | 'Not Annotated' {
        if (hasGt && roomCount > 0) return 'Annotated';
        if (hasGt && roomCount === 0) return 'In Progress';
        return 'Not Annotated';
      }

      assert.strictEqual(computeStatus(true, 6), 'Annotated');
      assert.strictEqual(computeStatus(true, 0), 'In Progress');
      assert.strictEqual(computeStatus(false, 0), 'Not Annotated');
    });
  });
});
