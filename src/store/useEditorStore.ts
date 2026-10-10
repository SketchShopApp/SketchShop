import { create } from 'zustand';
import type { Tool, Layer, DrawingSettings, DrawingScene  } from '../core/types';

export interface HistorySnapshot {
  layers: Layer[];
  layerData: Map<string, string>;
  canvasDimensions: { width: number; height: number };
  canvasBackground: string;
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
  updateActiveLayerOpacity: (opacity: number) => void;
  resetEditor: (params: { dimensions: { width: number; height: number }, background?: string }) => void;

  // Filter State
  applyFilter: { type: 'threshold' | 'pixelate' | 'ascii', timestamp: number } | undefined;
  triggerFilter: (type: 'threshold' | 'pixelate' | 'ascii') => void;

  // AI Scene State
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
  }): HistorySnapshot => ({
    layers: state.layers.map(l => ({ ...l })),
    layerData: new Map(state.layerData),
    canvasDimensions: { ...state.canvasDimensions },
    canvasBackground: state.canvasBackground,
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
    setLayers: (layers) => set({ layers }), // Reordering updates state, history saved on dragEnd in SideBarLayer
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
      layers: state.layers.map(l => ({ ...l, isActive: l.id === id }))
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

        const newLayers = state.layers.filter((_, i) => i !== activeIndex);
        const nextActiveIndex = Math.max(0, activeIndex - 1);
        newLayers[nextActiveIndex].isActive = true;
        
        return { layers: newLayers };
      });
      saveHistory();
    },
    updateActiveLayerOpacity: (opacity) => set((state) => ({
      layers: state.layers.map(l => l.isActive ? { ...l, opacity } : l)
    })),
    resetEditor: ({ dimensions, background = '#ffffff' }) => {
      const newLayers = [
        {
          id: '1',
          name: "Calque 1",
          isVisible: true,
          isLocked: false,
          isActive: true,
          opacity: 100,
        }
      ];
      const newLayerData = new Map<string, string>();
      const newSnapshot = createSnapshot({
        layers: newLayers,
        layerData: newLayerData,
        canvasDimensions: dimensions,
        canvasBackground: background,
      });

      set({
        canvasDimensions: dimensions,
        canvasBackground: background,
        layers: newLayers,
        layerData: newLayerData,
        activeTool: 'brush',
        applyFilter: undefined,
        history: [newSnapshot],
        historyIndex: 0,
      });
    },

    // AI Scene State
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
          }
        ],
        layerData: new Map(),
        canvasDimensions: { width: 1200, height: 800 },
        canvasBackground: '#ffffff',
      }
    ],
    historyIndex: 0,
    saveHistory,
    undo: () => set((state) => {
      if (state.historyIndex <= 0) return state;
      const nextIndex = state.historyIndex - 1;
      const snapshot = state.history[nextIndex];
      return {
        historyIndex: nextIndex,
        layers: snapshot.layers.map(l => ({ ...l })),
        layerData: new Map(snapshot.layerData),
        canvasDimensions: { ...snapshot.canvasDimensions },
        canvasBackground: snapshot.canvasBackground,
      };
    }),
    redo: () => set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIndex = state.historyIndex + 1;
      const snapshot = state.history[nextIndex];
      return {
        historyIndex: nextIndex,
        layers: snapshot.layers.map(l => ({ ...l })),
        layerData: new Map(snapshot.layerData),
        canvasDimensions: { ...snapshot.canvasDimensions },
        canvasBackground: snapshot.canvasBackground,
      };
    }),
  };
});
