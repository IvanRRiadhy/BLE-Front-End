import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FloorplanDetectionPipeline,
  normalizePolygonGeometry,
  type DetectedArea,
} from '../dist/index.js';

async function getActivePort(): Promise<number> {
  if (process.env.FASTAPI_PORT) return parseInt(process.env.FASTAPI_PORT, 10);
  for (const port of [9000, 8000]) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return port;
    } catch {}
  }
  return 8000;
}

test('End-to-End: FastAPI Python CV to TypeScript Engine Pipeline', async (t) => {
  const port = await getActivePort();
  const baseUrl = `http://localhost:${port}`;

  await t.test(`Step 1: Check FastAPI Backend Health on port ${port}`, async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200, `FastAPI ${baseUrl}/health should return 200`);
    const data = await res.json();
    assert.deepEqual(data, { status: 'ok' });
  });

  await t.test('Step 2: Detect Real Architectural Floorplan via POST /detect', async () => {
    const samplePath = path.resolve('services/floorplan-detector/samples/06_realistic_architectural.png');
    assert.ok(fs.existsSync(samplePath), 'Sample image file must exist');

    const fileBuffer = fs.readFileSync(samplePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', blob, '06_realistic_architectural.png');

    const response = await fetch(`${baseUrl}/detect`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(response.status, 200, `POST /detect returned ${response.status}`);
    const result = await response.json();

    assert.equal(result.imageWidth, 1200);
    assert.equal(result.imageHeight, 900);
    assert.equal(result.areas.length, 6, 'Realistic blueprint should detect exactly 6 rooms');
    assert.equal(result.stats.accepted_rooms, 6);

    // Step 3: Transform to DetectedArea internal format (identical to useFloorplanDevTools)
    const rawAreas: DetectedArea[] = result.areas.map((a: any) => ({
      id: a.id,
      name: '',
      polygon: a.polygon.map((p: any) => ({
        id: '',
        x: p.xPx,
        y: p.yPx,
        xPx: p.xPx,
        yPx: p.yPx,
      })),
    }));

    assert.equal(rawAreas.length, 6);

    // Step 4: Process through Headless TypeScript Pipeline & BIONIC Serializer
    const normalized = rawAreas.map((area) => ({
      ...area,
      polygon: normalizePolygonGeometry(area.polygon),
    }));

    const mockProvider = {
      detectAreas: async () => normalized,
    };
    const pipeline = new FloorplanDetectionPipeline(mockProvider);
    const serialized = pipeline.processDetectedAreas(normalized, {
      autoAssignDefaultNames: true,
      floorplanId: 'fp-arch-floor-06',
    });

    assert.equal(serialized.length, 6);

    // Step 5: Validate BIONIC Production JSON Fields
    for (let i = 0; i < serialized.length; i++) {
      const area = serialized[i];
      assert.equal(area.floorplanId, 'fp-arch-floor-06');
      assert.equal(area.name, `Area_${String(i + 1).padStart(3, '0')}`);
      assert.equal(area.colorArea, '#228B22');
      assert.equal(area.restrictedStatus, 'NonRestrict');
      assert.equal(typeof area.areaShape, 'string', 'areaShape must be serialized string');
      assert.equal(typeof area.areaNameTextBox, 'string', 'areaNameTextBox must be serialized string');
      assert.equal(typeof area.occupancyNameTextBox, 'string', 'occupancyNameTextBox must be serialized string');

      // Verify JSON parsed structure
      const parsedPoints = JSON.parse(area.areaShape);
      const parsedNameBox = JSON.parse(area.areaNameTextBox);
      const parsedOccBox = JSON.parse(area.occupancyNameTextBox);

      assert.ok(Array.isArray(parsedPoints));
      assert.ok(parsedPoints.length >= 4, 'Polygons should have at least 4 vertices');
      for (const pt of parsedPoints) {
        assert.equal(pt.id, '');
        assert.equal(typeof pt.x, 'number');
        assert.equal(typeof pt.y, 'number');
        assert.equal(typeof pt.x_px, 'number');
        assert.equal(typeof pt.y_px, 'number');
      }

      assert.ok(typeof parsedNameBox.posX === 'number' && typeof parsedNameBox.posY === 'number');
      assert.ok(typeof parsedOccBox.posX === 'number' && typeof parsedOccBox.posY === 'number');
      assert.ok(parsedOccBox.posY > parsedNameBox.posY, 'Occupancy box must be stacked below name box');
    }

    console.log('✅ End-to-End Pipeline Verification Succeeded!');
    console.log(`✅ 6 rooms detected, normalized, visual-centered, and serialized into BIONIC JSON.`);
  });
});
