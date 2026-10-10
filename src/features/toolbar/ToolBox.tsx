import { CursorMinimal, Hand, Shapes, Brush, Sparkles } from 'pixelarticons/react';
import { useEditorStore } from '../../store/useEditorStore';

export default function ToolBox() {
  const { activeTool, setActiveTool, settings, updateSetting, isAiChatOpen, toggleAiChat } = useEditorStore();

  return (
    <div className="flex flex-col justify-between py-2 gap-4 absolute h-fill-available m-6 bg-[#171717] z-10">
      <div className="flex flex-col gap-2 px-2 ">
        <button 
          onClick={() => setActiveTool('select')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'select' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Select"
        >
          <CursorMinimal width={20} />
        </button>
        <button 
          onClick={() => setActiveTool('move')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'move' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Move"
        >
          <Hand width={20} />
        </button>
        <button 
          onClick={() => setActiveTool('brush')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'brush' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Brush"
        >
          <Brush width={20} />
        </button>
        <button 
          onClick={() => setActiveTool('eraser')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'eraser' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Eraser"
        >
          <svg width="20" height="18" viewBox="0 0 20 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16H20V18H4V16H10V14H12V16ZM4 16H2V14H4V16ZM2 14H0V12H2V14ZM14 2H16V4H18V6H20V8H18V10H16V12H14V14H12V12H10V10H8V8H6V6H8V4H10V2H12V0H14V2ZM4 12H2V10H4V12ZM6 10H4V8H6V10Z" fill="currentColor"/>
          </svg>
        </button>
        <button 
          onClick={() => setActiveTool('square')}
          className={`flex items-center justify-center w-12 h-12 hover:bg-[#2A2A2A] ${activeTool === 'square' ? 'bg-[#8354E0] text-white hover:bg-[#8354E0]' : 'text-[#737373]'} hover:text-white transition-colors`}
          title="Square"
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
