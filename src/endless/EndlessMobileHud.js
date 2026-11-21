// Endless Crusade Mobile Compact Events Icon-Strip & Dismissible Pop-Card Helper
// Isolated from EndlessShopUI.js to prevent bloat; 100% Node-safe ESM, zero emojis/dingbats.

import {
  CLOSE_SVG,
  BOUNTY_TARGET_SVG,
  MERCHANT_SVG,
  getMobileBuffSvg,
  formatGoldTag,
  setTextIfChanged,
  stopEventLeak
} from './EndlessShopIcons.js?v=30fps207';

function setStyleIfChanged(el, prop, value) {
  if (!el || !el.style) return;
  if (el.style[prop] !== value) {
    el.style[prop] = value;
  }
}

export class EndlessMobileHud {
  constructor(callbacks = {}) {
    this.callbacks = callbacks || {};
    this.root = null;
    this.activePopCard = null; // null | 'bounty' | 'merchant'
    this._lastBountyCompleted = false;
    this._lastMerchantUid = null;
    this._buffChipRefs = new Map();
    this._refs = {};
    this._lastState = null;
    this._lastMeasureAt = 0;
    this._lastMeasureSig = '';
    this._appliedPortraitVars = false;
  }

  _hasDom() {
    return typeof document !== 'undefined' && typeof document.createElement === 'function';
  }

  mount(rootEl) {
    this.unmount();
    if (!rootEl || !this._hasDom()) return this;
    this.root = rootEl;

    // 1. Slim Mobile Icon+Countdown Notification Strip (height <= 26px)
    const strip = document.createElement('div');
    strip.className = 'endless-mobile-events-strip hidden';
    strip.setAttribute('aria-label', 'Mobile Events Strip');
    stopEventLeak(strip);

    // Bounty Compact Pill: [Target] 7/15 or [Target] 15/15!
    const bountyChip = document.createElement('button');
    bountyChip.type = 'button';
    bountyChip.className = 'endless-m-evt-pill is-bounty hidden';
    bountyChip.setAttribute('aria-label', 'Active Bounty');

    const bountyIco = document.createElement('span');
    bountyIco.className = 'endless-m-evt-ico';
    bountyIco.innerHTML = BOUNTY_TARGET_SVG;

    const bountyTxt = document.createElement('span');
    bountyTxt.className = 'endless-m-evt-txt';
    bountyTxt.textContent = '0/15';

    bountyChip.appendChild(bountyIco);
    bountyChip.appendChild(bountyTxt);
    bountyChip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._lastBountyCompleted) {
        this.closePopCard();
        this.callbacks.onClaimBounty?.(bountyChip);
      } else {
        this.callbacks.onUiClick?.();
        this.togglePopCard('bounty');
      }
    });

    // Keyed Active Shrine / Elixir Buff Icon+Seconds Chips
    const buffList = document.createElement('div');
    buffList.className = 'endless-m-buff-list hidden';

    // Wandering Merchant Compact Badge Pill: [Merchant] 22S
    const merchantChip = document.createElement('button');
    merchantChip.type = 'button';
    merchantChip.className = 'endless-m-evt-pill is-merchant hidden';
    merchantChip.setAttribute('aria-label', 'Wandering Merchant Offer');

    const merchantIco = document.createElement('span');
    merchantIco.className = 'endless-m-evt-ico';
    merchantIco.innerHTML = MERCHANT_SVG;

    const merchantTxt = document.createElement('span');
    merchantTxt.className = 'endless-m-evt-txt';
    merchantTxt.textContent = '22S';

    merchantChip.appendChild(merchantIco);
    merchantChip.appendChild(merchantTxt);
    merchantChip.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onUiClick?.();
      this.togglePopCard('merchant');
    });

    strip.appendChild(bountyChip);
    strip.appendChild(buffList);
    strip.appendChild(merchantChip);

    // 2. Compact Dismissible Pop-Card Layer (Bounty & Merchant on demand)
    const popLayer = document.createElement('div');
    popLayer.className = 'endless-mobile-popcard-layer hidden';
    popLayer.setAttribute('aria-live', 'polite');

    // 2A. Bounty Pop-Card
    const bountyPop = document.createElement('div');
    bountyPop.className = 'endless-mobile-popcard is-bounty hidden';
    bountyPop.setAttribute('role', 'dialog');
    bountyPop.setAttribute('aria-label', 'Bounty Details');
    stopEventLeak(bountyPop);

    const bHead = document.createElement('div');
    bHead.className = 'endless-m-pop-head';
    const bTitleWrap = document.createElement('div');
    bTitleWrap.className = 'endless-m-pop-title-wrap';
    const bTitleIco = document.createElement('span');
    bTitleIco.className = 'endless-m-pop-ico';
    bTitleIco.innerHTML = BOUNTY_TARGET_SVG;
    const bTitle = document.createElement('span');
    bTitle.className = 'endless-m-pop-title';
    bTitle.textContent = 'SLAY MONSTERS';
    bTitleWrap.appendChild(bTitleIco);
    bTitleWrap.appendChild(bTitle);

    const bClose = document.createElement('button');
    bClose.type = 'button';
    bClose.className = 'endless-m-pop-close';
    bClose.setAttribute('aria-label', 'Close bounty card');
    bClose.innerHTML = CLOSE_SVG;
    bClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onUiClick?.();
      this.closePopCard();
    });

    bHead.appendChild(bTitleWrap);
    bHead.appendChild(bClose);

    const bProgRow = document.createElement('div');
    bProgRow.className = 'endless-m-pop-prog-row';
    const bProgTxt = document.createElement('span');
    bProgTxt.className = 'endless-m-pop-prog-txt';
    bProgTxt.textContent = '0 / 15';
    const bRewardTxt = document.createElement('span');
    bRewardTxt.className = 'endless-m-pop-reward';
    bRewardTxt.textContent = '+0G';
    bProgRow.appendChild(bProgTxt);
    bProgRow.appendChild(bRewardTxt);

    const bTrack = document.createElement('div');
    bTrack.className = 'endless-m-pop-track';
    const bFill = document.createElement('div');
    bFill.className = 'endless-m-pop-fill';
    bTrack.appendChild(bFill);

    const bClaimBtn = document.createElement('button');
    bClaimBtn.type = 'button';
    bClaimBtn.className = 'endless-m-pop-cta is-bounty hidden';
    bClaimBtn.textContent = 'CLAIM REWARD!';
    bClaimBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePopCard();
      this.callbacks.onClaimBounty?.(bClaimBtn);
    });

    bountyPop.appendChild(bHead);
    bountyPop.appendChild(bProgRow);
    bountyPop.appendChild(bTrack);
    bountyPop.appendChild(bClaimBtn);

    // 2B. Wandering Merchant Pop-Card
    const merchantPop = document.createElement('div');
    merchantPop.className = 'endless-mobile-popcard is-merchant hidden';
    merchantPop.setAttribute('role', 'dialog');
    merchantPop.setAttribute('aria-label', 'Wandering Merchant Offer');
    stopEventLeak(merchantPop);

    const mHead = document.createElement('div');
    mHead.className = 'endless-m-pop-head';
    const mTitleWrap = document.createElement('div');
    mTitleWrap.className = 'endless-m-pop-title-wrap';
    const mTitleIco = document.createElement('span');
    mTitleIco.className = 'endless-m-pop-ico';
    mTitleIco.innerHTML = MERCHANT_SVG;
    const mTitle = document.createElement('span');
    mTitle.className = 'endless-m-pop-title';
    mTitle.textContent = 'ARCANE MERCHANT';
    mTitleWrap.appendChild(mTitleIco);
    mTitleWrap.appendChild(mTitle);

    const mHeadRight = document.createElement('div');
    mHeadRight.className = 'endless-m-pop-head-right';
    const mTimer = document.createElement('span');
    mTimer.className = 'endless-m-pop-timer';
    mTimer.textContent = '22S';
    const mClose = document.createElement('button');
    mClose.type = 'button';
    mClose.className = 'endless-m-pop-close';
    mClose.setAttribute('aria-label', 'Close merchant card');
    mClose.innerHTML = CLOSE_SVG;
    mClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onUiClick?.();
      this.closePopCard();
    });
    mHeadRight.appendChild(mTimer);
    mHeadRight.appendChild(mClose);

    mHead.appendChild(mTitleWrap);
    mHead.appendChild(mHeadRight);

    const mSub = document.createElement('div');
    mSub.className = 'endless-m-pop-sub';
    mSub.textContent = 'LIMITED OFFER';

    const mTrack = document.createElement('div');
    mTrack.className = 'endless-m-pop-track';
    const mFill = document.createElement('div');
    mFill.className = 'endless-m-pop-fill is-merchant';
    mTrack.appendChild(mFill);

    const mBuyBtn = document.createElement('button');
    mBuyBtn.type = 'button';
    mBuyBtn.className = 'endless-m-pop-cta is-merchant';
    mBuyBtn.textContent = 'BUY 0G';
    mBuyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mBuyBtn.disabled) return;
      this.callbacks.onBuyMerchant?.(mBuyBtn, merchantPop);
      this.closePopCard();
    });

    merchantPop.appendChild(mHead);
    merchantPop.appendChild(mSub);
    merchantPop.appendChild(mTrack);
    merchantPop.appendChild(mBuyBtn);

    popLayer.appendChild(bountyPop);
    popLayer.appendChild(merchantPop);

    this.root.appendChild(strip);
    this.root.appendChild(popLayer);

    this._refs = {
      strip,
      bountyChip,
      bountyTxt,
      buffList,
      merchantChip,
      merchantTxt,
      popLayer,
      bountyPop,
      bTitle,
      bProgTxt,
      bRewardTxt,
      bFill,
      bClaimBtn,
      merchantPop,
      mTitle,
      mTimer,
      mSub,
      mFill,
      mBuyBtn
    };

    return this;
  }

  togglePopCard(kind) {
    if (kind !== 'bounty' && kind !== 'merchant') {
      this.closePopCard();
      return;
    }
    this.activePopCard = this.activePopCard === kind ? null : kind;
    if (this.activePopCard && this._lastState) {
      this._syncPopCardContent(this._lastState);
    }
    this._applyPopCardVisibility();
  }

  _syncPopCardContent(state) {
    const r = this._refs;
    const events = state?.events || null;
    const bounty = events?.bounty || null;
    const merchantOffer = events?.merchantOffer || null;

    if (this.activePopCard === 'bounty' && bounty && r.bountyPop) {
      const shownProg = Math.min(bounty.progress, bounty.target);
      const completed = Boolean(bounty.completed);
      const rw = bounty.rewards || {};
      const rwParts = [];
      if (rw.gold > 0) rwParts.push(`+${formatGoldTag(rw.formattedGold, rw.gold)}`);
      if (rw.astralShards > 0) rwParts.push(`+${rw.astralShards}S`);
      if (rw.forgeDust > 0) rwParts.push(`+${rw.forgeDust}D`);
      const rewardStr = rwParts.join(' ') || '+0G';

      setStyleIfChanged(r.bountyPop, 'borderLeftColor', completed ? '#fef08a' : (bounty.accentHex || '#facc15'));
      setTextIfChanged(r.bTitle, bounty.title || 'ACTIVE BOUNTY');
      setTextIfChanged(r.bProgTxt, `${shownProg} / ${bounty.target}`);
      setTextIfChanged(r.bRewardTxt, rewardStr);
      const pct = Math.max(0, Math.min(100, (Number(bounty.ratio) || 0) * 100));
      setStyleIfChanged(r.bFill, 'width', `${pct.toFixed(1)}%`);
      setStyleIfChanged(r.bFill, 'backgroundColor', completed ? '#facc15' : (bounty.accentHex || '#facc15'));
      r.bClaimBtn?.classList?.toggle('hidden', !completed);
    }

    if (this.activePopCard === 'merchant' && merchantOffer && r.merchantPop) {
      const secLeft = Math.max(0, Math.ceil(Number(merchantOffer.remainingSec) || 0));
      const accent = merchantOffer.accentHex || '#c084fc';
      const costTag = formatGoldTag(merchantOffer.formattedCost, merchantOffer.costGold);

      setStyleIfChanged(r.merchantPop, 'borderLeftColor', accent);
      setTextIfChanged(r.mTitle, merchantOffer.title || 'ARCANE MERCHANT');
      setTextIfChanged(r.mTimer, `${secLeft}S`);
      setTextIfChanged(r.mSub, merchantOffer.subtitle || 'LIMITED OFFER');
      const pct = Math.max(0, Math.min(100, (Number(merchantOffer.ratio) || 0) * 100));
      setStyleIfChanged(r.mFill, 'width', `${pct.toFixed(1)}%`);
      setTextIfChanged(r.mBuyBtn, `BUY ${costTag}`);
      if (r.mBuyBtn) {
        r.mBuyBtn.disabled = !merchantOffer.canAfford;
        r.mBuyBtn.classList.toggle('is-affordable', Boolean(merchantOffer.canAfford));
      }
    }
  }

  closePopCard() {
    if (this.activePopCard === null && !this._refs.popLayer) return;
    this.activePopCard = null;
    this._applyPopCardVisibility();
  }

  _applyPopCardVisibility() {
    const r = this._refs;
    if (!r.popLayer) return;
    const showBounty = this.activePopCard === 'bounty';
    const showMerchant = this.activePopCard === 'merchant';
    const showAny = showBounty || showMerchant;

    r.popLayer.classList.toggle('hidden', !showAny);
    r.bountyPop?.classList.toggle('hidden', !showBounty);
    r.merchantPop?.classList.toggle('hidden', !showMerchant);
    r.bountyChip?.classList.toggle('is-pop-open', showBounty);
    r.merchantChip?.classList.toggle('is-pop-open', showMerchant);
    if (this.root) {
      this.root.classList.toggle('has-mobile-popcard', showAny);
    }
  }

  sync(state, drawerOpen = false) {
    const r = this._refs;
    if (!r.strip) return;
    this._lastState = state || null;

    const events = state?.events || null;
    const bounty = events?.bounty || null;
    const activeBuffs = Array.isArray(events?.activeBuffs) ? events.activeBuffs : [];
    const merchantOffer = events?.merchantOffer || null;

    if (drawerOpen && this.activePopCard !== null) {
      this.activePopCard = null;
    }

    const hasAny = Boolean(bounty || activeBuffs.length > 0 || merchantOffer);
    r.strip.classList.toggle('hidden', !hasAny);

    // 1. Compact Bounty Pill + Pop-Card
    const showBounty = Boolean(bounty);
    r.bountyChip.classList.toggle('hidden', !showBounty);
    if (showBounty) {
      const shownProg = Math.min(bounty.progress, bounty.target);
      const completed = Boolean(bounty.completed);
      this._lastBountyCompleted = completed;

      r.bountyChip.classList.toggle('is-claimable', completed);
      setStyleIfChanged(
        r.bountyChip,
        'borderColor',
        completed ? '#fde047' : (bounty.accentHex || '#facc15')
      );
      setTextIfChanged(r.bountyTxt, completed ? `${shownProg}/${bounty.target}!` : `${shownProg}/${bounty.target}`);

      const rw = bounty.rewards || {};
      const rwParts = [];
      if (rw.gold > 0) rwParts.push(`+${formatGoldTag(rw.formattedGold, rw.gold)}`);
      if (rw.astralShards > 0) rwParts.push(`+${rw.astralShards}S`);
      if (rw.forgeDust > 0) rwParts.push(`+${rw.forgeDust}D`);
      const rewardStr = rwParts.join(' ') || '+0G';
      const tip = `${bounty.title} (${shownProg}/${bounty.target}) ${rewardStr}${completed ? ' - TAP TO CLAIM!' : ' - TAP FOR DETAILS'}`;
      if (r.bountyChip.title !== tip) r.bountyChip.title = tip;
    } else {
      this._lastBountyCompleted = false;
      r.bountyChip.classList.remove('is-claimable');
      if (this.activePopCard === 'bounty') {
        this.activePopCard = null;
      }
    }

    // 2. Keyed Shrine / Elixir Buff Icon+Seconds Chips (ZERO truncated text)
    const hasBuffs = activeBuffs.length > 0;
    r.buffList.classList.toggle('hidden', !hasBuffs);

    const seenKeys = new Set();
    for (let i = 0; i < activeBuffs.length; i++) {
      const bf = activeBuffs[i];
      const key = String(bf.id || `${bf.source || 'buff'}_${i}`);
      seenKeys.add(key);

      let ref = this._buffChipRefs.get(key);
      if (!ref) {
        const chip = document.createElement('div');
        chip.className = 'endless-m-evt-pill is-buff';
        chip.dataset.buffId = key;

        const ico = document.createElement('span');
        ico.className = 'endless-m-evt-ico';
        ico.innerHTML = getMobileBuffSvg(bf.id);

        const secEl = document.createElement('span');
        secEl.className = 'endless-m-evt-txt';
        secEl.textContent = '0S';

        const track = document.createElement('div');
        track.className = 'endless-m-buff-bar';
        const fill = document.createElement('div');
        fill.className = 'endless-m-buff-fill';
        track.appendChild(fill);

        chip.appendChild(ico);
        chip.appendChild(secEl);
        chip.appendChild(track);
        r.buffList.appendChild(chip);

        ref = { chip, ico, secEl, fill, lastAccent: '', lastBuffId: String(bf.id || '') };
        this._buffChipRefs.set(key, ref);
      }

      const accent = bf.accentHex || '#facc15';
      if (ref.lastAccent !== accent) {
        ref.chip.style.borderColor = accent;
        ref.ico.style.color = accent;
        ref.fill.style.backgroundColor = accent;
        ref.lastAccent = accent;
      }
      if (ref.lastBuffId !== String(bf.id || '')) {
        ref.ico.innerHTML = getMobileBuffSvg(bf.id);
        ref.lastBuffId = String(bf.id || '');
      }

      const secLeft = Math.max(0, Math.ceil(Number(bf.remainingSec) || 0));
      setTextIfChanged(ref.secEl, `${secLeft}S`);
      const pct = Math.max(0, Math.min(100, (Number(bf.ratio) || 0) * 100));
      setStyleIfChanged(ref.fill, 'width', `${pct.toFixed(1)}%`);

      const tip = `${bf.name || bf.shortLabel || 'BUFF'} (${secLeft}S)`;
      if (ref.chip.title !== tip) ref.chip.title = tip;

      if (
        r.buffList.children &&
        typeof r.buffList.insertBefore === 'function' &&
        r.buffList.children[i] !== ref.chip
      ) {
        r.buffList.insertBefore(ref.chip, r.buffList.children[i] || null);
      }
    }

    for (const [key, ref] of this._buffChipRefs.entries()) {
      if (!seenKeys.has(key)) {
        if (ref.chip && ref.chip.parentNode === r.buffList) {
          r.buffList.removeChild(ref.chip);
        }
        this._buffChipRefs.delete(key);
      }
    }

    // 3. Compact Wandering Merchant Pill + On-Demand Dismissible Pop-Card
    const showMerchant = Boolean(merchantOffer);
    r.merchantChip.classList.toggle('hidden', !showMerchant);
    if (showMerchant) {
      const secLeft = Math.max(0, Math.ceil(Number(merchantOffer.remainingSec) || 0));
      const accent = merchantOffer.accentHex || '#c084fc';
      const costTag = formatGoldTag(merchantOffer.formattedCost, merchantOffer.costGold);

      if (this._lastMerchantUid && this._lastMerchantUid !== merchantOffer.uid && this.activePopCard === 'merchant') {
        this.activePopCard = null;
      }
      this._lastMerchantUid = merchantOffer.uid || null;

      setStyleIfChanged(r.merchantChip, 'borderColor', accent);
      r.merchantChip.classList.toggle('is-affordable', Boolean(merchantOffer.canAfford));
      setTextIfChanged(r.merchantTxt, `${secLeft}S`);
      const mTip = `${merchantOffer.title || 'ARCANE MERCHANT'} (${costTag}, ${secLeft}S) - TAP TO INSPECT`;
      if (r.merchantChip.title !== mTip) r.merchantChip.title = mTip;
    } else {
      this._lastMerchantUid = null;
      r.merchantChip.classList.remove('is-affordable');
      if (this.activePopCard === 'merchant') {
        this.activePopCard = null;
      }
    }

    if (this.activePopCard) {
      this._syncPopCardContent(state);
    }
    this._applyPopCardVisibility();
    this._syncPortraitLayoutVars(state, drawerOpen, hasAny);
  }

  _syncPortraitLayoutVars(state, drawerOpen, hasEvents) {
    if (!this.root || !this.root.style || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const isMobileLandscape = Boolean(
      document.documentElement?.classList?.contains?.('is-mobile-landscape')
    );
    const isPortrait = !isMobileLandscape && Number(window.innerWidth) > 0 && Number(window.innerWidth) <= 560;
    if (!isPortrait) {
      if (this._appliedPortraitVars) {
        this.root.style.removeProperty('--endless-mobile-party-top');
        this.root.style.removeProperty('--endless-mobile-events-top');
        this.root.style.removeProperty('--endless-mobile-pop-top');
        this._appliedPortraitVars = false;
        this._lastMeasureSig = '';
      }
      return;
    }

    const hasParty = (state?.activeCompanionUnits?.length || 0) > 0;
    const isTrial = Boolean(state?.trials?.isActive);
    const hasChallenge = Boolean(state?.bossFarmMode && !state?.isBossEncounter);
    const bossEl = typeof document.getElementById === 'function'
      ? document.getElementById('adv-boss-raid-hud')
      : null;
    const bossVisible = Boolean(bossEl && !bossEl.classList?.contains?.('hidden'));
    const sig = `${window.innerWidth}x${window.innerHeight}|${drawerOpen ? 1 : 0}|${hasParty ? 1 : 0}|${hasEvents ? 1 : 0}|${isTrial ? 1 : 0}|${hasChallenge ? 1 : 0}|${bossVisible ? 1 : 0}`;
    const nowMs = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
    if (sig === this._lastMeasureSig && nowMs - this._lastMeasureAt < 180) {
      return;
    }
    this._lastMeasureSig = sig;
    this._lastMeasureAt = nowMs;

    try {
      const rootRect = typeof this.root.getBoundingClientRect === 'function'
        ? this.root.getBoundingClientRect()
        : null;
      const rootTop = rootRect && Number.isFinite(rootRect.top) ? rootRect.top : 0;

      let anchorBottom = 0;
      const topStack = typeof this.root.querySelector === 'function'
        ? this.root.querySelector('.endless-top-stack')
        : null;
      if (topStack && typeof topStack.getBoundingClientRect === 'function') {
        const r = topStack.getBoundingClientRect();
        if (r.height > 4 && Number.isFinite(r.bottom)) {
          anchorBottom = Math.max(anchorBottom, r.bottom - rootTop);
        }
      }

      if (bossVisible && typeof bossEl.getBoundingClientRect === 'function') {
        const br = bossEl.getBoundingClientRect();
        if (br.width > 4 && br.height > 4 && Number.isFinite(br.bottom)) {
          anchorBottom = Math.max(anchorBottom, br.bottom - rootTop);
        }
      }

      if (anchorBottom <= 40) return;

      const partyTop = Math.ceil(anchorBottom + 4);
      let partyHeight = 0;
      if (hasParty && !drawerOpen && typeof this.root.querySelector === 'function') {
        const partyEl = this.root.querySelector('.endless-party-hud');
        if (partyEl && !partyEl.classList?.contains?.('hidden') && typeof partyEl.getBoundingClientRect === 'function') {
          const pr = partyEl.getBoundingClientRect();
          if (pr.height > 4) partyHeight = Math.ceil(pr.height);
        }
        if (partyHeight <= 0) partyHeight = 36;
      }

      const eventsTop = partyHeight > 0 ? partyTop + partyHeight + 4 : partyTop;
      let stripHeight = 24;
      if (this._refs.strip && !this._refs.strip.classList?.contains?.('hidden') && typeof this._refs.strip.getBoundingClientRect === 'function') {
        const sr = this._refs.strip.getBoundingClientRect();
        if (sr.height > 4) stripHeight = Math.ceil(sr.height);
      }
      const popTop = eventsTop + stripHeight + 4;

      this.root.style.setProperty('--endless-mobile-party-top', `${partyTop}px`);
      this.root.style.setProperty('--endless-mobile-events-top', `${eventsTop}px`);
      this.root.style.setProperty('--endless-mobile-pop-top', `${popTop}px`);
      this._appliedPortraitVars = true;
    } catch {
      // Ignore measurement failures in mocked/headless DOM environments
    }
  }

  unmount() {
    if (this._refs.strip?.parentNode) {
      this._refs.strip.parentNode.removeChild(this._refs.strip);
    }
    if (this._refs.popLayer?.parentNode) {
      this._refs.popLayer.parentNode.removeChild(this._refs.popLayer);
    }
    if (this.root) {
      this.root.classList?.remove?.('has-mobile-popcard');
      if (this._appliedPortraitVars && this.root.style?.removeProperty) {
        this.root.style.removeProperty('--endless-mobile-party-top');
        this.root.style.removeProperty('--endless-mobile-events-top');
        this.root.style.removeProperty('--endless-mobile-pop-top');
      }
    }
    this.root = null;
    this.activePopCard = null;
    this._lastBountyCompleted = false;
    this._lastMerchantUid = null;
    this._buffChipRefs.clear();
    this._refs = {};
    this._lastState = null;
    this._lastMeasureAt = 0;
    this._lastMeasureSig = '';
    this._appliedPortraitVars = false;
  }
}
