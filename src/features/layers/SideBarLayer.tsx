import LayerCard from "../../shared/components/LayerCard";
import { PlusBox, Copy, ArrowBarDown, CornerDownRight, Grid3x3 } from 'pixelarticons/react';
import { Reorder } from "motion/react";
import { useEditorStore } from "../../store/useEditorStore";
import type { BlendMode } from "../../core/types";

export default function SideBarLayer() {
  const { 
    layers, 
    layerData,
    setLayers, 
    toggleVisibility, 
    toggleLock, 
    toggleLayerClippingMask,
    toggleLayerTransparentLock,
    setActiveLayer, 
    addLayer, 
    deleteActiveLayer,
    duplicateActiveLayer,
    triggerMergeDown,
    triggerFilter,
    updateActiveLayerOpacity,
    updateActiveLayerBlendMode,
    saveHistory
  } = useEditorStore();

  const reversedLayers = [...layers].reverse();
  const activeIndex = layers.findIndex(l => l.isActive);
  const activeLayer = activeIndex !== -1 ? layers[activeIndex] : undefined;
  const canMergeDown = activeIndex > 0;
  const canClipActive = activeIndex > 0;

  const handleReorder = (newOrder: any[]) => {
    setLayers([...newOrder].reverse());
  };

  return (
    <aside className="flex flex-col right-0 absolute w-72 lg:w-84 h-fill-available m-6 bg-[#171717] z-10 overflow-hidden">

      {/* Layer Settings (Blend Mode & Opacity) */}
      <div className="flex flex-col gap-2.5 p-3 bg-[#1a1a1a]">
        <div className="flex items-center justify-between gap-2">
          {/* Blend Mode Selector */}
          <div className="flex-1 flex flex-col gap-1">

            <select 
              value={activeLayer?.blendMode || "normal"}
              onChange={(e) => updateActiveLayerBlendMode(e.target.value as BlendMode)}
              className="bg-[#2A2A2A] select-fusion text-white text-xs py-2 px-2 outline-none cursor-pointer hover:border-gray-500 transition-colors"
            >
              <option value="normal">Normal</option>
              <option value="multiply">Produit (Multiply)</option>
              <option value="screen">Superposition (Screen)</option>
              <option value="overlay">Incrustation (Overlay)</option>
              <option value="darken">Obscurcir (Darken)</option>
              <option value="lighten">Éclaircir (Lighten)</option>
              <option value="color-dodge">Densité - (Color Dodge)</option>
              <option value="color-burn">Densité + (Color Burn)</option>
              <option value="hard-light">Lumière crue (Hard Light)</option>
              <option value="difference">Différence</option>
            </select>
          </div>

          {/* Opacity Slider */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              <span>Opacité</span>
              <span className="text-gray-300">{activeLayer?.opacity ?? 100}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={activeLayer?.opacity ?? 100}
              onChange={(e) => updateActiveLayerOpacity(parseInt(e.target.value))}
              onMouseUp={saveHistory}
              onTouchEnd={saveHistory}
              className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500 my-2"
            />
          </div>
        </div>

        {/* Quick Toggles: Lock Transparency, Clipping Mask, Filters */}
        <div className="flex items-center justify-between pt-1 border-t border-[#262626]">
          <div className="flex items-center gap-1.5">
            {/* Lock Transparency Button */}
            <button
              type="button"
              disabled={!activeLayer}
              title={
                activeLayer?.isTransparentLocked
                  ? "Transparence verrouillée (cliquez pour déverrouiller)"
                  : "Verrouiller les pixels transparents (peindre sans déborder)"
              }
              onClick={() => activeLayer && toggleLayerTransparentLock(activeLayer.id)}
              className={`p-1.5 rounded transition-all text-xs flex items-center gap-1 border ${
                activeLayer?.isTransparentLocked
                  ? 'bg-purple-950/80 text-amber-300 border-purple-500/80 shadow-xs'
                  : 'bg-[#242424] text-gray-400 hover:text-white border-[#333333]'
              }`}
            >
              <Grid3x3 width={14} height={14} />
              <span className="text-[10px]">Alpha</span>
            </button>

            {/* Clipping Mask Button */}
            <button
              type="button"
              disabled={!canClipActive}
              title={
                !canClipActive
                  ? "Le calque inférieur ne peut pas être masqué"
                  : activeLayer?.isClippingMask
                  ? "Annuler le masque d'écrêtage"
                  : "Créer un masque d'écrêtage (lier au calque inférieur)"
              }
              onClick={() => activeLayer && toggleLayerClippingMask(activeLayer.id)}
              className={`p-1.5 rounded transition-all text-xs flex items-center gap-1 border ${
                !canClipActive
                  ? 'opacity-30 cursor-not-allowed bg-[#242424] text-gray-500 border-[#333333]'
                  : activeLayer?.isClippingMask
                  ? 'bg-purple-950/80 text-purple-300 border-purple-500/80 shadow-xs'
                  : 'bg-[#242424] text-gray-400 hover:text-white border-[#333333]'
              }`}
            >
              <CornerDownRight width={14} height={14} />
              <span className="text-[10px]">Écrêter</span>
            </button>
          </div>

          {/* Image Filter trigger */}
          <select 
            onChange={(e) => {
              if (e.target.value !== "none") {
                triggerFilter(e.target.value as any);
                e.target.value = "none";
              }
            }}
            className="bg-[#242424] text-gray-300 hover:text-white text-[10px] py-1 px-1.5 rounded border border-[#333333] outline-none cursor-pointer"
            defaultValue="none"
            title="Appliquer un filtre d'effet pixel"
          >
            <option value="none">Filtres...</option>
            <option value="threshold">Seuil (Threshold)</option>
            <option value="pixelate">Pixélisation</option>
            <option value="ascii">Art ASCII</option>
          </select>
        </div>
      </div>

      {/* Layers List */}
      <Reorder.Group 
        axis="y" 
        values={reversedLayers} 
        onReorder={handleReorder}
        className="flex flex-1 flex-col py-1 px-1 gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
      >
        {reversedLayers.map((layer) => {
          const lIndex = layers.findIndex(l => l.id === layer.id);
          const canClip = lIndex > 0;
          const thumbnail = layerData.get(layer.id) || null;

          return (
            <Reorder.Item 
              key={layer.id} 
              value={layer}
              onDragEnd={() => saveHistory()}
              className="relative"
            >
              <LayerCard
                title={layer.name}
                isActive={layer.isActive}
                isVisible={layer.isVisible}
                isLocked={layer.isLocked}
                isClippingMask={layer.isClippingMask}
                isTransparentLocked={layer.isTransparentLocked}
                blendMode={layer.blendMode}
                canClip={canClip}
                thumbnail={thumbnail}
                onToggleVisibility={() => toggleVisibility(layer.id)}
                onToggleLock={() => toggleLock(layer.id)}
                onToggleClippingMask={() => toggleLayerClippingMask(layer.id)}
                onToggleTransparentLock={() => toggleLayerTransparentLock(layer.id)}
                onClick={() => setActiveLayer(layer.id)}
              />
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Footer Actions */}
      <div className="bg-[#202020]  text-[#ADAAAA] flex items-center justify-around px-2 py-2">
        {/* Add Layer */}
        <button
          type="button"
          onClick={addLayer}
          title="Nouveau calque"
          className="p-1.5 hover:text-[#8354E0] transition-colors"
        >
          <PlusBox width={17} height={17} />
        </button>

        {/* Duplicate Layer */}
        <button
          type="button"
          onClick={duplicateActiveLayer}
          title="Dupliquer le calque actif (Ctrl+J)"
          className="p-1.5 hover:text-[#8354E0] transition-colors"
        >
          <Copy width={17} height={17} />
        </button>

        {/* Merge Down */}
        <button
          type="button"
          disabled={!canMergeDown}
          onClick={triggerMergeDown}
          title={
            canMergeDown
              ? "Fusionner vers le bas (Ctrl+E)"
              : "Impossible de fusionner le calque inférieur"
          }
          className={`p-1.5 transition-colors ${
            canMergeDown
              ? ' hover:text-[#8354E0] cursor-pointer'
              : 'opacity-25 cursor-not-allowed'
          }`}
        >
          <ArrowBarDown width={17} height={17} />
        </button>

        {/* Delete Layer */}
        <button
          type="button"
          disabled={layers.length <= 1}
          onClick={deleteActiveLayer}
          title={layers.length <= 1 ? "Impossible de supprimer l'unique calque" : "Supprimer le calque"}
          className={`p-1.5 transition-colors ${
            layers.length <= 1
              ? 'opacity-25 cursor-not-allowed'
              : ' hover:text-red-500 cursor-pointer'
          }`}
        >
          <svg 
            width="17" 
            height="17" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18 22H4V20H18V22ZM4 20H2V6H0V4H6V2H8V4H14V2H16V4H22V6H20V20H18V6H4V20ZM9 17H7V8H9V17ZM15 17H13V8H15V17ZM14 2H8V0H14V2Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
