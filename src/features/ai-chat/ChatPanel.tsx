import { useState, useRef, useEffect } from 'react';
import { ArrowBigUpDash } from 'pixelarticons/react';
import { useEditorStore } from '../../store/useEditorStore';

export default function ChatPanel() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isAiChatOpen, applyAiScene, canvasDimensions } = useEditorStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt, isAiChatOpen]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      applyAiScene(data.scene);
      setPrompt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de contacter le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAiChatOpen) return null;

  return (
    <div className="absolute bottom-6 left-24 z-20 w-80 md:w-96 bg-[#171717] shadow-2xl px-4.5 py-4 flex flex-col gap-2 text-white">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-2.5 py-1.5 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleGenerate} className="flex flex-col justify-between gap-4 min-h-22.5">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Describe your image..."
          rows={1}
          className="w-full bg-transparent outline-none resize-none text-sm text-white placeholder-[#737373] max-h-36 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          autoFocus
        />

        <div className="flex justify-end items-center mt-1">
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-9 h-9 bg-[#8354E0] disabled:bg-[#2A2A2A] hover:bg-[#7140D4] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer"
            title="Générer avec Gemini"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowBigUpDash width={20} height={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}