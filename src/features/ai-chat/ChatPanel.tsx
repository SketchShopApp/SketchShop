import { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import type { DrawingScene } from '../../core/types';

// Une scène de test statique pour valider le moteur sans attendre l'API
const MOCK_SCENE: DrawingScene = {
  description: "Scène démo : Maison sous le soleil",
  backgroundColor: "#E0F2FE",
  commands: [
    // Soleil
    { type: 'circle', x: 700, y: 150, radius: 60, fill: '#FBBF24', stroke: '#F59E0B', strokeWeight: 3 },
    // Sol vert
    { type: 'rect', x: 0, y: 550, width: 1200, height: 250, fill: '#22C55E', stroke: 'none' },
    // Maison (corps)
    { type: 'rect', x: 300, y: 380, width: 220, height: 170, fill: '#F97316', stroke: '#9A3412', strokeWeight: 2 },
    // Toit (triangle)
    { type: 'triangle', x1: 280, y1: 380, x2: 410, y2: 260, x3: 540, y3: 380, fill: '#DC2626', stroke: '#991B1B', strokeWeight: 2 },
    // Porte
    { type: 'rect', x: 380, y: 470, width: 50, height: 80, fill: '#78350F', stroke: 'none' },
    // Fenêtre
    { type: 'rect', x: 330, y: 410, width: 45, height: 45, fill: '#E0F2FE', stroke: '#1E3A8A', strokeWeight: 2 },
    // Arbre (tronc + feuillage)
    { type: 'rect', x: 750, y: 450, width: 35, height: 100, fill: '#78350F' },
    { type: 'circle', x: 767, y: 420, radius: 55, fill: '#15803D' },
    // Texte
    { type: 'text', text: 'Chat-to-Canvas AI', x: 50, y: 80, size: 28, fill: '#1E293B' }
  ]
};

export default function ChatPanel() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const { applyAiScene, canvasDimensions } = useEditorStore();

  // Test local immédiat sans passer par l'IA
  const handleTestMock = () => {
    setError(null);
    applyAiScene(MOCK_SCENE);
  };

  // Appel au serveur Express
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat-to-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          canvasWidth: canvasDimensions.width,
          canvasHeight: canvasDimensions.height
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération.');
      }

      // Dessine la scène reçue sur le calque actif
      applyAiScene(data.scene);
      setPrompt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de contacter le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 z-20 bg-[#8354E0] hover:bg-[#7140D4] text-white px-4 py-2.5 rounded-lg font-medium shadow-lg transition-all flex items-center gap-2"
      >
        ✨ Assistant IA
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 right-6 z-20 w-96 bg-[#171717] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] bg-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <h3 className="font-semibold text-sm">Chat to Canvas (IA)</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[#737373] hover:text-white transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col gap-3">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-2.5 rounded">
            {error}
          </div>
        )}

        {/* Bouton de test rapide */}
        <button
          type="button"
          onClick={handleTestMock}
          className="w-full bg-[#2A2A2A] hover:bg-[#333333] text-xs text-gray-300 py-1.5 px-3 rounded transition-colors"
        >
          🧪 Tester scène démo (Mock sans API)
        </button>

        {/* Formulaire de prompt */}
        <form onSubmit={handleGenerate} className="flex flex-col gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex : Un volcan en éruption la nuit avec des étoiles..."
            rows={3}
            className="w-full bg-[#111111] border border-[#2A2A2A] focus:border-[#8354E0] outline-none rounded p-2.5 text-xs text-white placeholder-gray-500 resize-none transition-colors"
          />

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-full bg-[#8354E0] hover:bg-[#7140D4] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 rounded transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Génération par Gemini...
              </>
            ) : (
              '🎨 Générer sur le canvas'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}