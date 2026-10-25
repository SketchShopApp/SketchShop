import type { CanvasObject, BoundingBox, HandleType } from './types';

/**
 * Normalise un rectangle (gère les largeurs et hauteurs négatives).
 */
export function normalizeBox(x: number, y: number, w: number, h: number): BoundingBox {
  const minX = w >= 0 ? x : x + w;
  const minY = h >= 0 ? y : y + h;
  const width = Math.abs(w);
  const height = Math.abs(h);
  return {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
    width,
    height,
  };
}

/**
 * Calcule la boîte englobante (Bounding Box) d'un objet canvas.
 */
export function computeObjectBounds(obj: CanvasObject): BoundingBox {
  if (obj.points && obj.points.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pt of obj.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    };
  }

  return normalizeBox(obj.x, obj.y, obj.width, obj.height);
}

/**
 * Calcule la boîte englobante combinée de plusieurs objets sélectionnés.
 */
export function computeCombinedBounds(objects: CanvasObject[]): BoundingBox | null {
  if (objects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    const b = computeObjectBounds(obj);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Vérifie si un point (x, y) est à l'intérieur d'un objet.
 */
export function isPointInsideObject(x: number, y: number, obj: CanvasObject, padding = 4): boolean {
  const bounds = computeObjectBounds(obj);

  // Vérification de base de la boîte avec tolérance
  if (
    x < bounds.minX - padding ||
    x > bounds.maxX + padding ||
    y < bounds.minY - padding ||
    y > bounds.maxY + padding
  ) {
    return false;
  }

  // Pour un cercle
  if (obj.type === 'circle') {
    const cx = bounds.minX + bounds.width / 2;
    const cy = bounds.minY + bounds.height / 2;
    const rx = bounds.width / 2 + padding;
    const ry = bounds.height / 2 + padding;
    if (rx <= 0 || ry <= 0) return false;
    const normX = (x - cx) / rx;
    const normY = (y - cy) / ry;
    return normX * normX + normY * normY <= 1;
  }

  return true;
}

/**
 * Vérifie si la boîte d'un objet intersecte ou est incluse dans un rectangle de sélection (marquee).
 */
export function isObjectInMarquee(
  obj: CanvasObject,
  marquee: { startX: number; startY: number; currentX: number; currentY: number }
): boolean {
  const mBox = normalizeBox(
    marquee.startX,
    marquee.startY,
    marquee.currentX - marquee.startX,
    marquee.currentY - marquee.startY
  );
  const oBox = computeObjectBounds(obj);

  return !(
    oBox.maxX < mBox.minX ||
    oBox.minX > mBox.maxX ||
    oBox.maxY < mBox.minY ||
    oBox.minY > mBox.maxY
  );
}

/**
 * Retourne les coordonnées des 8 poignées d'ancrage + poignée de rotation.
 */
export function getHandlePositions(box: BoundingBox): Record<HandleType, { x: number; y: number }> {
  const midX = box.minX + box.width / 2;
  const midY = box.minY + box.height / 2;
  const rotDistance = 22;

  return {
    tl: { x: box.minX, y: box.minY },
    tc: { x: midX, y: box.minY },
    tr: { x: box.maxX, y: box.minY },
    mr: { x: box.maxX, y: midY },
    br: { x: box.maxX, y: box.maxY },
    bc: { x: midX, y: box.maxY },
    bl: { x: box.minX, y: box.maxY },
    ml: { x: box.minX, y: midY },
    rot: { x: midX, y: box.minY - rotDistance },
  };
}

/**
 * Détecte si le curseur se trouve au-dessus d'une des 8 poignées ou de la poignée de rotation.
 */
export function getHandleUnderPoint(
  x: number,
  y: number,
  box: BoundingBox,
  handleHitRadius = 7
): HandleType | null {
  const handles = getHandlePositions(box);
  const handleKeys: HandleType[] = ['rot', 'tl', 'tr', 'br', 'bl', 'tc', 'mr', 'bc', 'ml'];

  for (const key of handleKeys) {
    const h = handles[key];
    const dx = Math.abs(x - h.x);
    const dy = Math.abs(y - h.y);
    if (dx <= handleHitRadius && dy <= handleHitRadius) {
      return key;
    }
  }

  return null;
}

/**
 * Retourne le style de curseur approprié pour chaque type de poignée.
 */
export function getCursorForHandle(handle: HandleType): string {
  switch (handle) {
    case 'tl':
    case 'br':
      return 'nwse-resize';
    case 'tr':
    case 'bl':
      return 'nesw-resize';
    case 'tc':
    case 'bc':
      return 'ns-resize';
    case 'ml':
    case 'mr':
      return 'ew-resize';
    case 'rot':
      return 'grab';
    default:
      return 'default';
  }
}

/**
 * Calcule la nouvelle boîte englobante lors du redimensionnement via une des 8 poignées.
 * Gère correctement toutes les directions, y compris les deltas négatifs (-x, -y).
 */
export function resizeBoundsWithHandle(
  origBox: BoundingBox,
  handle: HandleType,
  dx: number,
  dy: number,
  preserveAspect = false
): BoundingBox {
  let anchorX = origBox.minX;
  let anchorY = origBox.minY;
  let targetX = origBox.maxX + dx;
  let targetY = origBox.maxY + dy;

  switch (handle) {
    case 'br':
      anchorX = origBox.minX;
      anchorY = origBox.minY;
      targetX = origBox.maxX + dx;
      targetY = origBox.maxY + dy;
      break;
    case 'tl':
      anchorX = origBox.maxX;
      anchorY = origBox.maxY;
      targetX = origBox.minX + dx;
      targetY = origBox.minY + dy;
      break;
    case 'tr':
      anchorX = origBox.minX;
      anchorY = origBox.maxY;
      targetX = origBox.maxX + dx;
      targetY = origBox.minY + dy;
      break;
    case 'bl':
      anchorX = origBox.maxX;
      anchorY = origBox.minY;
      targetX = origBox.minX + dx;
      targetY = origBox.maxY + dy;
      break;
    case 'tc':
      anchorX = origBox.minX;
      anchorY = origBox.maxY;
      targetX = origBox.maxX;
      targetY = origBox.minY + dy;
      break;
    case 'bc':
      anchorX = origBox.minX;
      anchorY = origBox.minY;
      targetX = origBox.maxX;
      targetY = origBox.maxY + dy;
      break;
    case 'ml':
      anchorX = origBox.maxX;
      anchorY = origBox.minY;
      targetX = origBox.minX + dx;
      targetY = origBox.maxY;
      break;
    case 'mr':
      anchorX = origBox.minX;
      anchorY = origBox.minY;
      targetX = origBox.maxX + dx;
      targetY = origBox.maxY;
      break;
    default:
      return { ...origBox };
  }

  // Calcul des largeurs et hauteurs minimales garanties
  let currentW = Math.max(Math.abs(targetX - anchorX), 4);
  let currentH = Math.max(Math.abs(targetY - anchorY), 4);

  // Maintien des proportions si demandé (Shift)
  const isCorner = handle === 'tl' || handle === 'tr' || handle === 'bl' || handle === 'br';
  if (preserveAspect && isCorner && origBox.width > 0 && origBox.height > 0) {
    const scale = Math.max(currentW / origBox.width, currentH / origBox.height);
    currentW = origBox.width * scale;
    currentH = origBox.height * scale;
  }

  let minX: number;
  let maxX: number;
  if (handle === 'tc' || handle === 'bc') {
    minX = origBox.minX;
    maxX = origBox.maxX;
  } else if (targetX >= anchorX) {
    minX = anchorX;
    maxX = anchorX + currentW;
  } else {
    maxX = anchorX;
    minX = anchorX - currentW;
  }

  let minY: number;
  let maxY: number;
  if (handle === 'ml' || handle === 'mr') {
    minY = origBox.minY;
    maxY = origBox.maxY;
  } else if (targetY >= anchorY) {
    minY = anchorY;
    maxY = anchorY + currentH;
  } else {
    maxY = anchorY;
    minY = anchorY - currentH;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Applique une nouvelle boîte englobante aux objets en conservant leurs positions relatives.
 */
export function transformObjectsWithNewBounds(
  origObjects: Map<string, CanvasObject>,
  origBox: BoundingBox,
  newBox: BoundingBox
): { id: string; changes: Partial<CanvasObject> }[] {
  if (origBox.width <= 0 || origBox.height <= 0) return [];

  const results: { id: string; changes: Partial<CanvasObject> }[] = [];

  origObjects.forEach((orig, id) => {
    const relX = (orig.x - origBox.minX) / origBox.width;
    const relY = (orig.y - origBox.minY) / origBox.height;
    const relW = orig.width / origBox.width;
    const relH = orig.height / origBox.height;

    results.push({
      id,
      changes: {
        x: newBox.minX + relX * newBox.width,
        y: newBox.minY + relY * newBox.height,
        width: Math.max(relW * newBox.width, 2),
        height: Math.max(relH * newBox.height, 2),
      },
    });
  });

  return results;
}
