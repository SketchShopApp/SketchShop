export type Tool = 'select' | 'move' | 'brush'  | 'eraser' | 'shapes' | 'square' | 'pixelate' | 'threshold' | 'ascii';

export type CanvasObjectType = 'rect' | 'circle' | 'line' | 'triangle' | 'text' | 'image';

export interface CanvasObject {
  id: string;
  layerId: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // en degrés (0 - 360)
  fill?: string;
  stroke?: string;
  strokeWeight?: number;
  opacity?: number;
  borderRadius?: number;
  text?: string;
  fontSize?: number;
  imageUrl?: string;
  flipX?: boolean;
  flipY?: boolean;
  points?: { x: number; y: number }[];
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type HandleType = 'tl' | 'tc' | 'tr' | 'mr' | 'br' | 'bc' | 'bl' | 'ml' | 'rot';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'difference';

export interface Layer {
  id: string;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
  isActive: boolean;
  opacity: number;
  blendMode?: BlendMode;
  isClippingMask?: boolean;
  isTransparentLocked?: boolean;
}

export interface DrawingSettings {
  color: string;
  brushSize: number;
  opacity: number;
  isDynamicBrush: boolean;
  pixelSize: number;
  threshold: number;
  asciiScale: number;
}

// --- Commandes graphiques générées par l'IA ---
export interface BaseStyle {
  fill?: string;
  stroke?: string;
  strokeWeight?: number;
}

export interface CircleCommand extends BaseStyle {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface RectCommand extends BaseStyle {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface LineCommand extends BaseStyle {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TriangleCommand extends BaseStyle {
  type: 'triangle';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
}

export interface TextCommand extends BaseStyle {
  type: 'text';
  text: string;
  x: number;
  y: number;
  size: number;
}

export type DrawingCommand =
  | CircleCommand
  | RectCommand
  | LineCommand
  | TriangleCommand
  | TextCommand;

export interface DrawingScene {
  description: string;
  backgroundColor: string;
  commands: DrawingCommand[];
}
