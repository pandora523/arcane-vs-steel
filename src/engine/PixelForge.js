// 32-Frame HD Sprite Sheet Atlas Loader & 60FPS Sub-Frame Animator
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
      arenaBg: loadImg('assets/sprites/arena_bg.jpg'),
      warrior: {
        sheet: loadImg('assets/sprites/warrior_sheet.png'),
        fallback: loadImg('assets/sprites/warrior_idle.png'),
        portrait: loadImg('assets/sprites/warrior_portrait.jpg', (img) =>
          this.drawPortrait('warrior-portrait', img, '#38bdf8')
        )
      },
      mage: {
        sheet: loadImg('assets/sprites/mage_sheet.png'),
        fallback: loadImg('assets/sprites/mage_idle.png'),
        portrait: loadImg('assets/sprites/mage_portrait.jpg', (img) =>
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, 96, 96);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 93, 93);
  }

  /**
   * Maps fighter state & timers to one of the 32 frames (8 cols x 4 rows):
   * - Row 0 (0..7):   8-frame IDLE combat ready loop
   * - Row 1 (8..15):  8-frame WALK / SPRINT stride loop
   * - Row 2 (16..23): 8-frame AUTO_ATTACK combo sequence
   * - Row 3 (24..31): 8-frame SKILL (24..27) & ULTIMATE (28..31) sequence
   */
  static getFrameIndex(fighter, phase) {
    const st = fighter.state;
    const t = fighter.stateTimer;

    if (st === 'AUTO_ATTACK') {
      const duration = 0.56;
      const step = Math.min(7, Math.max(0, Math.floor((t / duration) * 8)));
      return 16 + step;
    }

    if (st === 'SKILL') {
      // Warrior Whirlwind spins rapidly through 24..27; Mage Pillar progresses through 24..27
      if (fighter.skillName === 'WHIRLWIND') {
        return 24 + (Math.floor(t * 18) % 4);
      }
      const step = Math.min(3, Math.max(0, Math.floor((t / 0.72) * 4)));
      return 24 + step;
    }

    if (st === 'ULTIMATE') {
      if (t < 0.32) return 28;
      if (t < 0.68) return 29;
      if (t < 0.92) return 30;
      return 31;
    }

    if (st === 'WALK') {
      const walkStep = Math.floor(Math.abs(fighter.walkPhase) * 2.2) % 8;
      return 8 + walkStep;
    }

    // IDLE: 8-frame breathing, weapon poise & cape wave loop
    const idleStep = Math.floor(Math.abs(phase) * 2.4) % 8;
    return idleStep;
  }

  static drawSheetFrame(ctx, charSet, fighter, w, h, phase, isReflection = false) {
    const sheet = charSet.sheet;
    const cell = 256;

    if (!sheet || !sheet.complete || !sheet.naturalWidth) {
      const fb = charSet.fallback;
      if (fb && fb.complete && fb.naturalWidth) {
        ctx.drawImage(fb, -w * 0.5, -h + 10, w, h);
      }
      return;
    }

    const frameIdx = this.getFrameIndex(fighter, phase);
    const col = frameIdx % 8;
    const row = Math.floor(frameIdx / 8);
    const sx = col * cell;
    const sy = row * cell;

    // Fast single-draw on floor reflection pass
    if (isReflection) {
      ctx.drawImage(sheet, sx, sy, cell, cell, -w * 0.5, -h + 10, w, h);
      return;
    }

    // 8-band 60FPS sub-frame cloth & limb micro-interpolation over the 32-frame atlas
    const slices = 8;
    const sliceSrcH = cell / slices;
    const sliceDstH = h / slices;
    const st = fighter.state;

    for (let i = 0; i < slices; i++) {
      const ratio = i / (slices - 1);
      let offsetX = 0;
      if (st === 'WALK') {
        offsetX = Math.sin(phase * 1.8 + ratio * 2.2) * (ratio > 0.55 ? 3.2 : 1.6);
      } else if (st === 'IDLE') {
        offsetX = Math.sin(phase * 1.5 - ratio * 2.5) * 1.8;
      } else {
        offsetX = Math.sin(phase * 2.6 - ratio * 3.0) * 2.5;
      }

      const dx = -w * 0.5 + offsetX;
      const dy = -h + 10 + i * sliceDstH;

      ctx.drawImage(
        sheet,
        sx,
        sy + i * sliceSrcH,
        cell,
        sliceSrcH + 0.6,
        dx,
        dy,
        w,
        sliceDstH + 0.7
      );
    }
  }

  static drawGhostFrame(ctx, charSet, frameIdx, w, h) {
    const sheet = charSet.sheet;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const cell = 256;
    const col = frameIdx % 8;
    const row = Math.floor(frameIdx / 8);
    ctx.drawImage(sheet, col * cell, row * cell, cell, cell, -w * 0.5, -h + 10, w, h);
  }
}
