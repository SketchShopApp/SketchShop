import { P5Canvas } from "@p5-wrapper/react";
import type { Sketch } from "@p5-wrapper/react";
import type { Tool, Layer, DrawingSettings, BlendMode } from '../../core/types';
import { useEditorStore } from "../../store/useEditorStore";
import { applyThreshold, applyPixelate, applyASCII } from "./filters";
import { renderDrawingScene } from '../../core/interpreter';
import type { DrawingScene } from '../../core/types';

interface CanvasProps {
  activeTool: Tool;
  layers: Layer[];
  settings: DrawingSettings;
  canvasDimensions: { width: number; height: number };
  canvasBackground: string;
  applyFilter?: { type: 'threshold' | 'pixelate' | 'ascii', timestamp: number };
  layerData?: Map<string, string>;
  onUpdateCanvas?: (dataUrl: string) => void;
  onUpdateLayer?: (id: string, dataUrl: string) => void;
  saveHistory?: () => void;
  historyIndex?: number;
  [key: string]: any;
  pendingAiScene?: { scene: DrawingScene; timestamp: number } | null;
  pendingMergeDown?: { timestamp: number } | null;
  completeMergeDown?: (upperId: string, lowerId: string, mergedDataUrl: string) => void;
}

function getCompositeOperation(blendMode?: BlendMode): GlobalCompositeOperation {
  switch (blendMode) {
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'darken':
      return 'darken';
    case 'lighten':
      return 'lighten';
    case 'color-dodge':
      return 'color-dodge';
    case 'color-burn':
      return 'color-burn';
    case 'hard-light':
      return 'hard-light';
    case 'difference':
      return 'difference';
    case 'normal':
    default:
      return 'source-over';
  }
}

const sketch: Sketch<CanvasProps> = (p5) => {
  let activeTool: Tool = 'brush';
  let layersData: Layer[] = [];
  let canvasDimensions: { width: number; height: number } = { width: 1200, height: 800 };
  let canvasBackground: string = '#ffffff';
  let settingsData: DrawingSettings = {
    color: '#000000',
    brushSize: 5,
    opacity: 100,
    isDynamicBrush: false,
    pixelSize: 10,
    threshold: 128,
    asciiScale: 10,
  };

  const layerGraphics = new Map<string, any>();
  const lastSyncedDataUrl = new Map<string, string>();
  let rectangleStart: { x: number, y: number } | null = null;
  const speedHistory: number[] = [];
  const SPEED_HISTORY_SIZE = 5;
  let lastFilterTimestamp = 0;
  let lastAiTimestamp = 0;
  let lastMergeDownTimestamp = 0;
  let onUpdateCanvas: ((dataUrl: string) => void) | undefined;
  let onUpdateLayer: ((id: string, dataUrl: string) => void) | undefined;
  let completeMergeDownProp: ((upperId: string, lowerId: string, mergedDataUrl: string) => void) | undefined;
  let saveHistoryProp: (() => void) | undefined;
  let lastSyncTime = 0;
  let needsSync = false;
  let wasDrawingSession = false;

  let groupBuffer: any = null;
  let scratchBuffer: any = null;

  function ensureCompositeBuffers() {
    if (!groupBuffer || groupBuffer.width !== canvasDimensions.width || groupBuffer.height !== canvasDimensions.height) {
      groupBuffer = p5.createGraphics(canvasDimensions.width, canvasDimensions.height);
    }
    if (!scratchBuffer || scratchBuffer.width !== canvasDimensions.width || scratchBuffer.height !== canvasDimensions.height) {
      scratchBuffer = p5.createGraphics(canvasDimensions.width, canvasDimensions.height);
    }
  }

  const localMouse = { x: 0, y: 0 };
  let prevLocalMouse = { x: 0, y: 0 };

  function updateLocalMouse() {
    prevLocalMouse = { ...localMouse };
    const canvasElement = (p5 as any).canvas;
    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      const scaleX = canvasDimensions.width / rect.width;
      const scaleY = canvasDimensions.height / rect.height;
      localMouse.x = (p5.winMouseX - rect.left) * scaleX;
      localMouse.y = (p5.winMouseY - rect.top) * scaleY;
    }
  }

  function isMouseOverCanvas() {
    const canvasElement = (p5 as any).canvas;
    if (!canvasElement) return false;
    const rect = canvasElement.getBoundingClientRect();
    return (
      p5.winMouseX >= rect.left &&
      p5.winMouseX <= rect.right &&
      p5.winMouseY >= rect.top &&
      p5.winMouseY <= rect.bottom
    );
  }

  p5.updateWithProps = (props) => {
    activeTool = props.activeTool;
    layersData = props.layers;
    settingsData = props.settings;
    onUpdateCanvas = props.onUpdateCanvas;
    onUpdateLayer = props.onUpdateLayer;
    completeMergeDownProp = props.completeMergeDown;
    saveHistoryProp = props.saveHistory;
    canvasBackground = props.canvasBackground;
    
    if (props.canvasDimensions.width !== canvasDimensions.width || props.canvasDimensions.height !== canvasDimensions.height) {
        canvasDimensions = props.canvasDimensions;
        p5.resizeCanvas(canvasDimensions.width, canvasDimensions.height);
        layerGraphics.forEach((g) => g.resizeCanvas(canvasDimensions.width, canvasDimensions.height));
        if (groupBuffer) groupBuffer.resizeCanvas(canvasDimensions.width, canvasDimensions.height);
        if (scratchBuffer) scratchBuffer.resizeCanvas(canvasDimensions.width, canvasDimensions.height);
    }

    // Clean up graphics for deleted layers
    const layerIds = new Set(layersData.map(l => l.id));
    layerGraphics.forEach((_, id) => {
      if (!layerIds.has(id)) {
        layerGraphics.delete(id);
        lastSyncedDataUrl.delete(id);
      }
    });

    layersData.forEach(layer => {
      const storeDataUrl = props.layerData?.get(layer.id);
      if (!layerGraphics.has(layer.id)) {
        const g = p5.createGraphics(canvasDimensions.width, canvasDimensions.height);
        // Restore from store if data exists
        if (storeDataUrl) {
          p5.loadImage(storeDataUrl, 
            (img) => {
              g.image(img, 0, 0);
            },
            (err) => {
              console.error(`[Canvas] Failed to load initial image for Layer ${layer.id}:`, err);
            }
          );
          lastSyncedDataUrl.set(layer.id, storeDataUrl);
        } else {
          lastSyncedDataUrl.set(layer.id, '');
        }
        layerGraphics.set(layer.id, g);
      } else {
        // Layer already exists, check if data URL changed from outside (e.g. undo/redo)
        const localDataUrl = lastSyncedDataUrl.get(layer.id) || '';
        const currentStoreDataUrl = storeDataUrl || '';
        if (currentStoreDataUrl !== localDataUrl) {
          const g = layerGraphics.get(layer.id);
          if (g) {
            if (storeDataUrl) {
              p5.loadImage(storeDataUrl, 
                (img) => {
                  g.clear();
                  g.image(img, 0, 0);
                },
                (err) => {
                  console.error(`[Canvas] Failed to reload/restore Layer ${layer.id}:`, err);
                }
              );
            } else {
              g.clear();
            }
            lastSyncedDataUrl.set(layer.id, currentStoreDataUrl);
          }
        }
      }
    });

    if (props.applyFilter && props.applyFilter.timestamp > lastFilterTimestamp) {
      lastFilterTimestamp = props.applyFilter.timestamp;
      const activeLayer = layersData.find(l => l.isActive);
      if (activeLayer) {
        const g = layerGraphics.get(activeLayer.id);
        if (g) {
          applyFilterEffect(g, props.applyFilter.type);
          needsSync = true;
          syncToStore();
          saveHistoryProp?.();
        }
      }
    }

    if (props.pendingAiScene && props.pendingAiScene.timestamp > lastAiTimestamp) {
      lastAiTimestamp = props.pendingAiScene.timestamp;
      const activeLayer = layersData.find(l => l.isActive);
      if (activeLayer) {
        const g = layerGraphics.get(activeLayer.id);
        if (g) {
          renderDrawingScene(g, props.pendingAiScene.scene);
          needsSync = true;
          syncToStore();
          saveHistoryProp?.();
        }
      }
    }

    if (props.pendingMergeDown && props.pendingMergeDown.timestamp > lastMergeDownTimestamp) {
      lastMergeDownTimestamp = props.pendingMergeDown.timestamp;
      const activeIndex = layersData.findIndex(l => l.isActive);
      if (activeIndex > 0) {
        const upperLayer = layersData[activeIndex];
        const lowerLayer = layersData[activeIndex - 1];
        const gUpper = layerGraphics.get(upperLayer.id);
        const gLower = layerGraphics.get(lowerLayer.id);
        if (gLower) {
          if (gUpper) {
            gLower.drawingContext.save();
            gLower.drawingContext.globalAlpha = upperLayer.opacity / 100;
            gLower.drawingContext.globalCompositeOperation = getCompositeOperation(upperLayer.blendMode);
            gLower.drawingContext.drawImage(gUpper.canvas, 0, 0);
            gLower.drawingContext.restore();
          }
          const mergedDataUrl = (gLower as any).canvas.toDataURL();
          layerGraphics.delete(upperLayer.id);
          lastSyncedDataUrl.delete(upperLayer.id);
          lastSyncedDataUrl.set(lowerLayer.id, mergedDataUrl);

          completeMergeDownProp?.(upperLayer.id, lowerLayer.id, mergedDataUrl);
          needsSync = true;
          syncToStore();
        }
      }
    }
  };

  function applyFilterEffect(g: any, type: string) {
    switch (type) {
      case 'threshold':
        applyThreshold(g, settingsData);
        break;
      case 'pixelate':
        applyPixelate(g, settingsData);
        break;
      case 'ascii':
        applyASCII(g, settingsData);
        break;
    }
  }

  p5.setup = () => {
    const canvas = p5.createCanvas(canvasDimensions.width, canvasDimensions.height);
    if (canvasBackground === 'transparent') {
        p5.clear();
    } else {
        p5.background(canvasBackground);
    }
    canvas.drop(handleFileDrop);
  };

  function handleFileDrop(file: any) {
    if (file.type === 'image') {
      p5.loadImage(file.data, (img) => {
        const activeLayer = layersData.find(l => l.isActive);
        if (activeLayer) {
          const g = layerGraphics.get(activeLayer.id);
          if (g) {
            g.image(img, 0, 0);
            needsSync = true;
            syncToStore();
            saveHistoryProp?.();
          }
        }
      });
    }
  }

  p5.draw = () => {
    updateLocalMouse();
    if (canvasBackground === 'transparent') {
        p5.clear();
    } else {
        p5.background(canvasBackground);
    }
    updateCursor();

    ensureCompositeBuffers();

    let i = 0;
    while (i < layersData.length) {
      const baseLayer = layersData[i];
      const baseG = layerGraphics.get(baseLayer.id);

      // Check if there are clipping masks directly above this layer
      let nextIndex = i + 1;
      while (nextIndex < layersData.length && layersData[nextIndex].isClippingMask) {
        nextIndex++;
      }

      const hasClipping = nextIndex > i + 1;

      const mainCtx = p5.drawingContext as CanvasRenderingContext2D;

      if (!hasClipping) {
        // Standalone layer (standard rendering with blend mode and opacity)
        if (baseG && baseLayer.isVisible) {
          mainCtx.save();
          mainCtx.globalAlpha = baseLayer.opacity / 100;
          mainCtx.globalCompositeOperation = getCompositeOperation(baseLayer.blendMode);
          mainCtx.drawImage(baseG.canvas, 0, 0);
          mainCtx.restore();
        }
        i++;
      } else {
        // Group with clipping mask(s)
        if (baseG && baseLayer.isVisible) {
          groupBuffer.clear();
          groupBuffer.drawingContext.save();
          groupBuffer.drawingContext.globalAlpha = 1.0;
          groupBuffer.drawingContext.globalCompositeOperation = 'source-over';
          groupBuffer.drawingContext.drawImage(baseG.canvas, 0, 0);
          groupBuffer.drawingContext.restore();

          // Composite each clipped layer onto groupBuffer
          for (let k = i + 1; k < nextIndex; k++) {
            const clipLayer = layersData[k];
            const clipG = layerGraphics.get(clipLayer.id);
            if (clipG && clipLayer.isVisible) {
              const clipOp = getCompositeOperation(clipLayer.blendMode);
              if (clipOp === 'source-over') {
                groupBuffer.drawingContext.save();
                groupBuffer.drawingContext.globalAlpha = clipLayer.opacity / 100;
                groupBuffer.drawingContext.globalCompositeOperation = 'source-atop';
                groupBuffer.drawingContext.drawImage(clipG.canvas, 0, 0);
                groupBuffer.drawingContext.restore();
              } else {
                // Blend mode combined with clipping constraint
                scratchBuffer.clear();
                scratchBuffer.drawingContext.save();
                scratchBuffer.drawingContext.globalAlpha = 1.0;
                scratchBuffer.drawingContext.globalCompositeOperation = 'source-over';
                scratchBuffer.drawingContext.drawImage(groupBuffer.canvas, 0, 0);

                scratchBuffer.drawingContext.globalAlpha = clipLayer.opacity / 100;
                scratchBuffer.drawingContext.globalCompositeOperation = clipOp;
                scratchBuffer.drawingContext.drawImage(clipG.canvas, 0, 0);

                scratchBuffer.drawingContext.globalCompositeOperation = 'destination-in';
                scratchBuffer.drawingContext.drawImage(groupBuffer.canvas, 0, 0);
                scratchBuffer.drawingContext.restore();

                groupBuffer.clear();
                groupBuffer.drawingContext.drawImage(scratchBuffer.canvas, 0, 0);
              }
            }
          }

          // Composite the grouped buffer onto the main canvas with base layer's blend mode and opacity
          mainCtx.save();
          mainCtx.globalAlpha = baseLayer.opacity / 100;
          mainCtx.globalCompositeOperation = getCompositeOperation(baseLayer.blendMode);
          mainCtx.drawImage(groupBuffer.canvas, 0, 0);
          mainCtx.restore();
        }
        i = nextIndex;
      }
    }

    if (p5.mouseIsPressed && isMouseOverCanvas()) {
      const activeLayer = layersData.find(l => l.isActive);
      if (activeLayer && !activeLayer.isLocked) {
        const g = layerGraphics.get(activeLayer.id);
        if (g) {
          handleDrawing(g, activeLayer);
          needsSync = true;
          wasDrawingSession = true;
        }
      }
    }

    if (activeTool === 'square' && rectangleStart && p5.mouseIsPressed && isMouseOverCanvas()) {
      p5.push();
      p5.stroke(settingsData.color);
      p5.strokeWeight(2);
      p5.noFill();
      p5.rect(
        rectangleStart.x,
        rectangleStart.y,
        localMouse.x - rectangleStart.x,
        localMouse.y - rectangleStart.y
      );
      p5.pop();
    }

    // Periodically sync canvas to store for preview
    if (needsSync && p5.millis() - lastSyncTime > 500) {
        syncToStore();
    }
  };

  function syncToStore() {
    if (onUpdateCanvas) {
        onUpdateCanvas((p5 as any).canvas.toDataURL());
    }
    const activeLayer = layersData.find(l => l.isActive);
    if (activeLayer && onUpdateLayer) {
        const g = layerGraphics.get(activeLayer.id);
        if (g) {
            const dataUrl = (g as any).canvas.toDataURL();
            onUpdateLayer(activeLayer.id, dataUrl);
            lastSyncedDataUrl.set(activeLayer.id, dataUrl);
        }
    }
    lastSyncTime = p5.millis();
    needsSync = false;
  }

  p5.mousePressed = () => {
    if (!isMouseOverCanvas()) return;
    updateLocalMouse();
    if (activeTool === 'square') {
      rectangleStart = { x: localMouse.x, y: localMouse.y };
    }
  };

  p5.mouseReleased = () => {
    if (!wasDrawingSession) return;
    updateLocalMouse();
    if (activeTool === 'square' && rectangleStart) {
      const activeLayer = layersData.find(l => l.isActive);
      if (activeLayer && !activeLayer.isLocked) {
        const g = layerGraphics.get(activeLayer.id);
        if (g) {
          if (activeLayer.isTransparentLocked) {
            g.drawingContext.save();
            g.drawingContext.globalCompositeOperation = 'source-atop';
          }
          g.push();
          g.fill(settingsData.color);
          g.noStroke();
          g.rect(
            rectangleStart.x,
            rectangleStart.y,
            localMouse.x - rectangleStart.x,
            localMouse.y - rectangleStart.y
          );
          g.pop();
          if (activeLayer.isTransparentLocked) {
            g.drawingContext.restore();
          }
          needsSync = true;
        }
      }
      rectangleStart = null;
    }

    if (wasDrawingSession) {
      syncToStore();
      saveHistoryProp?.();
      wasDrawingSession = false;
    }
  };

  function updateCursor() {
    switch (activeTool) {
      case 'brush':
      case 'eraser':
        p5.cursor(p5.CROSS);
        break;
      case 'move':
        p5.cursor(p5.HAND);
        break;
      case 'select':
        p5.cursor(p5.ARROW);
        break;
      default:
        p5.cursor(p5.CROSS);
    }
  }

  function handleDrawing(g: any, activeLayer: Layer) {
    if (activeLayer.isTransparentLocked) {
      g.drawingContext.save();
      g.drawingContext.globalCompositeOperation = 'source-atop';
    }

    if (activeTool === 'brush') {
      const c = p5.color(settingsData.color);
      c.setAlpha((settingsData.opacity / 100) * 255);
      g.stroke(c);

      let sw = settingsData.brushSize;
      if (settingsData.isDynamicBrush) {
        sw = calculateDynamicStrokeWeight(localMouse.x, localMouse.y, prevLocalMouse.x, prevLocalMouse.y);
      }

      g.strokeWeight(sw);
      g.line(prevLocalMouse.x, prevLocalMouse.y, localMouse.x, localMouse.y);
    } else if (activeTool === 'eraser') {
      // Transparency lock prevents erasing or decreasing pixel alpha
      if (!activeLayer.isTransparentLocked) {
        g.erase();
        g.strokeWeight(settingsData.brushSize);
        g.line(prevLocalMouse.x, prevLocalMouse.y, localMouse.x, localMouse.y);
        g.noErase();
      }
    } else if (activeTool === 'shapes') {
      g.noStroke();
      const c = p5.color(settingsData.color);
      c.setAlpha((settingsData.opacity / 100) * 50);
      g.fill(c);
      g.ellipse(localMouse.x, localMouse.y, settingsData.brushSize * 2, settingsData.brushSize * 2);
    }

    if (activeLayer.isTransparentLocked) {
      g.drawingContext.restore();
    }
  }

  function calculateDynamicStrokeWeight(x: number, y: number, px: number, py: number) {
    const dx = x - px;
    const dy = y - py;
    const speed = Math.sqrt(dx * dx + dy * dy);
    
    speedHistory.push(speed);
    if (speedHistory.length > SPEED_HISTORY_SIZE) {
      speedHistory.shift();
    }
    
    const averageSpeed = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
    const maxSpeed = 80;
    const normalizedSpeed = Math.min(averageSpeed, maxSpeed) / maxSpeed;
    
    let easedSpeed;
    if (normalizedSpeed < 0.5) {
      easedSpeed = 4 * normalizedSpeed * normalizedSpeed * normalizedSpeed;
    } else {
      const val = 2 * normalizedSpeed - 2;
      easedSpeed = 0.5 * val * val * val + 1;
    }
    
    const maxWeight = settingsData.brushSize;
    const minWeight = settingsData.brushSize * 0.30;
    const dynamicWeight = maxWeight - (easedSpeed * (maxWeight - minWeight));
    
    return Math.max(minWeight, dynamicWeight);
  }
};

export function Canvas() {
  const { 
    activeTool, 
    layers, 
    settings, 
    applyFilter, 
    canvasDimensions, 
    canvasBackground, 
    setPreviewUrl, 
    layerData, 
    setLayerData, 
    saveHistory, 
    historyIndex, 
    pendingAiScene,
    pendingMergeDown,
    completeMergeDown
  } = useEditorStore();

  return (
    <P5Canvas 
      sketch={sketch} 
      activeTool={activeTool} 
      layers={layers} 
      settings={settings} 
      applyFilter={applyFilter} 
      pendingAiScene={pendingAiScene}
      pendingMergeDown={pendingMergeDown}
      completeMergeDown={completeMergeDown}
      canvasDimensions={canvasDimensions}
      canvasBackground={canvasBackground}
      layerData={layerData}
      onUpdateCanvas={setPreviewUrl}
      onUpdateLayer={setLayerData}
      saveHistory={saveHistory}
      historyIndex={historyIndex}
    />
  );
}
