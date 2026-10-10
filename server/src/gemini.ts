import { GoogleGenAI, Type } from '@google/genai';
import { DrawingScene } from './type/types.js';



// Schéma strict imposé à Gemini
const drawingSceneSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: 'Courte description en français de la scène graphique dessinée.'
    },
    backgroundColor: {
      type: Type.STRING,
      description: 'Couleur de fond au format hexadécimal (ex: #FFFFFF, #1E1E2E, #87CEEB).'
    },
    commands: {
      type: Type.ARRAY,
      description: 'Liste chronologique des commandes de dessin du fond vers le premier plan.',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['circle', 'rect', 'line', 'triangle', 'text'],
            description: 'Type de forme géométrique à tracer.'
          },
          // Propriétés de style
          fill: { type: Type.STRING, description: 'Couleur de remplissage hexadécimale ou "none".' },
          stroke: { type: Type.STRING, description: 'Couleur du contour hexadécimale ou "none".' },
          strokeWeight: { type: Type.NUMBER, description: 'Épaisseur du trait en px.' },

          // Coordonnées et dimensions
          x: { type: Type.NUMBER, description: 'Position X (centre pour cercle, coin haut-gauche pour rect/texte).' },
          y: { type: Type.NUMBER, description: 'Position Y.' },
          radius: { type: Type.NUMBER, description: 'Rayon pour le cercle.' },
          width: { type: Type.NUMBER, description: 'Largeur pour le rectangle.' },
          height: { type: Type.NUMBER, description: 'Hauteur pour le rectangle.' },
          borderRadius: { type: Type.NUMBER, description: 'Rayon des coins arrondis (optionnel).' },

          // Ligne et Triangle
          x1: { type: Type.NUMBER },
          y1: { type: Type.NUMBER },
          x2: { type: Type.NUMBER },
          y2: { type: Type.NUMBER },
          x3: { type: Type.NUMBER },
          y3: { type: Type.NUMBER },

          // Texte
          text: { type: Type.STRING, description: 'Contenu du texte à afficher.' },
          size: { type: Type.NUMBER, description: 'Taille de la police en px.' }
        },
        required: ['type']
      }
    }
  },
  required: ['description', 'backgroundColor', 'commands']
};

/**
 * Traduit une description textuelle en instructions graphiques structurées
 */
export async function generateDrawingScene(
  userPrompt: string,
  canvasWidth: number = 800,
  canvasHeight: number = 600
): Promise<DrawingScene> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('La clé d\'API Gemini n\'est pas définie dans les variables d\'environnement.');
    }
    const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
Tu es un artiste et programmeur expert p5.js.
Ton rôle est de traduire les demandes de l'utilisateur en une composition graphique harmonieuse.
Règles du canvas :
- Dimensions : largeur ${canvasWidth}px, hauteur ${canvasHeight}px.
- Origine (0, 0) : coin supérieur gauche.
- x augmente vers la droite (0 à ${canvasWidth}).
- y augmente vers le bas (0 à ${canvasHeight}).
- L'ordre des formes dans 'commands' compte : les premières formes sont dessinées en dessous, les dernières au-dessus.
- Choisis des palettes de couleurs esthétiques et modernes.
- Décompose les objets complexes en formes simples (ex: un sapin = triangles verts superposés + rectangle marron pour le tronc).
- Pour chaque forme, tu DOIS impérativement fournir sa couleur ('fill' ou 'stroke'). Pour un 'circle', 'radius' est obligatoire. Pour un 'rect', 'width' et 'height' sont obligatoires. Compose des scènes détaillées et riches avec au minimum 5 à 15 formes.
`;

  const response = await ai.models.generateContent({
    model: 'models/gemini-3.8-flash',
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: drawingSceneSchema,
      temperature: 0.7
    }
  });

  if (!response.text) {
    throw new Error('Réponse vide reçue de Gemini');
  }

  // Le résultat est garanti conforme au schéma JSON
  const scene: DrawingScene = JSON.parse(response.text);
  return scene;
}