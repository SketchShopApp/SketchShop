import { useEffect, useRef } from "react";
import { P5Canvas } from "@p5-wrapper/react";
import type { Sketch } from "@p5-wrapper/react";
import type { Tool, Layer, DrawingSettings, BlendMode, CanvasObject, BoundingBox, HandleType } from '../../core/types';
import { useEditorStore } from "../../store/useEditorStore";
import { applyThreshold, applyPixelate, applyASCII } from "./filters";
import { sceneToCanvasObjects } from '../../core/interpreter';
import type { DrawingScene } from '../../core/types';
import {
  computeCombinedBounds,
  isPointInsideObject,
  isObjectInMarquee,
  getHandlePositions,
  getHandleUnderPoint,
  getCursorForHandle,
  normalizeBox,
  resizeBoundsWithHandle,
  transformObjectsWithNewBounds,
} from '../../core/selection';

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

  // Manipulation d'objets & boîte de délimitation (Phase 1)
  objects: CanvasObject[];
  selectedObjectIds: string[];
  onAddObject?: (obj: CanvasObject, autoSelect?: boolean) => void;
  onUpdateObject?: (id: string, updates: Partial<CanvasObject>) => void;
  onUpdateObjects?: (updates: { id: string; changes: Partial<CanvasObject> }[]) => void;
  onSetObjects?: (objects: CanvasObject[]) => void;
  onSelectObject?: (id: string, multiSelect?: boolean) => void;
  onSelectObjects?: (ids: string[]) => void;
  onClearSelection?: () => void;
  onSetActiveLayer?: (id: string) => void;
  onDeleteSelectedObjects?: () => void;
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

  // Phase 1 : Données d'objets et de sélection
  let objectsData: CanvasObject[] = [];
  let selectedObjectIdsData: string[] = [];
  let onAddObject: ((obj: CanvasObject, autoSelect?: boolean) => void) | undefined;
  let onUpdateObjects: ((updates: { id: string; changes: Partial<CanvasObject> }[]) => void) | undefined;
  let onSetObjects: ((objects: CanvasObject[]) => void) | undefined;
  let onSelectObject: ((id: string, multiSelect?: boolean) => void) | undefined;
  let onSelectObjects: ((ids: string[]) => void) | undefined;
  let onClearSelection: (() => void) | undefined;
  let onSetActiveLayer: ((id: string) => void) | undefined;

  const layerGraphics = new Map<string, any>();
  const lastSyncedDataUrl = new Map<string, string>();
  
  // États d'interaction
  let shapeCreationStart: { x: number; y: number } | null = null;
  let marqueeBox: { startX: number; startY: number; currentX: number; currentY: number } | null = null;
  let isDraggingObjects = false;
  let dragStartPos = { x: 0, y: 0 };
  let initialObjectPositions = new Map<string, { x: number; y: number }>();

  // États pour les poignées d'ancrage
  let activeHandle: HandleType | null = null;
  let hoveredHandle: HandleType | null = null;
  let initialHandleBounds: BoundingBox | null = null;
  let initialObjectsBeforeTransform = new Map<string, CanvasObject>();

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
  const prevLocalMouse = { x: 0, y: 0 };

  function updateLocalMouse(forceSyncPrev = false) {
    const canvasElement = (p5 as any).canvas;
    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      const scaleX = canvasDimensions.width / rect.width;
      const scaleY = canvasDimensions.height / rect.height;
      localMouse.x = (p5.winMouseX - rect.left) * scaleX;
      localMouse.y = (p5.winMouseY - rect.top) * scaleY;
    }
    if (forceSyncPrev) {
      prevLocalMouse.x = localMouse.x;
      prevLocalMouse.y = localMouse.y;
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

    // Mise à jour objets et sélection
    objectsData = props.objects || [];
    selectedObjectIdsData = props.selectedObjectIds || [];
    onAddObject = props.onAddObject;
    onUpdateObjects = props.onUpdateObjects;
    onSetObjects = props.onSetObjects;
    onSelectObject = props.onSelectObject;
    onSelectObjects = props.onSelectObjects;
    onClearSelection = props.onClearSelection;
    onSetActiveLayer = props.onSetActiveLayer;
    
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

    // Support des scènes IA : converties en objets manipulables et/ou tracées
    if (props.pendingAiScene && props.pendingAiScene.timestamp > lastAiTimestamp) {
      lastAiTimestamp = props.pendingAiScene.timestamp;
      const activeLayer = layersData.find(l => l.isActive);
      if (activeLayer) {
        const newObjects = sceneToCanvasObjects(props.pendingAiScene.scene, activeLayer.id);
        if (newObjects.length > 0 && onSetObjects) {
          onSetObjects([...objectsData, ...newObjects]);
          onSelectObjects?.(newObjects.map(o => o.id));
        }
        needsSync = true;
        syncToStore();
        saveHistoryProp?.();
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

  // Rendu individuel d'un objet canvas vectoriel
  function renderCanvasObject(target: any, obj: CanvasObject, layerOpacity: number) {
    target.push();
    const effOpacity = ((obj.opacity ?? 100) / 100) * (layerOpacity / 100);

    // Rotation si définie
    if (obj.rotation) {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      target.translate(cx, cy);
      target.rotate(p5.radians(obj.rotation));
      target.translate(-cx, -cy);
    }

    // Traitement du Fill
    if (obj.fill === 'none' || obj.fill === 'transparent') {
      target.noFill();
    } else if (obj.fill) {
      const c = p5.color(obj.fill);
      c.setAlpha(effOpacity * 255);
      target.fill(c);
    } else {
      const c = p5.color('#000000');
      c.setAlpha(effOpacity * 255);
      target.fill(c);
    }

    // Traitement du Stroke
    if (obj.stroke && obj.stroke !== 'none' && obj.stroke !== 'transparent') {
      const sc = p5.color(obj.stroke);
      sc.setAlpha(effOpacity * 255);
      target.stroke(sc);
      target.strokeWeight(obj.strokeWeight ?? 1);
    } else {
      target.noStroke();
    }

    switch (obj.type) {
      case 'rect': {
        target.rect(obj.x, obj.y, obj.width, obj.height, obj.borderRadius ?? 0);
        break;
      }
      case 'circle': {
        target.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width, obj.height);
        break;
      }
      case 'line': {
        if (obj.points && obj.points.length >= 2) {
          target.line(obj.points[0].x, obj.points[0].y, obj.points[1].x, obj.points[1].y);
        } else {
          target.line(obj.x, obj.y, obj.x + obj.width, obj.y + obj.height);
        }
        break;
      }
      case 'triangle': {
        if (obj.points && obj.points.length >= 3) {
          target.triangle(
            obj.points[0].x, obj.points[0].y,
            obj.points[1].x, obj.points[1].y,
            obj.points[2].x, obj.points[2].y
          );
        }
        break;
      }
      case 'text': {
        if (obj.fontSize) {
          target.textSize(obj.fontSize);
        }
        target.text(obj.text || '', obj.x, obj.y + (obj.fontSize || 16));
        break;
      }
    }

    target.pop();
  }

  // Rasterisation automatique des objets touchés par le pinceau ou la gomme
  function checkRasterizeObjectsUnderBrush(activeLayerId: string, x: number, y: number, radius: number) {
    const g = layerGraphics.get(activeLayerId);
    if (!g) return;

    const hitObjects = objectsData.filter(
      o => o.layerId === activeLayerId && isPointInsideObject(x, y, o, radius + 2)
    );

    if (hitObjects.length > 0) {
      const hitIds = new Set(hitObjects.map(o => o.id));
      for (const obj of hitObjects) {
        renderCanvasObject(g, obj, 100);
      }
      const remaining = objectsData.filter(o => !hitIds.has(o.id));
      objectsData = remaining;
      if (onSetObjects) {
        onSetObjects(remaining);
      }
      needsSync = true;
    }
  }

  p5.draw = () => {
    updateLocalMouse(false);
    if (canvasBackground === 'transparent') {
        p5.clear();
    } else {
        p5.background(canvasBackground);
    }

    ensureCompositeBuffers();

    // 1. Rendu des calques et des objets par calque
    let i = 0;
    while (i < layersData.length) {
      const baseLayer = layersData[i];
      const baseG = layerGraphics.get(baseLayer.id);

      let nextIndex = i + 1;
      while (nextIndex < layersData.length && layersData[nextIndex].isClippingMask) {
        nextIndex++;
      }

      const hasClipping = nextIndex > i + 1;
      const mainCtx = p5.drawingContext as CanvasRenderingContext2D;

      if (!hasClipping) {
        if (baseG && baseLayer.isVisible) {
          mainCtx.save();
          mainCtx.globalAlpha = baseLayer.opacity / 100;
          mainCtx.globalCompositeOperation = getCompositeOperation(baseLayer.blendMode);
          mainCtx.drawImage(baseG.canvas, 0, 0);
          mainCtx.restore();

          // Rendu des objets de ce calque
          const layerObjects = objectsData.filter(o => o.layerId === baseLayer.id);
          for (const obj of layerObjects) {
            renderCanvasObject(p5, obj, baseLayer.opacity);
          }
        }
        i++;
      } else {
        if (baseG && baseLayer.isVisible) {
          groupBuffer.clear();
          groupBuffer.drawingContext.save();
          groupBuffer.drawingContext.globalAlpha = 1.0;
          groupBuffer.drawingContext.globalCompositeOperation = 'source-over';
          groupBuffer.drawingContext.drawImage(baseG.canvas, 0, 0);
          groupBuffer.drawingContext.restore();

          // Rendu des objets du calque de base
          const baseObjects = objectsData.filter(o => o.layerId === baseLayer.id);
          for (const obj of baseObjects) {
            renderCanvasObject(groupBuffer, obj, 100);
          }

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

              // Objets du calque de masque
              const clipObjects = objectsData.filter(o => o.layerId === clipLayer.id);
              for (const obj of clipObjects) {
                renderCanvasObject(groupBuffer, obj, clipLayer.opacity);
              }
            }
          }

          mainCtx.save();
          mainCtx.globalAlpha = baseLayer.opacity / 100;
          mainCtx.globalCompositeOperation = getCompositeOperation(baseLayer.blendMode);
          mainCtx.drawImage(groupBuffer.canvas, 0, 0);
          mainCtx.restore();
        }
        i = nextIndex;
      }
    }

    // 2. Dessin continu au pinceau / gomme
    if (p5.mouseIsPressed && isMouseOverCanvas() && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'shapes')) {
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

    // 3. Prévisualisation de création d'objet (square)
    if (activeTool === 'square' && shapeCreationStart && p5.mouseIsPressed && isMouseOverCanvas()) {
      p5.push();
      p5.stroke('#8354E0');
      p5.strokeWeight(1.5);
      const c = p5.color(settingsData.color);
      c.setAlpha((settingsData.opacity / 100) * 100);
      p5.fill(c);
      p5.rect(
        shapeCreationStart.x,
        shapeCreationStart.y,
        localMouse.x - shapeCreationStart.x,
        localMouse.y - shapeCreationStart.y
      );
      p5.pop();
    }

    // Synchronisation périodique propre
    if (needsSync && p5.millis() - lastSyncTime > 500) {
      syncToStore();
    }

    // 4. Phase 1 : Rendu de la boîte de délimitation (Bounding Box) et des 8 poignées d'ancrage
    renderSelectionOverlays();

    // 5. Mise à jour du curseur contextuel
    updateCursor();
  };

  function renderSelectionOverlays() {
    // 4.1 Cadre de sélection rectangulaire (Marquee)
    if (marqueeBox) {
      const m = normalizeBox(
        marqueeBox.startX,
        marqueeBox.startY,
        marqueeBox.currentX - marqueeBox.startX,
        marqueeBox.currentY - marqueeBox.startY
      );
      p5.push();
      p5.fill(131, 84, 224, 30);
      p5.stroke('#8354E0');
      p5.strokeWeight(1);
      (p5.drawingContext as CanvasRenderingContext2D).setLineDash([4, 4]);
      p5.rect(m.minX, m.minY, m.width, m.height);
      (p5.drawingContext as CanvasRenderingContext2D).setLineDash([]);
      p5.pop();
    }

    // 4.2 Boîte de délimitation (Bounding Box) avec 8 poignées — EXCLUSIVEMENT pour le calque actif
    if (selectedObjectIdsData.length > 0) {
      const activeLayer = layersData.find(l => l.isActive);
      const selectedObjects = objectsData.filter(o => {
        if (!selectedObjectIdsData.includes(o.id)) return false;
        if (!activeLayer || o.layerId !== activeLayer.id) return false;
        return activeLayer.isVisible && !activeLayer.isLocked;
      });

      const bounds = computeCombinedBounds(selectedObjects);
      if (bounds && bounds.width >= 0 && bounds.height >= 0) {
        p5.push();

        // Cadre principal de délimitation
        p5.noFill();
        p5.stroke('#8354E0');
        p5.strokeWeight(1.5);
        p5.rect(bounds.minX, bounds.minY, bounds.width, bounds.height);

        // Poignée de rotation (tige et cercle au-dessus)
        const midX = bounds.minX + bounds.width / 2;
        const rotY = bounds.minY - 22;
        p5.stroke('#8354E0');
        p5.strokeWeight(1);
        p5.line(midX, bounds.minY, midX, rotY);

        const isRotHovered = hoveredHandle === 'rot' || activeHandle === 'rot';
        p5.fill(isRotHovered ? '#8354E0' : '#ffffff');
        p5.stroke('#8354E0');
        p5.strokeWeight(1.5);
        p5.circle(midX, rotY, 8);

        // 8 Poignées d'ancrage (Coins et Bords)
        const handles = getHandlePositions(bounds);
        const handleKeys: HandleType[] = ['tl', 'tc', 'tr', 'mr', 'br', 'bc', 'bl', 'ml'];
        const handleSize = 8;

        for (const key of handleKeys) {
          const h = handles[key];
          const isHighlighted = hoveredHandle === key || activeHandle === key;
          
          p5.fill(isHighlighted ? '#8354E0' : '#ffffff');
          p5.stroke('#8354E0');
          p5.strokeWeight(1.5);
          p5.rectMode(p5.CENTER);
          p5.rect(h.x, h.y, handleSize, handleSize);
        }

        p5.rectMode(p5.CORNER);
        p5.pop();
      }
    }
  }

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

  // RÈGLE : La sélection ne cible QUE les objets du calque actif
  function getSelectableObjects(): CanvasObject[] {
    const activeLayer = layersData.find(l => l.isActive);
    if (!activeLayer || !activeLayer.isVisible || activeLayer.isLocked) {
      return [];
    }
    return objectsData.filter(o => o.layerId === activeLayer.id);
  }

  p5.mousePressed = () => {
    if (!isMouseOverCanvas()) return;
    updateLocalMouse(true);

    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'shapes') {
      const activeLayer = layersData.find(l => l.isActive);
      if (activeLayer && !activeLayer.isLocked) {
        const g = layerGraphics.get(activeLayer.id);
        if (g) {
          handleDrawing(g, activeLayer);
          needsSync = true;
          wasDrawingSession = true;
        }
      }
      return;
    }

    if (activeTool === 'square') {
      shapeCreationStart = { x: localMouse.x, y: localMouse.y };
      return;
    }

    if (activeTool === 'select') {
      const activeLayer = layersData.find(l => l.isActive);
      const selectedObjects = objectsData.filter(o =>
        selectedObjectIdsData.includes(o.id) &&
        activeLayer && o.layerId === activeLayer.id
      );
      const bounds = computeCombinedBounds(selectedObjects);

      // 1. Clic sur une des 8 poignées d'ancrage ou rotation
      if (bounds) {
        const hitHandle = getHandleUnderPoint(localMouse.x, localMouse.y, bounds);
        if (hitHandle) {
          activeHandle = hitHandle;
          dragStartPos = { x: localMouse.x, y: localMouse.y };
          initialHandleBounds = { ...bounds };
          initialObjectsBeforeTransform = new Map(selectedObjects.map(o => [o.id, { ...o }]));
          return;
        }
      }

      // 2. Clic sur un objet du calque actif
      const selectables = getSelectableObjects();
      let clickedObject: CanvasObject | null = null;
      for (let idx = selectables.length - 1; idx >= 0; idx--) {
        const candidate = selectables[idx];
        if (isPointInsideObject(localMouse.x, localMouse.y, candidate)) {
          clickedObject = candidate;
          break;
        }
      }

      const isShift = p5.keyIsDown(p5.SHIFT);

      if (clickedObject) {
        const isAlreadySelected = selectedObjectIdsData.includes(clickedObject.id);

        if (isShift) {
          onSelectObject?.(clickedObject.id, true);
        } else if (!isAlreadySelected) {
          onSelectObject?.(clickedObject.id, false);
          onSetActiveLayer?.(clickedObject.layerId);
        }

        // Préparation du déplacement par glisser-déposer
        isDraggingObjects = true;
        dragStartPos = { x: localMouse.x, y: localMouse.y };
        const activeGroup = isAlreadySelected && !isShift
          ? selectedObjects
          : [clickedObject];
        initialObjectPositions = new Map(activeGroup.map(o => [o.id, { x: o.x, y: o.y }]));
        return;
      }

      // 3. Clic dans la boîte de délimitation déjà sélectionnée
      if (bounds && localMouse.x >= bounds.minX && localMouse.x <= bounds.maxX &&
          localMouse.y >= bounds.minY && localMouse.y <= bounds.maxY) {
        isDraggingObjects = true;
        dragStartPos = { x: localMouse.x, y: localMouse.y };
        initialObjectPositions = new Map(selectedObjects.map(o => [o.id, { x: o.x, y: o.y }]));
        return;
      }

      // 4. Clic dans le vide -> Démarrage du cadre de sélection (Marquee)
      if (!isShift) {
        onClearSelection?.();
      }
      marqueeBox = {
        startX: localMouse.x,
        startY: localMouse.y,
        currentX: localMouse.x,
        currentY: localMouse.y,
      };
    }
  };

  p5.mouseDragged = () => {
    updateLocalMouse(false);

    if (activeTool === 'select') {
      // Mise à jour du cadre de sélection rectangulaire
      if (marqueeBox) {
        marqueeBox.currentX = localMouse.x;
        marqueeBox.currentY = localMouse.y;
        return;
      }

      // Déplacement des objets sélectionnés (Drag & Drop)
      if (isDraggingObjects && initialObjectPositions.size > 0) {
        const dx = localMouse.x - dragStartPos.x;
        const dy = localMouse.y - dragStartPos.y;

        const updates: { id: string; changes: Partial<CanvasObject> }[] = [];
        initialObjectPositions.forEach((pos, id) => {
          updates.push({
            id,
            changes: { x: pos.x + dx, y: pos.y + dy }
          });
        });

        if (updates.length > 0) {
          objectsData = objectsData.map(o => {
            const pos = initialObjectPositions.get(o.id);
            return pos ? { ...o, x: pos.x + dx, y: pos.y + dy } : o;
          });
        }
        return;
      }

      // Redimensionnement via les 8 poignées d'ancrage (gère -x et -y)
      if (activeHandle && initialHandleBounds && initialObjectsBeforeTransform.size > 0) {
        handleResizeTransform(activeHandle, initialHandleBounds);
        return;
      }
    }
  };

  function handleResizeTransform(handle: HandleType, origBox: BoundingBox) {
    const dx = localMouse.x - dragStartPos.x;
    const dy = localMouse.y - dragStartPos.y;
    const isShift = p5.keyIsDown(p5.SHIFT);

    if (handle === 'rot') {
      const cx = origBox.minX + origBox.width / 2;
      const cy = origBox.minY + origBox.height / 2;
      const angle = Math.atan2(localMouse.y - cy, localMouse.x - cx);
      let deg = Math.round(p5.degrees(angle) + 90);
      if (isShift) {
        deg = Math.round(deg / 15) * 15;
      }
      deg = (deg % 360 + 360) % 360;

      objectsData = objectsData.map(o => {
        if (initialObjectsBeforeTransform.has(o.id)) {
          return { ...o, rotation: deg };
        }
        return o;
      });
      return;
    }

    // Calcul précis avec anchor fixe, supportant parfaitement les deltas négatifs (-x, -y)
    const newBox = resizeBoundsWithHandle(origBox, handle, dx, dy, isShift);
    const updates = transformObjectsWithNewBounds(initialObjectsBeforeTransform, origBox, newBox);
    const updateMap = new Map(updates.map(u => [u.id, u.changes]));

    objectsData = objectsData.map(o => {
      const ch = updateMap.get(o.id);
      return ch ? { ...o, ...ch } : o;
    });
  }

  p5.mouseReleased = () => {
    updateLocalMouse(false);

    // Finalisation de création d'objet (square)
    if (activeTool === 'square' && shapeCreationStart) {
      const activeLayer = layersData.find(l => l.isActive);
      if (activeLayer && !activeLayer.isLocked) {
        const box = normalizeBox(
          shapeCreationStart.x,
          shapeCreationStart.y,
          localMouse.x - shapeCreationStart.x,
          localMouse.y - shapeCreationStart.y
        );

        if (box.width >= 3 && box.height >= 3) {
          const newObj: CanvasObject = {
            id: Math.random().toString(36).substring(2, 9),
            layerId: activeLayer.id,
            type: 'rect',
            x: box.minX,
            y: box.minY,
            width: box.width,
            height: box.height,
            fill: settingsData.color,
            opacity: settingsData.opacity,
          };
          onAddObject?.(newObj, true);
          needsSync = true;
        }
      }
      shapeCreationStart = null;
    }

    // Finalisation du cadre de sélection (Marquee) — Cible QUE le calque actif
    if (activeTool === 'select' && marqueeBox) {
      const mWidth = Math.abs(marqueeBox.currentX - marqueeBox.startX);
      const mHeight = Math.abs(marqueeBox.currentY - marqueeBox.startY);

      if (mWidth > 4 || mHeight > 4) {
        const selectables = getSelectableObjects();
        const selected = selectables.filter(o => isObjectInMarquee(o, marqueeBox!));
        if (selected.length > 0) {
          onSelectObjects?.(selected.map(o => o.id));
        } else {
          onClearSelection?.();
        }
      }
      marqueeBox = null;
    }

    // Finalisation du déplacement
    if (isDraggingObjects) {
      if (initialObjectPositions.size > 0 && onUpdateObjects) {
        const updates: { id: string; changes: Partial<CanvasObject> }[] = [];
        const dx = localMouse.x - dragStartPos.x;
        const dy = localMouse.y - dragStartPos.y;
        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
          initialObjectPositions.forEach((pos, id) => {
            updates.push({
              id,
              changes: { x: pos.x + dx, y: pos.y + dy }
            });
          });
          onUpdateObjects(updates);
          needsSync = true;
        }
      }
      isDraggingObjects = false;
      initialObjectPositions.clear();
    }

    // Finalisation du redimensionnement / rotation
    if (activeHandle) {
      if (initialObjectsBeforeTransform.size > 0 && onUpdateObjects) {
        const updates: { id: string; changes: Partial<CanvasObject> }[] = [];
        initialObjectsBeforeTransform.forEach((_, id) => {
          const current = objectsData.find(o => o.id === id);
          if (current) {
            updates.push({
              id,
              changes: {
                x: current.x,
                y: current.y,
                width: current.width,
                height: current.height,
                rotation: current.rotation,
              }
            });
          }
        });
        onUpdateObjects(updates);
        needsSync = true;
      }
      activeHandle = null;
      initialHandleBounds = null;
      initialObjectsBeforeTransform.clear();
    }

    if (wasDrawingSession) {
      syncToStore();
      saveHistoryProp?.();
      wasDrawingSession = false;
    }
  };

  function updateCursor() {
    const canvasElement = (p5 as any).canvas as HTMLCanvasElement;
    if (!canvasElement) return;

    if (activeTool === 'brush' || activeTool === 'eraser') {
      p5.cursor(p5.CROSS);
      return;
    }

    if (activeTool === 'move') {
      p5.cursor(p5.HAND);
      return;
    }

    if (activeTool === 'square') {
      p5.cursor(p5.CROSS);
      return;
    }

    if (activeTool === 'select') {
      const activeLayer = layersData.find(l => l.isActive);
      const selectedObjects = objectsData.filter(o =>
        selectedObjectIdsData.includes(o.id) &&
        activeLayer && o.layerId === activeLayer.id
      );
      const bounds = computeCombinedBounds(selectedObjects);

      if (bounds) {
        const handle = getHandleUnderPoint(localMouse.x, localMouse.y, bounds);
        hoveredHandle = handle;
        if (handle) {
          canvasElement.style.cursor = getCursorForHandle(handle);
          return;
        }

        if (localMouse.x >= bounds.minX && localMouse.x <= bounds.maxX &&
            localMouse.y >= bounds.minY && localMouse.y <= bounds.maxY) {
          canvasElement.style.cursor = 'move';
          return;
        }
      } else {
        hoveredHandle = null;
      }

      // Au-dessus d'un objet sélectionnable du calque actif
      const selectables = getSelectableObjects();
      for (const obj of selectables) {
        if (isPointInsideObject(localMouse.x, localMouse.y, obj)) {
          canvasElement.style.cursor = 'pointer';
          return;
        }
      }

      canvasElement.style.cursor = 'default';
    }
  }

  function handleDrawing(g: any, activeLayer: Layer) {
    if (activeLayer.isTransparentLocked) {
      g.drawingContext.save();
      g.drawingContext.globalCompositeOperation = 'source-atop';
    }

    // Si on dessine ou efface sur un objet du calque actif, on le rasterise dans g
    checkRasterizeObjectsUnderBrush(activeLayer.id, localMouse.x, localMouse.y, settingsData.brushSize);

    if (activeTool === 'brush') {
      const c = p5.color(settingsData.color);
      c.setAlpha((settingsData.opacity / 100) * 255);
      g.stroke(c);
      g.fill(c);
      g.strokeCap(p5.ROUND);
      g.strokeJoin(p5.ROUND);

      let sw = settingsData.brushSize;
      if (settingsData.isDynamicBrush) {
        sw = calculateDynamicStrokeWeight(localMouse.x, localMouse.y, prevLocalMouse.x, prevLocalMouse.y);
      }

      g.strokeWeight(sw);
      g.line(prevLocalMouse.x, prevLocalMouse.y, localMouse.x, localMouse.y);
    } else if (activeTool === 'eraser') {
      if (!activeLayer.isTransparentLocked) {
        g.erase();
        g.strokeCap(p5.ROUND);
        g.strokeJoin(p5.ROUND);
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

    // Mise à jour de la coordonnée précédente à la fin de chaque tracé effectif
    prevLocalMouse.x = localMouse.x;
    prevLocalMouse.y = localMouse.y;
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
    completeMergeDown,
    objects,
    selectedObjectIds,
    addObject,
    updateObject,
    updateObjects,
    setObjects,
    selectObject,
    selectObjects,
    clearSelection,
    setActiveLayer,
    deleteSelectedObjects,
  } = useEditorStore();

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Raccourcis clavier pour la suppression et l'échappement de sélection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedObjectIds.length > 0) {
          e.preventDefault();
          deleteSelectedObjects();
        }
      } else if (e.key === 'Escape') {
        if (selectedObjectIds.length > 0) {
          e.preventDefault();
          clearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectIds, deleteSelectedObjects, clearSelection]);

  return (
    <div ref={canvasContainerRef} className="w-full h-full relative">
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
        objects={objects}
        selectedObjectIds={selectedObjectIds}
        onAddObject={addObject}
        onUpdateObject={updateObject}
        onUpdateObjects={updateObjects}
        onSetObjects={setObjects}
        onSelectObject={selectObject}
        onSelectObjects={selectObjects}
        onClearSelection={clearSelection}
        onSetActiveLayer={setActiveLayer}
        onDeleteSelectedObjects={deleteSelectedObjects}
      />
    </div>
  );
}

