// Crisp 5x7 Stepped Pixel-Art Bitmap Font Renderer for HTML5 Canvas
// Renders 100% integer-aligned blocky pixel-art text with dark pixel outlines and 2-tone highlights.

const GLYPHS = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  '"': [0b01010, 0b01010, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  '%': [0b11001, 0b11010, 0b00100, 0b00100, 0b01011, 0b10011, 0b00000],
  '&': [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "'": [0b00100, 0b00100, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '*': [0b00100, 0b10101, 0b01110, 0b11111, 0b01110, 0b10101, 0b00100],
  '+': [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
  ',': [0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100, 0b01000],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00110, 0b00110],
  '/': [0b00001, 0b00010, 0b00100, 0b00100, 0b01000, 0b10000, 0b00000],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b01110, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  ':': [0b00000, 0b00110, 0b00110, 0b00000, 0b00110, 0b00110, 0b00000],
  '[': [0b01110, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110],
  ']': [0b01110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b01110],
  'A': [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  'B': [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  'C': [0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111],
  'D': [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  'E': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  'F': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  'G': [0b01111, 0b10000, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  'H': [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  'I': [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  'J': [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100],
  'K': [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  'M': [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  'N': [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  'O': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  'P': [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  'Q': [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  'R': [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  'S': [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  'T': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  'U': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  'V': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  'W': [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  'X': [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  'Y': [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  'Z': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '•': [0b00000, 0b00000, 0b01110, 0b01110, 0b01110, 0b00000, 0b00000],
  '★': [0b00100, 0b00100, 0b11111, 0b01110, 0b01110, 0b10001, 0b00000],
  '✦': [0b00100, 0b01110, 0b11111, 0b01110, 0b00100, 0b00000, 0b00000]
};

export class PixelFont {
  static measureWidth(text, pixelSize = 2, spacing = 1) {
    if (!text) return 0;
    const str = String(text).toUpperCase();
    return str.length * (5 + spacing) * pixelSize - spacing * pixelSize;
  }

  /**
   * Draws crisp 5x7 stepped pixel-art text centered at (cx, cy).
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} cx - Center X coordinate
   * @param {number} cy - Center Y coordinate
   * @param {number} pixelSize - Integer pixel block size (e.g. 2 or 3)
   * @param {string} mainColor - Primary fill color
   * @param {string} topColor - Optional top-half highlight color for retro 16-bit gradient look
   * @param {boolean} outline - Whether to draw a crisp 1-block dark pixel shadow/outline
   */
  static drawCentered(
    ctx,
    text,
    cx,
    cy,
    pixelSize = 2,
    mainColor = '#ffffff',
    topColor = null,
    outline = true
  ) {
    if (!text) return;
    const str = String(text).toUpperCase();
    const p = Math.max(1, Math.round(pixelSize));
    const charStep = 6 * p;
    const totalW = str.length * charStep - p;
    const totalH = 7 * p;
    const startX = Math.round(cx - totalW * 0.5);
    const startY = Math.round(cy - totalH * 0.5);

    if (outline) {
      ctx.fillStyle = '#05070e';
      for (let i = 0; i < str.length; i++) {
        const rows = GLYPHS[str[i]] || GLYPHS[' '];
        const gx = startX + i * charStep;
        for (let r = 0; r < 7; r++) {
          const bits = rows[r];
          if (!bits) continue;
          const py = startY + r * p;
          for (let c = 0; c < 5; c++) {
            if ((bits >> (4 - c)) & 1) {
              const px = gx + c * p;
              ctx.fillRect(px - p, py, p * 3, p);
              ctx.fillRect(px, py - p, p, p * 3);
              ctx.fillRect(px + p, py + p, p, p);
            }
          }
        }
      }
    }

    for (let i = 0; i < str.length; i++) {
      const rows = GLYPHS[str[i]] || GLYPHS[' '];
      const gx = startX + i * charStep;
      for (let r = 0; r < 7; r++) {
        const bits = rows[r];
        if (!bits) continue;
        ctx.fillStyle = topColor && r < 3 ? topColor : mainColor;
        const py = startY + r * p;
        for (let c = 0; c < 5; c++) {
          if ((bits >> (4 - c)) & 1) {
            ctx.fillRect(gx + c * p, py, p, p);
          }
        }
      }
    }
  }

  static _spriteCache = new Map();
  static _spriteCacheMax = 192;

  static clearCache() {
    PixelFont._spriteCache.clear();
  }

  /**
   * Offscreen sprite-cached variant of drawCentered (100% pixel-identical nearest-neighbor bitmap).
   * Used exclusively in Endless Mode so damage numbers & floating callouts blit in 1 drawImage()
   * instead of 340-2,000 individual ctx.fillRect() calls per frame on iPhone Safari.
   */
  static drawCenteredCached(
    ctx,
    text,
    cx,
    cy,
    pixelSize = 2,
    mainColor = '#ffffff',
    topColor = null,
    outline = true,
    heavyOutline = false
  ) {
    if (!text || !ctx) return;
    if (
      typeof document === 'undefined' ||
      typeof document.createElement !== 'function' ||
      typeof ctx.drawImage !== 'function'
    ) {
      PixelFont.drawCentered(ctx, text, cx, cy, pixelSize, mainColor, topColor, outline);
      return;
    }

    const str = String(text).toUpperCase();
    const p = Math.max(1, Math.round(pixelSize));
    const key = `${str}|${p}|${mainColor || ''}|${topColor || ''}|${outline ? 1 : 0}|${heavyOutline ? 1 : 0}`;
    const cache = PixelFont._spriteCache;
    let entry = cache.get(key);

    if (!entry) {
      const charStep = 6 * p;
      const totalW = Math.max(1, str.length * charStep - p);
      const totalH = 7 * p;
      const pad = heavyOutline ? Math.max(3, p + 2) : outline ? p + 1 : 1;
      const w = totalW + pad * 2;
      const h = totalH + pad * 2 + (heavyOutline ? 1 : 0);
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (!octx) {
        PixelFont.drawCentered(ctx, str, cx, cy, p, mainColor, topColor, outline);
        return;
      }
      octx.imageSmoothingEnabled = false;
      const midX = w * 0.5;
      const midY = pad + totalH * 0.5;

      if (heavyOutline) {
        const offsets =
          p === 1
            ? [
                [-2, 0],
                [2, 0],
                [0, -2],
                [0, 2],
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
                [0, 3]
              ]
            : [
                [-2, -2],
                [2, -2],
                [-2, 2],
                [2, 2],
                [0, 3],
                [2, 3]
              ];
        for (let i = 0; i < offsets.length; i++) {
          PixelFont.drawCentered(
            octx,
            str,
            midX + offsets[i][0],
            midY + offsets[i][1],
            p,
            '#050712',
            '#050712',
            false
          );
        }
        PixelFont.drawCentered(octx, str, midX, midY, p, mainColor, topColor, true);
      } else {
        PixelFont.drawCentered(octx, str, midX, midY, p, mainColor, topColor, outline);
      }

      if (cache.size >= PixelFont._spriteCacheMax) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
      entry = { canvas: off, w, h, anchorX: Math.round(midX), anchorY: Math.round(midY) };
      cache.set(key, entry);
    } else {
      // Refresh LRU recency
      cache.delete(key);
      cache.set(key, entry);
    }

    ctx.drawImage(entry.canvas, Math.round(cx - entry.anchorX), Math.round(cy - entry.anchorY));
  }
}
