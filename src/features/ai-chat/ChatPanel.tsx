import { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';


export default function ChatPanel() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const { applyAiScene, canvasDimensions } = useEditorStore();


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