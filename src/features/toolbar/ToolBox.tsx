import { useRef } from 'react';
import { CursorMinimal, Hand, Shapes, Brush, Sparkles } from 'pixelarticons/react';
import { useEditorStore } from '../../store/useEditorStore';
import type { CanvasObject } from '../../core/types';

export default function ToolBox() {
  const { activeTool, setActiveTool, settings, updateSetting, isAiChatOpen, toggleAiChat } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const state = useEditorStore.getState();
        const activeLayer = state.layers.find(l => l.isActive);
        if (!activeLayer) return;

        let w = img.width;
        let h = img.height;
        const maxW = state.canvasDimensions.width * 0.7;
        const maxH = state.canvasDimensions.height * 0.7;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const dropX = Math.round((state.canvasDimensions.width - w) / 2);
        const dropY = Math.round((state.canvasDimensions.height - h) / 2);

        const newObj: CanvasObject = {
          id: Math.random().toString(36).substring(2, 9),
          layerId: activeLayer.id,
          type: 'image',
          imageUrl: dataUrl,
          x: dropX,
          y: dropY,
          width: w,
          height: h,
          rotation: 0,
          opacity: 100,
        };

        state.addObject(newObj, true);
        state.setActiveTool('select');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col justify-between py-2 gap-4 absolute h-fill-available m-6 bg-[#171717] z-10">
      <div className="flex flex-col gap-2 px-2 ">
        <button 
          onClick={() => setActiveTool('select')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'select' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Select (V)"
        >
          <CursorMinimal width={20} />
        </button>
        <button 
          onClick={() => setActiveTool('move')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'move' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Move / Pan (Espace)"
        >
          <Hand width={20} />
        </button>
        <button 
          onClick={() => setActiveTool('brush')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'brush' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Brush (B)"
        >
          <Brush width={20} />
        </button>
        <button 
          onClick={() => setActiveTool('eraser')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'eraser' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Eraser (E)"
        >
          <svg width="20" height="18" viewBox="0 0 20 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16H20V18H4V16H10V14H12V16ZM4 16H2V14H4V16ZM2 14H0V12H2V14ZM14 2H16V4H18V6H20V8H18V10H16V12H14V14H12V12H10V10H8V8H6V6H8V4H10V2H12V0H14V2ZM4 12H2V10H4V12ZM6 10H4V8H6V10Z" fill="currentColor"/>
          </svg>
        </button>
        <button 
          onClick={() => setActiveTool('square')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'square' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Rectangle (U)"
        >
          <div className="w-4 h-4 border-2 border-current"></div>
        </button>
        <button 
          onClick={() => setActiveTool('shapes')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'shapes' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Circle"
        >
          <Shapes width={20} />
        </button>
        {/* Importer une image en tant qu'objet transformable */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] text-[#737373] hover:text-white transition-colors cursor-pointer"
          title="Importer une image (ou glisser-déposer sur le canevas)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zm-4 8h2v2h-2zm-2 2h2v2h-2zm4 0h2v2h-2zm-8 0h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2z"/>
            <path d="M20 16h2v2h-2zM8 16h2v2H8zm-2 2h2v2H6zM8 6h2v2H8zM6 8h2v2H6zm2 2h2v2H8zm2-2h2v2h-2z"/>
          </svg>
        </button>
        <input 
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <div id='separator' className='border-b border-white/10'></div>
      </div>
      <div className="flex flex-col items-center gap-2 px-2">
        <button 
          onClick={toggleAiChat}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${
            isAiChatOpen ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'
          } hover:text-white transition-colors`}
          title="Assistant IA"
        >
          <Sparkles width={20} />
        </button>
        <div className="flex items-center justify-center h-auto w-full">
          <input 
            type="color" 
            value={settings.color}
            onChange={(e) => updateSetting('color', e.target.value)}
            className="w-full h-auto aspect-square bg-transparent border-none appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
