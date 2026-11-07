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
      arenaSylvan: loadImg('assets/sprites/arena_sylvan.png'),
      arenaBoneyard: loadImg('assets/sprites/arena_boneyard.png'),
      arenaClocktower: loadImg('assets/sprites/arena_clocktower.png'),
      warrior: {
        sheet: loadImg('assets/sprites/warrior_sheet.png'),
        vfx: loadImg('assets/sprites/warrior_vfx.png'),
        portrait: loadImg('assets/sprites/warrior_portrait.png', () => this.refreshPortraits())
      },
      mage: {
        sheet: loadImg('assets/sprites/mage_sheet.png'),
        vfx: loadImg('assets/sprites/mage_vfx.png'),
        portrait: loadImg('assets/sprites/mage_portrait.png', () => this.refreshPortraits())
      },
      archer: {
        sheet: loadImg('assets/sprites/archer_sheet.png'),
        vfx: loadImg('assets/sprites/archer_vfx.png'),
        portrait: loadImg('assets/sprites/archer_portrait.png', () => this.refreshPortraits())
      },
      priestess: {
        sheet: loadImg('assets/sprites/priestess_sheet.png'),
        wings: loadImg('assets/sprites/seraphim_wings.png'),
        vfx: loadImg('assets/sprites/priestess_vfx.png'),
        portrait: loadImg('assets/sprites/priestess_portrait.png', () => this.refreshPortraits())
      },
      reaper: {
        sheet: loadImg('assets/sprites/reaper_sheet.png'),
        vfx: loadImg('assets/sprites/reaper_vfx.png'),
        portrait: loadImg('assets/sprites/reaper_portrait.png', () => this.refreshPortraits())
      },
      chronomancer: {
        sheet: loadImg('assets/sprites/chronomancer_sheet.png'),
        vfx: loadImg('assets/sprites/chronomancer_vfx.png'),
        portrait: loadImg('assets/sprites/chronomancer_portrait.png', () => this.refreshPortraits())
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
      if (fighter.heroId === 'warrior') {
        if (t < 0.50) {
          const blitzFrames = [42, 19, 20, 43, 25, 26];
          return blitzFrames[Math.floor(t * 16) % blitzFrames.length];
        }
        if (t < 0.90) return t < 0.70 ? 28 : 29;
        return t < 1.15 ? 30 : 31;
      }
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

  /**
   * Builds the Guessed Height ("pillow" distance-from-outline + luminance relief) & 3D Normal Map
   * on the real logical pixel grid (52x52 per frame, scaled 4x to 208x208), exactly like the
   * Aseprite normal-map lighting pipeline (Sprite -> Guessed height -> Normal map -> Light in 4 steps).
   */
  static ensureNormalMap(charSet) {
    if (charSet.normalMapData) return charSet.normalMapData;
    const sheet = charSet.sheet;
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return null;

    const cols = 8;
    const rows = 6;
    const cellLow = 52; // 208 / 4 = 52 real logical pixels per character cell
    const wLow = cols * cellLow;
    const hLow = rows * cellLow;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = wLow;
    tmpCanvas.height = hLow;
    const tCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(sheet, 0, 0, wLow, hLow);

    const srcData = tCtx.getImageData(0, 0, wLow, hLow).data;
    const totalPixels = wLow * hLow;
    const heightMap = new Float32Array(totalPixels);
    const distMap = new Float32Array(totalPixels);
    const normals = new Float32Array(totalPixels * 4); // nx, ny, nz, edgeFlag

    // Process each 52x52 frame cell independently so normals never bleed across cell borders
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ox = c * cellLow;
        const oy = r * cellLow;

        // 1. Initialize outline distance transform (0 at transparent pixels, large inside opaque silhouette)
        for (let y = 0; y < cellLow; y++) {
          for (let x = 0; x < cellLow; x++) {
            const idx = (oy + y) * wLow + (ox + x);
            const a = srcData[idx * 4 + 3];
            distMap[idx] = a > 40 ? 999.0 : 0.0;
          }
        }

        // Forward chamfer distance pass
        for (let y = 0; y < cellLow; y++) {
          for (let x = 0; x < cellLow; x++) {
            const idx = (oy + y) * wLow + (ox + x);
            if (distMap[idx] === 0) continue;
            let d = distMap[idx];
            if (x > 0) d = Math.min(d, distMap[idx - 1] + 1.0);
            if (y > 0) d = Math.min(d, distMap[idx - wLow] + 1.0);
            if (x > 0 && y > 0) d = Math.min(d, distMap[idx - wLow - 1] + 1.414);
            if (x < cellLow - 1 && y > 0) d = Math.min(d, distMap[idx - wLow + 1] + 1.414);
            distMap[idx] = d;
          }
        }

        // Backward chamfer distance pass
        for (let y = cellLow - 1; y >= 0; y--) {
          for (let x = cellLow - 1; x >= 0; x--) {
            const idx = (oy + y) * wLow + (ox + x);
            if (distMap[idx] === 0) continue;
            let d = distMap[idx];
            if (x < cellLow - 1) d = Math.min(d, distMap[idx + 1] + 1.0);
            if (y < cellLow - 1) d = Math.min(d, distMap[idx + wLow] + 1.0);
            if (x < cellLow - 1 && y < cellLow - 1) d = Math.min(d, distMap[idx + wLow + 1] + 1.414);
            if (x > 0 && y < cellLow - 1) d = Math.min(d, distMap[idx + wLow - 1] + 1.414);
            distMap[idx] = d;
          }
        }

        // 2. Guessed Height: Rounded "Pillow" profile from outline distance + local pixel luminance relief
        for (let y = 0; y < cellLow; y++) {
          for (let x = 0; x < cellLow; x++) {
            const idx = (oy + y) * wLow + (ox + x);
            const d = distMap[idx];
            if (d <= 0) {
              heightMap[idx] = 0;
              continue;
            }
            const u = Math.min(1.0, d / 9.5);
            const pillow = Math.sqrt(Math.max(0, 1.0 - (1.0 - u) * (1.0 - u)));
            const pr = srcData[idx * 4];
            const pg = srcData[idx * 4 + 1];
            const pb = srcData[idx * 4 + 2];
            const lum = (pr * 0.299 + pg * 0.587 + pb * 0.114) / 255.0;
            heightMap[idx] = pillow * 0.68 + lum * 0.32;
          }
        }

        // 3. Compute 3D Surface Normal (nx, ny, nz) + Character Inking Flags on the 52x52 logical grid
        // edgeFlag:
        //   1.0 = 1px Silhouette Comic Ink (d <= 1.05)
        //   2.0 = 1px Inner Rim Catchlight (1.05 < d <= 2.2)
        //   3.0 = 1px Exterior Luminous Separation Rim (d === 0, 4-connected to opaque silhouette)
        //   4.0 = Interior Cel-Ink Crease Line (d > 2.2, local luminance crease between armor/limb/robe forms)
        const bumpStrength = 2.85;
        for (let y = 0; y < cellLow; y++) {
          for (let x = 0; x < cellLow; x++) {
            const idx = (oy + y) * wLow + (ox + x);
            const nBase = idx * 4;
            const d = distMap[idx];
            const hL = x > 0 ? heightMap[idx - 1] : 0;
            const hR = x < cellLow - 1 ? heightMap[idx + 1] : 0;
            const hU = y > 0 ? heightMap[idx - wLow] : 0;
            const hD = y < cellLow - 1 ? heightMap[idx + wLow] : 0;

            if (d <= 0) {
              // Check if this transparent pixel is 4-connected to the opaque silhouette (1px Exterior Rim)
              const touchesOpaque =
                (x > 0 && distMap[idx - 1] > 0) ||
                (x < cellLow - 1 && distMap[idx + 1] > 0) ||
                (y > 0 && distMap[idx - wLow] > 0) ||
                (y < cellLow - 1 && distMap[idx + wLow] > 0);
              if (touchesOpaque) {
                const gx = (hL - hR) * bumpStrength;
                const gy = (hU - hD) * bumpStrength;
                const gz = 0.85;
                const invLen = 1.0 / Math.hypot(gx, gy, gz);
                normals[nBase] = gx * invLen;
                normals[nBase + 1] = gy * invLen;
                normals[nBase + 2] = gz * invLen;
                normals[nBase + 3] = 3.0;
              } else {
                normals[nBase] = 0;
                normals[nBase + 1] = 0;
                normals[nBase + 2] = 1;
                normals[nBase + 3] = 0;
              }
              continue;
            }

            const gx = (hL - hR) * bumpStrength;
            const gy = (hU - hD) * bumpStrength;
            const gz = 1.0;
            const invLen = 1.0 / Math.hypot(gx, gy, gz);

            normals[nBase] = gx * invLen;
            normals[nBase + 1] = gy * invLen;
            normals[nBase + 2] = gz * invLen;

            if (d <= 1.05) {
              normals[nBase + 3] = 1.0;
            } else if (d <= 2.2) {
              normals[nBase + 3] = 2.0;
            } else {
              // Detect interior cel-ink creases where local pixel luminance drops sharply next to brighter forms
              const pr = srcData[idx * 4];
              const pg = srcData[idx * 4 + 1];
              const pb = srcData[idx * 4 + 2];
              const lum = (pr * 0.299 + pg * 0.587 + pb * 0.114) / 255.0;
              let maxN = lum;
              if (x > 0) {
                const nI = (idx - 1) * 4;
                maxN = Math.max(maxN, (srcData[nI] * 0.299 + srcData[nI + 1] * 0.587 + srcData[nI + 2] * 0.114) / 255.0);
              }
              if (x < cellLow - 1) {
                const nI = (idx + 1) * 4;
                maxN = Math.max(maxN, (srcData[nI] * 0.299 + srcData[nI + 1] * 0.587 + srcData[nI + 2] * 0.114) / 255.0);
              }
              if (y > 0) {
                const nI = (idx - wLow) * 4;
                maxN = Math.max(maxN, (srcData[nI] * 0.299 + srcData[nI + 1] * 0.587 + srcData[nI + 2] * 0.114) / 255.0);
              }
              if (y < cellLow - 1) {
                const nI = (idx + wLow) * 4;
                maxN = Math.max(maxN, (srcData[nI] * 0.299 + srcData[nI + 1] * 0.587 + srcData[nI + 2] * 0.114) / 255.0);
              }
              normals[nBase + 3] = lum < 0.40 && maxN - lum > 0.18 ? 4.0 : 0.0;
            }
          }
        }
      }
    }

    const litCanvas = document.createElement('canvas');
    litCanvas.width = cellLow;
    litCanvas.height = cellLow;
    const litCtx = litCanvas.getContext('2d');
    const litImgData = litCtx.createImageData(cellLow, cellLow);

    charSet.normalMapData = {
      cellLow,
      wLow,
      hLow,
      srcData,
      normals,
      litCanvas,
      litCtx,
      litImgData
    };
    return charSet.normalMapData;
  }

  static drawSheetFrame(ctx, charSet, fighter, w, h, phase, isReflection = false, renderer = null) {
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

    // Crisp pixel-art afterimage trail during active DASH, DODGE, or Warrior Omnislash Ultimate
    if (
      !isReflection &&
      !fighter.isAngelicAscent &&
      fighter.heroId !== 'reaper' &&
      fighter.heroId !== 'chronomancer' &&
      (fighter.state === 'DASH' || fighter.state === 'DODGE' || fighter.isOmnislashing)
    ) {
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
      recoilX = -6 + Math.round((Math.sin(fighter.hurtTimer * 60) * 4) / 2) * 2;
      recoilY = -2;
    }

    // HD-2D Normal-Mapped 4-Step Pixel Lighting + Dual-Layer Character Inking Pass
    const nm = !isReflection && renderer ? this.ensureNormalMap(charSet) : null;
    if (nm && renderer.activePointLights && renderer.activePointLights.length > 0) {
      const { cellLow, wLow, srcData, normals, litCanvas, litCtx, litImgData } = nm;
      const dst = litImgData.data;
      const ox = col * cellLow;
      const oy = row * cellLow;
      // FireMage sheet faces left natively; all other champions face right natively
      const flipX = fighter.heroId === 'mage' ? -fighter.facing : fighter.facing;
      const fx = fighter.x;
      const fy = fighter.y;
      const lights = renderer.activePointLights;
      const numLights = lights.length;

      // Champion Signature Elemental Rim Colors paired with Warm Sunlit Ivory-Gold (#fef3a8)
      const rimPalettes = {
        warrior: [56, 189, 248],       // Electric Frost-Cyan (#38bdf8)
        archer: [52, 211, 153],        // Vivid Sylvan Emerald (#34d399)
        mage: [251, 146, 60],          // Blazing Solar Amber (#fb923c)
        priestess: [253, 224, 71],     // Radiant Archangel Gold (#fde047)
        reaper: [232, 121, 249],       // Luminous Necrotic Orchid (#e879f9)
        chronomancer: [45, 212, 191]   // Luminous Aether-Teal (#2dd4bf)
      };
      const elemRim = rimPalettes[fighter.heroId] || [56, 189, 248];
      const inkMode =
        (typeof window !== 'undefined' &&
          (window.__INK_MODE__ || new URLSearchParams(window.location.search).get('ink'))) ||
        'dual_gold_elemental';

      for (let py = 0; py < cellLow; py++) {
        const wy = fy - 198 + py * 4;
        const rowOff = (oy + py) * wLow + ox;
        const dstRowOff = py * cellLow;

        for (let px = 0; px < cellLow; px++) {
          const sIdx = (rowOff + px) * 4;
          const dIdx = (dstRowOff + px) * 4;
          const a = srcData[sIdx + 3];
          const edgeFlag = normals[sIdx + 3];

          // 1px Exterior Separation Rim (edgeFlag === 3.0) on transparent pixels 4-connected to silhouette
          if (a === 0) {
            if (edgeFlag === 3.0) {
              const wnx = normals[sIdx] * flipX;
              const wny = normals[sIdx + 1];
              const wnz = normals[sIdx + 2];
              const wx = fx + flipX * ((px - 26) * 4);

              // Dynamic point-light boost on the exterior rim
              let rimLightR = 0;
              let rimLightG = 0;
              let rimLightB = 0;
              for (let li = 0; li < numLights; li++) {
                const L = lights[li];
                const dx = L.x - wx;
                const dy = L.y - wy;
                const rMax = L.radius;
                if (Math.abs(dx) > rMax || Math.abs(dy) > rMax) continue;
                const distSq = dx * dx + dy * dy;
                if (distSq >= rMax * rMax) continue;
                const dist2D = Math.sqrt(distSq);
                const dz = L.z || 68;
                const inv3D = 1.0 / Math.sqrt(distSq + dz * dz);
                const ndotl = Math.max(0, wnx * dx * inv3D + wny * dy * inv3D + wnz * dz * inv3D);
                if (ndotl > 0.05) {
                  const att = (1.0 - dist2D / rMax) * L.intensity * ndotl;
                  rimLightR += att * L.nr * 95;
                  rimLightG += att * L.ng * 95;
                  rimLightB += att * L.nb * 95;
                }
              }

              if (inkMode === 'obsidian_comic') {
                dst[dIdx] = 6;
                dst[dIdx + 1] = 3;
                dst[dIdx + 2] = 15;
                dst[dIdx + 3] = 248;
              } else if (inkMode === 'ivory_gold_rim') {
                dst[dIdx] = Math.min(255, (254 + rimLightR * 0.25) | 0);
                dst[dIdx + 1] = Math.min(255, (240 + rimLightG * 0.25) | 0);
                dst[dIdx + 2] = Math.min(255, (138 + rimLightB * 0.25) | 0);
                dst[dIdx + 3] = 236;
              } else if (inkMode === 'neon_elemental') {
                dst[dIdx] = Math.min(255, (elemRim[0] + rimLightR * 0.3) | 0);
                dst[dIdx + 1] = Math.min(255, (elemRim[1] + rimLightG * 0.3) | 0);
                dst[dIdx + 2] = Math.min(255, (elemRim[2] + rimLightB * 0.3) | 0);
                dst[dIdx + 3] = 236;
              } else {
                // Default Winner ('dual_gold_elemental'): Directional Sunlit Ivory-Gold (#fef3a8) top/front rim
                // blended with Champion Signature Elemental Neon on side/back rim
                const goldMix = Math.max(
                  0.22,
                  Math.min(0.90, -wny * 0.52 + wnx * fighter.facing * 0.24 + 0.46)
                );
                const eMix = 1.0 - goldMix;
                dst[dIdx] = Math.min(255, (254 * goldMix + elemRim[0] * eMix + rimLightR * 0.25) | 0);
                dst[dIdx + 1] = Math.min(255, (243 * goldMix + elemRim[1] * eMix + rimLightG * 0.25) | 0);
                dst[dIdx + 2] = Math.min(255, (168 * goldMix + elemRim[2] * eMix + rimLightB * 0.25) | 0);
                dst[dIdx + 3] = 238;
              }
            } else {
              dst[dIdx + 3] = 0;
            }
            continue;
          }

          const baseR = srcData[sIdx];
          const baseG = srcData[sIdx + 1];
          const baseB = srcData[sIdx + 2];
          const baseLum = (baseR * 0.299 + baseG * 0.587 + baseB * 0.114) / 255.0;

          // 1px Inner Silhouette Comic Ink (edgeFlag === 1.0): Unbroken Deep Obsidian-Indigo (#06030f)
          // Locks in razor-sharp comic silhouette separation right inside the luminous exterior rim!
          if (edgeFlag === 1.0 && baseLum < 0.94) {
            dst[dIdx] = (6 * 0.88 + baseR * 0.12) | 0;
            dst[dIdx + 1] = (3 * 0.88 + baseG * 0.12) | 0;
            dst[dIdx + 2] = (15 * 0.88 + baseB * 0.12) | 0;
            dst[dIdx + 3] = a;
            continue;
          }

          const wnx = normals[sIdx] * flipX;
          const wny = normals[sIdx + 1];
          const wnz = normals[sIdx + 2];
          const wx = fx + flipX * ((px - 26) * 4);

          // Base directional moonlight + 3D pillow shading with rich saturated albedo
          const zenithDot = Math.max(0, -0.18 * wnx - 0.52 * wny + 0.83 * wnz);
          const zenithStep = Math.floor(Math.min(0.999, zenithDot) * 4) / 3;
          const isFaceOrHead = py <= 22;
          const innerRimLift = edgeFlag === 2.0 && !isFaceOrHead ? 0.10 : 0.0;
          let mulR = 0.72 + zenithStep * 0.24 + innerRimLift;
          let mulG = 0.72 + zenithStep * 0.24 + innerRimLift;
          let mulB = 0.75 + zenithStep * 0.25 + innerRimLift;

          // Accumulate 3D Normal-Mapped Point Lights and quantize total irradiance into 4 discrete steps
          let irradR = 0;
          let irradG = 0;
          let irradB = 0;
          let specR = 0;
          let specG = 0;
          let specB = 0;

          for (let li = 0; li < numLights; li++) {
            const L = lights[li];
            const dx = L.x - wx;
            const dy = L.y - wy;
            const rMax = L.radius;
            if (Math.abs(dx) > rMax || Math.abs(dy) > rMax) continue;

            const distSq = dx * dx + dy * dy;
            if (distSq >= rMax * rMax) continue;

            const dist2D = Math.sqrt(distSq);
            const dz = L.z || 68;
            const inv3D = 1.0 / Math.sqrt(distSq + dz * dz);
            const lx = dx * inv3D;
            const ly = dy * inv3D;
            const lz = dz * inv3D;

            const ndotl = Math.max(0, wnx * lx + wny * ly + wnz * lz);
            if (ndotl <= 0.04) continue;

            const step4 = Math.floor(Math.min(0.999, ndotl * 1.12) * 4) / 3;
            if (step4 <= 0) continue;

            const rawAtt = (1.0 - dist2D / rMax) * L.intensity;
            const stepAtt = Math.min(1.0, Math.ceil(rawAtt * 4) / 4);
            const contrib = step4 * stepAtt;

            irradR += contrib * L.nr;
            irradG += contrib * L.ng;
            irradB += contrib * L.nb;

            if (!isFaceOrHead && edgeFlag === 2.0 && step4 >= 0.66) {
              const sVal = 16 * stepAtt;
              specR = Math.max(specR, sVal * L.nr);
              specG = Math.max(specG, sVal * L.ng);
              specB = Math.max(specB, sVal * L.nb);
            }
          }

          // Quantize and cap total point-light diffuse contribution into 4 crisp HD-2D steps (max +0.32)
          const peakIrrad = Math.max(irradR, irradG, irradB);
          if (peakIrrad > 0 && !isFaceOrHead) {
            const damp = Math.max(0.0, 1.0 - baseLum * 1.15);
            const clampedPeak =
              Math.min(0.32, (Math.ceil(Math.min(1.0, peakIrrad * 0.6) * 4) / 4) * 0.32) * damp;
            const scale = clampedPeak / peakIrrad;
            mulR += irradR * scale;
            mulG += irradG * scale;
            mulB += irradB * scale;
          }

          // Never over-brighten character faces (py <= 22) or bright skin/hair/gown pixels (baseLum > 0.48)
          if (isFaceOrHead || baseLum > 0.48) {
            mulR = Math.min(1.0, mulR);
            mulG = Math.min(1.0, mulG);
            mulB = Math.min(1.0, mulB);
          }

          const headroom = isFaceOrHead || baseLum > 0.48 ? 0.0 : Math.max(0.0, 1.0 - baseLum * 1.2);
          let addR = specR * headroom;
          let addG = specG * headroom;
          let addB = specB * headroom;

          // Interior Cel-Ink Crease Line (edgeFlag === 4.0): crisp hand-inked internal contour definition
          if (edgeFlag === 4.0) {
            mulR *= 0.38;
            mulG *= 0.36;
            mulB *= 0.42;
            addR = 0;
            addG = 0;
            addB = 0;
          }

          dst[dIdx] = Math.min(255, Math.max(0, (baseR * mulR + addR) | 0));
          dst[dIdx + 1] = Math.min(255, Math.max(0, (baseG * mulG + addG) | 0));
          dst[dIdx + 2] = Math.min(255, Math.max(0, (baseB * mulB + addB) | 0));
          dst[dIdx + 3] = a;
        }
      }

      litCtx.putImageData(litImgData, 0, 0);
      ctx.drawImage(
        litCanvas,
        0,
        0,
        cellLow,
        cellLow,
        Math.round(-w * 0.5 + recoilX),
        Math.round(baseY + recoilY),
        w,
        h
      );
      return;
    }

    // Fallback / reflection draw
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

  static drawGhostFrame(_ctx, _charSet, _frameIdx, _w, _h) {
    // Disabled additive double-exposure so character faces and inked silhouettes stay 100% crisp during hits
  }
}
