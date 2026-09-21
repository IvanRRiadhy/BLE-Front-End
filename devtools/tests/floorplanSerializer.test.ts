import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CoordinateTransformer,
  serializeToProductionArea,
  serializeAreasToProductionJson,
  deserializeProductionArea,
  calculateVisualCenter,
  isPointInPolygon,
  FloorplanDetectionPipeline,
  PRODUCTION_DEFAULTS,
  type DetectedArea,
  type AreaPoint,
} from '../dist/index.js';

describe('CoordinateTransformer', () => {
  it('should correctly convert between pixel and world coordinates', () => {
    const transformer = new CoordinateTransformer({
      scaleX: 0.1,
      scaleY: 0.1,
      originPxX: 100,
      originPxY: 200,
    });

    const world = transformer.pxToWorld(200, 400);
    assert.strictEqual(world.x, 10);
    assert.strictEqual(world.y, 20);

    const px = transformer.worldToPx(10, 20);
    assert.strictEqual(px.xPx, 200);
    assert.strictEqual(px.yPx, 400);
  });

  it('should initialize AreaPoint with empty string ID', () => {
    const transformer = CoordinateTransformer.defaultTransformer();
    const point = transformer.createAreaPoint(850, 200);

    assert.strictEqual(point.id, '');
    assert.strictEqual(point.xPx, 850);
    assert.strictEqual(point.yPx, 200);
    assert.strictEqual(point.x, 850);
    assert.strictEqual(point.y, 200);
  });
});

describe('Visual Center & Polygon Geometry', () => {
  it('should find centroid for regular rectangular room', () => {
    // 100x100 square from (100, 100) to (200, 200)
    const square: AreaPoint[] = [
      { id: '', x: 100, y: 100, xPx: 100, yPx: 100 },
      { id: '', x: 200, y: 100, xPx: 200, yPx: 100 },
      { id: '', x: 200, y: 200, xPx: 200, yPx: 200 },
      { id: '', x: 100, y: 200, xPx: 100, yPx: 200 },
    ];

    const center = calculateVisualCenter(square);
    assert.strictEqual(Math.round(center.x), 150);
    assert.strictEqual(Math.round(center.y), 150);
  });

  it('should ensure visual center lies inside concave / L-shaped room', () => {
    // L-shaped room where simple centroid falls near or outside the cut-out
    // Bounding box [0, 0] to [200, 200], but cutout [100, 100] to [200, 200]
    const lShape: AreaPoint[] = [
      { id: '', x: 0, y: 0, xPx: 0, yPx: 0 },
      { id: '', x: 200, y: 0, xPx: 200, yPx: 0 },
      { id: '', x: 200, y: 100, xPx: 200, yPx: 100 },
      { id: '', x: 100, y: 100, xPx: 100, yPx: 100 },
      { id: '', x: 100, y: 200, xPx: 100, yPx: 200 },
      { id: '', x: 0, y: 200, xPx: 0, yPx: 200 },
    ];

    const center = calculateVisualCenter(lShape);
    const isInside = isPointInPolygon(center, lShape);
    assert.strictEqual(isInside, true, 'Visual center must be inside the L-shaped room');
  });
});

describe('Production Floorplan Serializer', () => {
  const samplePolygon: AreaPoint[] = [
    { id: '', x: 800, y: 150, xPx: 800, yPx: 150 },
    { id: '', x: 932, y: 150, xPx: 932, yPx: 150 },
    { id: '', x: 932, y: 280, xPx: 932, yPx: 280 },
    { id: '', x: 800, y: 280, xPx: 800, yPx: 280 },
  ];

  const sampleArea: DetectedArea = {
    id: 'internal-uuid-1234',
    name: 'Area_B',
    polygon: samplePolygon,
  };

  it('should serialize with correct default values and stringified JSON fields', () => {
    const prodJson = serializeToProductionArea(sampleArea);

    // 1. Defaults
    assert.strictEqual(prodJson.floorplanId, '');
    assert.strictEqual(prodJson.floorId, '');
    assert.strictEqual(prodJson.name, 'Area_B');
    assert.strictEqual(prodJson.colorArea, '#228B22');
    assert.strictEqual(prodJson.restrictedStatus, 'NonRestrict');
    assert.strictEqual(prodJson.allowFloorChange, false);
    assert.strictEqual(prodJson.isAssemblyPoint, false);
    assert.deepStrictEqual(prodJson.labelIds, []);

    // 2. Area shape points format
    assert.strictEqual(typeof prodJson.areaShape, 'string');
    const parsedPoints = JSON.parse(prodJson.areaShape);
    assert.strictEqual(parsedPoints.length, 4);
    for (const pt of parsedPoints) {
      assert.strictEqual(pt.id, '');
      assert.strictEqual(typeof pt.x, 'number');
      assert.strictEqual(typeof pt.y, 'number');
      assert.strictEqual(typeof pt.x_px, 'number');
      assert.strictEqual(typeof pt.y_px, 'number');
    }

    // 3. Area name text box format
    assert.strictEqual(typeof prodJson.areaNameTextBox, 'string');
    const parsedAreaBox = JSON.parse(prodJson.areaNameTextBox);
    assert.strictEqual(parsedAreaBox.fontSize, 18);
    assert.strictEqual(parsedAreaBox.fontColor, 'rgb(28, 118, 28)');
    assert.strictEqual(typeof parsedAreaBox.posX, 'number');
    assert.strictEqual(typeof parsedAreaBox.posY, 'number');

    // 4. Occupancy name text box format
    assert.strictEqual(typeof prodJson.occupancyNameTextBox, 'string');
    const parsedOccBox = JSON.parse(prodJson.occupancyNameTextBox);
    assert.strictEqual(parsedOccBox.fontSize, 15);
    assert.strictEqual(parsedOccBox.fontColor, 'rgb(28, 118, 28)');
    assert.strictEqual(typeof parsedOccBox.posX, 'number');
    assert.strictEqual(typeof parsedOccBox.posY, 'number');

    // Occupancy box is positioned below area name box
    assert.ok(
      parsedOccBox.posY > parsedAreaBox.posY,
      `Occupancy posY (${parsedOccBox.posY}) should be below areaName posY (${parsedAreaBox.posY})`
    );
  });

  it('should automatically assign Area_001, Area_002 if names are missing', () => {
    const areas: DetectedArea[] = [
      { id: '1', name: '', polygon: samplePolygon },
      { id: '2', name: '', polygon: samplePolygon },
      { id: '3', name: '', polygon: samplePolygon },
    ];

    const results = serializeAreasToProductionJson(areas);
    assert.strictEqual(results[0].name, 'Area_001');
    assert.strictEqual(results[1].name, 'Area_002');
    assert.strictEqual(results[2].name, 'Area_003');
  });

  it('should support overriding context IDs when known', () => {
    const result = serializeToProductionArea(sampleArea, {
      floorplanId: '7617dd1f-1148-41e4-8b20-b1e433a18c58',
      floorId: 'febc1149-5fea-47ae-a487-6e0127d3b9bf',
    });

    assert.strictEqual(result.floorplanId, '7617dd1f-1148-41e4-8b20-b1e433a18c58');
    assert.strictEqual(result.floorId, 'febc1149-5fea-47ae-a487-6e0127d3b9bf');
  });

  it('should roundtrip deserialize production JSON back to DetectedArea', () => {
    const prodJson = serializeToProductionArea(sampleArea);
    const restored = deserializeProductionArea(prodJson, 'restored-id');

    assert.strictEqual(restored.id, 'restored-id');
    assert.strictEqual(restored.name, 'Area_B');
    assert.strictEqual(restored.polygon.length, samplePolygon.length);
    assert.strictEqual(restored.polygon[0].xPx, samplePolygon[0].xPx);
    assert.strictEqual(restored.polygon[0].yPx, samplePolygon[0].yPx);
  });

  it('should generate the exact production JSON schema matching the BIONIC specifications', () => {
    const serialized = serializeToProductionArea(sampleArea, {
      floorplanId: '7617dd1f-1148-41e4-8b20-b1e433a18c58',
      floorId: 'febc1149-5fea-47ae-a487-6e0127d3b9bf',
    });

    const expectedKeys = [
      'floorplanId',
      'floorId',
      'name',
      'areaShape',
      'colorArea',
      'areaNameTextBox',
      'occupancyNameTextBox',
      'restrictedStatus',
      'allowFloorChange',
      'isAssemblyPoint',
      'labelIds',
    ];

    assert.deepStrictEqual(Object.keys(serialized).sort(), expectedKeys.sort());
    assert.strictEqual(serialized.floorplanId, '7617dd1f-1148-41e4-8b20-b1e433a18c58');
    assert.strictEqual(serialized.floorId, 'febc1149-5fea-47ae-a487-6e0127d3b9bf');
    assert.strictEqual(serialized.colorArea, '#228B22');
    assert.strictEqual(serialized.restrictedStatus, 'NonRestrict');
    assert.strictEqual(serialized.allowFloorChange, false);
    assert.strictEqual(serialized.isAssemblyPoint, false);
    assert.deepStrictEqual(serialized.labelIds, []);
  });
});

describe('FloorplanDetectionPipeline', () => {
  it('should run detection pipeline with normalization and serialization', () => {
    const pipeline = new FloorplanDetectionPipeline();
    const mockAreas: DetectedArea[] = [
      {
        id: 'area-1',
        name: '',
        polygon: [
          { id: '', x: 0, y: 0, xPx: 0, yPx: 0 },
          { id: '', x: 0, y: 0, xPx: 0, yPx: 0 }, // Duplicate vertex to normalize
          { id: '', x: 100, y: 0, xPx: 100, yPx: 0 },
          { id: '', x: 100, y: 100, xPx: 100, yPx: 100 },
          { id: '', x: 0, y: 100, xPx: 0, yPx: 100 },
        ],
      },
    ];

    const output = pipeline.processDetectedAreas(mockAreas);
    assert.strictEqual(output.length, 1);
    assert.strictEqual(output[0].name, 'Area_001');

    const parsedShape = JSON.parse(output[0].areaShape);
    // Duplicate vertex was normalized away
    assert.strictEqual(parsedShape.length, 4);
  });
});
