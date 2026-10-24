import { Eye, EyeOff, Lock, Unlock, CornerDownRight, Grid3x3 } from 'pixelarticons/react';
import type { BlendMode } from '../../core/types';

interface LayerCardProps {
  title: string;
  subtitle?: string;
  isActive: boolean;
  isVisible: boolean;
  isLocked: boolean;
  isClippingMask?: boolean;
  isTransparentLocked?: boolean;
  blendMode?: BlendMode;
  canClip?: boolean;
  thumbnail: string | null;
  onToggleVisibility?: () => void;
  onToggleLock?: () => void;
  onToggleClippingMask?: () => void;
  onToggleTransparentLock?: () => void;
  onClick?: () => void;
}

export default function LayerCard({
  title,
  subtitle,
  isActive,
  isVisible,
  isLocked,
  isClippingMask = false,
  isTransparentLocked = false,
  blendMode = 'normal',
  canClip = true,
  thumbnail,
  onToggleVisibility,
  onToggleLock,
  onToggleClippingMask,
  onToggleTransparentLock,
  onClick,
}: LayerCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2 p-2.5 cursor-pointer transition-all select-none ${
        isClippingMask ? 'pl-6 bg-[#1b1b22]/40' : ''
      } ${
        isActive
          ? 'bg-[#8354E0] text-white shadow-sm'
          : 'bg-transparent text-gray-400 hover:bg-[#252525]'
      }`}
    >
      {/* Visibility Toggle */}
      <button
        type="button"
        title={isVisible ? "Masquer le calque" : "Afficher le calque"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility?.();
        }}
        className={`p-1 hover:text-white transition-colors shrink-0 ${
          !isVisible && !isActive ? 'text-gray-600' : ''
        }`}
      >
        {isVisible ? <Eye width={16} height={16} /> : <EyeOff width={16} height={16} />}
      </button>

      {/* Clipping Mask Arrow Indicator */}
      {isClippingMask && (
        <span
          title="Masque d'écrêtage (lié au calque inférieur)"
          className={`shrink-0 ${isActive ? 'text-purple-200' : 'text-purple-400'}`}
        >
          <CornerDownRight width={14} height={14} />
        </span>
      )}

      {/* Thumbnail */}
      <div
        className={`w-9 h-9 bg-checkerboard border shrink-0 overflow-hidden rounded-xs relative ${
          isActive ? 'border-purple-300' : 'border-gray-700'
        }`}
      >
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
            <div className="w-3 h-3 border border-gray-600 rotate-45"></div>
          </div>
        )}
      </div>

      {/* Layer Name & Meta info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <h4 className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
            {title}
          </h4>
          {blendMode && blendMode !== 'normal' && (
            <span
              className={`text-[9px] uppercase px-1 py-0.2 rounded font-mono shrink-0 ${
                isActive
                  ? 'bg-purple-900/60 text-purple-100 border border-purple-400/40'
                  : 'bg-black/40 text-gray-400 border border-gray-700'
              }`}
            >
              {blendMode}
            </span>
          )}
        </div>
        <p className={`text-[10px] truncate ${isActive ? 'text-purple-200' : 'text-gray-500'}`}>
          {subtitle || (isClippingMask ? "Masque d'écrêtage" : isActive ? "Calque actif" : "Calque standard")}
        </p>
      </div>

      {/* Layer Action Badges / Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Transparent Lock Button */}
        {onToggleTransparentLock && (
          <button
            type="button"
            title={
              isTransparentLocked
                ? "Verrouillage de la transparence activé (cliquez pour déverrouiller)"
                : "Verrouiller la transparence (dessiner uniquement sur les pixels existants)"
            }
            onClick={(e) => {
              e.stopPropagation();
              onToggleTransparentLock();
            }}
            className={`p-1 transition-colors ${
              isTransparentLocked
                ? isActive
                  ? ' text-amber-300'
                  : ' text-amber-400'
                : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 text-gray-400 hover:text-white'
            }`}
          >
            <Grid3x3 width={14} height={14} />
          </button>
        )}

        {/* Clipping Mask Button */}
        {canClip && onToggleClippingMask && !isClippingMask && (
          <button
            type="button"
            title="Créer un masque d'écrêtage avec le calque inférieur"
            onClick={(e) => {
              e.stopPropagation();
              onToggleClippingMask();
            }}
            className="p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-gray-400 hover:text-white transition-colors"
          >
            <CornerDownRight width={14} height={14} />
          </button>
        )}

        {/* Lock Layer Status */}
        <button
          type="button"
          title={isLocked ? "Déverrouiller le calque" : "Verrouiller le calque"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock?.();
          }}
          className={`p-1 hover:text-white transition-colors ${
            !isLocked ? 'opacity-0 group-hover:opacity-100 text-gray-400' : ''
          } ${isActive ? 'text-white' : ''}`}
        >
          {isLocked ? <Lock width={15} height={15} /> : <Unlock width={15} height={15} />}
        </button>
      </div>
    </div>
  );
}