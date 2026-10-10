// Style commun applicable aux formes
export interface BaseStyle {
  fill?: string;         // Ex: "#FF5733" ou "none" pour transparent
  stroke?: string;       // Ex: "#000000" ou "none"
  strokeWeight?: number; // Épaisseur du trait en pixels (ex: 2)
}

// 1. Cercle
export interface CircleCommand extends BaseStyle {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

// 2. Rectangle
export interface RectCommand extends BaseStyle {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

// 3. Ligne
export interface LineCommand extends BaseStyle {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// 4. Triangle
export interface TriangleCommand extends BaseStyle {
  type: 'triangle';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
}

// 5. Texte
export interface TextCommand extends BaseStyle {
  type: 'text';
  text: string;
  x: number;
  y: number;
  size: number;
}

// Union discriminée de toutes les commandes supportées
export type DrawingCommand =
  | CircleCommand
  | RectCommand
  | LineCommand
  | TriangleCommand
  | TextCommand;

// La scène complète générée par l'IA
export interface DrawingScene {
  description: string;       // Explication courte de la scène générée
  backgroundColor: string;   // Couleur de fond (ex: "#1E1E2E" ou "#F0F4F8")
  commands: DrawingCommand[];
}

// Types pour la communication HTTP
export interface GenerateSketchRequest {
  prompt: string;
  canvasWidth?: number;      // Pour donner le repère à l'IA (ex: 800)
  canvasHeight?: number;     // Pour donner le repère à l'IA (ex: 600)
}

export interface GenerateSketchResponse {
  success: boolean;
  scene?: DrawingScene;
  error?: string;
}