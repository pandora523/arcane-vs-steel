// Multi-Frame HD Sprite Loader & 60FPS 2D Slice-Mesh Animator
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
        idle: loadImg('assets/sprites/warrior_idle.png'),
        walk1: loadImg('assets/sprites/warrior_walk1.png'),
        walk2: loadImg('assets/sprites/warrior_walk2.png'),
        windup: loadImg('assets/sprites/warrior_windup.png'),
        attack: loadImg('assets/sprites/warrior_attack.png'),
        portrait: loadImg('assets/sprites/warrior_portrait.jpg', (img) =>
          this.drawPortrait('warrior-portrait', img, '#38bdf8')
        )
      },
      mage: {
        idle: loadImg('assets/sprites/mage_idle.png'),
        walk1: loadImg('assets/sprites/mage_glide1.png'),
        walk2: loadImg('assets/sprites/mage_glide2.png'),
        windup: loadImg('assets/sprites/mage_windup.png'),
        attack: loadImg('assets/sprites/mage_attack.png'),
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

  // Selects active keyframe from the 5-pose set based on fighter state & animation phase
  static selectFrame(set, fighter) {
    const st = fighter.state;
    const t = fighter.stateTimer;
    if (st === 'AUTO_ATTACK') {
      if (t < 0.22) return set.windup || set.idle;
      if (t < 0.5) return set.attack || set.idle;
      return set.walk1 || set.idle;
    }
    if (st === 'SKILL') {
      if (t < 0.2) return set.windup || set.idle;
      // Rapidly alternate poses during Whirlwind / Pillar channeling
      return Math.floor(t * 14) % 2 === 0 ? set.attack : set.windup;
    }
    if (st === 'ULTIMATE') {
      if (t < 0.72) return set.windup || set.idle;
      return set.attack || set.idle;
    }
    if (st === 'WALK') {
      const cycle = [set.walk1, set.idle, set.walk2, set.idle];
      const idx = Math.floor(fighter.walkPhase * 1.4) % cycle.length;
      return cycle[Math.abs(idx)] || set.idle;
    }
    // IDLE subtle 2-pose breathing alternation
    return Math.sin(fighter.walkPhase * 0.8) > 0.55 ? set.walk1 || set.idle : set.idle;
  }

  // Renders the sprite with 10-band horizontal mesh deformation (breathing, cloth wave, leg stride)
  static drawDeformedSprite(ctx, img, w, h, phase, state, isReflection = false) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;

    // Fast single-draw on reflection pass
    if (isReflection) {
      ctx.drawImage(img, -w * 0.5, -h + 8, w, h);
      return;
    }

    const slices = 10;
    const sliceSrcH = sh / slices;
    const sliceDstH = h / slices;
    const isWalk = state === 'WALK';
    const isAct = state === 'AUTO_ATTACK' || state === 'SKILL' || state === 'ULTIMATE';

    for (let i = 0; i < slices; i++) {
      const ratio = i / (slices - 1); // 0 = head, 0.5 = torso/cape, 1 = feet
      let offsetX = 0;
      let scaleW = 1;

      if (isWalk) {
        // Upper body leans forward, lower legs shear in stride rhythm
        offsetX = Math.sin(phase + ratio * 2.4) * (ratio > 0.6 ? 7.5 : 3.5);
      } else if (isAct) {
        // Dynamic whip wave from torso to weapon tip
        offsetX = Math.sin(phase * 3 - ratio * 3.2) * 5.5;
      } else {
        // Idle breathing & cape/robe flutter
        offsetX = Math.sin(phase * 1.6 - ratio * 2.8) * 3.0;
        if (ratio > 0.2 && ratio < 0.65) {
          scaleW = 1 + Math.sin(phase * 1.5) * 0.03;
        }
      }

      const dw = w * scaleW;
      const dx = -dw * 0.5 + offsetX;
      const dy = -h + 8 + i * sliceDstH;

      ctx.drawImage(
        img,
        0,
        i * sliceSrcH,
        sw,
        sliceSrcH + 0.8,
        dx,
        dy,
        dw,
        sliceDstH + 0.9
      );
    }
  }
}
