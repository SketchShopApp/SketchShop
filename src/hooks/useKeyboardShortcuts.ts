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
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        if (isSpacePressed) {
          event.preventDefault();
          const state = useEditorStore.getState();
          // Only restore if current tool is still 'move' (in case they changed it manually)
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

