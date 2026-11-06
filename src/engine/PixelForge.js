// HD Hand-Painted Sprite & Stage Asset Loader
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
        attack: loadImg('assets/sprites/warrior_attack.png'),
        portrait: loadImg('assets/sprites/warrior_portrait.jpg', (img) =>
          this.drawPortrait('warrior-portrait', img, '#38bdf8')
        )
      },
      mage: {
        idle: loadImg('assets/sprites/mage_idle.png'),
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
}
