import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBox,
  computeObjectBounds,
  computeCombinedBounds,
  isPointInsideObject,
  isObjectInMarquee,
  getHandlePositions,
  getHandleUnderPoint,
  getCursorForHandle,
  resizeBoundsWithHandle,
  transformObjectsWithNewBounds,
} from './selection.ts';
import type { CanvasObject } from './types.ts';

test('normalizeBox normalizes positive and negative coordinates', () => {
  const box1 = normalizeBox(10, 20, 100, 50);
  assert.equal(box1.minX, 10);
  assert.equal(box1.minY, 20);
  assert.equal(box1.maxX, 110);
  assert.equal(box1.maxY, 70);
  assert.equal(box1.width, 100);
  assert.equal(box1.height, 50);

  const box2 = normalizeBox(110, 70, -100, -50);
  assert.equal(box2.minX, 10);
  assert.equal(box2.minY, 20);
  assert.equal(box2.maxX, 110);
  assert.equal(box2.maxY, 70);
  assert.equal(box2.width, 100);
  assert.equal(box2.height, 50);
});

test('computeObjectBounds calculates bounds for rect, circle and points', () => {
  const rectObj: CanvasObject = {
    id: '1',
    layerId: 'layer1',
    type: 'rect',
    x: 50,
    y: 80,
    width: 200,
    height: 100,
  };
  const rectBounds = computeObjectBounds(rectObj);
  assert.deepEqual(rectBounds, {
    minX: 50,
    minY: 80,
    maxX: 250,
    maxY: 180,
    width: 200,
    height: 100,
  });

  const triangleObj: CanvasObject = {
    id: '2',
    layerId: 'layer1',
    type: 'triangle',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    points: [
      { x: 10, y: 30 },
      { x: 50, y: 10 },
      { x: 40, y: 90 },
    ],
  };
  const triBounds = computeObjectBounds(triangleObj);
  assert.deepEqual(triBounds, {
    minX: 10,
    minY: 10,
    maxX: 50,
    maxY: 90,
    width: 40,
    height: 80,
  });
});

test('computeCombinedBounds handles single and multiple objects', () => {
  assert.equal(computeCombinedBounds([]), null);

  const objA: CanvasObject = {
    id: 'a',
    layerId: 'l1',
    type: 'rect',
    x: 10,
    y: 20,
    width: 40,
    height: 30,
  };
  const objB: CanvasObject = {
    id: 'b',
    layerId: 'l1',
    type: 'circle',
    x: 100,
    y: 200,
    width: 50,
    height: 50,
  };

  const combined = computeCombinedBounds([objA, objB]);
  assert.notEqual(combined, null);
  assert.equal(combined?.minX, 10);
  assert.equal(combined?.minY, 20);
  assert.equal(combined?.maxX, 150);
  assert.equal(combined?.maxY, 250);
  assert.equal(combined?.width, 140);
  assert.equal(combined?.height, 230);
});

test('isPointInsideObject correctly detects hit inside and outside', () => {
  const rectObj: CanvasObject = {
    id: '1',
    layerId: 'l1',
    type: 'rect',
    x: 50,
    y: 50,
    width: 100,
    height: 100,
  };
  assert.equal(isPointInsideObject(100, 100, rectObj), true);
  assert.equal(isPointInsideObject(20, 20, rectObj), false);
  assert.equal(isPointInsideObject(200, 200, rectObj), false);

  const circleObj: CanvasObject = {
    id: '2',
    layerId: 'l1',
    type: 'circle',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };
  assert.equal(isPointInsideObject(50, 50, circleObj), true);
  assert.equal(isPointInsideObject(80, 80, circleObj), true);
  assert.equal(isPointInsideObject(5, 5, circleObj), false);
});

test('isObjectInMarquee detects intersection with selection rectangle', () => {
  const obj: CanvasObject = {
    id: '1',
    layerId: 'l1',
    type: 'rect',
    x: 100,
    y: 100,
    width: 50,
    height: 50,
  };

  assert.equal(
    isObjectInMarquee(obj, { startX: 50, startY: 50, currentX: 200, currentY: 200 }),
    true
  );
  assert.equal(
    isObjectInMarquee(obj, { startX: 80, startY: 80, currentX: 120, currentY: 120 }),
    true
  );
  assert.equal(
    isObjectInMarquee(obj, { startX: 0, startY: 0, currentX: 50, currentY: 50 }),
    false
  );
});

test('getHandlePositions and getHandleUnderPoint detect all 8 handles and rotation handle', () => {
  const box = {
    minX: 100,
    minY: 100,
    maxX: 200,
    maxY: 200,
    width: 100,
    height: 100,
  };

  const handles = getHandlePositions(box);
  assert.deepEqual(handles.tl, { x: 100, y: 100 });
  assert.deepEqual(handles.tc, { x: 150, y: 100 });
  assert.deepEqual(handles.tr, { x: 200, y: 100 });
  assert.deepEqual(handles.mr, { x: 200, y: 150 });
  assert.deepEqual(handles.br, { x: 200, y: 200 });
  assert.deepEqual(handles.bc, { x: 150, y: 200 });
  assert.deepEqual(handles.bl, { x: 100, y: 200 });
  assert.deepEqual(handles.ml, { x: 100, y: 150 });
  assert.deepEqual(handles.rot, { x: 150, y: 78 });

  assert.equal(getHandleUnderPoint(100, 100, box), 'tl');
  assert.equal(getHandleUnderPoint(150, 100, box), 'tc');
  assert.equal(getHandleUnderPoint(200, 100, box), 'tr');
  assert.equal(getHandleUnderPoint(200, 150, box), 'mr');
  assert.equal(getHandleUnderPoint(200, 200, box), 'br');
  assert.equal(getHandleUnderPoint(150, 200, box), 'bc');
  assert.equal(getHandleUnderPoint(100, 200, box), 'bl');
  assert.equal(getHandleUnderPoint(100, 150, box), 'ml');
  assert.equal(getHandleUnderPoint(150, 78, box), 'rot');
  assert.equal(getHandleUnderPoint(150, 150, box), null);
});

test('getCursorForHandle maps handles to standard resize cursors', () => {
  assert.equal(getCursorForHandle('tl'), 'nwse-resize');
  assert.equal(getCursorForHandle('br'), 'nwse-resize');
  assert.equal(getCursorForHandle('tr'), 'nesw-resize');
  assert.equal(getCursorForHandle('bl'), 'nesw-resize');
  assert.equal(getCursorForHandle('tc'), 'ns-resize');
  assert.equal(getCursorForHandle('bc'), 'ns-resize');
  assert.equal(getCursorForHandle('ml'), 'ew-resize');
  assert.equal(getCursorForHandle('mr'), 'ew-resize');
  assert.equal(getCursorForHandle('rot'), 'grab');
});

test('resizeBoundsWithHandle correctly resizes in negative dx and dy directions', () => {
  const origBox = {
    minX: 100,
    minY: 100,
    maxX: 200,
    maxY: 200,
    width: 100,
    height: 100,
  };

  // Dragging 'tl' by (-30, -40): should expand top-left into -x and -y, bottom-right stays fixed
  const tlResized = resizeBoundsWithHandle(origBox, 'tl', -30, -40);
  assert.equal(tlResized.minX, 70);
  assert.equal(tlResized.minY, 60);
  assert.equal(tlResized.maxX, 200);
  assert.equal(tlResized.maxY, 200);
  assert.equal(tlResized.width, 130);
  assert.equal(tlResized.height, 140);

  // Dragging 'br' by (-20, -30): should shrink from bottom-right into -x and -y, top-left stays fixed
  const brResized = resizeBoundsWithHandle(origBox, 'br', -20, -30);
  assert.equal(brResized.minX, 100);
  assert.equal(brResized.minY, 100);
  assert.equal(brResized.maxX, 180);
  assert.equal(brResized.maxY, 170);
  assert.equal(brResized.width, 80);
  assert.equal(brResized.height, 70);

  // Dragging 'ml' by (-50, 0): expands to left, right stays fixed, height unchanged
  const mlResized = resizeBoundsWithHandle(origBox, 'ml', -50, 0);
  assert.equal(mlResized.minX, 50);
  assert.equal(mlResized.maxX, 200);
  assert.equal(mlResized.minY, 100);
  assert.equal(mlResized.maxY, 200);

  // Dragging 'tc' by (0, -60): expands up, bottom stays fixed, width unchanged
  const tcResized = resizeBoundsWithHandle(origBox, 'tc', 0, -60);
  assert.equal(tcResized.minY, 40);
  assert.equal(tcResized.maxY, 200);
  assert.equal(tcResized.minX, 100);
  assert.equal(tcResized.maxX, 200);

  // Test transformObjectsWithNewBounds
  const objMap = new Map<string, CanvasObject>([
    ['1', { id: '1', layerId: 'l1', type: 'rect', x: 100, y: 100, width: 100, height: 100 }]
  ]);
  const transformed = transformObjectsWithNewBounds(objMap, origBox, tlResized);
  assert.equal(transformed.length, 1);
  assert.equal(transformed[0].changes.x, 70);
  assert.equal(transformed[0].changes.y, 60);
  assert.equal(transformed[0].changes.width, 130);
  assert.equal(transformed[0].changes.height, 140);
});

test('image objects support bounds calculation, hit-testing and transformation', () => {
  const imgObj: CanvasObject = {
    id: 'img-1',
    layerId: 'layer1',
    type: 'image',
    imageUrl: 'data:image/png;base64,...',
    x: 200,
    y: 150,
    width: 400,
    height: 300,
    rotation: 0,
    opacity: 100,
  };

  const bounds = computeObjectBounds(imgObj);
  assert.deepEqual(bounds, {
    minX: 200,
    minY: 150,
    maxX: 600,
    maxY: 450,
    width: 400,
    height: 300,
  });

  // Hit test inside image
  assert.equal(isPointInsideObject(300, 250, imgObj), true);
  // Hit test outside image
  assert.equal(isPointInsideObject(50, 50, imgObj), false);

  // Resize image from bottom-right handle
  const resized = resizeBoundsWithHandle(bounds, 'br', 100, 50, true);
  assert.equal(resized.minX, 200);
  assert.equal(resized.minY, 150);
  assert.ok(resized.width > 400);
  assert.ok(resized.height > 300);
});

