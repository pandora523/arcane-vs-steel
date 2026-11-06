// Procedural 16-bit Pixel-Art Sprite & Portrait Baker — Distinct Archetypes
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
      K: '#070a12', // Black outline
      D: '#1e293b', // Dark steel
      M: '#475569', // Mid armor
      L: '#94a3b8', // Bright steel
      W: '#f8fafc', // Specular edge
      C: '#0284c7', // Deep cyan
      B: '#38bdf8', // Glowing cyan
      E: '#e0f2fe', // White-cyan core
      G: '#b45309', // Bronze shadow
      Y: '#facc15'  // Gold trim
    };

    const arcanePal = {
      K: '#120604', // Dark outline
      D: '#3b0764', // Deep mystic shadow
      P: '#581c87', // Dark crimson-violet hat/robe shadow
      R: '#9a3412', // Rich ember robe
      L: '#ea580c', // Bright flame cloth
      O: '#fb923c', // Glowing orange
      Y: '#facc15', // Gold runes
      W: '#fef08a', // White-hot fire
      S: '#451a03', // Dark staff wood
      B: '#fde68a'  // Grimoire parchment
    };

    // WARRIOR: Winged/Horned Greathelm with Flowing Plume (18x16)
    const wHelmet = [
      '..KKKKBEEEBKKKK...',
      '.KBBBBEEEEEBBBBK..',
      'KBBCCCCCCCCCCCBBK.',
      'KKKK..KKKKKK..KKKK',
      'KYGK.KDLLLLDK.KGYK',
      '.KYKKDMLLLLMDKKYK.',
      '..KKKDMLLLLMDKKK..',
      '...KKDMLWWLMDKK...',
      '...KDMKKKKKKMDK...',
      '...KDMKEEEEKMDK...',
      '...KDMKKKKKKMDK...',
      '...KDDMMLLMMDDK...',
      '...KKDDMMMMDDKK...',
      '....KKYYYYYYKK....',
      '.....KKKKKKKK.....',
      '..................'
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

    // WARRIOR: Heavy Runed Tower Shield (12x20)
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

    // WARRIOR: Spiked Pauldron Arm & Armored Greave
    const wArm = [
      '..KK....KK..',
      '.KYYKKKKYYK.',
      'KYDMLLLLMDYK',
      'KDMLLLLLLMDK',
      'KDDMMMMMMDDK',
      '.KKKKKKKKKK.',
      '...KDMMDK...',
      '...KYYYYK...',
      '...KDLLDK...',
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

    // WARRIOR: Colossal Runed Greatsword (14x36)
    const wSword = [
      '......KK......',
      '.....KWWK.....',
      '....KWEEWK....',
      '....KWBbwK....'.replace('b', 'B'),
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

    // FIRE MAGE: Iconic Tall Pointed Wizard Hat + Blazing Eyes (18x20)
    const mHead = [
      '........KKKK......',
      '......KKRRRRKK....',
      '.....KRRLLLLRRK...',
      '....KRRLLOOLLRRK..',
      '...KRRLLLLLLLLRRK.',
      '...KPRRRRRRRRRRPK.',
      '..KPRRYYYYYYYYRRPK',
      '.KPRRYYWWWWWWYYRRK',
      'KKKKYYYYYYYYYYYYKK',
      'KRRRRRRRRRRRRRRRRK',
      '.KKKKKKKKKKKKKKKK.',
      '..KPKDDDDDDDDKPK..',
      '..KPKDWWDDWWDKPK..',
      '..KPKDOODDOODKPK..',
      '...KKDDDDDDDDKK...',
      '...KROOOOOOOORK...',
      '..KROOWWWWWWOORK..',
      '...KROOWWWWOORK...',
      '....KKOOOOOOKK....',
      '......KKKKKK......'
    ];

    // FIRE MAGE: Ornate Arch-Mage Robe & Tattered Levitating Skirt (18x26)
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

    // FIRE MAGE: Floating Open Spellbook / Grimoire (12x10)
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

    // FIRE MAGE: Twin-Horn Dragon Flame Staff (12x32)
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
      '..KKKSSSKKK.',
      '....KYYK....',
      '....KSSK....',
      '....KTTK....',
      '....KSSK....',
      '....KYYK....',
      '....KSSK....',
      '....KSSK....',
      '....KSSK....',
      '....KSSK....',
      '....KYYK....',
      '....KKKK....'
    ];

    this.assets = {
      warrior: {
        helmet: this.bakeGrid(wHelmet, steelPal, 3),
        torso: this.bakeGrid(wTorso, steelPal, 3),
        shield: this.bakeGrid(wShield, steelPal, 3),
        arm: this.bakeGrid(wArm, steelPal, 3),
        leg: this.bakeGrid(wLeg, steelPal, 3),
        sword: this.bakeGrid(wSword, steelPal, 3)
      },
      mage: {
        head: this.bakeGrid(mHead, arcanePal, 3),
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
      if (headSprite) ctx.drawImage(headSprite, 2, 2, el.width - 4, el.height - 4);
    };
    const a = this.assets;
    paint('warrior-portrait', a.warrior.helmet, '#0c192c', '#050811', '#38bdf8');
    paint('mage-portrait', a.mage.head, '#2a1208', '#090504', '#fb923c');
  }
}
