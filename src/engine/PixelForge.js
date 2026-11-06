// 32-Frame HD-2D Pixel-Art Sprite Sheet Loader & Nearest-Neighbor Sub-Frame Animator
export class PixelForge {
  static initAssets() {
    if (this.assets) return this.assets;

    const loadImg = (src, onLoad) => {
      const img = new Image();
      img.decoding = 'async';
      if (onLoad) img.onload = () => onLoad(img);
      img.src = src;
      return img;
    };

    this.assets = {
      arenaBg: loadImg('assets/sprites/arena_bg.png'),
      warrior: {
        sheet: loadImg('assets/sprites/warrior_sheet.png'),
        portrait: loadImg('assets/sprites/warrior_portrait.png', (img) =>
          this.drawPortrait('warrior-portrait', img, '#38bdf8')
        )
      },
      mage: {
        sheet: loadImg('assets/sprites/mage_sheet.png'),
        portrait: loadImg('assets/sprites/mage_portrait.png', (img) =>
          this.drawPortrait('mage-portrait', img, '#fb923c')
        )
      }
    };

    return this.assets;
  }

  static drawPortrait(canvasId, img, borderColor) {
    const el = document.getElementById(canvasId);
    if (!el || !img.complete) return;
    el.width = 96;
    el.height = 96;
    const ctx = el.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 96, 96);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 92, 92);
  }

  /**
   * Maps fighter state & timers to one of the 32 HD-2D pixel-art frames (8 cols x 4 rows):
   * - Row 0 (0..7):   8-frame IDLE combat ready loop
   * - Row 1 (8..15):  8-frame WALK / SPRINT stride loop
   * - Row 2 (16..23): 8-frame AUTO_ATTACK combo sequence
   * - Row 3 (24..31): 8-frame SKILL (24..27) & ULTIMATE (28..31) sequence
   */
  static getFrameIndex(fighter, phase) {
    const st = fighter.state;
    const t = fighter.stateTimer;

    if (st === 'AUTO_ATTACK') {
      const duration = 0.96;
      const step = Math.min(7, Math.max(0, Math.floor((t / duration) * 8)));
      return 16 + step;
    }

    if (st === 'SKILL') {
      if (fighter.skillName === 'WHIRLWIND') {
        return 24 + (Math.floor(t * 9.5) % 4);
      }
      const step = Math.min(3, Math.max(0, Math.floor((t / 1.05) * 4)));
      return 24 + step;
    }

    if (st === 'ULTIMATE') {
      if (t < 0.42) return 28;
      if (t < 0.85) return 29;
      if (t < 1.25) return 30;
      return 31;
    }

    if (st === 'WALK') {
      const walkStep = Math.floor(Math.abs(fighter.walkPhase) * 2.0) % 8;
      return 8 + walkStep;
    }

    const idleStep = Math.floor(Math.abs(phase) * 2.2) % 8;
    return idleStep;
  }

  static drawSheetFrame(ctx, charSet, fighter, w, h, phase, isReflection = false) {
    const sheet = charSet.sheet;
    const cell = 96;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;

    ctx.imageSmoothingEnabled = false;

    const frameIdx = this.getFrameIndex(fighter, phase);
    const col = frameIdx % 8;
    const row = (frameIdx / 8) | 0;
    const sx = col * cell;
    const sy = row * cell;
    const baseY = -h + 4;

    if (isReflection) {
      ctx.drawImage(sheet, sx, sy, cell, cell, Math.round(-w * 0.5), Math.round(baseY), w, h);
      return;
    }

    // 8-band integer-snapped pixel-row wave for upper-body/cape breathing while keeping feet planted
    const slices = 8;
    const sliceSrcH = cell / slices;
    const sliceDstH = h / slices;
    const st = fighter.state;

    for (let i = 0; i < slices; i++) {
      const ratio = i / (slices - 1);
      const upperWeight = 1 - ratio * 0.85;
      let rawOffset = 0;
      if (st === 'WALK') {
        rawOffset = Math.sin(phase * 1.6 + ratio * 2.0) * 2.4 * upperWeight;
      } else if (st === 'IDLE') {
        rawOffset = Math.sin(phase * 1.4 - ratio * 2.2) * 2.0 * (1 - ratio);
      } else {
        rawOffset = Math.sin(phase * 2.0 - ratio * 2.4) * 2.4 * (1 - ratio);
      }

      // Snap offset to integer 2px pixel steps to preserve crisp HD-2D pixel grid
      const offsetX = Math.round(rawOffset * 0.5) * 2;
      const dx = Math.round(-w * 0.5 + offsetX);
      const dy = Math.round(baseY + i * sliceDstH);

      ctx.drawImage(
        sheet,
        sx,
        sy + i * sliceSrcH,
        cell,
        sliceSrcH,
        dx,
        dy,
        w,
        Math.ceil(sliceDstH)
      );
    }
  }

  static drawGhostFrame(ctx, charSet, frameIdx, w, h) {
    const sheet = charSet.sheet;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    ctx.imageSmoothingEnabled = false;
    const cell = 96;
    const col = frameIdx % 8;
    const row = (frameIdx / 8) | 0;
    ctx.drawImage(
      sheet,
      col * cell,
      row * cell,
      cell,
      cell,
      Math.round(-w * 0.5),
      Math.round(-h + 4),
      w,
      h
    );
  }
}
