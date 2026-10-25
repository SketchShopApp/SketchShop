import type { DrawingScene, DrawingCommand, CanvasObject } from './types';

/**
 * Interprète et dessine une scène générée par l'IA sur une cible p5 (canvas ou graphics de calque).
 */
export function renderDrawingScene(target: any, scene: DrawingScene) {
  if (!target || !scene) return;

  // 1. Sauvegarde de l'état graphique (pour ne pas perturber les outils du pinceau)
  target.push();

  // 2. Traitement de la couleur de fond si demandée
  if (scene.backgroundColor && scene.backgroundColor !== 'none') {
    target.background(scene.backgroundColor);
  }

  // 3. Boucle d'interprétation des formes
  for (const cmd of scene.commands) {
    applyStyles(target, cmd);

    switch (cmd.type) {
      case 'circle': {
        const radius = cmd.radius ?? 20;
        // p5.js attend le diamètre (rayon * 2)
        target.circle(cmd.x, cmd.y, radius * 2);
        break;
      }

      case 'rect': {
        const w = cmd.width ?? 50;
        const h = cmd.height ?? 50;
        const radius = cmd.borderRadius ?? 0;
        target.rect(cmd.x, cmd.y, w, h, radius);
        break;
      }

      case 'line': {
        target.line(cmd.x1, cmd.y1, cmd.x2, cmd.y2);
        break;
      }

      case 'triangle': {
        target.triangle(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x3, cmd.y3);
        break;
      }

      case 'text': {
        if (cmd.size) {
          target.textSize(cmd.size);
        }
        target.text(cmd.text, cmd.x, cmd.y);
        break;
      }

      default:
        console.warn(`Commande graphique inconnue :`, (cmd as any).type);
    }
  }

  // 4. Restauration de l'état graphique initial
  target.pop();
}

/**
 * Convertit une scène générée par l'IA en une liste d'objets vectoriels manipulables.
 */
export function sceneToCanvasObjects(scene: DrawingScene, layerId: string): CanvasObject[] {
  if (!scene || !scene.commands) return [];

  return scene.commands.map((cmd) => {
    const id = Math.random().toString(36).substring(2, 9);
    switch (cmd.type) {
      case 'circle': {
        const r = cmd.radius ?? 20;
        return {
          id,
          layerId,
          type: 'circle',
          x: cmd.x - r,
          y: cmd.y - r,
          width: r * 2,
          height: r * 2,
          fill: cmd.fill ?? '#000000',
          stroke: cmd.stroke,
          strokeWeight: cmd.strokeWeight,
        };
      }
      case 'rect': {
        return {
          id,
          layerId,
          type: 'rect',
          x: cmd.x,
          y: cmd.y,
          width: cmd.width ?? 50,
          height: cmd.height ?? 50,
          borderRadius: cmd.borderRadius,
          fill: cmd.fill ?? '#000000',
          stroke: cmd.stroke,
          strokeWeight: cmd.strokeWeight,
        };
      }
      case 'line': {
        const minX = Math.min(cmd.x1, cmd.x2);
        const minY = Math.min(cmd.y1, cmd.y2);
        const maxX = Math.max(cmd.x1, cmd.x2);
        const maxY = Math.max(cmd.y1, cmd.y2);
        return {
          id,
          layerId,
          type: 'line',
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1),
          points: [{ x: cmd.x1, y: cmd.y1 }, { x: cmd.x2, y: cmd.y2 }],
          stroke: cmd.stroke ?? '#000000',
          strokeWeight: cmd.strokeWeight ?? 2,
        };
      }
      case 'triangle': {
        const minX = Math.min(cmd.x1, cmd.x2, cmd.x3);
        const minY = Math.min(cmd.y1, cmd.y2, cmd.y3);
        const maxX = Math.max(cmd.x1, cmd.x2, cmd.x3);
        const maxY = Math.max(cmd.y1, cmd.y2, cmd.y3);
        return {
          id,
          layerId,
          type: 'triangle',
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1),
          points: [
            { x: cmd.x1, y: cmd.y1 },
            { x: cmd.x2, y: cmd.y2 },
            { x: cmd.x3, y: cmd.y3 },
          ],
          fill: cmd.fill ?? '#000000',
          stroke: cmd.stroke,
          strokeWeight: cmd.strokeWeight,
        };
      }
      case 'text': {
        const size = cmd.size ?? 20;
        const estimatedWidth = cmd.text.length * size * 0.6;
        return {
          id,
          layerId,
          type: 'text',
          x: cmd.x,
          y: cmd.y,
          width: estimatedWidth,
          height: size,
          text: cmd.text,
          fontSize: size,
          fill: cmd.fill ?? '#000000',
          stroke: cmd.stroke,
          strokeWeight: cmd.strokeWeight,
        };
      }
    }
  });
}

/**
 * Applique les styles (remplissage, contour, épaisseur)
 */
function applyStyles(target: any, cmd: DrawingCommand) {
  // Gestion du Fill (remplissage)
  if (cmd.fill === 'none' || cmd.fill === 'transparent') {
    target.noFill();
  } else if (cmd.fill) {
    target.fill(cmd.fill);
  } else {
    // Style par défaut si non spécifié
    target.fill('#000000');
  }

  // Gestion du Stroke (contour)
  if (cmd.stroke === 'none' || cmd.stroke === 'transparent') {
    target.noStroke();
  } else if (cmd.stroke) {
    target.stroke(cmd.stroke);
  } else {
    target.noStroke();
  }

  // Gestion du StrokeWeight (épaisseur)
  if (typeof cmd.strokeWeight === 'number') {
    target.strokeWeight(cmd.strokeWeight);
  }
}
