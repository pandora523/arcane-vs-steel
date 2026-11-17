// 32-Frame HD-2D Pixel-Art Sprite Sheet Loader & Nearest-Neighbor Animator (128x128 Cells)
export class PixelForge {
  static DEATH_DURATION = 1.55;

  static get assets() {
    return globalThis.__avsPixelForgeAssets || null;
  }

  static set assets(v) {
    globalThis.__avsPixelForgeAssets = v;
  }

  static get hudPortraitCfg() {
    return globalThis.__avsPixelForgeHudPortraitCfg || null;
  }

  static set hudPortraitCfg(v) {
    globalThis.__avsPixelForgeHudPortraitCfg = v;
  }

  static STAGE_ASSET_KEY_MAP = {
    cathedral: 'arenaBg',
    sylvan: 'arenaSylvan',
    boneyard: 'arenaBoneyard',
    clocktower: 'arenaClocktower',
    inferno: 'arenaInferno',
    sanctuary: 'arenaSanctuary',
    shogunate: 'arenaShogunate',
    shogunate_inferno: 'arenaShogunateInferno',
    glacial: 'arenaGlacial',
    shogunate_glacial: 'arenaShogunateGlacial',
    cob_monitor: 'arenaCobMonitor'
  };

  static EX_HERO_KEYS = [
    'warrior_ex',
    'mage_ex',
    'priestess_ex',
    'chronomancer_ex',
    'valkyrie_ex',
    'ronin_ex',
    'archer_ex',
    'reaper_ex',
    'titan_ex',
    'icemage_ex',
    'android_ex',
    'nyx_ex'
  ];

  static LEGACY_HERO_KEYS = [
    'warrior',
    'mage',
    'priestess',
    'chronomancer',
    'valkyrie',
    'ronin',
    'archer',
    'reaper',
    'titan',
    'icemage',
    'android'
  ];

  static ALL_HERO_KEYS = [
    ...PixelForge.EX_HERO_KEYS,
    ...PixelForge.LEGACY_HERO_KEYS
  ];

  static get _recentHeroIds() {
    if (!Array.isArray(globalThis.__avsPixelForgeRecentHeroes)) {
      globalThis.__avsPixelForgeRecentHeroes = [];
    }
    return globalThis.__avsPixelForgeRecentHeroes;
  }

  static get _recentStageKeys() {
    if (!Array.isArray(globalThis.__avsPixelForgeRecentStages)) {
      globalThis.__avsPixelForgeRecentStages = [];
    }
    return globalThis.__avsPixelForgeRecentStages;
  }

  static _touchRecentHero(heroKey) {
    if (!heroKey || !this.ALL_HERO_KEYS?.includes(heroKey)) return;
    const list = this._recentHeroIds;
    const idx = list.indexOf(heroKey);
    if (idx !== -1) list.splice(idx, 1);
    list.push(heroKey);
    while (list.length > 4) list.shift();
  }

  static _touchRecentStage(assetKey) {
    if (!assetKey) return;
    const list = this._recentStageKeys;
    const idx = list.indexOf(assetKey);
    if (idx !== -1) list.splice(idx, 1);
    list.push(assetKey);
    while (list.length > 2) list.shift();
  }

  static getWarmHeroKeepList(activeHeroIds = []) {
    const active = (activeHeroIds || []).filter(Boolean);
    for (const hk of active) this._touchRecentHero(hk);
    return Array.from(new Set([...active, ...this._recentHeroIds]));
  }

  static getWarmStageKeepList(activeStageIds = []) {
    const active = (activeStageIds || []).filter(Boolean);
    for (const sid of active) {
      this._touchRecentStage(this.STAGE_ASSET_KEY_MAP[sid] || sid);
    }
    const reverseStageMap = {};
    for (const [k, v] of Object.entries(this.STAGE_ASSET_KEY_MAP)) {
      reverseStageMap[v] = k;
    }
    return Array.from(
      new Set([
        ...active,
        ...this._recentStageKeys.map((ak) => reverseStageMap[ak] || ak)
      ])
    );
  }

  static ensureImage(img) {
    if (!img) return null;
    if (img._deferredSrc) {
      const src = img._deferredSrc;
      const onLoad = img._deferredOnLoad;
      img._origSrc = img._origSrc || src;
      img._deferredSrc = null;
      img._deferredOnLoad = null;
      img._loadFailed = false;
      img._loadingStartedAt = Date.now();
      img._loadingInFlight = !(img.complete && img.naturalWidth > 0);
      const prevOnLoad = onLoad || img._origOnLoad || null;
      img.onload = () => {
        img._loadingInFlight = false;
        img._loadFailed = false;
        img._retryCount = 0;
        img._nextRetryAt = 0;
        if (prevOnLoad) prevOnLoad(img);
      };
      img.onerror = () => {
        img._loadingInFlight = false;
        img._loadFailed = true;
      };
      img.src = src;
      if (img.complete && img.naturalWidth > 0 && !img.__avsPending) {
        img._loadingInFlight = false;
      }
      return img;
    }
    if (
      img._origSrc &&
      !img.__avsPending &&
      (img._loadFailed ||
        img.__avsFailed ||
        (img.complete && img.naturalWidth === 0 && !img._loadingInFlight))
    ) {
      const retries = img._retryCount || 0;
      const now = Date.now();
      if (retries < 4 && now >= (img._nextRetryAt || 0)) {
        const nextRetry = retries + 1;
        img._retryCount = nextRetry;
        img._nextRetryAt = now + Math.min(2400, 200 * Math.pow(2, nextRetry - 1));
        img._loadFailed = false;
        img._loadingStartedAt = now;
        img._loadingInFlight = true;
        const prevOnLoad = img._origOnLoad || null;
        img.onload = () => {
          img._loadingInFlight = false;
          img._loadFailed = false;
          img._retryCount = 0;
          img._nextRetryAt = 0;
          if (prevOnLoad) prevOnLoad(img);
        };
        img.onerror = () => {
          img._loadingInFlight = false;
          img._loadFailed = true;
        };
        const sep = img._origSrc.includes('?') ? '&' : '?';
        img.src = `${img._origSrc}${sep}retry=${nextRetry}`;
      }
    }
    return img;
  }

  static isImageReady(img) {
    if (!img) return true;
    return Boolean(img.complete && img.naturalWidth > 0 && !img.__avsPending);
  }

  static areMatchAssetsReady({ heroIds = [], stageId = null, isAdventure = false, zoneIdx = 0 } = {}) {
    if (typeof window === 'undefined' || typeof HTMLImageElement === 'undefined') {
      return true;
    }
    const assets = this.initAssets();
    if (!assets) return true;

    for (const hk of heroIds || []) {
      if (!hk) continue;
      this.ensureHeroLoaded(hk);
      const entry = assets[hk];
      if (!entry) continue;
      if (entry.sheet && !this.isImageReady(entry.sheet)) return false;
      if (entry.vfx && !this.isImageReady(entry.vfx)) return false;
      if (hk === 'archfiend' && entry.colossus && !this.isImageReady(entry.colossus)) return false;
    }

    if (isAdventure) {
      this.ensureAdventureLoaded(zoneIdx);
      const coreAdv = [assets.advVistaPano, assets.advArchPano, assets.advFloorPano, assets.advPropsSheet];
      for (const img of coreAdv) {
        if (img && !this.isImageReady(img)) return false;
      }
      if (zoneIdx >= 2 && assets.advInfernoPano && !this.isImageReady(assets.advInfernoPano)) {
        return false;
      }
      const zoneMonsters =
        zoneIdx <= 0
          ? ['templar', 'astrologer']
          : zoneIdx === 1
            ? ['treant', 'dryad']
            : zoneIdx === 2
              ? ['ghoul', 'cultist']
              : ['brute', 'fiend', 'archfiend'];
      for (const mk of zoneMonsters) {
        const me = assets[mk];
        if (me?.sheet && !this.isImageReady(me.sheet)) return false;
        if (mk === 'archfiend' && me?.colossus && !this.isImageReady(me.colossus)) return false;
      }
    } else if (stageId) {
      this.ensureStageLoaded(stageId);
      const assetKey = this.STAGE_ASSET_KEY_MAP[stageId] || stageId;
      if (assets[assetKey] && !this.isImageReady(assets[assetKey])) return false;
    }

    return true;
  }

  static waitForMatchAssets(opts = {}, timeoutMs = 1400) {
    if (this.areMatchAssetsReady(opts)) return Promise.resolve(true);
    const start = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        if (this.areMatchAssetsReady(opts)) {
          resolve(true);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, 32);
      };
      setTimeout(check, 24);
    });
  }

  static ensureHeroLoaded(heroKey) {
    if (!heroKey) return;
    this._touchRecentHero(heroKey);
    const assets = this.initAssets();
    const entry = assets?.[heroKey];
    if (!entry) return;
    this.ensureImage(entry.sheet);
    this.ensureImage(entry.vfx);
    this.ensureImage(entry.wings);
    this.ensureImage(entry.meteor);
    this.ensureImage(entry.companions);
    this.ensureImage(entry.colossus);
    this.ensureImage(entry.portrait);
  }

  static ensureMonsterLoaded(kind) {
    if (!kind) return;
    this.ensureHeroLoaded(kind);
  }

  static ensureStageLoaded(stageId) {
    if (!stageId || (typeof Image === 'undefined' && !this.assets)) return;
    const assets = this.initAssets();
    const assetKey = this.STAGE_ASSET_KEY_MAP[stageId] || stageId;
    this._touchRecentStage(assetKey);
    if (assets?.[assetKey]) {
      this.ensureImage(assets[assetKey]);
    }
    if ((stageId === 'cob_monitor' || assetKey === 'arenaCobMonitor') && assets?.cobCreatorAnim) {
      this.ensureImage(assets.cobCreatorAnim);
    }
  }

  static ensureAdventureLoaded(zoneIdx = 0) {
    const assets = this.initAssets();
    if (!assets) return;
    this.ensureImage(assets.advVistaPano);
    this.ensureImage(assets.advArchPano);
    this.ensureImage(assets.advFloorPano);
    this.ensureImage(assets.advPropsSheet);
    this.ensureImage(assets.advFxSheet);
    this.ensureImage(assets.advStageVfx);
    if (zoneIdx >= 2) {
      this.ensureImage(assets.advInfernoPano);
      this.ensureHeroLoaded('archfiend');
    }
    if (zoneIdx <= 0) {
      this.ensureMonsterLoaded('templar');
      this.ensureMonsterLoaded('astrologer');
    } else if (zoneIdx === 1) {
      this.ensureMonsterLoaded('treant');
      this.ensureMonsterLoaded('dryad');
    } else if (zoneIdx === 2) {
      this.ensureMonsterLoaded('ghoul');
      this.ensureMonsterLoaded('cultist');
    } else {
      this.ensureImage(assets.advInfernoPano);
      this.ensureMonsterLoaded('brute');
      this.ensureMonsterLoaded('fiend');
      this.ensureMonsterLoaded('archfiend');
    }
  }

  static releaseImage(img) {
    if (
      !img ||
      !img._origSrc ||
      img._deferredSrc ||
      (img._loadingInFlight && !img.complete) ||
      typeof window === 'undefined' ||
      typeof HTMLImageElement === 'undefined' ||
      !(img instanceof HTMLImageElement)
    ) {
      return;
    }
    img.onload = null;
    img.onerror = null;
    img._loadingInFlight = false;
    img._loadFailed = false;
    img._retryCount = 0;
    img._nextRetryAt = 0;
    img._deferredSrc = img._origSrc;
    img._deferredOnLoad = img._origOnLoad || null;
    img.removeAttribute('src');
    if (typeof window.__avsEvictImageCache === 'function') {
      window.__avsEvictImageCache(img);
    }
  }

  static _releaseCharSetNormalMap(entry) {
    if (!entry || !entry.normalMapData) return;
    if (entry.normalMapData.litCanvas) {
      entry.normalMapData.litCanvas.width = 0;
      entry.normalMapData.litCanvas.height = 0;
    }
    entry.normalMapData = null;
  }

  static ensureAllPortraitsLoaded(rosterVersion = null) {
    const assets = this.initAssets();
    if (!assets) return;
    const heroKeys =
      rosterVersion === 'ex'
        ? this.EX_HERO_KEYS
        : rosterVersion === 'legacy'
          ? this.LEGACY_HERO_KEYS
          : this.ALL_HERO_KEYS;
    for (const k of heroKeys) {
      if (assets[k]?.portrait) this.ensureImage(assets[k].portrait);
    }
  }

  static releaseInactiveAssets(keepHeroIds = [], keepStageIds = [], keepAdventure = false) {
    if (!this.assets) return;
    const keepHeroes = new Set(keepHeroIds.filter(Boolean));
    const keepStageAssetKeys = new Set(
      keepStageIds.filter(Boolean).map((id) => this.STAGE_ASSET_KEY_MAP[id] || id)
    );

    // 1. Release unused VS stage backdrops
    for (const assetKey of Object.values(this.STAGE_ASSET_KEY_MAP)) {
      if (!keepStageAssetKeys.has(assetKey) && this.assets[assetKey]) {
        this.releaseImage(this.assets[assetKey]);
      }
    }
    if (!keepStageAssetKeys.has('arenaCobMonitor') && !keepHeroes.has('nyx_ex') && this.assets.cobCreatorAnim) {
      this.releaseImage(this.assets.cobCreatorAnim);
    }

    // 2. Release Adventure 9600px panoramas, prop sheets & monster sheets when outside Adventure
    if (!keepAdventure) {
      this.releaseImage(this.assets.advVistaPano);
      this.releaseImage(this.assets.advArchPano);
      this.releaseImage(this.assets.advFloorPano);
      this.releaseImage(this.assets.advInfernoPano);
      this.releaseImage(this.assets.advPropsSheet);
      this.releaseImage(this.assets.advFxSheet);
      this.releaseImage(this.assets.advStageVfx);
      const monsterKeys = [
        'templar',
        'astrologer',
        'treant',
        'dryad',
        'ghoul',
        'cultist',
        'brute',
        'fiend',
        'archfiend'
      ];
      for (const mk of monsterKeys) {
        if (!keepHeroes.has(mk) && this.assets[mk]) {
          this.releaseImage(this.assets[mk].sheet);
          this.releaseImage(this.assets[mk].colossus);
          this._releaseCharSetNormalMap(this.assets[mk]);
        }
      }
    }

    // 3. Release heavy 6240x2080 / 9600x2400 champion sprite & VFX sheets across all 22 heroes (keep tiny 128x128 portraits warm)
    const keepSharedWings =
      keepHeroes.has('warrior') ||
      keepHeroes.has('warrior_ex') ||
      keepHeroes.has('priestess') ||
      keepHeroes.has('priestess_ex');
    const keepSharedMeteor = keepHeroes.has('mage') || keepHeroes.has('mage_ex');
    const keepSharedCompanions = keepHeroes.has('reaper') || keepHeroes.has('reaper_ex');
    for (const hk of this.ALL_HERO_KEYS) {
      if (keepHeroes.has(hk)) continue;
      const entry = this.assets[hk];
      if (!entry) continue;
      this.releaseImage(entry.sheet);
      this.releaseImage(entry.vfx);
      if (!keepSharedMeteor && entry.meteor) {
        this.releaseImage(entry.meteor);
      }
      if (!keepSharedCompanions && entry.companions) {
        this.releaseImage(entry.companions);
      }
      this._releaseCharSetNormalMap(entry);
      if (!keepSharedWings && entry.wings) {
        this.releaseImage(entry.wings);
      }
    }
  }

  static initAssets() {
    if (this.assets) return this.assets;

    const canDeferBrowserImg =
      typeof window !== 'undefined' && typeof HTMLImageElement !== 'undefined';

    const loadEagerImg = (src, onLoad) => {
      const img = new Image();
      img.decoding = 'async';
      img._origSrc = src;
      img._origOnLoad = onLoad || null;
      if (onLoad) img.onload = () => onLoad(img);
      img.src = src;
      return img;
    };

    const loadDeferredImg = (src, onLoad) => {
      const img = new Image();
      img.decoding = 'async';
      img._origSrc = src;
      img._origOnLoad = onLoad || null;
      if (canDeferBrowserImg && img instanceof HTMLImageElement) {
        img._deferredSrc = src;
        img._deferredOnLoad = onLoad || null;
      } else {
        if (onLoad) img.onload = () => onLoad(img);
        img.src = src;
      }
      return img;
    };

    const sharedSeraphimWings = loadDeferredImg('assets/sprites/seraphim_wings.png?v=30fps128');
    const sharedMageMeteor = loadDeferredImg('assets/sprites/meteor_cataclysm.png?v=30fps128');
    const sharedMageIcons = loadEagerImg('assets/sprites/mage_icons.png?v=30fps128');
    const sharedReaperCompanions = loadDeferredImg('assets/sprites/reaper_companions.png?v=30fps113');
    const sharedBossPortrait = loadDeferredImg(
      'assets/sprites/boss_archfiend_portrait.png?v=30fps128',
      () => this.refreshPortraits()
    );

    const makeExHeroEntry = (id, extra = {}) => ({
      sheet: loadDeferredImg(`assets/sprites/${id}_sheet.png?v=30fps128`),
      vfx: loadDeferredImg(`assets/sprites/${id}_vfx.png?v=30fps128`),
      portrait: loadDeferredImg(`assets/sprites/${id}_portrait.png?v=30fps128`, () =>
        this.refreshPortraits()
      ),
      cellW: 320,
      cellH: 240,
      anchorX: 112,
      anchorY: 230,
      ...extra
    });

    this.assets = {
      arenaBg: loadDeferredImg('assets/sprites/arena_bg.png?v=30fps128'),
      arenaSylvan: loadDeferredImg('assets/sprites/arena_sylvan.png?v=30fps128'),
      arenaBoneyard: loadDeferredImg('assets/sprites/arena_boneyard.png?v=30fps128'),
      arenaClocktower: loadDeferredImg('assets/sprites/arena_clocktower.png?v=30fps128'),
      arenaInferno: loadDeferredImg('assets/sprites/arena_inferno.png?v=30fps128'),
      arenaSanctuary: loadDeferredImg('assets/sprites/arena_sanctuary.png?v=30fps128'),
      arenaShogunate: loadDeferredImg('assets/sprites/arena_shogunate.png?v=30fps128'),
      arenaShogunateInferno: loadDeferredImg('assets/sprites/arena_shogunate_inferno.png?v=30fps128'),
      arenaGlacial: loadDeferredImg('assets/sprites/arena_glacial.png?v=30fps128'),
      arenaShogunateGlacial: loadDeferredImg('assets/sprites/arena_shogunate_glacial.png?v=30fps128'),
      arenaCobMonitor: loadDeferredImg('assets/sprites/arena_cob_monitor.png?v=30fps128'),
      cobCreatorAnim: loadDeferredImg('assets/sprites/cob_creator_anim.png?v=30fps128'),
      advVistaPano: loadDeferredImg('assets/sprites/adv_vista_pano.png?v=30fps128'),
      advArchPano: loadDeferredImg('assets/sprites/adv_arch_pano.png?v=30fps128'),
      advFloorPano: loadDeferredImg('assets/sprites/adv_floor_pano.png?v=30fps128'),
      advInfernoPano: loadDeferredImg('assets/sprites/adv_inferno_pano.png?v=30fps128'),
      advPropsSheet: loadDeferredImg('assets/sprites/adv_props_sheet.png?v=30fps128'),
      advFxSheet: loadDeferredImg('assets/sprites/adv_fx_sheet.png?v=30fps128'),
      advStageVfx: loadDeferredImg('assets/sprites/adv_stage_vfx.png?v=30fps128'),
      heroIconsSheet: loadEagerImg('assets/sprites/hero_icons_sheet.png?v=30fps128'),
      warrior: {
        sheet: loadDeferredImg('assets/sprites/warrior_sheet.png?v=30fps112'),
        wings: sharedSeraphimWings,
        vfx: loadDeferredImg('assets/sprites/warrior_vfx.png?v=30fps112'),
        portrait: loadDeferredImg('assets/sprites/warrior_portrait.png?v=30fps112', () => this.refreshPortraits())
      },
      warrior_ex: makeExHeroEntry('warrior_ex', { wings: sharedSeraphimWings }),
      mage_ex: makeExHeroEntry('mage_ex', { meteor: sharedMageMeteor, icons: sharedMageIcons }),
      priestess_ex: makeExHeroEntry('priestess_ex', { wings: sharedSeraphimWings }),
      chronomancer_ex: makeExHeroEntry('chronomancer_ex'),
      valkyrie_ex: makeExHeroEntry('valkyrie_ex'),
      ronin_ex: makeExHeroEntry('ronin_ex'),
      archer_ex: makeExHeroEntry('archer_ex'),
      reaper_ex: makeExHeroEntry('reaper_ex', { companions: sharedReaperCompanions }),
      titan_ex: makeExHeroEntry('titan_ex'),
      icemage_ex: makeExHeroEntry('icemage_ex'),
      android_ex: makeExHeroEntry('android_ex'),
      nyx_ex: makeExHeroEntry('nyx_ex'),
      mage: {
        sheet: loadDeferredImg('assets/sprites/mage_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/mage_vfx.png?v=30fps113'),
        meteor: sharedMageMeteor,
        icons: sharedMageIcons,
        portrait: loadDeferredImg('assets/sprites/mage_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      archer: {
        sheet: loadDeferredImg('assets/sprites/archer_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/archer_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/archer_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      priestess: {
        sheet: loadDeferredImg('assets/sprites/priestess_sheet.png?v=30fps113'),
        wings: sharedSeraphimWings,
        vfx: loadDeferredImg('assets/sprites/priestess_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/priestess_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      reaper: {
        sheet: loadDeferredImg('assets/sprites/reaper_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/reaper_vfx.png?v=30fps113'),
        companions: sharedReaperCompanions,
        portrait: loadDeferredImg('assets/sprites/reaper_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      chronomancer: {
        sheet: loadDeferredImg('assets/sprites/chronomancer_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/chronomancer_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/chronomancer_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      titan: {
        sheet: loadDeferredImg('assets/sprites/titan_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/titan_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/titan_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      ronin: {
        sheet: loadDeferredImg('assets/sprites/ronin_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/ronin_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/ronin_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      valkyrie: {
        sheet: loadDeferredImg('assets/sprites/valkyrie_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/valkyrie_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/valkyrie_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      icemage: {
        sheet: loadDeferredImg('assets/sprites/icemage_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/icemage_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/icemage_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      android: {
        sheet: loadDeferredImg('assets/sprites/android_sheet.png?v=30fps113'),
        vfx: loadDeferredImg('assets/sprites/android_vfx.png?v=30fps113'),
        portrait: loadDeferredImg('assets/sprites/android_portrait.png?v=30fps113', () => this.refreshPortraits())
      },
      templar: {
        sheet: loadDeferredImg('assets/sprites/monster_templar_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      astrologer: {
        sheet: loadDeferredImg('assets/sprites/monster_astrologer_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      treant: {
        sheet: loadDeferredImg('assets/sprites/monster_treant_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      dryad: {
        sheet: loadDeferredImg('assets/sprites/monster_dryad_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      ghoul: {
        sheet: loadDeferredImg('assets/sprites/monster_ghoul_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      cultist: {
        sheet: loadDeferredImg('assets/sprites/monster_cultist_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      brute: {
        sheet: loadDeferredImg('assets/sprites/monster_brute_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      fiend: {
        sheet: loadDeferredImg('assets/sprites/monster_fiend_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      },
      archfiend: {
        sheet: loadDeferredImg('assets/sprites/boss_archfiend_sheet.png?v=30fps128'),
        colossus: loadDeferredImg('assets/sprites/boss_colossus_sheet.png?v=30fps128'),
        portrait: sharedBossPortrait
      }
    };

    return this.assets;
  }

  static setHUDPortraits(leftKey, leftColor, rightKey, rightColor) {
    const prev = this.hudPortraitCfg;
    if (
      prev &&
      prev.leftKey === leftKey &&
      prev.leftColor === leftColor &&
      prev.rightKey === rightKey &&
      prev.rightColor === rightColor
    ) {
      // Skip redundant 60fps portrait redraws once both portraits are already blitted!
      const leftImg = this.assets?.[leftKey]?.portrait;
      const rightImg = this.assets?.[rightKey]?.portrait;
      if (
        typeof document !== 'undefined' &&
        typeof document.getElementById === 'function' &&
        document.getElementById('left-portrait')?._lastPortraitImg === leftImg &&
        document.getElementById('right-portrait')?._lastPortraitImg === rightImg
      ) {
        return;
      }
    }
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

  static drawPortrait(canvasId, img, _borderColor) {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const el = document.getElementById(canvasId);
    this.ensureImage(img);
    if (!el || !img || !img.complete || !img.naturalWidth) return;
    const resized = el.width !== 128 || el.height !== 128;
    if (resized) {
      el.width = 128;
      el.height = 128;
      el._lastPortraitImg = null;
    }
    if (!resized && el._lastPortraitImg === img) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 128, 128);
    ctx.drawImage(img, 0, 0, 128, 128);
    el._lastPortraitImg = img;
  }

  /**
   * Maps fighter state & timers to 270-frame (30 cols x 9 rows, 208x208 cells) 30fps HD-2D sprite sheets
   * across all 9 champions (Warrior, FireMage, Archer, Priestess, Reaper, Chronomancer, Titan, Ronin, Valkyrie):
   *   Row 0 (0..29):    30-frame IDLE breathing, cloak/robe/hair wave & weapon glint
   *   Row 1 (30..59):   30-frame WALK anatomical 2-step stride cycle
   *   Row 2 (60..89):   30-frame AUTO_ATTACK progressive windup, strike/cast & follow-through
   *   Row 3 (90..119):  30-frame SKILL 2-phase special skill animation
   *   Row 4 (120..149): 30-frame ULTIMATE multi-stage overdrive animation
   *   Row 5 (150..179): 30-frame DEATH stagger (F00..F05 HURT), kneeling collapse & flat horizontal rest
   *   Row 6 (180..209): 30-frame DASH forward assault charge / Arcane Blink / Chrono Portal Warp
   *   Row 7 (210..239): 30-frame CROUCH tactical low stance & counter-shot/slash
   *   Row 8 (240..269): 30-frame JUMP full-body aerial vault & apex downward strike/shot
   *   Row 9 (270..299): 30-frame VICTORY triumph flourish (F00..F14) & sovereign loop (F15..F29)
   */
  static getFrameIndex(fighter, phase) {
    const st = fighter.state;
    const t = fighter.stateTimer;

    if (fighter.isDead || st === 'DEATH') {
      const deathDuration = PixelForge.DEATH_DURATION || 1.55;
      const dt = fighter.deathTimer || 0;
      const step = Math.min(29, Math.max(0, Math.floor((dt / deathDuration) * 30)));
      return 150 + step;
    }

    if (fighter.chronoTimeStopTimer > 0 && Number.isFinite(fighter.chronoTimeStopFrame)) {
      return fighter.chronoTimeStopFrame;
    }

    if (st === 'VICTORY') {
      const rawStep = Math.max(0, Math.floor((t || 0) * 30));
      const step = rawStep < 15 ? rawStep : 15 + ((rawStep - 15) % 15);
      return 270 + step;
    }

    if (
      st === 'HURT' ||
      (fighter.hurtTimer > 0.05 &&
        st !== 'ULTIMATE' &&
        st !== 'TRUE_ULTIMATE' &&
        !(st === 'AUTO_ATTACK' && (fighter.unstoppablePoise || fighter.forgeArmorTimer > 0)) &&
        st !== 'SKILL' &&
        st !== 'DODGE' &&
        st !== 'JUMP' &&
        st !== 'CROUCH' &&
        st !== 'DASH')
    ) {
      const hurtProgress = 1.0 - Math.min(1.0, Math.max(0.0, (fighter.hurtTimer || 0) / 0.28));
      return 150 + Math.min(5, Math.max(0, Math.floor(hurtProgress * 6)));
    }

    if (fighter.isBlinkTeleport || fighter.isChronoWarp) {
      const dur = fighter.dashDuration || 0.42;
      const step = Math.min(29, Math.max(0, Math.floor((t / dur) * 30)));
      return 180 + step;
    }

    if (st === 'CROUCH' || fighter.isCrouching) {
      const dur = fighter.crouchDuration || 0.96;
      const step = Math.min(29, Math.max(0, Math.floor((t / dur) * 30)));
      return 210 + step;
    }

    if (fighter._advPureDodge && Number.isFinite(fighter._advDodgeFrameOverride)) {
      return fighter._advDodgeFrameOverride;
    }

    if (
      st === 'JUMP' ||
      st === 'DODGE' ||
      (fighter.isFlipVault && st !== 'ULTIMATE' && st !== 'SKILL' && st !== 'TRUE_ULTIMATE')
    ) {
      const dur = fighter.dashDuration || 0.56;
      const step = Math.min(29, Math.max(0, Math.floor((t / dur) * 30)));
      return 240 + step;
    }

    if (st === 'DASH') {
      const dur = fighter.dashDuration || 0.44;
      const step = Math.min(29, Math.max(0, Math.floor((t / dur) * 30)));
      return 180 + step;
    }

    if (
      st === 'AUTO_ATTACK' ||
      st === 'SKILL' ||
      st === 'ULTIMATE' ||
      st === 'TRUE_ULTIMATE'
    ) {
      const frameOverride = fighter.trueUltFrameOverride ?? fighter._overrideFrameIdx;
      if (frameOverride !== undefined && frameOverride !== null) {
        return frameOverride;
      }
    }

    if (st === 'AUTO_ATTACK') {
      const duration = fighter.autoDuration || 0.96;
      const step = Math.min(29, Math.max(0, Math.floor((t / duration) * 30)));
      return 60 + step;
    }

    if (st === 'SKILL') {
      const skillDur = fighter.skillDuration || 1.05;
      const step = Math.min(29, Math.max(0, Math.floor((t / skillDur) * 30)));
      return 90 + step;
    }

    if (st === 'TRUE_ULTIMATE') {
      const ultDur = fighter.trueUltDuration || 4.35;
      const step = Math.min(29, Math.max(0, Math.floor((t / ultDur) * 30)));
      return 120 + step;
    }

    if (st === 'ULTIMATE') {
      const ultDur = fighter.ultDuration || 1.60;
      const step = Math.min(29, Math.max(0, Math.floor((t / ultDur) * 30)));
      return 120 + step;
    }

    if (st === 'WALK') {
      const rawStep = Math.floor(Math.abs(fighter.walkPhase) * 7.5) % 30;
      const walkStep = (fighter.moveDir || 1) < 0 ? (30 - rawStep) % 30 : rawStep;
      return 30 + walkStep;
    }

    const idleStep = Math.floor(Math.abs(phase) * 8.0) % 30;
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

    const cell = 208;
    const cols = Math.max(1, Math.round(sheet.naturalWidth / cell));
    const rows = Math.max(1, Math.round(sheet.naturalHeight / cell));
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
    tmpCanvas.width = 0;
    tmpCanvas.height = 0;
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

  static resolveSheetMetrics(charSet, sheet, w, h) {
    const natW = sheet.naturalWidth || 208;
    const natH = sheet.naturalHeight || 208;
    const hasCustomMeta = Boolean(charSet && (charSet.cellW || charSet.cellH));

    // Legacy 208x208 path: guarantees 0.00px behavioral change across all 11 existing champions & monsters
    if (!hasCustomMeta && natW !== 9600) {
      const cellW = 208;
      const cellH = 208;
      return {
        cellW,
        cellH,
        cols: Math.max(1, Math.round(natW / cellW)),
        rows: Math.max(1, Math.round(natH / cellH)),
        drawW: w,
        drawH: h,
        baseX: -w * 0.5,
        baseY: -h + 10
      };
    }

    // Automatic fallback/adaptation if a 30x10 sheet has standard 6240x2080 or custom wide dimensions
    let cellW = charSet?.cellW || 320;
    let cellH = charSet?.cellH || 240;
    let anchorX = charSet?.anchorX ?? 112;
    let anchorY = charSet?.anchorY ?? 230;
    if (natW === 6240 && natH === 2080) {
      cellW = 208;
      cellH = 208;
      anchorX = 104;
      anchorY = 198;
    } else if (natW > 0 && natH > 0 && (natW % cellW !== 0 || natH % cellH !== 0) && natW % 30 === 0 && natH % 10 === 0) {
      const nextCellW = natW / 30;
      const nextCellH = natH / 10;
      anchorX = Math.round(anchorX * (nextCellW / cellW));
      anchorY = Math.round(anchorY * (nextCellH / cellH));
      cellW = nextCellW;
      cellH = nextCellH;
    }

    const scaleY = h / 208;
    return {
      cellW,
      cellH,
      cols: Math.max(1, Math.round(natW / cellW)),
      rows: Math.max(1, Math.round(natH / cellH)),
      drawW: Math.round(cellW * scaleY),
      drawH: Math.round(cellH * scaleY),
      baseX: -anchorX * scaleY,
      baseY: -anchorY * scaleY
    };
  }

  static _drawLoadingSilhouette(ctx, fighter, w, h) {
    const px = 3;
    const totalH = Math.max(48, Math.round((h || 104) * 0.68 / px) * px);
    const bodyW = Math.max(24, Math.round((w || 72) * 0.34 / px) * px);
    const tick = ((Date.now() / 120) | 0) % 6;
    const accent = fighter?.isEx ? '#38bdf8' : fighter?.team === 2 ? '#f43f5e' : '#fbbf24';

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Pixel summoning base glyph
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = accent;
    ctx.fillRect(-bodyW - px * 2, -px, (bodyW + px * 2) * 2, px);
    // Crisp stepped arcane figure silhouette
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#0f172a';
    const headSize = px * 4;
    ctx.fillRect(-Math.round(headSize / 2), -totalH, headSize, headSize);
    ctx.fillRect(-Math.round(bodyW / 2), -totalH + headSize + px, bodyW, Math.round(totalH * 0.45));
    ctx.fillRect(-Math.round(bodyW * 0.42), -Math.round(totalH * 0.35), Math.round(bodyW * 0.32), Math.round(totalH * 0.32));
    ctx.fillRect(Math.round(bodyW * 0.1), -Math.round(totalH * 0.35), Math.round(bodyW * 0.32), Math.round(totalH * 0.32));
    // Rising pixel rune shimmer columns
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = accent;
    for (let i = 0; i < 3; i++) {
      const colX = (i - 1) * Math.round(bodyW * 0.65);
      const lift = ((tick + i * 2) % 6) * px * 2;
      ctx.fillRect(colX - px, -px * 3 - lift, px * 2, px * 2);
    }
    ctx.restore();
  }

  static drawSheetFrame(ctx, charSet, fighter, w, h, phase, isReflection = false, renderer = null) {
    if (fighter?.heroId) this.ensureHeroLoaded(fighter.heroId);
    const sheet = this.ensureImage(charSet?.sheet);
    if (!sheet || !sheet.complete || !sheet.naturalWidth) {
      if (
        !isReflection &&
        ctx &&
        typeof ctx.fillRect === 'function' &&
        typeof HTMLImageElement !== 'undefined' &&
        sheet instanceof HTMLImageElement
      ) {
        this._drawLoadingSilhouette(ctx, fighter, w, h);
      }
      return;
    }
    const { cellW, cellH, cols, rows, drawW, drawH, baseX, baseY } = this.resolveSheetMetrics(
      charSet,
      sheet,
      w,
      h
    );

    ctx.imageSmoothingEnabled = false;

    const frameIdx = this.getFrameIndex(fighter, phase);
    const col = frameIdx % cols;
    const row = Math.min(rows - 1, Math.max(0, (frameIdx / cols) | 0));
    const sx = col * cellW;
    const sy = row * cellH;

    // Crisp pixel-art afterimage trail during active horizontal DASH, DODGE, or Warrior Omnislash Ultimate
    if (
      !isReflection &&
      !fighter.isAngelicAscent &&
      !fighter.isFlipVault &&
      fighter.heroId !== 'reaper' &&
      fighter.heroId !== 'reaper_ex' &&
      fighter.heroId !== 'chronomancer' &&
      fighter.heroId !== 'chronomancer_ex' &&
      (fighter.state === 'DASH' || fighter.state === 'DODGE' || fighter.isOmnislashing)
    ) {
      const dir = (fighter.dashDir || fighter.facing) * fighter.facing;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(
        sheet,
        sx,
        sy,
        cellW,
        cellH,
        Math.round(baseX - dir * 32),
        Math.round(baseY),
        drawW,
        drawH
      );
      ctx.globalAlpha = 0.42;
      ctx.drawImage(
        sheet,
        sx,
        sy,
        cellW,
        cellH,
        Math.round(baseX - dir * 16),
        Math.round(baseY),
        drawW,
        drawH
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
    // Opt-in crunchy anime hit-stop shake jitter (+-3px) when struck by heavy melee smashes
    if (!isReflection && !fighter.isDead && fighter._hitShakeTimer > 0) {
      recoilX += (Math.floor(fighter._hitShakeTimer * 90) & 1) === 0 ? 3 : -3;
    }

    // HD-2D Normal-Mapped 4-Step Pixel Lighting + Dual-Layer Character Inking Pass
    // (Disabled across all 6 overhauled 30fps champions so every model renders with pure, un-inked 30fps pixel art!)
    const nm = null;
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

    // Real-Time Ray-Cast Directional Specular Rim-Lighting on Characters (`2px` pixel silhouette catchlight)
    if (
      !isReflection &&
      !fighter.isDead &&
      typeof document !== 'undefined' &&
      renderer?.activePointLights?.length > 0
    ) {
      const lights = renderer.activePointLights;
      let bestLight = null;
      let bestScore = 0.35;
      for (let li = 0; li < lights.length; li++) {
        const L = lights[li];
        if (!L || (L.isSelfPassive && L.owner === fighter)) continue;
        const dx = L.x - fighter.x;
        const dy = L.y - (fighter.y - 76);
        if (Math.abs(dx) > 480 || Math.abs(dy) > 480) continue;
        const dist = Math.hypot(dx, dy);
        if (dist >= 480) continue;
        const maxSpan = Math.max(180, (L.radius || 180) * 1.35);
        if (dist >= maxSpan) continue;
        const score = (L.intensity || 1) * (1 - dist / maxSpan);
        if (score > bestScore) {
          bestScore = score;
          bestLight = L;
        }
      }
      if (bestLight) {
        const facingSign = fighter.facing || 1;
        const rimDx = Math.sign((bestLight.x - fighter.x) * facingSign || 1) * 2;
        const rimDy = bestLight.y < fighter.y - 70 ? -2 : 0;
        const lightHex = this._lightHexForType(bestLight.colorType);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.46, 0.16 + bestScore * 0.22);
        this.drawSilhouetteFrame(
          ctx,
          charSet,
          frameIdx,
          w,
          h,
          lightHex,
          recoilX + rimDx,
          recoilY + rimDy
        );
        ctx.restore();
      }
    }

    // Draw crisp 30fps handcrafted sprite frame directly on the integer pixel grid (ZERO horizontal shear/pulling!)
    ctx.drawImage(
      sheet,
      sx,
      sy,
      cellW,
      cellH,
      Math.round(baseX + recoilX),
      Math.round(baseY + recoilY),
      drawW,
      drawH
    );
  }

  static _lightHexForType(colorType) {
    switch (colorType) {
      case 'emerald':
        return '#34d399';
      case 'violet':
        return '#d946ef';
      case 'indigo':
        return '#818cf8';
      case 'crimson':
        return '#f43f5e';
      case 'teal':
        return '#2dd4bf';
      case 'gold':
        return '#fde047';
      case 'orange':
        return '#fb923c';
      case 'cyan':
      default:
        return '#38bdf8';
    }
  }

  static drawGhostFrame(_ctx, _charSet, _frameIdx, _w, _h) {
    // Disabled additive double-exposure so character faces and inked silhouettes stay 100% crisp during hits
    // (resolveSheetMetrics handles 320x240 *_ex and 208x208 Legacy cells across all active frame helpers)
  }

  static drawAfterimageFrame(ctx, charSet, frameIdx, w, h, offsetX = 0, offsetY = 0) {
    const sheet = this.ensureImage(charSet?.sheet);
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const { cellW, cellH, cols, rows, drawW, drawH, baseX, baseY } = this.resolveSheetMetrics(
      charSet,
      sheet,
      w,
      h
    );
    const safeIdx = Math.max(0, frameIdx | 0);
    const col = safeIdx % cols;
    const row = Math.min(rows - 1, Math.max(0, (safeIdx / cols) | 0));
    const sx = col * cellW;
    const sy = row * cellH;
    ctx.drawImage(
      sheet,
      sx,
      sy,
      cellW,
      cellH,
      Math.round(baseX + offsetX),
      Math.round(baseY + offsetY),
      drawW,
      drawH
    );
  }

  static drawSilhouetteFrame(
    ctx,
    charSet,
    frameIdx,
    w,
    h,
    color = '#03040a',
    offsetX = 0,
    offsetY = 0
  ) {
    const sheet = this.ensureImage(charSet?.sheet);
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const { cellW, cellH, cols, rows, drawW, drawH, baseX, baseY } = this.resolveSheetMetrics(
      charSet,
      sheet,
      w,
      h
    );
    const safeIdx = Math.max(0, frameIdx | 0);
    const col = safeIdx % cols;
    const row = Math.min(rows - 1, Math.max(0, (safeIdx / cols) | 0));
    const sx = col * cellW;
    const sy = row * cellH;

    if (typeof document !== 'undefined') {
      if (!this._silCanvas) {
        this._silCanvas = document.createElement('canvas');
        this._silCanvas.width = cellW;
        this._silCanvas.height = cellH;
        this._silCtx = this._silCanvas.getContext('2d');
      } else if (this._silCanvas.width < cellW || this._silCanvas.height < cellH) {
        this._silCanvas.width = Math.max(this._silCanvas.width, cellW);
        this._silCanvas.height = Math.max(this._silCanvas.height, cellH);
      }
      const sCtx = this._silCtx;
      if (sCtx) {
        sCtx.imageSmoothingEnabled = false;
        sCtx.globalCompositeOperation = 'source-over';
        sCtx.clearRect(0, 0, this._silCanvas.width, this._silCanvas.height);
        sCtx.drawImage(sheet, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
        sCtx.globalCompositeOperation = 'source-in';
        sCtx.fillStyle = color;
        sCtx.fillRect(0, 0, cellW, cellH);
        ctx.drawImage(
          this._silCanvas,
          0,
          0,
          cellW,
          cellH,
          Math.round(baseX + offsetX),
          Math.round(baseY + offsetY),
          drawW,
          drawH
        );
        return;
      }
    }
    ctx.drawImage(
      sheet,
      sx,
      sy,
      cellW,
      cellH,
      Math.round(baseX + offsetX),
      Math.round(baseY + offsetY),
      drawW,
      drawH
    );
  }

  /**
   * Blits Ignis Sol's remade 64x64 HD-2D RPG ability & action icon sheet (`assets/sprites/mage_icons.png`, 448x64):
   *   Cell 0: attack (Solar Fireball)
   *   Cell 1: skill (Triple Solar Pillar)
   *   Cell 2: overdrive (Eclipse Supernova)
   *   Cell 3: ultimate (Heavensfall Astral Meteor)
   *   Cell 4: dodge (Arcane Flame-Blink)
   *   Cell 5: jump (Solar Phoenix Vault)
   *   Cell 6: crouch (Flame Ward Aegis)
   */
  static drawMageSheetIcon(ctx, cellIdx, w, h, t = 0) {
    if (!ctx || typeof Image === 'undefined') return false;
    const icons = this.initAssets()?.mage?.icons;
    if (!icons || !icons.complete || !icons.naturalWidth || icons.naturalWidth < 448) return false;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(icons, cellIdx * 64, 0, 64, 64, 0, 0, w, h);

    const b = Math.max(1, Math.round(w / 64));
    ctx.fillStyle = 'rgba(255, 244, 214, 0.14)';
    ctx.fillRect(0, 0, w, b);
    ctx.fillRect(0, 0, b, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, h - b, w, b);
    ctx.fillRect(w - b, 0, b, h);

    if (t > 0) {
      const sparkPhase = Math.floor(t * 3.5) % 2;
      ctx.fillStyle = sparkPhase === 0 ? '#ffffff' : '#fde047';
      ctx.fillRect(Math.round(w * 0.14), Math.round(h * 0.14), b * 2, b * 2);
      ctx.fillRect(Math.round(w * 0.82), Math.round(h * 0.80), b * 2, b * 2);
    }

    ctx.restore();
    return true;
  }

  static HERO_ICON_ROW_MAP = {
    warrior: 0,
    warrior_ex: 0,
    archer: 1,
    archer_ex: 1,
    priestess: 2,
    priestess_ex: 2,
    reaper: 3,
    reaper_ex: 3,
    chronomancer: 4,
    chronomancer_ex: 4,
    titan: 5,
    titan_ex: 5,
    ronin: 6,
    ronin_ex: 6,
    valkyrie: 7,
    valkyrie_ex: 7,
    icemage: 8,
    icemage_ex: 8,
    android: 9,
    android_ex: 9,
    archfiend: 10,
    nyx_ex: 11
  };

  /**
   * Blits all-roster 64x64 HD-2D RPG ability & action icon atlas (`assets/sprites/hero_icons_sheet.png`, 384x768):
   *   Col 0: attack  • Col 1: skill  • Col 2: overdrive  • Col 3: ultimate (Supreme)  • Col 4: dodge  • Col 5: guard/vault
   */
  static drawHeroSheetIcon(ctx, heroKey, colIdx, w, h, t = 0) {
    if (!ctx || typeof Image === 'undefined') return false;
    const rowIdx = this.HERO_ICON_ROW_MAP[heroKey];
    if (rowIdx === undefined || colIdx < 0 || colIdx > 5) return false;
    const icons = this.initAssets()?.heroIconsSheet;
    if (!icons || !icons.complete || !icons.naturalWidth || icons.naturalWidth < 384) return false;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(icons, colIdx * 64, rowIdx * 64, 64, 64, 0, 0, w, h);

    const b = Math.max(1, Math.round(w / 64));
    const isEx = typeof heroKey === 'string' && heroKey.endsWith('_ex');
    ctx.fillStyle = isEx ? 'rgba(250, 204, 21, 0.24)' : 'rgba(255, 255, 255, 0.13)';
    ctx.fillRect(0, 0, w, b);
    ctx.fillRect(0, 0, b, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, h - b, w, b);
    ctx.fillRect(w - b, 0, b, h);

    if (t > 0) {
      const sparkPhase = Math.floor(t * 3.5 + colIdx) % 2;
      ctx.fillStyle = sparkPhase === 0 ? '#ffffff' : '#fde047';
      ctx.fillRect(Math.round(w * 0.14), Math.round(h * 0.14), b * 2, b * 2);
      ctx.fillRect(Math.round(w * 0.82), Math.round(h * 0.80), b * 2, b * 2);
    }

    ctx.restore();
    return true;
  }

  /**
   * Renders purpose-built 64x64 HD-2D Pixel-Art RPG Ability Icons across all 22 champions
   * (`mage_icons.png` for Ignis Sol / Ignis Sol EX; `hero_icons_sheet.png` for the remaining champions + Boss Malphas,
   * with crisp 28x28 procedural fallback prior to image load).
   */
  static drawSkillIcon(ctx, heroKey, slotIdx, w, h, t = 0) {
    if (!ctx) return;
    if ((heroKey === 'mage' || heroKey === 'mage_ex') && slotIdx >= 0 && slotIdx <= 3) {
      if (this.drawMageSheetIcon(ctx, slotIdx, w, h, t)) return;
    } else if (slotIdx >= 0 && slotIdx <= 5) {
      if (this.drawHeroSheetIcon(ctx, heroKey, slotIdx, w, h, t)) return;
    }
    const rawHeroKey = heroKey;
    heroKey =
      rawHeroKey === 'warrior_ex'
        ? 'warrior_ex'
        : typeof rawHeroKey === 'string' && rawHeroKey.endsWith('_ex')
          ? rawHeroKey.slice(0, -3)
          : rawHeroKey;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    const G = 28; // 28x28 logical pixel grid -> 2x2 screen pixels on 56x56 canvas
    const px = w / G;
    const buf = new Array(G * G).fill(null);
    const setPx = (x, y, col) => {
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix >= 0 && ix < G && iy >= 0 && iy < G) {
        buf[iy * G + ix] = col;
      }
    };
    const fillRectPx = (x, y, rw, rh, col) => {
      for (let yy = y; yy < y + rh; yy++) {
        for (let xx = x; xx < x + rw; xx++) setPx(xx, yy, col);
      }
    };
    const drawLinePx = (x0, y0, x1, y1, col, thick = 1) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= steps; i++) {
        const lx = Math.round(x0 + ((x1 - x0) * i) / steps);
        const ly = Math.round(y0 + ((y1 - y0) * i) / steps);
        for (let ty = 0; ty < thick; ty++) {
          for (let tx = 0; tx < thick; tx++) setPx(lx + tx, ly + ty, col);
        }
      }
    };
    const drawCirclePx = (cx, cy, r, col, fill = false) => {
      for (let yy = Math.floor(cy - r - 1); yy <= Math.ceil(cy + r + 1); yy++) {
        for (let xx = Math.floor(cx - r - 1); xx <= Math.ceil(cx + r + 1); xx++) {
          const d = Math.hypot(xx - cx, yy - cy);
          if (fill ? d <= r + 0.35 : Math.abs(d - r) <= 0.72) setPx(xx, yy, col);
        }
      }
    };

    const themes = {
      warrior: { bg0: '#061024', bg1: '#0c2d5e', rim: '#38bdf8', glow: '#7dd3fc', gold: '#facc15' },
      warrior_ex: { bg0: '#040c24', bg1: '#0f2e6b', rim: '#38bdf8', glow: '#bae6fd', gold: '#facc15' },
      archer: { bg0: '#041b15', bg1: '#0b4635', rim: '#34d399', glow: '#6ee7b7', gold: '#fde047' },
      mage: { bg0: '#1c0806', bg1: '#57160b', rim: '#fb923c', glow: '#fde047', gold: '#facc15' },
      priestess: { bg0: '#191205', bg1: '#4d360b', rim: '#fde047', glow: '#fef9c3', gold: '#fbbf24' },
      reaper: { bg0: '#11061f', bg1: '#351052', rim: '#c084fc', glow: '#f43f5e', gold: '#e879f9' },
      chronomancer: { bg0: '#04181c', bg1: '#0d4248', rim: '#2dd4bf', glow: '#99f6e4', gold: '#f59e0b' },
      titan: { bg0: '#1a0c04', bg1: '#4a2108', rim: '#f59e0b', glow: '#34d399', gold: '#fde047' },
      ronin: { bg0: '#070a24', bg1: '#1e1b4b', rim: '#818cf8', glow: '#38bdf8', gold: '#facc15' },
      valkyrie: { bg0: '#1f060d', bg1: '#590d22', rim: '#fb7185', glow: '#fef08a', gold: '#f59e0b' },
      icemage: { bg0: '#051529', bg1: '#0c3a6e', rim: '#67e8f9', glow: '#a5f3fc', gold: '#e879f9' },
      android: { bg0: '#07091a', bg1: '#152254', rim: '#00f0ff', glow: '#7df9ff', gold: '#ff2e93' },
      nyx: { bg0: '#0f1029', bg1: '#3b1f6e', rim: '#c084fc', glow: '#22d3ee', gold: '#d946ef' }
    };
    const th = themes[heroKey] || themes.warrior;

    // 1. Rich Recessed RPG Icon Backdrop + Radial Elemental Glow
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, w * 0.72);
    bgGrad.addColorStop(0, th.bg1);
    bgGrad.addColorStop(1, th.bg0);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle pixel-art corner bevels inside the icon frame
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.fillRect(0, 0, w, px);
    ctx.fillRect(0, 0, px, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, h - px, w, px);
    ctx.fillRect(w - px, 0, px, h);

    // 2. Draw Bespoke 28x28 Pixel-Art Emblem per Hero & Skill Slot
    if (heroKey === 'warrior') {
      if (slotIdx === 0) {
        // FROST CRESCENT + AEGIS SHIELD: Winged Sapphire Shield + Diagonal Runeblade + Frost Arc
        drawCirclePx(13, 15, 7, '#1d4ed8', true);
        drawCirclePx(13, 15, 7, '#facc15', false);
        drawCirclePx(13, 15, 4, '#38bdf8', false);
        // Diagonal Frost Runeblade cutting from bottom-left to top-right
        drawLinePx(5, 22, 22, 5, '#38bdf8', 2);
        drawLinePx(6, 21, 22, 5, '#e0f2fe', 1);
        drawLinePx(7, 16, 12, 21, '#facc15', 2); // Golden Crossguard
        fillRectPx(4, 21, 3, 3, '#f59e0b'); // Pommel
        // Glowing Frost Crescent Wave on right
        drawCirclePx(16, 13, 9, '#7dd3fc', false);
        drawCirclePx(17, 13, 9, '#ffffff', false);
      } else if (slotIdx === 1) {
        // TEMPEST VANGUARD: 3-Blade Cryo-Cyclone Whirlwind Vortex + Lightning Sparks
        for (let r = 3; r <= 10; r += 3) {
          drawCirclePx(14, 14, r, r === 9 ? '#ffffff' : '#38bdf8', false);
        }
        // Sweeping razor vortex blades
        drawLinePx(6, 10, 20, 6, '#e0f2fe', 2);
        drawLinePx(22, 11, 18, 22, '#7dd3fc', 2);
        drawLinePx(19, 22, 6, 17, '#38bdf8', 2);
        drawCirclePx(14, 14, 3, '#facc15', true);
        setPx(14, 14, '#ffffff');
      } else {
        // HEAVENLY EARTHSHATTER: Colossal Vertical Runeblade Plunging + 5 Glacial Spires
        // Left & right erupting glacial crystal spires
        drawLinePx(5, 23, 7, 12, '#0284c7', 2);
        drawLinePx(6, 23, 7, 13, '#7dd3fc', 1);
        drawLinePx(9, 23, 10, 15, '#38bdf8', 2);
        drawLinePx(22, 23, 20, 12, '#0284c7', 2);
        drawLinePx(21, 23, 20, 13, '#7dd3fc', 1);
        drawLinePx(18, 23, 17, 15, '#38bdf8', 2);
        // Central plunging Greatsword
        fillRectPx(13, 3, 2, 4, '#f59e0b');
        fillRectPx(9, 7, 10, 2, '#facc15');
        fillRectPx(12, 9, 4, 13, '#0284c7');
        fillRectPx(13, 9, 2, 14, '#e0f2fe');
        // Golden impact shockwave at base
        drawLinePx(4, 23, 23, 23, '#fde047', 2);
        drawLinePx(8, 24, 19, 24, '#ffffff', 1);
      }
    } else if (heroKey === 'warrior_ex') {
      if (slotIdx === 0) {
        // DAWN-BREAKER SMEAR SLASH: Wide FFBE Golden-Cyan Serrated Crescent Smear + 2H Dawn-Breaker Greatsword
        drawCirclePx(14, 14, 10, '#1d4ed8', false);
        drawCirclePx(15, 14, 9, '#38bdf8', false);
        drawCirclePx(16, 13, 8, '#fde047', false);
        drawCirclePx(17, 13, 7, '#ffffff', false);
        fillRectPx(3, 4, 8, 12, null); // Open rear hemisphere for serrated forward crescent
        // Diagonal 2H Dawn-Breaker Greatsword cutting bottom-left -> top-right
        drawLinePx(4, 23, 22, 5, '#0284c7', 3);
        drawLinePx(5, 22, 23, 4, '#7dd3fc', 2);
        drawLinePx(6, 21, 23, 4, '#ffffff', 1);
        // Winged Neo-Vision Gold Crossguard & Sapphire Gem
        drawLinePx(6, 15, 13, 22, '#f59e0b', 2);
        drawLinePx(7, 15, 12, 20, '#fef08a', 1);
        fillRectPx(3, 22, 3, 3, '#facc15');
        setPx(9, 18, '#38bdf8');
      } else if (slotIdx === 1) {
        // ASTRAL CROSS-BLITZ: Twin Intersecting X-Smear Slashes + Rising Dragon-Fang Pillar
        fillRectPx(12, 4, 4, 19, '#1d4ed8');
        fillRectPx(13, 3, 2, 20, '#7dd3fc');
        // X-shaped golden-cyan razor cross-slashes
        drawLinePx(4, 6, 23, 22, '#38bdf8', 3);
        drawLinePx(5, 6, 23, 21, '#fde047', 2);
        drawLinePx(23, 6, 4, 22, '#38bdf8', 3);
        drawLinePx(22, 6, 4, 21, '#ffffff', 1);
        drawCirclePx(14, 14, 3, '#facc15', true);
        drawCirclePx(14, 14, 1.5, '#ffffff', true);
      } else if (slotIdx === 3) {
        // DAWN OF EXVIUS SUPREME JUDGMENT: Seraphic Wings + Colossal Cathedral Dawn-Breaker Beam-Blade
        drawLinePx(3, 12, 11, 7, '#f59e0b', 2);
        drawLinePx(4, 16, 11, 11, '#fde047', 2);
        drawLinePx(24, 12, 16, 7, '#f59e0b', 2);
        drawLinePx(23, 16, 16, 11, '#fde047', 2);
        fillRectPx(11, 2, 6, 21, '#0284c7');
        fillRectPx(12, 2, 4, 21, '#38bdf8');
        fillRectPx(13, 2, 2, 22, '#ffffff');
        fillRectPx(8, 7, 12, 2, '#facc15');
        drawLinePx(3, 23, 24, 23, '#fde047', 2);
        drawLinePx(7, 24, 20, 24, '#ffffff', 1);
      } else {
        // SOVEREIGN OMNISLASH (slotIdx === 2): 5-Angle Multi-Vector Astral Smear Blitz
        drawCirclePx(14, 14, 9.5, '#1d4ed8', false);
        drawLinePx(4, 14, 24, 14, '#38bdf8', 2);
        drawLinePx(6, 5, 22, 22, '#7dd3fc', 2);
        drawLinePx(22, 5, 6, 22, '#fde047', 2);
        drawLinePx(14, 3, 14, 24, '#e0f2fe', 2);
        drawLinePx(5, 19, 23, 9, '#ffffff', 1);
        drawCirclePx(14, 14, 3.2, '#facc15', true);
        drawCirclePx(14, 14, 1.6, '#ffffff', true);
      }
    } else if (heroKey === 'archer') {
      if (slotIdx === 0) {
        // ASTRAL LONGBOW: Golden Recurve Bow + Blazing Emerald Arrow
        drawCirclePx(11, 14, 9, '#facc15', false);
        drawCirclePx(12, 14, 9, '#fef08a', false);
        fillRectPx(4, 5, 6, 18, null); // Open left half for recurve arc
        drawLinePx(11, 5, 11, 23, '#a7f3d0', 1); // Taut bowstring
        // Blazing emerald arrow nocked horizontally
        drawLinePx(6, 14, 23, 14, '#10b981', 2);
        drawLinePx(7, 14, 23, 14, '#ecfdf5', 1);
        // Arrowhead
        drawLinePx(20, 11, 24, 14, '#34d399', 2);
        drawLinePx(20, 17, 24, 14, '#34d399', 2);
        // Emerald fletching feathers
        drawLinePx(5, 12, 8, 14, '#fde047', 1);
        drawLinePx(5, 16, 8, 14, '#fde047', 1);
      } else if (slotIdx === 1) {
        // STARFALL VOLLEY: 5 Diagonal Emerald-Gold Starlight Arrows Raining Down
        const arrows = [
          [5, 4, 12, 18],
          [10, 3, 17, 17],
          [15, 5, 22, 19],
          [6, 11, 12, 23],
          [16, 11, 22, 23]
        ];
        for (const [x0, y0, x1, y1] of arrows) {
          drawLinePx(x0, y0, x1, y1, '#10b981', 2);
          drawLinePx(x0, y0, x1, y1, '#a7f3d0', 1);
          fillRectPx(x1 - 1, y1 - 1, 3, 3, '#fde047');
          setPx(x1, y1, '#ffffff');
        }
      } else {
        // ASTRAL HURRICANE: Coiling Emerald Wind-Dragon + Orbital Starlight Beams
        fillRectPx(5, 3, 2, 22, '#059669');
        fillRectPx(21, 3, 2, 22, '#059669');
        // Coiling emerald dragon S-curve & roaring head
        drawLinePx(8, 22, 18, 16, '#10b981', 3);
        drawLinePx(18, 16, 9, 10, '#34d399', 3);
        drawLinePx(9, 10, 19, 6, '#6ee7b7', 3);
        // Dragon head, golden horns & glowing eye
        fillRectPx(16, 5, 6, 5, '#10b981');
        drawLinePx(14, 3, 18, 5, '#fde047', 2);
        setPx(19, 7, '#ffffff');
        setPx(18, 7, '#fde047');
      }
    } else if (heroKey === 'mage') {
      if (slotIdx === 0) {
        // SOLAR FIREBALL: Molten White-Gold Comet Orb + Crimson Flame Tail
        drawLinePx(4, 22, 14, 14, '#dc2626', 4);
        drawLinePx(6, 20, 15, 13, '#f97316', 3);
        drawCirclePx(17, 11, 6, '#ea580c', true);
        drawCirclePx(17, 11, 4, '#facc15', true);
        drawCirclePx(18, 10, 2, '#ffffff', true);
      } else if (slotIdx === 1) {
        // TRIPLE SOLAR PILLAR: 3 Erupting Columns of Hellfire Magma
        const cols = [
          [6, 8, 4, 15],
          [12, 4, 4, 19],
          [18, 7, 4, 16]
        ];
        for (const [cx, cy, cw, ch] of cols) {
          fillRectPx(cx - 1, cy, cw + 2, ch, '#dc2626');
          fillRectPx(cx, cy - 1, cw, ch + 1, '#f97316');
          fillRectPx(cx + 1, cy + 1, cw - 2, ch - 2, '#fde047');
          fillRectPx(cx + 1, cy + 3, 1, ch - 4, '#ffffff');
        }
        fillRectPx(4, 22, 20, 2, '#fde047');
      } else {
        // ECLIPSE SUPERNOVA: Black-Sun Void Sphere + Blazing Golden Corona Rays
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          drawLinePx(
            14,
            14,
            14 + Math.cos(ang) * 11,
            14 + Math.sin(ang) * 11,
            a % 2 === 0 ? '#fde047' : '#f97316',
            2
          );
        }
        drawCirclePx(14, 14, 8, '#ea580c', true);
        drawCirclePx(14, 14, 6, '#fde047', true);
        drawCirclePx(14, 14, 4.5, '#09040a', true);
        setPx(19, 10, '#ffffff');
        setPx(18, 10, '#ffffff');
      }
    } else if (heroKey === 'priestess') {
      if (slotIdx === 0) {
        // SACRED STARLIGHT: 8-Pointed Celestial Star + Golden Seraphim Wings
        // Left & right golden angel wings
        drawLinePx(4, 9, 10, 14, '#f59e0b', 2);
        drawLinePx(3, 13, 10, 16, '#fde047', 2);
        drawLinePx(23, 9, 17, 14, '#f59e0b', 2);
        drawLinePx(24, 13, 17, 16, '#fde047', 2);
        // Central 8-point star
        fillRectPx(13, 4, 2, 20, '#fde047');
        fillRectPx(4, 13, 20, 2, '#fde047');
        drawCirclePx(14, 14, 4, '#ffffff', true);
      } else if (slotIdx === 1) {
        // DIVINE SANCTUARY: Consecrated Golden Floor Ring + Descending Valkyrie Spear
        drawCirclePx(14, 20, 7, '#f59e0b', false);
        drawCirclePx(14, 20, 5, '#34d399', false);
        // Descending Valkyrie Spear
        fillRectPx(13, 3, 2, 16, '#fde047');
        fillRectPx(9, 8, 10, 2, '#fef08a');
        drawLinePx(11, 16, 14, 20, '#ffffff', 2);
        drawLinePx(17, 16, 14, 20, '#ffffff', 2);
      } else {
        // SERAPHIC APOTHEOSIS: 6-Winged Archangel Halo Crown + Judgment Pillars
        fillRectPx(6, 4, 2, 20, '#f59e0b');
        fillRectPx(13, 3, 2, 22, '#fef08a');
        fillRectPx(20, 4, 2, 20, '#f59e0b');
        drawCirclePx(14, 11, 6, '#fde047', false);
        drawLinePx(3, 8, 11, 13, '#fde047', 2);
        drawLinePx(24, 8, 16, 13, '#fde047', 2);
        drawLinePx(4, 15, 11, 16, '#fef08a', 2);
        drawLinePx(23, 15, 16, 16, '#fef08a', 2);
        drawCirclePx(14, 11, 3, '#ffffff', true);
      }
    } else if (heroKey === 'reaper') {
      if (slotIdx === 0) {
        // CRESCENT SCYTHE: Wicked Curved Abyssal Scythe Blade + Crimson Soul Leech
        drawLinePx(7, 23, 20, 6, '#9333ea', 2); // Scythe pole
        // Curved crescent scythe blade at top
        drawCirclePx(14, 11, 8, '#c084fc', false);
        drawCirclePx(15, 10, 8, '#f43f5e', false);
        drawLinePx(8, 6, 21, 8, '#e2e8f0', 2);
        // Glowing crimson soul drop
        drawCirclePx(19, 18, 2.5, '#f43f5e', true);
        setPx(19, 18, '#ffffff');
      } else if (slotIdx === 1) {
        // SOUL SEVER: Ferryman Chain + Captive Glowing Severed Soul Effigy
        drawLinePx(4, 23, 15, 13, '#d946ef', 2);
        drawLinePx(5, 22, 16, 12, '#fdf4ff', 1);
        drawCirclePx(18, 10, 6, '#9333ea', true);
        drawCirclePx(18, 10, 4, '#f43f5e', true);
        drawCirclePx(18, 10, 2, '#ffffff', true);
        drawCirclePx(18, 10, 8, '#d946ef', false);
      } else {
        // DEATH'S SOVEREIGNTY: Sovereign Horned Thanatos Skull + Crossed Crimson/Violet Scythes + Sky-Drop Guillotine Blade
        drawCirclePx(14, 14, 10, '#3b0764', true);
        drawLinePx(4, 23, 23, 4, '#a855f7', 2);
        drawLinePx(23, 23, 4, 4, '#f43f5e', 2);
        // Vertical Sky-Drop Guillotine Plumb-Blade
        fillRectPx(13, 2, 2, 24, '#fdf4ff');
        // Sweeping silver-bone crown horns & Sovereign Thanatos skull center
        drawLinePx(9, 10, 5, 4, '#e2e8f0', 2);
        drawLinePx(18, 10, 22, 4, '#e2e8f0', 2);
        drawCirclePx(14, 13, 5.5, '#1e1630', true);
        fillRectPx(11, 10, 6, 6, '#f8fafc');
        fillRectPx(12, 16, 4, 2, '#cbd5e1');
        fillRectPx(11, 12, 2, 2, '#d946ef');
        fillRectPx(15, 12, 2, 2, '#f43f5e');
        drawCirclePx(14, 14, 10, '#e879f9', false);
      }
    } else if (heroKey === 'chronomancer') {
      // CHRONOMANCER
      if (slotIdx === 0) {
        // ESCAPEMENT SAW-GEAR: 8-Toothed Golden Gear + Cyan Temporal Rewind Arc
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          drawLinePx(14, 14, 14 + Math.cos(ang) * 9, 14 + Math.sin(ang) * 9, '#f59e0b', 2);
        }
        drawCirclePx(14, 14, 7, '#fbbf24', true);
        drawCirclePx(14, 14, 4, '#0d4248', true);
        drawCirclePx(14, 14, 2, '#2dd4bf', true);
        drawCirclePx(14, 14, 10, '#2dd4bf', false);
      } else if (slotIdx === 1) {
        // HOURGLASS STASIS: Ornate Golden Frame + Glowing Turquoise Sand Bulbs
        fillRectPx(7, 4, 14, 2, '#fbbf24');
        fillRectPx(7, 22, 14, 2, '#fbbf24');
        drawLinePx(8, 6, 8, 22, '#d97706', 1);
        drawLinePx(19, 6, 19, 22, '#d97706', 1);
        // Upper & lower sand bulbs
        drawLinePx(9, 6, 14, 13, '#2dd4bf', 2);
        drawLinePx(18, 6, 14, 13, '#2dd4bf', 2);
        drawLinePx(14, 14, 9, 21, '#2dd4bf', 2);
        drawLinePx(14, 14, 18, 21, '#2dd4bf', 2);
        fillRectPx(11, 18, 6, 3, '#99f6e4');
        fillRectPx(13, 12, 2, 6, '#ffffff');
      } else {
        // DOOMSDAY MIDNIGHT: Grand Celestial Clockface Striking XII
        drawCirclePx(14, 14, 10, '#f59e0b', false);
        drawCirclePx(14, 14, 8, '#2dd4bf', false);
        // Clock ticks at 12, 3, 6, 9
        fillRectPx(13, 5, 2, 3, '#fef08a');
        fillRectPx(13, 20, 2, 3, '#fef08a');
        fillRectPx(5, 13, 3, 2, '#fef08a');
        fillRectPx(20, 13, 3, 2, '#fef08a');
        // Hands locked vertically at Midnight XII + glowing core
        fillRectPx(13, 6, 2, 9, '#ffffff');
        drawLinePx(14, 14, 19, 10, '#fbbf24', 2);
        drawCirclePx(14, 14, 2, '#fde047', true);
      }
    } else if (heroKey === 'titan') {
      if (slotIdx === 0) {
        // TRINITY OF THE WORLD-MAUL: Obsidian-Gold Horned Maul + Emerald-Jade Crucible Core & Magnetic Fissure
        drawLinePx(5, 22, 19, 8, '#b45309', 2);
        fillRectPx(11, 3, 12, 8, '#1e293b');
        fillRectPx(12, 4, 10, 6, '#f59e0b');
        fillRectPx(15, 5, 4, 4, '#10b981');
        setPx(16, 6, '#ffffff');
        // Orbiting Crucible Core + Magnetic Fissure wave
        drawCirclePx(7, 9, 2, '#34d399', true);
        drawLinePx(4, 23, 24, 23, '#fde047', 2);
        drawLinePx(8, 21, 20, 21, '#10b981', 1);
      } else if (slotIdx === 1) {
        // WORLD-ANVIL CATACLYSM: Horned Obsidian-Gold World-Anvil Altar + Wall-Ricochet Trajectory Spark
        fillRectPx(7, 13, 15, 4, '#334155');
        fillRectPx(4, 14, 4, 2, '#fbbf24');
        fillRectPx(21, 14, 3, 2, '#fbbf24');
        fillRectPx(10, 17, 9, 4, '#1e293b');
        fillRectPx(7, 21, 15, 3, '#b45309');
        fillRectPx(12, 14, 5, 2, '#10b981');
        fillRectPx(13, 18, 3, 2, '#fde047');
        // Ricochet trajectory V-arc off top-right border
        drawLinePx(8, 6, 23, 9, '#fde047', 2);
        drawLinePx(23, 9, 14, 12, '#34d399', 2);
        setPx(23, 9, '#ffffff');
      } else {
        // WORLD-BREAKER HOME RUN: 2H World-Maul Baseball-Bat Swing + Blazing Home-Run Comet & Wall-Slam Stun Star
        drawLinePx(4, 19, 17, 11, '#b45309', 2); // 2H Maul shaft swung horizontally like a baseball bat
        fillRectPx(14, 7, 7, 7, '#1e293b'); // Colossal Maul Head
        fillRectPx(15, 8, 5, 5, '#f59e0b');
        fillRectPx(16, 9, 3, 3, '#34d399');
        // Blazing Home-Run Comet Trajectory to the far right wall
        drawLinePx(6, 15, 23, 6, '#fde047', 2);
        drawLinePx(9, 17, 23, 8, '#10b981', 1);
        // Far-Wall Impact Barrier + Stun Star
        fillRectPx(23, 3, 2, 21, '#f97316');
        fillRectPx(21, 4, 4, 4, '#fef08a');
        setPx(22, 5, '#ffffff');
      }
    } else if (heroKey === 'ronin') {
      if (slotIdx === 0) {
        // STORM-ODACHI IAIDO: Curved Indigo-Cyan Great-Katana + Raijin Parry Sparks
        drawLinePx(5, 22, 22, 5, '#6366f1', 2);
        drawLinePx(6, 21, 22, 5, '#38bdf8', 1);
        drawLinePx(8, 17, 11, 20, '#facc15', 2); // Golden Tsuba guard
        drawLinePx(15, 6, 23, 12, '#818cf8', 1); // Lightning arc
        drawLinePx(17, 12, 23, 16, '#e0f2fe', 1);
        setPx(22, 5, '#ffffff');
      } else if (slotIdx === 1) {
        // RAIJIN THUNDER-PILLAR: Descending Heaven Odachi + 3 Tomoe Drum Ring
        drawCirclePx(14, 14, 9, '#6366f1', false);
        drawCirclePx(14, 5, 2, '#facc15', true);
        drawCirclePx(6, 18, 2, '#facc15', true);
        drawCirclePx(22, 18, 2, '#facc15', true);
        fillRectPx(13, 3, 2, 19, '#38bdf8');
        fillRectPx(13, 5, 1, 16, '#ffffff');
        drawLinePx(8, 22, 20, 22, '#818cf8', 2);
      } else {
        // SUSANOO THUNDERSTORM: Horned Storm-Tengu Mask + Twin Crossed Lightning Odachis
        drawLinePx(4, 22, 23, 5, '#38bdf8', 2);
        drawLinePx(23, 22, 4, 5, '#38bdf8', 2);
        drawCirclePx(14, 14, 6, '#312e81', true);
        drawLinePx(7, 7, 12, 11, '#facc15', 2);
        drawLinePx(20, 7, 15, 11, '#facc15', 2);
        fillRectPx(10, 12, 3, 2, '#38bdf8');
        fillRectPx(15, 12, 3, 2, '#38bdf8');
        setPx(11, 12, '#ffffff');
        setPx(16, 12, '#ffffff');
      }
    } else if (heroKey === 'valkyrie') {
      if (slotIdx === 0) {
        // DRAGON-LANCE THRUST: Crimson-Gold Winged Gungnir Halberd + Phalanx Cross-Guard
        drawLinePx(5, 22, 22, 5, '#f59e0b', 2);
        // Winged halberd axe-wings near tip
        drawLinePx(14, 9, 19, 4, '#f43f5e', 2);
        drawLinePx(18, 13, 23, 8, '#f43f5e', 2);
        drawLinePx(16, 11, 23, 4, '#fef08a', 2);
        setPx(23, 4, '#ffffff');
      } else if (slotIdx === 1) {
        // GUNGNIR SKY-LANCE: Plunging Crimson-Gold Sky-Lance + Dragonfire Crater
        fillRectPx(13, 3, 2, 18, '#fbbf24');
        drawLinePx(8, 9, 14, 14, '#f43f5e', 2);
        drawLinePx(20, 9, 14, 14, '#f43f5e', 2);
        drawLinePx(11, 16, 14, 21, '#ffffff', 2);
        drawLinePx(17, 16, 14, 21, '#ffffff', 2);
        drawLinePx(5, 22, 23, 22, '#f43f5e', 2);
        drawLinePx(8, 23, 20, 23, '#fef08a', 1);
      } else {
        // BAHAMUT CATACLYSM: Winged Crimson Dragon Crest + Golden Valkyrie Crown
        drawLinePx(4, 10, 11, 15, '#f43f5e', 3);
        drawLinePx(23, 10, 16, 15, '#f43f5e', 3);
        drawLinePx(5, 6, 12, 12, '#fbbf24', 2);
        drawLinePx(22, 6, 15, 12, '#fbbf24', 2);
        fillRectPx(10, 9, 8, 9, '#be123c');
        fillRectPx(11, 12, 2, 2, '#fef08a');
        fillRectPx(15, 12, 2, 2, '#fef08a');
        fillRectPx(13, 4, 2, 19, '#ffffff');
      }
    } else if (heroKey === 'icemage') {
      if (slotIdx === 0) {
        // CRYO-PRISM REFRACTION: Hexagonal Ice-Prism Mirror + Splitting Borealis Laser Rays
        drawCirclePx(12, 14, 6, '#0284c7', true);
        drawCirclePx(12, 14, 4, '#67e8f9', true);
        drawLinePx(4, 18, 12, 14, '#ffffff', 2);
        drawLinePx(12, 14, 24, 7, '#67e8f9', 2);
        drawLinePx(12, 14, 24, 14, '#ffffff', 2);
        drawLinePx(12, 14, 24, 21, '#e879f9', 2);
        setPx(12, 14, '#ffffff');
      } else if (slotIdx === 1) {
        // TRI-BEAM PRISM MATRIX: 3 Floating Hexagonal Prisms in an Equilateral Laser Triangle
        drawLinePx(14, 5, 6, 20, '#67e8f9', 2);
        drawLinePx(6, 20, 22, 20, '#e879f9', 2);
        drawLinePx(22, 20, 14, 5, '#67e8f9', 2);
        drawCirclePx(14, 5, 3, '#a5f3fc', true);
        drawCirclePx(6, 20, 3, '#a5f3fc', true);
        drawCirclePx(22, 20, 3, '#a5f3fc', true);
        drawCirclePx(14, 15, 2.5, '#ffffff', true);
      } else {
        // BOREALIS CATHEDRAL: Towering Diamond Iceberg Monolith + Northern Lights Aurora Crown
        drawLinePx(4, 7, 14, 4, '#e879f9', 2);
        drawLinePx(14, 4, 24, 7, '#67e8f9', 2);
        fillRectPx(9, 10, 10, 13, '#0284c7');
        fillRectPx(11, 8, 6, 15, '#67e8f9');
        fillRectPx(13, 6, 2, 17, '#ffffff');
        drawLinePx(5, 23, 23, 23, '#a5f3fc', 2);
      }
    } else if (heroKey === 'android') {
      if (slotIdx === 0) {
        // HF PLASMA KATANA + HEX DEFLECT: Dual-Tone Cyan-Magenta Blade + Hexagonal Force-Field Arc
        drawCirclePx(13, 15, 8, '#0092d6', false);
        drawCirclePx(13, 15, 5, '#00f0ff', false);
        drawLinePx(5, 22, 23, 4, '#ff2e93', 2);
        drawLinePx(6, 22, 23, 5, '#00f0ff', 2);
        drawLinePx(7, 21, 23, 5, '#ffffff', 1);
        drawLinePx(7, 17, 11, 21, '#9eafd4', 2);
      } else if (slotIdx === 1) {
        // EMP OVERLOAD BLITZ: Holo-Scanner Target Reticle + Hemispherical EMP Scanline Dome
        drawCirclePx(14, 18, 9, '#00f0ff', false);
        drawLinePx(6, 15, 22, 15, '#ff2e93', 1);
        drawLinePx(7, 12, 21, 12, '#7df9ff', 1);
        drawLinePx(5, 19, 23, 19, '#ffffff', 2);
        // Scanner corner brackets
        drawLinePx(6, 5, 10, 5, '#00f0ff', 1);
        drawLinePx(6, 5, 6, 9, '#00f0ff', 1);
        drawLinePx(18, 5, 22, 5, '#00f0ff', 1);
        drawLinePx(22, 5, 22, 9, '#00f0ff', 1);
        drawCirclePx(14, 15, 3, '#ffffff', true);
      } else {
        // SINGULARITY PROTOCOL: Counter-Rotating Cyber Hex Core + Magenta-Cyan Orbital Beams
        fillRectPx(5, 4, 2, 20, '#ff2e93');
        fillRectPx(21, 4, 2, 20, '#ff2e93');
        drawCirclePx(14, 14, 8, '#00f0ff', false);
        drawCirclePx(14, 14, 5, '#ff2e93', true);
        drawCirclePx(14, 14, 3, '#00f0ff', true);
        drawCirclePx(14, 14, 1.5, '#ffffff', true);
        drawLinePx(4, 22, 24, 22, '#7df9ff', 2);
      }
    }

    // 3. Automatic 1px Dark Pixel-Ink Silhouette Outline around all non-empty emblem pixels
    const outlineCol = '#03060c';
    for (let y = 1; y < G - 1; y++) {
      for (let x = 1; x < G - 1; x++) {
        if (buf[y * G + x]) continue;
        if (
          buf[(y - 1) * G + x] ||
          buf[(y + 1) * G + x] ||
          buf[y * G + (x - 1)] ||
          buf[y * G + (x + 1)]
        ) {
          ctx.fillStyle = outlineCol;
          ctx.fillRect(Math.round(x * px), Math.round(y * px), Math.ceil(px), Math.ceil(px));
        }
      }
    }

    // 4. Render Crisp Pixel-Art Emblem Clusters
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        const c = buf[y * G + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x * px), Math.round(y * px), Math.ceil(px), Math.ceil(px));
      }
    }

    // 5. Subtle Animated Pixel Sparkles in corners
    const sparkPhase = Math.floor(t * 3 + slotIdx * 2) % 2;
    ctx.fillStyle = sparkPhase === 0 ? '#ffffff' : th.glow;
    ctx.fillRect(Math.round(3 * px), Math.round(3 * px), Math.ceil(px), Math.ceil(px));
    ctx.fillRect(Math.round(24 * px), Math.round(24 * px), Math.ceil(px), Math.ceil(px));

    ctx.restore();
  }

  /**
   * Renders crisp 28x28 16-bit Pixel-Art Action-RPG Button Icons for all 7 Adventure HUD Slots:
   * - 'attack'    -> Hero Signature Basic Attack (`drawSkillIcon(..., 0)`)
   * - 'skill'     -> Hero Special Skill (`drawSkillIcon(..., 1)`)
   * - 'overdrive' -> Hero Overdrive Art (`drawSkillIcon(..., 2)`)
   * - 'ultimate'  -> Supreme Cataclysm Ultimate Finisher (e.g. Ignis Sol's Heavensfall Meteor)
   * - 'dodge'     -> Arcane Blink / Phase Dash Evasion
   * - 'jump'      -> Solar Vault / Aerial Leap
   * - 'crouch'    -> Flame Ward / Counter Aegis Shield
   */
  static drawAdventureActionIcon(ctx, heroKey, actionType, w, h, t = 0) {
    if (!ctx) return;
    if (heroKey === 'mage' || heroKey === 'mage_ex') {
      const mageCellMap = {
        attack: 0,
        skill: 1,
        overdrive: 2,
        ultimate: 3,
        dodge: 4,
        jump: 5,
        crouch: 6
      };
      const cellIdx = mageCellMap[actionType];
      if (cellIdx !== undefined && this.drawMageSheetIcon(ctx, cellIdx, w, h, t)) {
        return;
      }
    } else {
      const heroCellMap = {
        attack: 0,
        skill: 1,
        overdrive: 2,
        ultimate: 3,
        dodge: 4,
        jump: 5,
        crouch: 5
      };
      const colIdx = heroCellMap[actionType];
      if (colIdx !== undefined && this.drawHeroSheetIcon(ctx, heroKey, colIdx, w, h, t)) {
        return;
      }
    }
    if (actionType === 'attack') return this.drawSkillIcon(ctx, heroKey, 0, w, h, t);
    if (actionType === 'skill') return this.drawSkillIcon(ctx, heroKey, 1, w, h, t);
    if (actionType === 'overdrive') return this.drawSkillIcon(ctx, heroKey, 2, w, h, t);

    const rawHeroKey = heroKey;
    heroKey =
      rawHeroKey === 'warrior_ex'
        ? 'warrior_ex'
        : typeof rawHeroKey === 'string' && rawHeroKey.endsWith('_ex')
          ? rawHeroKey.slice(0, -3)
          : rawHeroKey;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    const G = 28;
    const px = w / G;
    const buf = new Array(G * G).fill(null);
    const setPx = (x, y, col) => {
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix >= 0 && ix < G && iy >= 0 && iy < G) buf[iy * G + ix] = col;
    };
    const fillRectPx = (x, y, rw, rh, col) => {
      for (let yy = y; yy < y + rh; yy++) {
        for (let xx = x; xx < x + rw; xx++) setPx(xx, yy, col);
      }
    };
    const drawLinePx = (x0, y0, x1, y1, col, thick = 1) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= steps; i++) {
        const lx = Math.round(x0 + ((x1 - x0) * i) / steps);
        const ly = Math.round(y0 + ((y1 - y0) * i) / steps);
        for (let ty = 0; ty < thick; ty++) {
          for (let tx = 0; tx < thick; tx++) setPx(lx + tx, ly + ty, col);
        }
      }
    };
    const drawCirclePx = (cx, cy, r, col, fill = false) => {
      for (let yy = Math.floor(cy - r - 1); yy <= Math.ceil(cy + r + 1); yy++) {
        for (let xx = Math.floor(cx - r - 1); xx <= Math.ceil(cx + r + 1); xx++) {
          const d = Math.hypot(xx - cx, yy - cy);
          if (fill ? d <= r + 0.35 : Math.abs(d - r) <= 0.72) setPx(xx, yy, col);
        }
      }
    };

    const themes = {
      warrior: { bg0: '#061024', bg1: '#0c2d5e', rim: '#38bdf8', glow: '#7dd3fc', gold: '#facc15', deep: '#0284c7' },
      warrior_ex: { bg0: '#040c24', bg1: '#0f2e6b', rim: '#38bdf8', glow: '#bae6fd', gold: '#facc15', deep: '#0284c7' },
      archer: { bg0: '#041b15', bg1: '#0b4635', rim: '#34d399', glow: '#6ee7b7', gold: '#fde047', deep: '#059669' },
      mage: { bg0: '#1c0806', bg1: '#5c180a', rim: '#fb923c', glow: '#fde047', gold: '#facc15', deep: '#dc2626' },
      priestess: { bg0: '#191205', bg1: '#4d360b', rim: '#fde047', glow: '#fef9c3', gold: '#fbbf24', deep: '#d97706' },
      reaper: { bg0: '#11061f', bg1: '#351052', rim: '#c084fc', glow: '#f43f5e', gold: '#e879f9', deep: '#7e22ce' },
      chronomancer: { bg0: '#04181c', bg1: '#0d4248', rim: '#2dd4bf', glow: '#99f6e4', gold: '#f59e0b', deep: '#0f766e' },
      titan: { bg0: '#1a0c04', bg1: '#4a2108', rim: '#f59e0b', glow: '#34d399', gold: '#fde047', deep: '#b45309' },
      ronin: { bg0: '#070a24', bg1: '#1e1b4b', rim: '#818cf8', glow: '#38bdf8', gold: '#facc15', deep: '#4338ca' },
      valkyrie: { bg0: '#1f060d', bg1: '#590d22', rim: '#fb7185', glow: '#fef08a', gold: '#f59e0b', deep: '#be123c' },
      icemage: { bg0: '#051529', bg1: '#0c3a6e', rim: '#67e8f9', glow: '#a5f3fc', gold: '#e879f9', deep: '#0284c7' },
      android: { bg0: '#07091a', bg1: '#152254', rim: '#00f0ff', glow: '#7df9ff', gold: '#ff2e93', deep: '#0092d6' }
    };
    const th = themes[heroKey] || themes.mage;

    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, w * 0.72);
    bgGrad.addColorStop(
      0,
      actionType === 'ultimate' ? (heroKey === 'warrior_ex' ? '#17387a' : '#581c0c') : th.bg1
    );
    bgGrad.addColorStop(1, th.bg0);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.fillRect(0, 0, w, px);
    ctx.fillRect(0, 0, px, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, h - px, w, px);
    ctx.fillRect(w - px, 0, px, h);

    if (actionType === 'ultimate' && heroKey === 'warrior_ex') {
      // DAWN OF EXVIUS SUPREME JUDGMENT: Seraphic Golden Wings + Cathedral Dawn-Breaker Beam-Blade
      drawLinePx(3, 12, 11, 7, '#f59e0b', 2);
      drawLinePx(4, 16, 11, 11, '#fde047', 2);
      drawLinePx(24, 12, 16, 7, '#f59e0b', 2);
      drawLinePx(23, 16, 16, 11, '#fde047', 2);
      fillRectPx(11, 2, 6, 21, '#0284c7');
      fillRectPx(12, 2, 4, 21, '#38bdf8');
      fillRectPx(13, 2, 2, 22, '#ffffff');
      fillRectPx(8, 7, 12, 2, '#facc15');
      drawLinePx(3, 23, 24, 23, '#fde047', 2);
      drawLinePx(7, 24, 20, 24, '#ffffff', 1);
    } else if (actionType === 'dodge' && heroKey === 'warrior_ex') {
      // FLASH-STEP DODGE: Low Sword-Drag Cinder Trail + Triple Astral Blitz Chevrons
      drawLinePx(3, 21, 18, 17, '#0284c7', 3);
      drawLinePx(4, 21, 19, 17, '#fde047', 1);
      setPx(5, 22, '#ffffff');
      setPx(9, 20, '#facc15');
      drawLinePx(7, 8, 12, 13, '#7dd3fc', 2);
      drawLinePx(7, 18, 12, 13, '#7dd3fc', 2);
      drawLinePx(13, 7, 18, 13, '#fde047', 2);
      drawLinePx(13, 19, 18, 13, '#fde047', 2);
      drawLinePx(18, 6, 24, 13, '#ffffff', 2);
      drawLinePx(18, 20, 24, 13, '#ffffff', 2);
    } else if (actionType === 'ultimate') {
      // SUPREME CATACLYSM METEOR / CELESTIAL FINISHER:
      // Astral cosmic ring + Colossal blazing meteor plunging top-right -> bottom-left + magma crater
      drawCirclePx(14, 14, 10, th.deep, false);
      drawLinePx(23, 3, 10, 16, th.deep, 5);
      drawLinePx(22, 4, 10, 16, th.rim, 3);
      drawLinePx(23, 6, 15, 13, th.gold, 2);
      drawCirclePx(10, 16, 6.5, th.deep, true);
      drawCirclePx(10, 16, 5, th.rim, true);
      drawCirclePx(10, 16, 3.4, th.gold, true);
      drawCirclePx(9, 17, 1.8, '#ffffff', true);
      // Impact shockwave & star-crown sparks
      drawLinePx(3, 23, 22, 23, th.gold, 2);
      drawLinePx(5, 24, 18, 24, '#ffffff', 1);
      setPx(5, 8, '#38bdf8');
      setPx(6, 8, '#ffffff');
      setPx(20, 19, th.glow);
    } else if (actionType === 'dodge') {
      // ARCANE BLINK / PHASE STEP: Twin rift portals + streaking winged phase boot & chevrons
      drawCirclePx(8, 14, 7, th.deep, false);
      drawCirclePx(19, 14, 8, th.rim, false);
      // 3 crisp forward warp chevrons
      drawLinePx(5, 10, 9, 14, th.glow, 2);
      drawLinePx(5, 18, 9, 14, th.glow, 2);
      drawLinePx(11, 9, 16, 14, th.gold, 2);
      drawLinePx(11, 19, 16, 14, th.gold, 2);
      drawLinePx(17, 8, 23, 14, '#ffffff', 2);
      drawLinePx(17, 20, 23, 14, '#ffffff', 2);
      fillRectPx(4, 13, 14, 2, th.rim);
      fillRectPx(10, 13, 11, 2, '#ffffff');
    } else if (actionType === 'jump') {
      // SOLAR VAULT / AERIAL LEAP: Twin ascending elemental wings + soaring apex arrow & launch ring
      drawLinePx(4, 15, 11, 10, th.rim, 2);
      drawLinePx(5, 18, 11, 13, th.gold, 2);
      drawLinePx(23, 15, 16, 10, th.rim, 2);
      drawLinePx(22, 18, 16, 13, th.gold, 2);
      // Central skyward spear-arrow
      fillRectPx(13, 5, 2, 15, th.gold);
      fillRectPx(13, 5, 1, 14, '#ffffff');
      drawLinePx(9, 9, 14, 4, '#ffffff', 2);
      drawLinePx(18, 9, 13, 4, '#ffffff', 2);
      // Ground launch shockwave
      drawLinePx(6, 22, 21, 22, th.rim, 2);
      drawLinePx(9, 23, 18, 23, '#ffffff', 1);
    } else {
      // FLAME WARD / COUNTER AEGIS ('crouch'): Crested rune-shield + deflect barrier dome & spark
      drawCirclePx(14, 14, 9.5, th.glow, false);
      fillRectPx(8, 7, 12, 9, th.deep);
      drawLinePx(8, 16, 14, 22, th.deep, 3);
      drawLinePx(19, 16, 14, 22, th.deep, 3);
      fillRectPx(9, 8, 10, 7, th.rim);
      drawLinePx(9, 15, 14, 20, th.rim, 2);
      drawLinePx(18, 15, 14, 20, th.rim, 2);
      // Gold shield trim + white-hot counter core
      fillRectPx(8, 7, 12, 2, th.gold);
      fillRectPx(13, 9, 2, 10, th.gold);
      fillRectPx(10, 12, 8, 2, th.gold);
      drawCirclePx(14, 13, 2, '#ffffff', true);
    }

    const outlineCol = '#03060c';
    for (let y = 1; y < G - 1; y++) {
      for (let x = 1; x < G - 1; x++) {
        if (buf[y * G + x]) continue;
        if (
          buf[(y - 1) * G + x] ||
          buf[(y + 1) * G + x] ||
          buf[y * G + (x - 1)] ||
          buf[y * G + (x + 1)]
        ) {
          ctx.fillStyle = outlineCol;
          ctx.fillRect(Math.round(x * px), Math.round(y * px), Math.ceil(px), Math.ceil(px));
        }
      }
    }

    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        const c = buf[y * G + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x * px), Math.round(y * px), Math.ceil(px), Math.ceil(px));
      }
    }

    const sparkPhase = Math.floor(t * 3) % 2;
    ctx.fillStyle = sparkPhase === 0 ? '#ffffff' : th.glow;
    ctx.fillRect(Math.round(3 * px), Math.round(3 * px), Math.ceil(px), Math.ceil(px));
    ctx.fillRect(Math.round(24 * px), Math.round(24 * px), Math.ceil(px), Math.ceil(px));

    ctx.restore();
  }
}
