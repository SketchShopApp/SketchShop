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
    type: 'circle',
    x: 150,
    y: 150,
    width: 60,
    height: 60,
    fill: '#00ff00',
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

