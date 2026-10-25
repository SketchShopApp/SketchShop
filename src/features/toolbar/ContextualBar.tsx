import { useEditorStore } from '../../store/useEditorStore';
import { Undo, Redo } from 'pixelarticons/react';

export default function ContextualBar() {
  const { 
    activeTool, 
    settings, 
    updateSetting, 
    undo, 
    redo, 
    historyIndex, 
    history,
    objects,
    selectedObjectIds,
    updateObject,
    deleteSelectedObjects,
    clearSelection,
  } = useEditorStore();

  const selectedObjects = objects.filter(o => selectedObjectIds.includes(o.id));
  const firstSelected = selectedObjects[0];

  return (
    <div className="flex items-center gap-6 px-6 py-2 bg-[#131313] text-white min-h-[44px]">
      {/* Tool Indicator */}
      <div className="flex items-center gap-1 pr-4 border-r border-white/10">
        <span className="text-xs font-bold uppercase tracking-wider">{activeTool}</span>
      </div>

      {activeTool === 'select' ? (
        /* Barre contextuelle de l'outil Sélection */
        selectedObjects.length > 0 ? (
          <div className="flex items-center gap-5 text-xs text-gray-300">
            <div className="flex items-center gap-2 bg-[#1e1e1e] px-2.5 py-1 border border-white/10">
              <span className="font-semibold text-violet-400">
                {selectedObjects.length}
              </span>
              <span className="text-gray-400">
                {selectedObjects.length > 1 ? 'objets sélectionnés' : 'objet sélectionné'}
              </span>
            </div>

            {firstSelected && selectedObjects.length === 1 && (
              <>
                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 border-r border-white/10 pr-4">
                  <span>X: {Math.round(firstSelected.x)}</span>
                  <span>Y: {Math.round(firstSelected.y)}</span>
                  <span>L: {Math.round(firstSelected.width)}</span>
                  <span>H: {Math.round(firstSelected.height)}</span>
                  {firstSelected.rotation ? <span>{Math.round(firstSelected.rotation)}°</span> : null}
                </div>

                {/* Couleur de remplissage */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Couleur</label>
                  <input
                    type="color"
                    value={firstSelected.fill || '#000000'}
                    onChange={(e) => updateObject(firstSelected.id, { fill: e.target.value })}
                    className="w-5 h-5 bg-transparent border-none appearance-none cursor-pointer"
                    title="Changer la couleur"
                  />
                </div>

                {/* Opacité de l'objet */}
                <div className="flex flex-col gap-0.5 w-20">
                  <div className="flex justify-between text-[9px] text-gray-400 uppercase font-bold">
                    <span>Opacité</span>
                    <span>{firstSelected.opacity ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={firstSelected.opacity ?? 100}
                    onChange={(e) => updateObject(firstSelected.id, { opacity: parseInt(e.target.value) })}
                    className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>
              </>
            )}

            {/* Supprimer la sélection */}
            <button
              onClick={deleteSelectedObjects}
              title="Supprimer la sélection (Suppr / Backspace)"
              className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20 text-[11px] cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 22H4V20H18V22ZM4 20H2V6H0V4H6V2H8V4H14V2H16V4H22V6H20V20H18V6H4V20ZM9 17H7V8H9V17ZM15 17H13V8H15V17ZM14 2H8V0H14V2Z" fill="currentColor"/>
              </svg>
              <span>Supprimer</span>
            </button>

            {/* Désélectionner */}
            <button
              onClick={clearSelection}
              title="Désélectionner (Échap)"
              className="px-2 py-1 hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors text-[11px] cursor-pointer"
            >
              Désélectionner
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-gray-400 italic">
            Cliquez sur un objet ou étirez une zone pour sélectionner • 8 poignées d'ancrage pour transformer
          </div>
        )
      ) : (
        /* Barre contextuelle standard pour le dessin */
        <>
          {/* Size Control */}
          <div className="flex flex-col gap-1 w-24">
            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
              <span>Size</span>
              <span>{settings.brushSize}px</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={settings.brushSize}
              onChange={(e) => updateSetting('brushSize', parseInt(e.target.value))}
              className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Opacity Control */}
          <div className="flex flex-col gap-1 w-24">
            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
              <span>Opacity</span>
              <span>{settings.opacity}%</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={settings.opacity}
              onChange={(e) => updateSetting('opacity', parseInt(e.target.value))}
              className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Color Picker (Compact) */}
          <div className="flex items-center gap-2 pl-4 border-l border-white/10">
            <div className="flex items-center gap-2 ml-2">
              <input 
                type="checkbox" 
                id="dynamic"
                checked={settings.isDynamicBrush}
                onChange={(e) => updateSetting('isDynamicBrush', e.target.checked)}
                className="w-3 h-3 accent-violet-500"
              />
              <label htmlFor="dynamic" className="text-[10px] text-gray-400 font-bold uppercase cursor-pointer">Dynamic</label>
            </div>
          </div>
        </>
      )}

      {/* History Controls */}
      <div className="flex items-center pl-4 gap-1 border-l border-white/10 ml-auto">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Undo (Ctrl+Z)"
          className="flex items-center justify-center p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Undo width={18} height={18} />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Redo (Ctrl+Shift+Z)"
          className="flex items-center justify-center p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Redo width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
