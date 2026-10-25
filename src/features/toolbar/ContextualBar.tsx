import { useEditorStore } from '../../store/useEditorStore';
import { Undo, Redo, Copy } from 'pixelarticons/react';

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
    duplicateSelectedObjects,
    bringToFront,
    sendToBack,
    flipHorizontal,
    flipVertical,
    alignSelectedObjects,
    clearSelection,
  } = useEditorStore();

  const selectedObjects = objects.filter(o => selectedObjectIds.includes(o.id));
  const firstSelected = selectedObjects[0];

  return (
    <div className="flex items-center gap-4 px-6 py-1.5 bg-[#131313] text-white min-h-[44px] overflow-x-auto select-none">

      {activeTool === 'select' ? (
        /* Barre contextuelle de l'outil Sélection */
        selectedObjects.length > 0 ? (
          <div className="flex items-center gap-3 text-xs text-gray-300 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#1e1e1e] px-2 py-1 border border-white/10">
              <span className="font-semibold text-violet-400">
                {selectedObjects.length}
              </span>
              <span className="text-gray-400 text-[11px]">
                {firstSelected?.type === 'image' && selectedObjects.length === 1 
                  ? 'image' 
                  : selectedObjects.length > 1 
                    ? 'objets' 
                    : 'objet'}
              </span>
            </div>

            {firstSelected && selectedObjects.length === 1 && (
              <>
                <div className="flex items-center gap-2.5 text-[10px] font-mono text-gray-400 border-r border-white/10 pr-3">
                  <span>X:{Math.round(firstSelected.x)}</span>
                  <span>Y:{Math.round(firstSelected.y)}</span>
                  <span>L:{Math.round(firstSelected.width)}</span>
                  <span>H:{Math.round(firstSelected.height)}</span>
                  {typeof firstSelected.rotation === 'number' && firstSelected.rotation !== 0 ? (
                    <span>{Math.round(firstSelected.rotation)}°</span>
                  ) : null}
                </div>

                {/* Couleur de remplissage (uniquement pour formes non-image) */}
                {firstSelected.type !== 'image' && (
                  <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                    <label className="text-[9px] text-gray-400 uppercase font-bold">Couleur</label>
                    <input
                      type="color"
                      value={firstSelected.fill || '#000000'}
                      onChange={(e) => updateObject(firstSelected.id, { fill: e.target.value })}
                      className="w-4 h-4 bg-transparent border-none appearance-none cursor-pointer"
                      title="Changer la couleur"
                    />
                  </div>
                )}

                {/* Opacité de l'objet / image */}
                <div className="flex flex-col gap-0.5 w-18 border-r border-white/10 pr-3">
                  <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold">
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

            {/* Alignements automatiques */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-3">
              <span className="text-[9px] text-gray-400 uppercase font-bold mr-1">Aligner</span>
              <button
                onClick={() => alignSelectedObjects('left')}
                title="Aligner à gauche"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 2H2V22H4V2ZM8 6H20V10H8V6ZM8 14H16V18H8V14Z"/>
                </svg>
              </button>
              <button
                onClick={() => alignSelectedObjects('center-h')}
                title="Centrer horizontalement"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 2H13V6H19V10H13V14H21V18H13V22H11V18H3V14H11V10H5V6H11V2Z"/>
                </svg>
              </button>
              <button
                onClick={() => alignSelectedObjects('right')}
                title="Aligner à droite"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 2H20V22H22V2ZM16 6H4V10H16V6ZM16 14H8V18H16V14Z"/>
                </svg>
              </button>
              <button
                onClick={() => alignSelectedObjects('top')}
                title="Aligner en haut"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 4V2H22V4H2ZM6 8V20H10V8H6ZM14 8V16H18V8H14Z"/>
                </svg>
              </button>
              <button
                onClick={() => alignSelectedObjects('center-v')}
                title="Centrer verticalement"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 11V13H6V19H10V13H14V21H18V13H22V11H18V3H14V11H10V5H6V11H2Z"/>
                </svg>
              </button>
              <button
                onClick={() => alignSelectedObjects('bottom')}
                title="Aligner en bas"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 22V20H22V22H2ZM6 16V4H10V16H6ZM14 16V8H18V16H14Z"/>
                </svg>
              </button>
            </div>

            {/* Miroir (Flip X / Flip Y) */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-3">
              <span className="text-[9px] text-gray-400 uppercase font-bold mr-1">Miroir</span>
              <button
                onClick={flipHorizontal}
                title="Miroir horizontal (Flip X)"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 2H13V22H11V2ZM8 6L3 12L8 18V6ZM16 6V18L21 12L16 6Z"/>
                </svg>
              </button>
              <button
                onClick={flipVertical}
                title="Miroir vertical (Flip Y)"
                className="p-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 11H22V13H2V11ZM6 8L12 3L18 8H6ZM6 16H18L12 21L6 16Z"/>
                </svg>
              </button>
            </div>

            {/* Ordre d'empilement (Z-index) */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-3">
              <span className="text-[9px] text-gray-400 uppercase font-bold mr-1">Plan</span>
              <button
                onClick={bringToFront}
                title="Mettre au premier plan"
                className="px-1.5 py-0.5 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors text-[10px] cursor-pointer border border-white/5"
              >
                Premier
              </button>
              <button
                onClick={sendToBack}
                title="Mettre à l'arrière-plan"
                className="px-1.5 py-0.5 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors text-[10px] cursor-pointer border border-white/5"
              >
                Arrière
              </button>
            </div>

            {/* Duplication rapide */}
            <button
              onClick={duplicateSelectedObjects}
              title="Dupliquer (Ctrl+D ou Alt+Drag)"
              className="flex items-center gap-1 px-1.5 py-1 hover:bg-[#2A2A2A] text-gray-300 hover:text-white transition-colors text-[11px] cursor-pointer border border-white/5"
            >
              <Copy width={12} height={12} />
              <span>Dupliquer</span>
            </button>

            {/* Supprimer la sélection */}
            <button
              onClick={deleteSelectedObjects}
              title="Supprimer la sélection (Suppr / Backspace)"
              className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20 text-[11px] cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 22H4V20H18V22ZM4 20H2V6H0V4H6V2H8V4H14V2H16V4H22V6H20V20H18V6H4V20ZM9 17H7V8H9V17ZM15 17H13V8H15V17ZM14 2H8V0H14V2Z" fill="currentColor"/>
              </svg>
              <span>Suppr</span>
            </button>

            {/* Désélectionner */}
            <button
              onClick={clearSelection}
              title="Désélectionner (Échap)"
              className="px-1.5 py-1 hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors text-[11px] cursor-pointer"
            >
              Échap
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-gray-400 italic">
            Cliquez sur un objet ou étirez une zone pour sélectionner • 8 poignées d'ancrage pour transformer • Alt+Glisser pour cloner
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
      <div className="flex items-center pl-3 gap-1 border-l border-white/10 ml-auto shrink-0">
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
