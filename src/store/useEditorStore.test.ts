import test from 'node:test';
import assert from 'node:assert/strict';
import { useEditorStore } from './useEditorStore.ts';
import type { CanvasObject } from '../core/types.ts';

test('useEditorStore manages objects and selection correctly', () => {
  const store = useEditorStore.getState();
  store.resetEditor({ dimensions: { width: 1200, height: 800 } });

  assert.equal(useEditorStore.getState().objects.length, 0);
  assert.equal(useEditorStore.getState().selectedObjectIds.length, 0);

  const obj1: CanvasObject = {
    id: 'obj-1',
    layerId: '1',
    type: 'rect',
    x: 10,
    y: 10,
    width: 100,
    height: 80,
    fill: '#ff0000',
  };

  const obj2: CanvasObject = {
    id: 'obj-2',
    layerId: '1',
    type: 'image',
    imageUrl: 'data:image/png;base64,abc',
    x: 150,
    y: 150,
    width: 60,
    height: 60,
  };

  // Add object with auto-select
  store.addObject(obj1, true);
  assert.equal(useEditorStore.getState().objects.length, 1);
  assert.deepEqual(useEditorStore.getState().selectedObjectIds, ['obj-1']);

  // Add second object without auto-select
  store.addObject(obj2, false);
  assert.equal(useEditorStore.getState().objects.length, 2);
  assert.deepEqual(useEditorStore.getState().selectedObjectIds, ['obj-1']);

  // Select multiple objects
  store.selectObject('obj-2', true); // Shift+select
  assert.deepEqual(useEditorStore.getState().selectedObjectIds, ['obj-1', 'obj-2']);

  // Update object
  store.updateObject('obj-1', { x: 50, y: 60 });
  const updated1 = useEditorStore.getState().objects.find(o => o.id === 'obj-1');
  assert.equal(updated1?.x, 50);
  assert.equal(updated1?.y, 60);

  // Batch update
  store.updateObjects([
    { id: 'obj-1', changes: { width: 120 } },
    { id: 'obj-2', changes: { width: 80 } },
  ]);
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'obj-1')?.width, 120);
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'obj-2')?.width, 80);

  // Undo restores previous state
  store.undo();
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'obj-1')?.width, 100);

  // Redo re-applies batch update
  store.redo();
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'obj-1')?.width, 120);

  // Delete selected objects
  store.deleteSelectedObjects();
  assert.equal(useEditorStore.getState().objects.length, 0);
  assert.equal(useEditorStore.getState().selectedObjectIds.length, 0);
});

test('useEditorStore supports object operations: alignment, flip, z-index, duplication', () => {
  const store = useEditorStore.getState();
  store.resetEditor({ dimensions: { width: 1000, height: 800 } });

  const o1: CanvasObject = {
    id: 'o1',
    layerId: '1',
    type: 'rect',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
  };
  const o2: CanvasObject = {
    id: 'o2',
    layerId: '1',
    type: 'image',
    x: 400,
    y: 300,
    width: 100,
    height: 100,
  };

  store.setObjects([o1, o2]);

  // 1. Alignment of multiple objects
  store.selectObjects(['o1', 'o2']);
  // Align left: combined bounds minX is 100. Both should have x = 100
  store.alignSelectedObjects('left');
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'o1')?.x, 100);
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'o2')?.x, 100);

  // 2. Alignment of single object relative to canvas
  store.selectObjects(['o1']);
  store.alignSelectedObjects('center-h');
  // Canvas width is 1000, o1 width is 200 -> center is (1000 - 200) / 2 = 400
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'o1')?.x, 400);

  // 3. Flip Horizontal & Vertical
  store.selectObjects(['o1']);
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'o1')?.flipX, undefined);
  store.flipHorizontal();
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'o1')?.flipX, true);
  store.flipVertical();
  assert.equal(useEditorStore.getState().objects.find(o => o.id === 'o1')?.flipY, true);

  // 4. Z-index order
  // Initial order: [o1, o2]
  assert.equal(useEditorStore.getState().objects[0].id, 'o1');
  assert.equal(useEditorStore.getState().objects[1].id, 'o2');
  // Bring o1 to front -> [o2, o1]
  store.selectObjects(['o1']);
  store.bringToFront();
  assert.equal(useEditorStore.getState().objects[0].id, 'o2');
  assert.equal(useEditorStore.getState().objects[1].id, 'o1');
  // Send o1 to back -> [o1, o2]
  store.sendToBack();
  assert.equal(useEditorStore.getState().objects[0].id, 'o1');
  assert.equal(useEditorStore.getState().objects[1].id, 'o2');

  // 5. Duplication
  store.selectObjects(['o1']);
  store.duplicateSelectedObjects();
  assert.equal(useEditorStore.getState().objects.length, 3);
  const selectedIds = useEditorStore.getState().selectedObjectIds;
  assert.equal(selectedIds.length, 1);
  assert.notEqual(selectedIds[0], 'o1'); // Newly created clone is selected
});
