import type { DrawingSettings } from '../../core/types';

export function applyThreshold(g: any, settings: DrawingSettings) {
  const ctx = g.canvas.getContext('2d');
  const w = g.canvas.width;
  const h = g.canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const threshold = settings.threshold;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const val = gray < threshold ? 0 : 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);
}

export function applyPixelate(g: any, settings: DrawingSettings) {
  const ctx = g.canvas.getContext('2d');
  const w = g.canvas.width;
  const h = g.canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const pixelSize = settings.pixelSize;

  for (let y = 0; y < h; y += pixelSize) {
    for (let x = 0; x < w; x += pixelSize) {
      let red = 0, green = 0, blue = 0, alpha = 0, count = 0;
      for (let py = 0; py < pixelSize; py++) {
        for (let px = 0; px < pixelSize; px++) {
          const posX = x + px;
          const posY = y + py;
          if (posX < w && posY < h) {
            const index = (posY * w + posX) * 4;
            if (data[index + 3] > 0) {
              red += data[index];
              green += data[index + 1];
              blue += data[index + 2];
              alpha += data[index + 3];
              count++;
            }
          }
        }
      }
      if (count > 0) {
        red /= count; green /= count; blue /= count; alpha /= count;
        for (let py = 0; py < pixelSize; py++) {
          for (let px = 0; px < pixelSize; px++) {
            const posX = x + px;
            const posY = y + py;
            if (posX < w && posY < h) {
              const index = (posY * w + posX) * 4;
              data[index] = red;
              data[index + 1] = green;
              data[index + 2] = blue;
              data[index + 3] = alpha;
            }
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export function applyASCII(g: any, settings: DrawingSettings) {
  const ctx = g.canvas.getContext('2d');
  const w = g.canvas.width;
  const h = g.canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const scale = settings.asciiScale;
  const densityChars = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];

  ctx.save();
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'black';
  ctx.font = `${scale}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let y = 0; y < h; y += scale) {
    for (let x = 0; x < w; x += scale) {
      let red = 0, green = 0, blue = 0, count = 0;
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const posX = x + px;
          const posY = y + py;
          if (posX < w && posY < h) {
            const index = (posY * w + posX) * 4;
            red += data[index];
            green += data[index + 1];
            blue += data[index + 2];
            count++;
          }
        }
      }
      red /= count; green /= count; blue /= count;
      const brightness = 0.299 * red + 0.587 * green + 0.114 * blue;
      let charIndex = Math.floor((brightness / 255) * (densityChars.length - 1));
      charIndex = densityChars.length - 1 - charIndex;
      ctx.fillText(densityChars[charIndex], x + scale / 2, y + scale / 2);
    }
  }
  ctx.restore();
}
