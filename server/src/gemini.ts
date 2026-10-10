import { GoogleGenAI, Type } from '@google/genai';
import { DrawingScene } from './type/types.js';



/**
 * Traduit une description textuelle en instructions graphiques structurées
 */
export async function generateDrawingScene(
  userPrompt: string,
  canvasWidth: number = 1200,
  canvasHeight: number = 800
): Promise<DrawingScene> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('La clé d\'API Gemini n\'est pas définie dans les variables d\'environnement.');
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
Tu es un illustrateur vectoriel expert en p5.js sur un canvas de ${canvasWidth}x${canvasHeight} pixels.
Ton objectif est de créer une œuvre graphique riche, moderne et détaillée en décomposant la demande de l'utilisateur en une série de formes géométriques.

FORMAT JSON STRICT REQUIS :
{
  "description": "Courte description en français",
  "backgroundColor": "#1E1035",
  "commands": [
    // Entre 20 et 35 formes ordonnées de l'arrière-plan vers le premier plan !
  ]
}

FORMES AUTORISÉES DANS 'commands' :
- { "type": "rect", "x": 0, "y": 450, "width": ${canvasWidth}, "height": 350, "fill": "#0F172A" }
- { "type": "circle", "x": 600, "y": 250, "radius": 70, "fill": "#F59E0B" }
- { "type": "triangle", "x1": 100, "y1": 450, "x2": 250, "y2": 200, "x3": 400, "y3": 450, "fill": "#334155" }
- { "type": "line", "x1": 0, "y1": 500, "x2": ${canvasWidth}, "y2": 500, "stroke": "#38BDF8", "strokeWeight": 2 }
- { "type": "text", "text": "Titre", "x": 50, "y": 50, "size": 24, "fill": "#FFFFFF" }

RÈGLES D'OR :
1. Génère OBLIGATOIREMENT entre 20 et 35 formes pour composer une scène complète.
2. Définis TOUJOURS une couleur 'fill' (code hexadécimal).
3. Décompose par plans successifs :
   - Fond / Ciel (backgroundColor)
   - Lointain : soleil/lune, mer, montagnes, ciel étoilé ou nuages
   - Bâtiment / Sujet principal : façades, toits, baies vitrées, piliers, terrasse
   - Détails / Premier plan : piscine, reflets sur l'eau, arbres/palmiers, éclairages.
Ne génère JAMAIS moins de 20 formes !
`;

  const response = await ai.models.generateContent({
    model: 'models/gemini-3.8-flash',
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json', // Force le retour en JSON propre
      temperature: 0.7
    }
  });

  if (!response.text) {
    throw new Error('Réponse vide reçue de Gemini');
  }

  const scene: DrawingScene = JSON.parse(response.text);
  return scene;
}