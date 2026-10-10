import type { DrawingScene, DrawingCommand } from './types';

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