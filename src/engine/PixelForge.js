// Procedural 16-bit Pixel-Art Sprite & Portrait Baker (HD-2D Style)
export class PixelForge {
  static createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { c, ctx };
  }

  // Renders an ASCII pixel grid with a palette map onto an offscreen canvas
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
      K: '#090d16', // Dark outline
      D: '#1e293b', // Dark steel shadow
      M: '#475569', // Mid steel
      L: '#94a3b8', // Light steel highlight
      W: '#e2e8f0', // Specular white
      C: '#38bdf8', // Cyan rune glow
      B: '#bae6fd', // Bright cyan core
      G: '#ca8a04', // Dark gold trim
      Y: '#facc15', // Bright gold
      R: '#0284c7'  // Royal cape blue
    };

    const arcanePal = {
      K: '#120705', // Dark outline
      D: '#431407', // Deep ember shadow
      R: '#7c2d12', // Crimson robe mid
      L: '#c2410c', // Lit robe fold
      O: '#fb923c', // Arcane orange
      Y: '#facc15', // Gold trim / fire
      W: '#fef08a', // White-hot core
      S: '#292524', // Dark wood staff
      T: '#78350f'  // Lit wood staff
    };

    // Warrior Pixel Helmet (14x14)
    const wHelmet = [
      '....KKKKKK....',
      '..KKCCCCCCKK..',
      '.KCCBBBBBBCCK.',
      '.KKKKKKKKKKKK.',
      '.KDMMLLLLMMDK.',
      'KDMLLLLLLLLMDK',
      'KDMLKKKKKKLMDK',
      'KDMLKBBBBKLMDK',
      'KDMLKKKKKKLMDK',
      'KDDMLLMLLMMDDK',
      '.KDDMMKKMMDDK.',
      '.KKDGGGGGGDKK.',
      '..KKKKKKKKKK..',
      '..............'
    ];

    // Warrior Plated Cuirass (16x18)
    const wTorso = [
      '..KKKKKKKKKKKK..',
      '.KGGGGGGGGGGGGK.',
      'KGDMMLLLLLLMMDGK',
      'KDMLLLLWWLLLLMDK',
      'KDMLLGGGGGGLLMDK',
      'KDMLLGCCCCCLLMDK',
      'KDMMLLCCCCLLMMDK',
      'KDDMMLLCCLLMMDDK',
      '.KDDMMMMMMMMDDK.',
      '.KKGGGGGGGGGGKK.',
      '.KDMLLLLLLLLMDK.',
      '.KDDMMMMMMMMDDK.',
      '..KGGGGGGGGGGK..',
      '..KDDMMMMMMDDK..',
      '..KDDMMKKMMDDK..',
      '...KKKKKKKKKK...',
      '................',
      '................'
    ];

    // Warrior Pauldron & Arm (10x14)
    const wArm = [
      '..KKKKKK..',
      '.KGGGGGGK.',
      'KGMLLLLMGK',
      'KDMLLLLMDK',
      'KDDMMMMDDK',
      '.KKKKKKKK.',
      '..KDMMDK..',
      '..KDMMDK..',
      '..KGGGGK..',
      '..KDLLDK..',
      '..KKKKKK..',
      '..........',
      '..........',
      '..........'
    ];

    // Warrior Greave / Leg (8x12)
    const wLeg = [
      '.KKKKKK.',
      'KDMMMMDK',
      'KDMLLMDK',
      'KGGGGGGK',
      'KDMLLMDK',
      'KDMLLMDK',
      'KDDMMDDK',
      'KGGGGGGK',
      'KDDLLLLK',
      'KKKKKKKK',
      '........',
      '........'
    ];

    // Warrior Runed Greatsword (12x34)
    const wSword = [
      '.....KK.....',
      '....KWWK....',
      '....KBBK....',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KWCWCK...',
      '...KWBBWK...',
      '...KLLLLK...',
      '..KKKKKKKK..',
      'KKYYYYYYYYKK',
      'KGGGGGGGGGGK',
      '.KKKKKKKKKK.',
      '....KGGK....',
      '....KMMK....',
      '....KGGK....',
      '....KMMK....',
      '...KYYYYK...',
      '...KGGGGK...',
      '....KKKK....',
      '............',
      '............'
    ];

    // Fire Mage Hooded Head (14x14)
    const mHead = [
      '....KKKKKK....',
      '..KKRRRRRRKK..',
      '.KRRLLLLLLRRK.',
      '.KRLLYYYYLLRK.',
      'KRLKKKKKKKKLRK',
      'KRLKDDDDDDKLRK',
      'KRLKDWWDDWWKRK',
      'KRLKDDDDDDKLRK',
      'KDRLKKKKKKLRDK',
      '.KDRRLLLLRRDK.',
      '.KKDDRRRRDDKK.',
      '..KKYYYYYYKK..',
      '....KKKKKK....',
      '..............'
    ];

    // Fire Mage Robe Torso (16x18)
    const mTorso = [
      '..KKKKKKKKKKKK..',
      '.KYYYYYYYYYYYYK.',
      'KYDRRLLLLLLRRDYK',
      'KDRRLLYYYYLLRRDK',
      'KDRRLYOOOOYLRRDK',
      'KDRRLYOWWOYLRRDK',
      'KDRRLLYYYYLLRRDK',
      'KDDRRLLLLLLRRDDK',
      '.KDDRRRRRRRRDDK.',
      '.KKYYYYYYYYYYKK.',
      '.KDRRLLLLLLRRDK.',
      'KDRRLLYYYYLLRRDK',
      'KDRRLYOOOOYLRRDK',
      'KDRRLLLLLLLLRRDK',
      'KDDRRRRRRRRRRDDK',
      'KYYYYYYYYYYYYYYK',
      'KKKKKKKKKKKKKKKK',
      '................'
    ];

    // Fire Mage Arm (8x12)
    const mArm = [
      '.KKKKKK.',
      'KYYYYYYK',
      'KDRLLRDK',
      'KDRLLRDK',
      'KDDRRDDK',
      'KYYYYYYK',
      '.KDOODK.',
      '.KKKKKK.',
      '........',
      '........',
      '........',
      '........'
    ];

    // Fire Mage Staff (10x32)
    const mStaff = [
      '...KKKK...',
      '..KWWWWK..',
      '.KWYYYYWK.',
      '.KWYOOYWK.',
      '.KWYYYYWK.',
      '..KWWWWK..',
      '.KKYYYYKK.',
      'KYYKKKKYYK',
      'KYK....KYK',
      '.KK.KK.KK.',
      '...KYYK...',
      '...KTTK...',
      '...KSSK...',
      '...KTTK...',
      '...KSSK...',
      '...KTTK...',
      '...KSSK...',
      '...KTTK...',
      '...KSSK...',
      '...KTTK...',
      '...KSSK...',
      '...KTTK...',
      '...KSSK...',
      '...KYYK...',
      '...KKKK...',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........'
    ];

    this.assets = {
      warrior: {
        helmet: this.bakeGrid(wHelmet, steelPal, 3),
        torso: this.bakeGrid(wTorso, steelPal, 3),
        arm: this.bakeGrid(wArm, steelPal, 3),
        leg: this.bakeGrid(wLeg, steelPal, 3),
        sword: this.bakeGrid(wSword, steelPal, 3)
      },
      mage: {
        head: this.bakeGrid(mHead, arcanePal, 3),
        torso: this.bakeGrid(mTorso, arcanePal, 3),
        arm: this.bakeGrid(mArm, arcanePal, 3),
        leg: this.bakeGrid(wLeg, arcanePal, 3),
        staff: this.bakeGrid(mStaff, arcanePal, 3)
      }
    };

    this.paintHUDPortraits();
    return this.assets;
  }

  static paintHUDPortraits() {
    const paint = (id, headSprite, bgTop, bgBot, accent) => {
      const el = document.getElementById(id);
      if (!el) return;
      const ctx = el.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const g = ctx.createLinearGradient(0, 0, 0, el.height);
      g.addColorStop(0, bgTop);
      g.addColorStop(1, bgBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, el.width, el.height);

      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, el.width - 2, el.height - 2);

      if (headSprite) {
        ctx.drawImage(headSprite, 3, 5, el.width - 6, el.height - 6);
      }
    };
    const a = this.assets;
    paint('warrior-portrait', a.warrior.helmet, '#0c192c', '#050811', '#38bdf8');
    paint('mage-portrait', a.mage.head, '#2a1208', '#090504', '#fb923c');
  }
}
