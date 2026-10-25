import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export function useKeyboardShortcuts() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  useEffect(() => {
    let previousTool: string | null = null;
    let isSpacePressed = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept shortcuts if typing in an input or textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        if (event.repeat || isSpacePressed) return;

        const state = useEditorStore.getState();
        if (state.activeTool !== 'move') {
          previousTool = state.activeTool;
          state.setActiveTool('move');
          isSpacePressed = true;
        }
        return;
      }

      const isCtrlKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (isCtrlKey && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isCtrlKey && key === 'y') {
        event.preventDefault();
        redo();
      } else if (isCtrlKey && key === 'j') {
        event.preventDefault();
        useEditorStore.getState().duplicateActiveLayer();
      } else if (isCtrlKey && key === 'e') {
        event.preventDefault();
        useEditorStore.getState().triggerMergeDown();
      } else if (isCtrlKey && key === 'd') {
        // Duplication rapide d'objets sélectionnés
        event.preventDefault();
        const state = useEditorStore.getState();
        if (state.selectedObjectIds.length > 0) {
          const toDuplicate = state.objects.filter(o => state.selectedObjectIds.includes(o.id));
          const newObjects = toDuplicate.map(o => ({
            ...o,
            id: Math.random().toString(36).substring(2, 9),
            x: o.x + 20,
            y: o.y + 20,
          }));
          state.setObjects([...state.objects, ...newObjects]);
          state.selectObjects(newObjects.map(o => o.id));
        }
      } else if (!isCtrlKey && !event.altKey) {
        // Raccourcis d'outils directs
        const state = useEditorStore.getState();
        if (key === 'v') {
          state.setActiveTool('select');
        } else if (key === 'b') {
          state.setActiveTool('brush');
        } else if (key === 'e') {
          state.setActiveTool('eraser');
        } else if (key === 'u') {
          state.setActiveTool('square');
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        if (isSpacePressed) {
          event.preventDefault();
          const state = useEditorStore.getState();
          if (state.activeTool === 'move' && previousTool) {
            state.setActiveTool(previousTool as any);
          }
          previousTool = null;
          isSpacePressed = false;
        }
      }
    };

    const handleBlur = () => {
      if (isSpacePressed) {
        const state = useEditorStore.getState();
        if (state.activeTool === 'move' && previousTool) {
          state.setActiveTool(previousTool as any);
        }
        previousTool = null;
        isSpacePressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [undo, redo]);
}
