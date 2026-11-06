// Procedural 16-bit Pixel-Art Sprite & Face Baker — Expressive Character Faces
export class PixelForge {
  static createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { c, ctx };
  }

  static bakeGrid(grid, palette, scale = 1) {
    const h = grid.length;
    const w = grid[0].length;
    const { c, ctx } = this.createCanvas(w * scale, h * scale);
    for (let y = 0; y < h; y++) {
      const row = grid[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch !== '.' && palette[ch]) {
          ctx.fillStyle = palette[ch];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    return c;
  }

  static initAssets() {
    if (this.assets) return this.assets;

    const steelPal = {
      K: '#070a12', // Outline
      D: '#1e293b', // Dark steel
      M: '#475569', // Mid steel
      L: '#94a3b8', // Light steel
      W: '#f8fafc', // White hair / eye sclera
      H: '#cbd5e1', // Silver hair mid
      S: '#fdebd0', // Skin highlight
      F: '#f5b041', // Warm skin mid (#f0b27a)
      J: '#ca6f1e', // Skin shadow / jaw / mouth
      C: '#0284c7', // Deep cyan
      B: '#38bdf8', // Bright cyan iris / rune
      E: '#e0f2fe', // White-cyan core
      G: '#b45309', // Bronze
      Y: '#facc15'  // Gold crown / trim
    };
    steelPal.F = '#f0b27a';

    const arcanePal = {
      K: '#120604', // Outline
      P: '#4c1d95', // Deep royal hood/hat shadow
      R: '#9a3412', // Crimson hat/robe
      L: '#ea580c', // Flame hair / bright cloth
      O: '#fb923c', // Orange glow
      Y: '#facc15', // Gold crown / iris
      W: '#ffffff', // Eye sclera / white core
      S: '#fdebd0', // Fair warm skin highlight
      F: '#eb984e', // Skin mid
      J: '#a04000', // Skin shadow / beard
      B: '#fde68a'  // Grimoire parchment
    };

    // WARRIOR REAL SPRITE FACE: Silver-haired Paladin with Golden Winged Crown & Fierce Eyes (20x20)
    const wFace = [
      '....KK........KK....',
      '...KYYK..KK..KYYK...',
      '..KYYYYKKBBKKYYYYK..',
      '..KGGGGYYEEYYGGGGK..',
      '..KKKKKKKKKKKKKKKK..',
      '.KWWWWWWWWWWWWWWWWK.',
      'KWWWHHSSSSSSSSHHWWWK',
      'KWWHSSSSSSSSSSSSHWWK',
      'KWHSSKKKKKKKKKKSSHWK',
      'KWHSSKWWBKKWWBKSSHWK',
      'KWHSSKWWBKKWWBKSSHWK',
      'KWHFFSSSSSSSSJJFFHWK',
      'KWHFFFFSSSSJJFFFFHWK',
      '.KHFFFFKKKKKKFFFFHK.',
      '.K.KFFFFJJJJFFFFK.K.',
      '...KKJJFFFFFFJJKK...',
      '....KKJJJJJJJJKK....',
      '....KYYYYYYYYYYK....',
      '....KKKKKKKKKKKK....',
      '....................'
    ];

    // WARRIOR: Broad Juggernaut Plate Cuirass (18x18)
    const wTorso = [
      '.KKKKKKKKKKKKKKKK.',
      'KYYYYYYYYYYYYYYYYK',
      'KYDMMLLLLLLLLMMDYK',
      'KDMLLLLWWWWLLLLMDK',
      'KDMLLYYYYYYYYLLMDK',
      'KDMLLYBBBBBBYLLMDK',
      'KDMLLYBEEEEBYLLMDK',
      'KDMMLLBBBBBBLLMMDK',
      '.KDDMMLLBBLLMMDDK.',
      '.KKYYYYYYYYYYYYKK.',
      '..KDMLLLLLLLLMDK..',
      '..KDDMMMMMMMMDDK..',
      '..KYYYYYYYYYYYYK..',
      '.KDDMMLLLLLLMMDDK.',
      '.KDDMMKKKKKKMMDDK.',
      '..KKKK......KKKK..',
      '..................',
      '..................'
    ];

    // WARRIOR: Runed Tower Shield (12x20)
    const wShield = [
      '..KKKKKKKK..',
      '.KYYYYYYYYK.',
      'KYDMMMMMMDYK',
      'KDMLLLLLLMDK',
      'KDMLYYYYLMDK',
      'KDMLYBBYLMDK',
      'KDMLYEEYLMDK',
      'KDMLYBBYLMDK',
      'KDMLYBBYLMDK',
      'KDMLYEEYLMDK',
      'KDMLYBBYLMDK',
      'KDMLYYYYLMDK',
      'KDMLLLLLLMDK',
      'KDDMMMMMMDDK',
      '.KYDMMMMDYK.',
      '.KYYDDDDYYK.',
      '..KYYYYYYK..',
      '...KKKKKK...',
      '............',
      '............'
    ];

    const wArm = [
      '..KK....KK..',
      '.KYYKKKKYYK.',
      'KYDMLLLLMDYK',
      'KDMLLLLLLMDK',
      'KDDMMMMMMDDK',
      '.KKKKKKKKKK.',
      '...KDMMDK...',
      '...KYYYYK...',
      '...KSSSSK...',
      '...KKKKKK...'
    ];

    const wLeg = [
      '.KKKKKK.',
      'KDMMMMDK',
      'KYYYYYYK',
      'KDMLLMDK',
      'KDMLLMDK',
      'KDDMMDDK',
      'KYYYYYYK',
      'KDLLLLWK',
      'KKKKKKKK'
    ];

    const wSword = [
      '......KK......',
      '.....KWWK.....',
      '....KWEEWK....',
      '....KWBBWK....',
      '...KWEEEEWK...',
      '...KWBBBBWK...',
      '...KWBCCBWK...',
      '...KWEEEEWK...',
      '...KWBBBBWK...',
      '...KWBCCBWK...',
      '...KWEEEEWK...',
      '...KWBBBBWK...',
      '...KWBCCBWK...',
      '...KWEEEEWK...',
      '...KWBBBBWK...',
      '...KWBCCBWK...',
      '...KWEEEEWK...',
      '...KWBBBBWK...',
      '...KLLLLLLK...',
      '..KKKKKKKKKK..',
      'KKYYYYYYYYYYKK',
      'KGGGGGGGGGGGGK',
      '.KKKKKKKKKKKK.',
      '.....KYYK.....',
      '.....KMMK.....',
      '.....KYYK.....',
      '.....KMMK.....',
      '....KYYYYK....',
      '....KGGGGK....',
      '.....KKKK.....'
    ];

    // FIRE MAGE REAL SPRITE FACE: Arch-Sorcerer Face with Wizard Hat, Flame Hair, Amber Eyes & Goatee (20x22)
    const mFace = [
      '........KKKK........',
      '......KKRRRRKK......',
      '.....KRRLLLLRRK.....',
      '....KRRLLYYYYRRK....',
      '...KPRRYYWWWWYRRK...',
      '..KPRRYYYYYYYYRRPK..',
      'KKKKYYYYYYYYYYYYKKKK',
      'KRRRRRRRRRRRRRRRRRRK',
      '.KKKKKKKKKKKKKKKKKK.',
      '.KLLLLSSSSSSSSLLLLK.',
      'KLLLSSSSSSSSSSSSLLLK',
      'KLLSSKKKKKKKKKKSSLLK',
      'KLLSSKWWYKKWWYKSSLLK',
      'KLLSSKWWYKKWWYKSSLLK',
      'KLLFFSSSSSSSSJJFFLLK',
      '.KLFFFFSSSSJJFFFFLK.',
      '..KFFFFKKKKKKFFFFK..',
      '..KKFFJJWWWWJJFFKK..',
      '...KKJJJRRRRJJJKK...',
      '....KKJJRRRRJJKK....',
      '.....KKYYYYYYKK.....',
      '.......KKKKKK.......'
    ];

    const mTorso = [
      '..KKKKKKKKKKKKKK..',
      '.KYYYYYYYYYYYYYYK.',
      'KYPRRLLLLLLLLRRPYK',
      'KPRRLLYYYYYYLLRRPK',
      'KPRRLYOOOOOOYLRRPK',
      'KPRRLYOWWWWOYLRRPK',
      'KPRRLLYYYYYYLLRRPK',
      '.KPRRLLLLLLLLRRPK.',
      '.KKYYYYYYYYYYYYKK.',
      '..KPRRLLLLLLRRPK..',
      '..KPRRLYYYYLRRPK..',
      '.KPRRLLYOOYLLRRPK.',
      '.KPRRLLYOOYLLRRPK.',
      'KPRRLLLYOOYLLLRRPK',
      'KPRRLLLYOOYLLLRRPK',
      'KPRRLLYYYYYYLLRRPK',
      'KPRRLLLLLLLLLLRRPK',
      'KYYYYYYYYYYYYYYYYK',
      'KOO..KOOOOOOK..OOK',
      'KWK..KOWWWWOK..KWK',
      '.K....KO..OK....K.',
      '......K....K......'
    ];

    const mBook = [
      '.KKKK..KKKK.',
      'KBBBBKKBBBBK',
      'KBYBBOOKBYBK',
      'KBBBBKKBBBBK',
      'KBYBBOOKBYBK',
      'KBBBBKKBBBBK',
      'KRRRRKKRRRRK',
      '.KKKKKKKKKK.'
    ];

    const mStaff = [
      '.KK......KK.',
      'KWWK....KWWK',
      'KYYK.KK.KYYK',
      'KOOKWWWWKOOK',
      '.KKWOOOOOWKK',
      '..KWOWWWOWK.',
      '..KWOYYYYWK.',
      '...KYYYYYK..',
      '..KYYYYYYYK.',
      '..KKKJJJKKK.',
      '....KYYK....',
      '....KJJk....'.replace('k', 'K'),
      '....KFFK....',
      '....KJJK....',
      '....KYYK....',
      '....KJJK....',
      '....KJJK....',
      '....KJJK....',
      '....KJJK....',
      '....KYYK....',
      '....KKKK....'
    ];

    this.assets = {
      warrior: {
        helmet: this.bakeGrid(wFace, steelPal, 2.6),
        torso: this.bakeGrid(wTorso, steelPal, 3),
        shield: this.bakeGrid(wShield, steelPal, 3),
        arm: this.bakeGrid(wArm, steelPal, 3),
        leg: this.bakeGrid(wLeg, steelPal, 3),
        sword: this.bakeGrid(wSword, steelPal, 3)
      },
      mage: {
        head: this.bakeGrid(mFace, arcanePal, 2.6),
        torso: this.bakeGrid(mTorso, arcanePal, 3),
        book: this.bakeGrid(mBook, arcanePal, 3),
        arm: this.bakeGrid(wArm, arcanePal, 3),
        staff: this.bakeGrid(mStaff, arcanePal, 3)
      }
    };

    this.paintHUDPortraits();
    return this.assets;
  }

  static paintHUDPortraits() {
    const paint = (id, faceSprite, bgTop, bgBot, accent) => {
      const el = document.getElementById(id);
      if (!el) return;
      const ctx = el.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const g = ctx.createLinearGradient(0, 0, 0, el.height);
      g.addColorStop(0, bgTop);
      g.addColorStop(1, bgBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, el.width, el.height);
      if (faceSprite) ctx.drawImage(faceSprite, 2, 2, el.width - 4, el.height - 4);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, el.width - 2, el.height - 2);
    };
    const a = this.assets;
    paint('warrior-portrait', a.warrior.helmet, '#0c192c', '#050811', '#38bdf8');
    paint('mage-portrait', a.mage.head, '#2a1208', '#090504', '#fb923c');
  }
}
