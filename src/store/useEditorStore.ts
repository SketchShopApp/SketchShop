import { create } from 'zustand';
import type { Tool, Layer, DrawingSettings, DrawingScene, BlendMode, CanvasObject, BoundingBox } from '../core/types';
import { computeCombinedBounds } from '../core/selection.ts';

export interface HistorySnapshot {
  layers: Layer[];
  layerData: Map<string, string>;
  canvasDimensions: { width: number; height: number };
  canvasBackground: string;
  objects: CanvasObject[];
}

interface EditorState {
  // Canvas State
  canvasDimensions: { width: number; height: number };
  canvasBackground: string;
  setCanvasDimensions: (dimensions: { width: number; height: number }) => void;
  setCanvasBackground: (background: string) => void;

  // Tool State
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  
  // Settings State
  settings: DrawingSettings;
  setSettings: (settings: DrawingSettings) => void;
  updateSetting: (key: keyof DrawingSettings, value: any) => void;

  // Layers State
  layers: Layer[];
  setLayers: (layers: Layer[]) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  setActiveLayer: (id: string) => void;
  addLayer: () => void;
  deleteActiveLayer: () => void;
  duplicateActiveLayer: () => void;
  duplicateLayer: (id: string) => void;
  updateActiveLayerOpacity: (opacity: number) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  updateActiveLayerBlendMode: (blendMode: BlendMode) => void;
  updateLayerBlendMode: (id: string, blendMode: BlendMode) => void;
  toggleLayerClippingMask: (id: string) => void;
  toggleLayerTransparentLock: (id: string) => void;
  pendingMergeDown: { timestamp: number } | null;
  triggerMergeDown: () => void;
  completeMergeDown: (upperId: string, lowerId: string, mergedDataUrl: string) => void;
  resetEditor: (params: { dimensions: { width: number; height: number }, background?: string }) => void;

  // Objects & Selection State
  objects: CanvasObject[];
  selectedObjectIds: string[];
  setObjects: (objects: CanvasObject[]) => void;
  addObject: (object: CanvasObject, autoSelect?: boolean) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  updateObjects: (updates: { id: string; changes: Partial<CanvasObject> }[]) => void;
  deleteObject: (id: string) => void;
  deleteSelectedObjects: () => void;
  duplicateSelectedObjects: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  alignSelectedObjects: (alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  setSelectedObjectIds: (ids: string[]) => void;
  selectObject: (id: string, multiSelect?: boolean) => void;
  selectObjects: (ids: string[]) => void;
  clearSelection: () => void;

  // Filter State
  applyFilter: { type: 'threshold' | 'pixelate' | 'ascii', timestamp: number } | undefined;
  triggerFilter: (type: 'threshold' | 'pixelate' | 'ascii') => void;

  // AI Scene State
  isAiChatOpen: boolean;
  toggleAiChat: () => void;
  setIsAiChatOpen: (isOpen: boolean) => void;
  pendingAiScene: { scene: DrawingScene; timestamp: number } | null;
  applyAiScene: (scene: DrawingScene) => void;

  // Export & Persistence State
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  layerData: Map<string, string>; // Maps layer ID to data URL
  setLayerData: (id: string, dataUrl: string) => void;

  // History State
  history: HistorySnapshot[];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => {
  const createSnapshot = (state: {
    layers: Layer[];
    layerData: Map<string, string>;
    canvasDimensions: { width: number; height: number };
    canvasBackground: string;
    objects: CanvasObject[];
  }): HistorySnapshot => ({
    layers: state.layers.map(l => ({ ...l })),
    layerData: new Map(state.layerData),
    canvasDimensions: { ...state.canvasDimensions },
    canvasBackground: state.canvasBackground,
    objects: state.objects.map(o => ({ ...o })),
  });

  const MAX_HISTORY_SIZE = 30;

  const saveHistory = () => {
    const state = get();
    const nextHistory = state.history.slice(0, state.historyIndex + 1);
    const newSnapshot = createSnapshot(state);
    
    let updatedHistory = [...nextHistory, newSnapshot];
    let newIndex = updatedHistory.length - 1;

    if (updatedHistory.length > MAX_HISTORY_SIZE) {
      updatedHistory = updatedHistory.slice(updatedHistory.length - MAX_HISTORY_SIZE);
      newIndex = MAX_HISTORY_SIZE - 1;
    }

    set({
      history: updatedHistory,
      historyIndex: newIndex,
    });
  };

  const initialLayers: Layer[] = [
    {
      id: '1',
      name: "Calque 1",
      isVisible: true,
      isLocked: false,
      isActive: true,
      opacity: 100,
      blendMode: 'normal',
      isClippingMask: false,
      isTransparentLocked: false,
    }
  ];

  const initialDimensions = { width: 1200, height: 800 };
  const initialBackground = '#ffffff';

  return {
    // Canvas State
    canvasDimensions: initialDimensions,
    canvasBackground: initialBackground,
    setCanvasDimensions: (canvasDimensions) => {
      set({ canvasDimensions });
      saveHistory();
    },
    setCanvasBackground: (canvasBackground) => {
      set({ canvasBackground });
      saveHistory();
    },

    // Tool State
    activeTool: 'brush',
    setActiveTool: (tool) => set({ activeTool: tool }),

    // Settings State
    settings: {
      color: '#000000',
      brushSize: 5,
      opacity: 100,
      isDynamicBrush: false,
      pixelSize: 10,
      threshold: 128,
      asciiScale: 10,
    },
    setSettings: (settings) => set({ settings }),
    updateSetting: (key, value) => 
      set((state) => ({ settings: { ...state.settings, [key]: value } })),

    // Layers State
    layers: initialLayers,
    setLayers: (layers) => set({ layers }),
    toggleVisibility: (id) => {
      set((state) => ({
        layers: state.layers.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l)
      }));
      saveHistory();
    },
    toggleLock: (id) => {
      set((state) => ({
        layers: state.layers.map(l => l.id === id ? { ...l, isLocked: !l.isLocked } : l)
      }));
      saveHistory();
    },
    setActiveLayer: (id) => set((state) => ({
      layers: state.layers.map(l => ({ ...l, isActive: l.id === id })),
      selectedObjectIds: state.selectedObjectIds.filter(selectedId => {
        const obj = state.objects.find(o => o.id === selectedId);
        return obj && obj.layerId === id;
      })
    })),
    addLayer: () => {
      set((state) => {
        const newLayer: Layer = {
          id: Math.random().toString(36).substring(2, 9),
          name: `Calque ${state.layers.length + 1}`,
          isVisible: true,
          isLocked: false,
          isActive: true,
          opacity: 100,
          blendMode: 'normal',
          isClippingMask: false,
          isTransparentLocked: false,
        };
        return {
          layers: [...state.layers.map(l => ({ ...l, isActive: false })), newLayer]
        };
      });
      saveHistory();
    },
    deleteActiveLayer: () => {
      set((state) => {
        if (state.layers.length <= 1) return state;
        const activeIndex = state.layers.findIndex(l => l.isActive);
        if (activeIndex === -1) return state;

        const deletedLayerId = state.layers[activeIndex].id;
        const newLayers = state.layers.filter((_, i) => i !== activeIndex);
        const nextActiveIndex = Math.max(0, activeIndex - 1);
        newLayers[nextActiveIndex].isActive = true;
        
        const newObjects = state.objects.filter(o => o.layerId !== deletedLayerId);
        const validIds = new Set(newObjects.map(o => o.id));
        const newSelected = state.selectedObjectIds.filter(id => validIds.has(id));

        return { 
          layers: newLayers,
          objects: newObjects,
          selectedObjectIds: newSelected,
        };
      });
      saveHistory();
    },
    duplicateLayer: (id) => {
      set((state) => {
        const targetIndex = state.layers.findIndex(l => l.id === id);
        if (targetIndex === -1) return state;
        const source = state.layers[targetIndex];
        const newId = Math.random().toString(36).substring(2, 9);
        const newLayer: Layer = {
          ...source,
          id: newId,
          name: `${source.name} (copie)`,
          isActive: true,
        };

        const newLayers = state.layers.map(l => ({ ...l, isActive: false }));
        newLayers.splice(targetIndex + 1, 0, newLayer);

        const newLayerData = new Map(state.layerData);
        const srcData = state.layerData.get(source.id);
        if (srcData) {
          newLayerData.set(newId, srcData);
        }

        // Duplicate objects of the layer as well
        const duplicatedObjects: CanvasObject[] = state.objects
          .filter(o => o.layerId === source.id)
          .map(o => ({
            ...o,
            id: Math.random().toString(36).substring(2, 9),
            layerId: newId,
          }));

        return {
          layers: newLayers,
          layerData: newLayerData,
          objects: [...state.objects, ...duplicatedObjects],
        };
      });
      saveHistory();
    },
    duplicateActiveLayer: () => {
      const active = get().layers.find(l => l.isActive);
      if (active) {
        get().duplicateLayer(active.id);
      }
    },
    updateLayerOpacity: (id, opacity) => set((state) => ({
      layers: state.layers.map(l => l.id === id ? { ...l, opacity } : l)
    })),
    updateActiveLayerOpacity: (opacity) => set((state) => ({
      layers: state.layers.map(l => l.isActive ? { ...l, opacity } : l)
    })),
    updateActiveLayerBlendMode: (blendMode) => {
      set((state) => ({
        layers: state.layers.map(l => l.isActive ? { ...l, blendMode } : l)
      }));
      saveHistory();
    },
    updateLayerBlendMode: (id, blendMode) => {
      set((state) => ({
        layers: state.layers.map(l => l.id === id ? { ...l, blendMode } : l)
      }));
      saveHistory();
    },
    toggleLayerClippingMask: (id) => {
      set((state) => {
        const index = state.layers.findIndex(l => l.id === id);
        if (index <= 0) return state;
        return {
          layers: state.layers.map((l, i) =>
            i === index ? { ...l, isClippingMask: !l.isClippingMask } : l
          ),
        };
      });
      saveHistory();
    },
    toggleLayerTransparentLock: (id) => {
      set((state) => ({
        layers: state.layers.map(l =>
          l.id === id ? { ...l, isTransparentLocked: !l.isTransparentLocked } : l
        ),
      }));
      saveHistory();
    },
    pendingMergeDown: null,
    triggerMergeDown: () => {
      const state = get();
      const activeIndex = state.layers.findIndex(l => l.isActive);
      if (activeIndex <= 0) return;
      set({ pendingMergeDown: { timestamp: Date.now() } });
    },
    completeMergeDown: (upperId, lowerId, mergedDataUrl) => {
      set((state) => {
        const newLayers = state.layers
          .filter(l => l.id !== upperId)
          .map(l => l.id === lowerId ? { ...l, isActive: true } : l);

        const newLayerData = new Map(state.layerData);
        newLayerData.delete(upperId);
        newLayerData.set(lowerId, mergedDataUrl);

        // Move upper layer objects to lower layer
        const updatedObjects = state.objects.map(o =>
          o.layerId === upperId ? { ...o, layerId: lowerId } : o
        );

        return {
          layers: newLayers,
          layerData: newLayerData,
          objects: updatedObjects,
          pendingMergeDown: null,
        };
      });
      saveHistory();
    },
    resetEditor: ({ dimensions, background = '#ffffff' }) => {
      const newLayers = [
        {
          id: '1',
          name: "Calque 1",
          isVisible: true,
          isLocked: false,
          isActive: true,
          opacity: 100,
          blendMode: 'normal' as BlendMode,
          isClippingMask: false,
          isTransparentLocked: false,
        }
      ];
      const newLayerData = new Map<string, string>();
      const newSnapshot = createSnapshot({
        layers: newLayers,
        layerData: newLayerData,
        canvasDimensions: dimensions,
        canvasBackground: background,
        objects: [],
      });

      set({
        canvasDimensions: dimensions,
        canvasBackground: background,
        layers: newLayers,
        layerData: newLayerData,
        objects: [],
        selectedObjectIds: [],
        activeTool: 'brush',
        applyFilter: undefined,
        pendingMergeDown: null,
        history: [newSnapshot],
        historyIndex: 0,
      });
    },

    // Objects & Selection State
    objects: [],
    selectedObjectIds: [],
    setObjects: (objects) => {
      set({ objects });
      saveHistory();
    },
    addObject: (object, autoSelect = true) => {
      set((state) => ({
        objects: [...state.objects, object],
        selectedObjectIds: autoSelect ? [object.id] : state.selectedObjectIds,
      }));
      saveHistory();
    },
    updateObject: (id, updates) => {
      set((state) => ({
        objects: state.objects.map(obj => obj.id === id ? { ...obj, ...updates } : obj)
      }));
      saveHistory();
    },
    updateObjects: (updates) => {
      set((state) => {
        const updateMap = new Map(updates.map(u => [u.id, u.changes]));
        return {
          objects: state.objects.map(obj => {
            const ch = updateMap.get(obj.id);
            return ch ? { ...obj, ...ch } : obj;
          })
        };
      });
      saveHistory();
    },
    deleteObject: (id) => {
      set((state) => ({
        objects: state.objects.filter(obj => obj.id !== id),
        selectedObjectIds: state.selectedObjectIds.filter(selectedId => selectedId !== id),
      }));
      saveHistory();
    },
    deleteSelectedObjects: () => {
      set((state) => {
        const toDelete = new Set(state.selectedObjectIds);
        if (toDelete.size === 0) return state;
        return {
          objects: state.objects.filter(obj => !toDelete.has(obj.id)),
          selectedObjectIds: [],
        };
      });
      saveHistory();
    },
    duplicateSelectedObjects: () => {
      set((state) => {
        if (state.selectedObjectIds.length === 0) return state;
        const selected = state.objects.filter(o => state.selectedObjectIds.includes(o.id));
        const newObjects = selected.map(o => ({
          ...o,
          id: Math.random().toString(36).substring(2, 9),
          x: o.x + 20,
          y: o.y + 20,
        }));
        return {
          objects: [...state.objects, ...newObjects],
          selectedObjectIds: newObjects.map(o => o.id),
        };
      });
      saveHistory();
    },
    bringToFront: () => {
      set((state) => {
        const activeLayer = state.layers.find(l => l.isActive);
        if (!activeLayer || state.selectedObjectIds.length === 0) return state;

        const selectedSet = new Set(state.selectedObjectIds);
        const layerObjects = state.objects.filter(o => o.layerId === activeLayer.id);
        const nonSelected = layerObjects.filter(o => !selectedSet.has(o.id));
        const selected = layerObjects.filter(o => selectedSet.has(o.id));
        const reorderedLayerObjects = [...nonSelected, ...selected];

        let idx = 0;
        const newObjects = state.objects.map(o => {
          if (o.layerId === activeLayer.id) {
            return reorderedLayerObjects[idx++];
          }
          return o;
        });

        return { objects: newObjects };
      });
      saveHistory();
    },
    sendToBack: () => {
      set((state) => {
        const activeLayer = state.layers.find(l => l.isActive);
        if (!activeLayer || state.selectedObjectIds.length === 0) return state;

        const selectedSet = new Set(state.selectedObjectIds);
        const layerObjects = state.objects.filter(o => o.layerId === activeLayer.id);
        const nonSelected = layerObjects.filter(o => !selectedSet.has(o.id));
        const selected = layerObjects.filter(o => selectedSet.has(o.id));
        const reorderedLayerObjects = [...selected, ...nonSelected];

        let idx = 0;
        const newObjects = state.objects.map(o => {
          if (o.layerId === activeLayer.id) {
            return reorderedLayerObjects[idx++];
          }
          return o;
        });

        return { objects: newObjects };
      });
      saveHistory();
    },
    bringForward: () => {
      set((state) => {
        const activeLayer = state.layers.find(l => l.isActive);
        if (!activeLayer || state.selectedObjectIds.length === 0) return state;

        const selectedSet = new Set(state.selectedObjectIds);
        const layerObjects = [...state.objects.filter(o => o.layerId === activeLayer.id)];

        for (let i = layerObjects.length - 2; i >= 0; i--) {
          if (selectedSet.has(layerObjects[i].id) && !selectedSet.has(layerObjects[i + 1].id)) {
            const temp = layerObjects[i];
            layerObjects[i] = layerObjects[i + 1];
            layerObjects[i + 1] = temp;
          }
        }

        let idx = 0;
        const newObjects = state.objects.map(o => {
          if (o.layerId === activeLayer.id) {
            return layerObjects[idx++];
          }
          return o;
        });

        return { objects: newObjects };
      });
      saveHistory();
    },
    sendBackward: () => {
      set((state) => {
        const activeLayer = state.layers.find(l => l.isActive);
        if (!activeLayer || state.selectedObjectIds.length === 0) return state;

        const selectedSet = new Set(state.selectedObjectIds);
        const layerObjects = [...state.objects.filter(o => o.layerId === activeLayer.id)];

        for (let i = 1; i < layerObjects.length; i++) {
          if (selectedSet.has(layerObjects[i].id) && !selectedSet.has(layerObjects[i - 1].id)) {
            const temp = layerObjects[i];
            layerObjects[i] = layerObjects[i - 1];
            layerObjects[i - 1] = temp;
          }
        }

        let idx = 0;
        const newObjects = state.objects.map(o => {
          if (o.layerId === activeLayer.id) {
            return layerObjects[idx++];
          }
          return o;
        });

        return { objects: newObjects };
      });
      saveHistory();
    },
    flipHorizontal: () => {
      set((state) => {
        if (state.selectedObjectIds.length === 0) return state;
        const selected = state.objects.filter(o => state.selectedObjectIds.includes(o.id));
        const bounds = computeCombinedBounds(selected);
        if (!bounds) return state;

        return {
          objects: state.objects.map(obj => {
            if (!state.selectedObjectIds.includes(obj.id)) return obj;
            const newX = bounds.minX + (bounds.maxX - (obj.x + obj.width));
            return {
              ...obj,
              x: Math.round(newX),
              flipX: !obj.flipX,
            };
          })
        };
      });
      saveHistory();
    },
    flipVertical: () => {
      set((state) => {
        if (state.selectedObjectIds.length === 0) return state;
        const selected = state.objects.filter(o => state.selectedObjectIds.includes(o.id));
        const bounds = computeCombinedBounds(selected);
        if (!bounds) return state;

        return {
          objects: state.objects.map(obj => {
            if (!state.selectedObjectIds.includes(obj.id)) return obj;
            const newY = bounds.minY + (bounds.maxY - (obj.y + obj.height));
            return {
              ...obj,
              y: Math.round(newY),
              flipY: !obj.flipY,
            };
          })
        };
      });
      saveHistory();
    },
    alignSelectedObjects: (alignment) => {
      set((state) => {
        if (state.selectedObjectIds.length === 0) return state;
        const selected = state.objects.filter(o => state.selectedObjectIds.includes(o.id));
        if (selected.length === 0) return state;

        let targetBox: BoundingBox;
        if (selected.length === 1) {
          targetBox = {
            minX: 0,
            minY: 0,
            maxX: state.canvasDimensions.width,
            maxY: state.canvasDimensions.height,
            width: state.canvasDimensions.width,
            height: state.canvasDimensions.height,
          };
        } else {
          const bounds = computeCombinedBounds(selected);
          if (!bounds) return state;
          targetBox = bounds;
        }

        return {
          objects: state.objects.map(obj => {
            if (!state.selectedObjectIds.includes(obj.id)) return obj;

            let newX = obj.x;
            let newY = obj.y;

            switch (alignment) {
              case 'left':
                newX = targetBox.minX;
                break;
              case 'center-h':
                newX = targetBox.minX + (targetBox.width - obj.width) / 2;
                break;
              case 'right':
                newX = targetBox.maxX - obj.width;
                break;
              case 'top':
                newY = targetBox.minY;
                break;
              case 'center-v':
                newY = targetBox.minY + (targetBox.height - obj.height) / 2;
                break;
              case 'bottom':
                newY = targetBox.maxY - obj.height;
                break;
            }

            return {
              ...obj,
              x: Math.round(newX),
              y: Math.round(newY),
            };
          })
        };
      });
      saveHistory();
    },
    setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),
    selectObject: (id, multiSelect = false) => {
      set((state) => {
        if (multiSelect) {
          const already = state.selectedObjectIds.includes(id);
          return {
            selectedObjectIds: already
              ? state.selectedObjectIds.filter(item => item !== id)
              : [...state.selectedObjectIds, id]
          };
        }
        return { selectedObjectIds: [id] };
      });
    },
    selectObjects: (ids) => set({ selectedObjectIds: ids }),
    clearSelection: () => set({ selectedObjectIds: [] }),

    // AI Scene State
    isAiChatOpen: false,
    toggleAiChat: () => set((state) => ({ isAiChatOpen: !state.isAiChatOpen })),
    setIsAiChatOpen: (isOpen: boolean) => set({ isAiChatOpen: isOpen }),
    pendingAiScene: null,
    applyAiScene: (scene) => set({ 
      pendingAiScene: { scene, timestamp: Date.now() } 
    }),  

    // Filter State
    applyFilter: undefined,
    triggerFilter: (type) => set({ applyFilter: { type, timestamp: Date.now() } }),

    // Export & Persistence State
    previewUrl: null,
    setPreviewUrl: (previewUrl) => set({ previewUrl }),
    layerData: new Map(),
    setLayerData: (id, dataUrl) => set((state) => {
      const newLayerData = new Map(state.layerData);
      newLayerData.set(id, dataUrl);
      return { layerData: newLayerData };
    }),

    // History State
    history: [
      {
        layers: [
          {
            id: '1',
            name: "Calque 1",
            isVisible: true,
            isLocked: false,
            isActive: true,
            opacity: 100,
            blendMode: 'normal',
            isClippingMask: false,
            isTransparentLocked: false,
          }
        ],
        layerData: new Map(),
        canvasDimensions: { width: 1200, height: 800 },
        canvasBackground: '#ffffff',
        objects: [],
      }
    ],
    historyIndex: 0,
    saveHistory,
    undo: () => set((state) => {
      if (state.historyIndex <= 0) return state;
      const nextIndex = state.historyIndex - 1;
      const snapshot = state.history[nextIndex];
      const restoredObjects = (snapshot.objects || []).map(o => ({ ...o }));
      const objectIds = new Set(restoredObjects.map(o => o.id));
      return {
        historyIndex: nextIndex,
        layers: snapshot.layers.map(l => ({ ...l })),
        layerData: new Map(snapshot.layerData),
        canvasDimensions: { ...snapshot.canvasDimensions },
        canvasBackground: snapshot.canvasBackground,
        objects: restoredObjects,
        selectedObjectIds: state.selectedObjectIds.filter(id => objectIds.has(id)),
      };
    }),
    redo: () => set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIndex = state.historyIndex + 1;
      const snapshot = state.history[nextIndex];
      const restoredObjects = (snapshot.objects || []).map(o => ({ ...o }));
      const objectIds = new Set(restoredObjects.map(o => o.id));
      return {
        historyIndex: nextIndex,
        layers: snapshot.layers.map(l => ({ ...l })),
        layerData: new Map(snapshot.layerData),
        canvasDimensions: { ...snapshot.canvasDimensions },
        canvasBackground: snapshot.canvasBackground,
        objects: restoredObjects,
        selectedObjectIds: state.selectedObjectIds.filter(id => objectIds.has(id)),
      };
    }),
  };
});
