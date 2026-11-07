// 32-Frame HD-2D Pixel-Art Sprite Sheet Loader & Nearest-Neighbor Animator (128x128 Cells)
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
        portrait: loadImg('assets/sprites/warrior_portrait.png', () => this.refreshPortraits())
      },
      mage: {
        sheet: loadImg('assets/sprites/mage_sheet.png'),
        portrait: loadImg('assets/sprites/mage_portrait.png', () => this.refreshPortraits())
      },
      archer: {
        sheet: loadImg('assets/sprites/archer_sheet.png'),
        portrait: loadImg('assets/sprites/archer_portrait.png', () => this.refreshPortraits())
      }
    };

    return this.assets;
  }

  static setHUDPortraits(leftKey, leftColor, rightKey, rightColor) {
    this.hudPortraitCfg = { leftKey, leftColor, rightKey, rightColor };
    this.refreshPortraits();
  }

  static refreshPortraits() {
    if (!this.assets || !this.hudPortraitCfg) return;
    const { leftKey, leftColor, rightKey, rightColor } = this.hudPortraitCfg;
    if (this.assets[leftKey]?.portrait) {
      this.drawPortrait('left-portrait', this.assets[leftKey].portrait, leftColor);
    }
    if (this.assets[rightKey]?.portrait) {
      this.drawPortrait('right-portrait', this.assets[rightKey].portrait, rightColor);
    }
  }

  static drawPortrait(canvasId, img, borderColor) {
    const el = document.getElementById(canvasId);
    if (!el || !img || !img.complete || !img.naturalWidth) return;
    el.width = 96;
    el.height = 96;
    const ctx = el.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 96, 96);
    ctx.drawImage(img, 0, 0, 96, 96);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 92, 92);
  }

  /**
   * Maps fighter state & timers to one of the 48 HD-2D pixel-art frames (8 cols x 6 rows, 208x208 cells):
   * - Row 0 (0..7):   8-frame IDLE combat ready loop
   * - Row 1 (8..15):  8-frame WALK / STRIDE loop
   * - Row 2 (16..23): 8-frame AUTO_ATTACK combo sequence
   * - Row 3 (24..31): 8-frame SKILL (24..27) & ULTIMATE (28..31) sequence
   * - Row 4 (32..39): 8-frame DEATH recoil, kneeling collapse & fallen sequence
   * - Row 5 (40..47): 8-frame DASH & DODGE evasive sequence
   */
  static getFrameIndex(fighter, phase) {
    const st = fighter.state;
    const t = fighter.stateTimer;

    if (fighter.isDead || st === 'DEATH') {
      const deathDuration = 1.35;
      const dt = fighter.deathTimer || 0;
      const step = Math.min(7, Math.max(0, Math.floor((dt / deathDuration) * 8)));
      return 32 + step;
    }

    if (
      st === 'HURT' ||
      (fighter.hurtTimer > 0.05 &&
        st !== 'ULTIMATE' &&
        st !== 'SKILL' &&
        st !== 'DODGE' &&
        st !== 'DASH')
    ) {
      return fighter.hurtTimer > 0.14 ? 32 : 33;
    }

    if (st === 'DASH' || st === 'DODGE') {
      const dur = fighter.dashDuration || 0.44;
      const step = Math.min(7, Math.max(0, Math.floor((t / dur) * 8)));
      return 40 + step;
    }

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
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const cell = Math.round(sheet.naturalWidth / 8) || 208;

    ctx.imageSmoothingEnabled = false;

    const frameIdx = this.getFrameIndex(fighter, phase);
    const col = frameIdx % 8;
    const row = (frameIdx / 8) | 0;
    const sx = col * cell;
    const sy = row * cell;
    const baseY = -h + 10;

    // Crisp pixel-art afterimage trail during active DASH or DODGE
    if (!isReflection && (fighter.state === 'DASH' || fighter.state === 'DODGE')) {
      const dir = (fighter.dashDir || fighter.facing) * fighter.facing;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(
        sheet,
        sx,
        sy,
        cell,
        cell,
        Math.round(-w * 0.5 - dir * 32),
        Math.round(baseY),
        w,
        h
      );
      ctx.globalAlpha = 0.42;
      ctx.drawImage(
        sheet,
        sx,
        sy,
        cell,
        cell,
        Math.round(-w * 0.5 - dir * 16),
        Math.round(baseY),
        w,
        h
      );
      ctx.restore();
    }

    // Pixel-snapped hit-recoil jolt & stagger back-lean when taking damage
    let recoilX = 0;
    let recoilY = 0;
    if (!isReflection && !fighter.isDead && fighter.hurtTimer > 0) {
      recoilX = -6 + Math.round(Math.sin(fighter.hurtTimer * 60) * 4 / 2) * 2;
      recoilY = -2;
    }

    // Draw the full 208x208 HD-2D pixel-art cell intact with zero horizontal slice-shearing
    ctx.drawImage(
      sheet,
      sx,
      sy,
      cell,
      cell,
      Math.round(-w * 0.5 + recoilX),
      Math.round(baseY + recoilY),
      w,
      h
    );
  }

  static drawGhostFrame(ctx, charSet, frameIdx, w, h) {
    const sheet = charSet.sheet;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    ctx.imageSmoothingEnabled = false;
    const cell = Math.round(sheet.naturalWidth / 8) || 256;
    const col = frameIdx % 8;
    const row = (frameIdx / 8) | 0;
    ctx.drawImage(
      sheet,
      col * cell,
      row * cell,
      cell,
      cell,
      Math.round(-w * 0.5),
      Math.round(-h + 10),
      w,
      h
    );
  }
}
