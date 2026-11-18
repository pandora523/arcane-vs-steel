#!/usr/bin/env node
/**
 * Arcane vs. Steel — Champion Voice Pack Rollout Batch 1 + EN/JP Generator
 *
 * STRICT API KEY POLICY:
 * - Reads `GEMINI_API_KEY` from local gitignored `.env.local` ONLY.
 * - Strictly locked to `models/gemini-3.8-flash-tts` (never calls image or general text models).
 * - Masters raw 24kHz PCM WAV via `ffmpeg` (leading silence trim, per-champion vocal EQ,
 *   dynamics compression, acoustic space reflection, automatic duration cap calibration,
 *   and peak limiter) into compact 44.1kHz 96kbps mono `.mp3` assets in:
 *     - `assets/voices/<prefix>_<cue>.mp3` (English)
 *     - `assets/voices/ja/<prefix>_<cue>.mp3` (Japanese anime seiyuu)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL_PATH = path.join(REPO_ROOT, '.env.local');
const OUT_DIR_EN = path.join(REPO_ROOT, 'assets', 'voices');
const OUT_DIR_JA = path.join(OUT_DIR_EN, 'ja');

// HARD-LOCKED MODEL GUARD & CIRCUIT BREAKER — DO NOT CHANGE TO ANY NON-TTS MODEL
const LOCKED_TTS_MODEL = 'models/gemini-3.8-flash-tts';
const MAX_VOICE_REQUESTS_PER_RUN = 40;

const CHAMPION_PROFILES = {
  seraphina: {
    voiceName: 'Kore',
    enPrefix: 'noble crystal-clear anime Seraphic Archpriestess in a dark-fantasy fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, noble crystal-clear Seraphic Archpriestess, authentic dramatic Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=85',
      'equalizer=f=260:t=q:w=1.2:g=-1.5',
      'equalizer=f=3600:t=q:w=1.1:g=2.4',
      'acompressor=threshold=-16dB:ratio=2.6:attack=6:release=90:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.10,aecho=0.88:0.86:30|52:0.13|0.07',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.90:0.88:22:0.07',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  aethelgard: {
    voiceName: 'Fenrir',
    enPrefix:
      'commanding knightly anime Sovereign Rune Paladin with resonant cathedral baritone in a fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, commanding knightly Sovereign Rune Paladin baritone, noble resolute Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=70',
      'equalizer=f=185:t=q:w=1.1:g=1.6',
      'equalizer=f=3200:t=q:w=1.1:g=2.3',
      'acompressor=threshold=-16dB:ratio=2.7:attack=6:release=92:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.10,aecho=0.88:0.86:28|50:0.13|0.07',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.90:0.88:20:0.07',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  kazemaru: {
    voiceName: 'Orus',
    enPrefix:
      'calm razor-sharp anime Storm Iaido Samurai Ronin with disciplined quiet steel intensity in a fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, calm razor-sharp Storm Iaido Samurai Ronin, classical samurai composure and fierce precision, ',
    eqComp: [
      'highpass=f=82',
      'equalizer=f=250:t=q:w=1.3:g=-1.8',
      'equalizer=f=4200:t=q:w=1.0:g=2.5',
      'acompressor=threshold=-16dB:ratio=2.6:attack=5:release=85:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.06,aecho=0.90:0.88:18|34:0.10|0.05',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.03,aecho=0.91:0.89:16:0.06',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  ignissol: {
    voiceName: 'Puck',
    enPrefix:
      'imperious anime Solar Cataclysm Pyromancer archmage sovereign radiating blazing pride in a fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, imperious Solar Cataclysm Pyromancer sovereign, proud blazing archmage Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=76',
      'equalizer=f=195:t=q:w=1.1:g=1.7',
      'equalizer=f=3500:t=q:w=1.1:g=2.4',
      'acompressor=threshold=-16dB:ratio=2.7:attack=6:release=90:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.09,aecho=0.88:0.86:26|48:0.12|0.06',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.90:0.88:20:0.07',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  freyja: {
    voiceName: 'Aoede',
    enPrefix:
      'fierce celestial anime Sky-Lance Valkyrie shieldmaiden warrior with soaring Norse majesty in a fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, fierce celestial Sky-Lance Valkyrie warrior maiden, proud heroic Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=88',
      'equalizer=f=270:t=q:w=1.2:g=-1.5',
      'equalizer=f=3900:t=q:w=1.1:g=2.5',
      'acompressor=threshold=-16dB:ratio=2.6:attack=5:release=88:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.11,aecho=0.87:0.85:34|62:0.14|0.08',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.90:0.88:22:0.07',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  malakor: {
    voiceName: 'Charon',
    enPrefix:
      'chilling anime Abyssal Necropolis Reaper death-lord with cold ominous authority in a dark-fantasy fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, chilling Abyssal Necropolis Reaper shinigami death-lord, cold ominous low Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=54',
      'equalizer=f=96:t=q:w=0.95:g=2.8',
      'equalizer=f=275:t=q:w=1.3:g=-1.6',
      'equalizer=f=3150:t=q:w=1.1:g=2.2',
      'acompressor=threshold=-16dB:ratio=2.8:attack=6:release=96:makeup=2.7dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.11,aecho=0.86:0.84:34|66:0.15|0.08',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.05,aecho=0.88:0.86:26:0.09',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  nyx: {
    voiceName: 'Laomedeia',
    jaVoiceName: 'Achernar',
    enPrefix:
      'cute youthful high-pitched bubbly-yet-cheeky teenage anime neko cyber-hacker girl in a fighting game, bright energetic girlish anime voice, ',
    jaPrefix:
      '透明感のある甘くて可愛い10代の美少女アニメ声優、高めのキュートな女の子の声、明るい小悪魔ネコミミ少女、',
    eqComp: [
      'highpass=f=98',
      'equalizer=f=255:t=q:w=1.3:g=-1.8',
      'equalizer=f=3950:t=q:w=1.1:g=2.5',
      'equalizer=f=6900:t=q:w=1.2:g=1.5',
      'acompressor=threshold=-16dB:ratio=2.6:attack=5:release=82:makeup=2.6dB'
    ],
    jaEqComp: [
      'highpass=f=105',
      'equalizer=f=255:t=q:w=1.3:g=-2.0',
      'equalizer=f=4100:t=q:w=1.1:g=2.4',
      'equalizer=f=7200:t=q:w=1.2:g=1.6',
      'acompressor=threshold=-16dB:ratio=2.5:attack=5:release=82:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.06,aecho=0.90:0.88:11|23:0.15|0.06',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.03,aecho=0.91:0.89:11:0.12',
      tight: 'afade=t=in:st=0:d=0.005,aecho=0.92:0.90:10:0.09'
    },
    jaSpaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.07,aecho=0.90:0.88:22|42:0.10|0.05',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.03,aecho=0.91:0.89:22:0.07',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  }
};

function makePack(hero, lang, clips) {
  return clips.map((c) => ({
    hero,
    lang,
    id: `${hero}_${c.cue}`,
    ...c
  }));
}

export const VOICE_CLIP_CATALOG = [
  // Seraphina JP-only (EN pack generated by scripts/build_seraphina_voices_tts.mjs)
  ...makePack('seraphina', 'ja', [
    {
      cue: 'select',
      text: 'セラフィナ。我が聖域は、決して揺るがない。',
      style: 'serene yet commanding archpriestess on character select, luminous, regal',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '光へ進みなさい――さもなくば浄化します！',
      style: 'noble battle priestess readying her staff before a duel, resolute, crisp, brisk',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: '聖なる光よ！',
      style: 'crisp fast combat spell-cast battle cry, sharp, energetic',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '浄化を！',
      style: 'fierce sorceress attack shout, crisp final syllable, energetic',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'ステンドグラスの祝福よ！',
      style: 'commanding high priestess unleashing a sacred sanctuary spell, bright, urgent',
      space: 'mid'
    },
    {
      cue: 'skill_crimson',
      text: '紅蓮の審問――跪きなさい！',
      style: 'fierce righteous inquisitor archpriestess casting judgment spears, intense, sharp',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '熾天使の翼よ――光の聖堂オルガン！',
      style: 'epic overdrive ultimate invocation, brisk, soaring, majestic',
      space: 'big'
    },
    {
      cue: 'ult_crimson',
      text: '聖光の坩堝よ――すべてを焼き払え！',
      style: 'wrathful celestial inquisitor unleashing overdrive ultimate, brisk, fierce',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '聖なる天よ、我が翼に集え！',
      style: 'urgent supreme ultimate prayer rising rapidly in power, brisk, luminous',
      space: 'big',
      atempo: 1.12,
      maxSec: 2.75
    },
    {
      cue: 'true_ult_fire',
      text: 'ファイナル・グレイス――創世の光輪！',
      style: 'climactic supreme finisher beam shout at full power, explosive, radiant',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'くっ……まだです！',
      style: 'sharp combat hit gasp followed immediately by defiant grit, fast, reactive',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> お許しを…… <breath> 光が……消えてゆく……',
      style: 'wounded heroine collapsing in defeat, breathless, sorrowful, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '六枚の熾天使の翼が舞う――あらゆる影は終焉の恩寵に跪くのです！',
      style: 'majestic victorious archpriestess after winning a duel, radiant, proud, noble',
      space: 'big',
      maxSec: 7.0
    }
  ]),

  // 1. Aethelgard (EN + JP)
  ...makePack('aethelgard', 'en', [
    {
      cue: 'select',
      text: 'Aethelgard. By the Runeblade, I hold the vanguard.',
      style: 'noble paladin commander pledging his sword on character select, steady, resonant',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Raise your blade! Let celestial steel judge your resolve!',
      style: 'chivalrous paladin duel challenge, booming, resolute, dramatic',
      space: 'mid',
      maxSec: 3.8
    },
    {
      cue: 'attack_1',
      text: 'Dawn-Breaker!',
      style: 'crisp heavy greatsword cleave shout, forceful, sharp',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Cut through!',
      style: 'decisive sword finisher bark, fast, powerful',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Runic seal — Trinity Rush!',
      style: 'commanding paladin unleashing an advancing three-beat sword rush, urgent, heroic',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Heavensfall — Dragoon Dive!',
      style: 'fierce leaping dragoon sword strike battle cry, sharp, explosive',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Star Sanctuary — Pentagram Omnislash!',
      style: 'epic overdrive blade blitz invocation, brisk, heroic, booming',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Astraea — Seven-Star Blitz!',
      style: 'blistering high-tempo overdrive battle call, intense, commanding',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Dawn Wings, unfurl! Celestial Swords, heed me!',
      style: 'urgent heroic supreme vow rising in power before a skyward dive, brisk, noble',
      space: 'big',
      atempo: 1.08,
      maxSec: 3.1
    },
    {
      cue: 'true_ult_fire',
      text: 'Exvius Dawn — Cathedral of Seven Swords!',
      style: 'climactic all-out supreme finisher impact shout, earth-shattering, triumphant',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Ghh! Aegis holds!',
      style: 'armored knight taking a heavy blow and holding firm, reactive, gritty',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> My sword... falters... <breath> stand tall... vanguard...',
      style: 'fallen knight collapsing with dignity, breathless, heavy, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'The Dawn-Breaker cleaves fate itself — sacred steel consecrates this arena!',
      style: 'triumphant noble paladin proclamation after victory, proud, resonant',
      space: 'big',
      maxSec: 7.1
    }
  ]),
  ...makePack('aethelgard', 'ja', [
    {
      cue: 'select',
      text: 'エセルガルド。この聖剣の名に懸けて、前衛は譲らぬ。',
      style: 'noble paladin commander pledge on select screen, resonant, steady',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '剣を取れ！聖なる鋼が、貴様の覚悟を裁く！',
      style: 'chivalrous paladin pre-duel challenge, bold, commanding',
      space: 'mid',
      maxSec: 3.8
    },
    {
      cue: 'attack_1',
      text: '暁を断つ！',
      style: 'crisp greatsword swing battle cry, forceful, sharp',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '斬り裂け！',
      style: 'decisive sword cleave bark, fast, strong',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'ルーンの聖印――トリニティ・ラッシュ！',
      style: 'commanding paladin skill rush call, urgent, heroic',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: '天墜の竜騎士――ヘヴンズフォール！',
      style: 'fierce leaping dragoon sword dive call, sharp, intense',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '星辰の聖域――五芒星・神速乱舞！',
      style: 'epic overdrive sword blitz shout, brisk, majestic',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'アストレア――七星閃光撃！',
      style: 'blistering overdrive assault call, brisk, powerful',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '七つの聖剣よ、我が誓いに応えよ！',
      style: 'urgent heroic supreme invocation building rapidly, brisk, noble',
      space: 'big',
      atempo: 1.08,
      maxSec: 3.1
    },
    {
      cue: 'true_ult_fire',
      text: 'エクスヴィアス・ドーン――七剣の大聖堂！',
      style: 'climactic supreme finisher slam shout at full power, triumphant',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'ぐっ……盾は砕けぬ！',
      style: 'armored knight taking a heavy blow, defiant, gritty',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 聖剣が……折れるのか…… <breath> 頼んだぞ……同胞よ……',
      style: 'fallen knight collapsing in defeat, breathless, solemn, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '黎明の聖剣は運命すら両断する――この闘技場に、聖なる光あれ！',
      style: 'triumphant noble paladin victory speech, proud, booming',
      space: 'big',
      maxSec: 7.1
    }
  ]),

  // 2. Kaze-Maru (EN + JP)
  ...makePack('kazemaru', 'en', [
    {
      cue: 'select',
      text: 'Kaze-Maru. My edge answers only the storm.',
      style: 'stoic samurai master calm yet lethal, crisp, measured',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'One breath, one draw — show me your steel!',
      style: 'disciplined iaido swordsman facing opponent before duel, calm, brisk, intense',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: 'Hah!',
      style: 'razor-sharp martial arts katana strike kiai, explosive, short',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Cut!',
      style: 'icy cold samurai iaido slash bark, crisp, instantaneous',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Zantetsuken — Thunder-Gate Flash!',
      style: 'lightning-fast iaido dash strike call, sharp, disciplined',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Ashura — Ten-Fold Sever!',
      style: 'fierce storm-blade sever shout, brisk, intense',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Susanoo — Sixfold Thunder-Blitz!',
      style: 'epic storm-god omnislash invocation, brisk, focused, fierce',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Takemikazuchi — Blood-Blitz!',
      style: 'crimson lightning samurai overdrive call, razor-sharp, relentless',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Silence — draw!',
      style: 'dead-calm iaido focus snapping instantaneously into action, crisp, short',
      space: 'big',
      atempo: 1.12,
      maxSec: 1.68
    },
    {
      cue: 'true_ult_fire',
      text: 'Amakakeru — Shogunate Realm Slice!',
      style: 'climactic tsuba-click dimension-slicing shout, explosive, sovereign',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Tch! Clean strike.',
      style: 'samurai acknowledging a hit with cold grit, sharp, brief',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> The storm... scatters... <breath> well struck...',
      style: 'stoic swordsman falling in honorable defeat, breathless, calm, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Thunder tolls only after the Raijin Odachi clicks home.',
      style: 'cool serene samurai victory statement as sword sheathes, poised, sharp',
      space: 'big',
      maxSec: 7.1
    }
  ]),
  ...makePack('kazemaru', 'ja', [
    {
      cue: 'select',
      text: '風丸。我が太刀は、ただ疾風迅雷にのみ応える。',
      style: 'stoic samurai master calm and sharp, classical cadence',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '一息一閃――貴様の鋼、見せてみよ！',
      style: 'disciplined iaido ronin pre-duel line, calm, brisk, razor-focused',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: 'はっ！',
      style: 'sharp samurai katana strike kiai, explosive, instant',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '斬る！',
      style: 'cold crisp katana cut shout, sharp, swift',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: '斬鉄剣――雷門一閃！',
      style: 'lightning-fast iaido dash technique call, sharp, crisp',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: '阿修羅――十文字斬り！',
      style: 'fierce storm katana cross-slash call, sharp, intense',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '須佐之男――六道雷迅！',
      style: 'epic storm-god overdrive technique shout, brisk, commanding',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: '建御雷――血風迅雷！',
      style: 'fierce crimson lightning overdrive call, brisk, lethal',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '無念――抜刀！',
      style: 'dead-calm iaido concentration snapping straight into draw, crisp, short',
      space: 'big',
      atempo: 1.12,
      maxSec: 1.68
    },
    {
      cue: 'true_ult_fire',
      text: '天翔ける――幕府・境界両断！',
      style: 'climactic tsuba-click realm-slicing finisher shout, explosive, sovereign',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'ちっ……見事な一撃だ。',
      style: 'samurai absorbing a hit with stoic grit, brief, sharp',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 雷鳴が……遠ざかる…… <breath> 見事……であった……',
      style: 'honorable fallen swordsman fading quietly, breathless, composed',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '雷は、雷神の大太刀が鞘に収まりし後に鳴り響くのだ。',
      style: 'poised samurai victory line after sheathing his blade, calm, authoritative',
      space: 'big',
      maxSec: 7.1
    }
  ]),

  // 3. Ignis Sol (EN + JP)
  ...makePack('ignissol', 'en', [
    {
      cue: 'select',
      text: 'Ignis Sol. Kneel before the sovereign sun.',
      style: 'imperious proud solar archmage on character select, commanding, fiery',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Ash before my solar crown! The heavens burn!',
      style: 'arrogant blazing pyromancer duelist declaration, intense, brisk',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: 'Solar flare!',
      style: 'sharp pyromancer spell cast cry, crisp, energetic',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Burn!',
      style: 'imperious fire-bolt attack shout, fast, fiery',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Helios seals — Solar Trinity!',
      style: 'commanding solar mage invoking flame pillars, bold, urgent',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Dreadnought — Meteor Triad!',
      style: 'fierce artillery bombardment command, explosive, crisp',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Black-Sun Eclipse — Singularity!',
      style: 'grand cosmic solar overdrive invocation, brisk, imperious, mighty',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Helios Extinction — Caldera!',
      style: 'wrathful solar apocalypse overdrive call, fierce, scorching',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Tear the sky! Descend, Dreadnought Sun!',
      style: 'urgent grand solar meteor summoning rising rapidly in heat and power, brisk',
      space: 'big',
      atempo: 1.08,
      maxSec: 2.85
    },
    {
      cue: 'true_ult_fire',
      text: 'Cataclysm — Grand Helios Apocalypse!',
      style: 'climactic world-scorching meteor impact shout at full power, thunderous',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Gah! Insolent spark!',
      style: 'proud fire mage outraged after taking a hit, sharp, fierce',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> The sun... eclipses... <breath> impossible...',
      style: 'defeated arrogant pyromancer stunned as flames die, breathless, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Helios Solar Sorcery reduces this pathetic arena to a Laywaste of Inferno!',
      style: 'triumphant imperious solar sovereign proclamation after victory, blazing, proud',
      space: 'big',
      maxSec: 7.1
    }
  ]),
  ...makePack('ignissol', 'ja', [
    {
      cue: 'select',
      text: 'イグニス・ソル。至高なる太陽の前に跪くがいい。',
      style: 'imperious solar archmage on character select, proud, resonant',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '太陽冠の前で灰となれ！天空よ燃えよ！',
      style: 'blazing arrogant archmage duel opening, brisk, fierce',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: '太陽閃光！',
      style: 'crisp pyromancer fire cast cry, sharp, fast',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '燃え尽きろ！',
      style: 'fierce burning spell attack bark, sharp, forceful',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'ヘリオスの印――太陽三位一体！',
      style: 'commanding solar mage skill invocation, urgent, bold',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: '弩級隕石――メテオ・トライアド！',
      style: 'fierce heavy meteor bombardment call, intense, explosive',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '黒日蝕――特異点崩壊！',
      style: 'grand black-sun overdrive shout, brisk, imperious',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'ヘリオス絶滅――紅蓮カルデラ！',
      style: 'wrathful solar extinction overdrive call, brisk, scorching',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '蒼穹を裂け！降臨せよ、超弩級の太陽！',
      style: 'urgent grand meteor summoning rising rapidly in fury, brisk',
      space: 'big',
      atempo: 1.08,
      maxSec: 2.85
    },
    {
      cue: 'true_ult_fire',
      text: 'カタクリズム――大太陽・終末黙示録！',
      style: 'climactic solar meteor impact shout at maximum power, explosive',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'ぐあっ！小癪な火の粉め！',
      style: 'proud fire sovereign outraged by an impact, reactive, sharp',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 太陽が……蝕まれる…… <breath> 馬鹿な……',
      style: 'defeated proud archmage collapsing in disbelief, breathless, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'ヘリオスの太陽魔術は、この哀れな闘技場を業火の焦土へと変えるのだ！',
      style: 'triumphant imperious solar sovereign victory line, proud, scorching',
      space: 'big',
      maxSec: 7.1
    }
  ]),

  // 4. Freyja (EN + JP)
  ...makePack('freyja', 'en', [
    {
      cue: 'select',
      text: 'Freyja. Six pinions ready for Valhalla.',
      style: 'fierce proud celestial Valkyrie warrior on select screen, clear, heroic',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Gungnir commands the Bifrost! Show your valour!',
      style: 'celestial shieldmaiden challenging foe with spear raised, fierce, brisk',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: 'Gungnir!',
      style: 'crisp spear hurl battle cry, sharp, energetic',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Pierce!',
      style: 'fierce airborne javelin thrust bark, fast, piercing',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Valhalla — Lightning Javelins!',
      style: 'commanding Valkyrie spear volley call, bright, urgent',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Ragnarok — Javelin Tempest!',
      style: 'fierce crimson storm spear tempest shout, intense, swift',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Valkyrie Sanctuary — Spear Volley!',
      style: 'soaring celestial overdrive ultimate battle cry, brisk, majestic',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Bahamut — Spear-Cataclysm!',
      style: 'wrathful dragon-lance overdrive call, brisk, devastating',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Bifrost, open! Einherjar lances, bind them!',
      style: 'urgent soaring sky-gate invocation ascending toward apex dive, brisk, heroic',
      space: 'big',
      atempo: 1.08,
      maxSec: 2.75
    },
    {
      cue: 'true_ult_fire',
      text: 'Twilight of Ragnarok — Bifrost Gungnir!',
      style: 'climactic supersonic Valkyrie spear-dive detonation shout at full power, radiant',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Ngh! Mere scratches!',
      style: 'defiant shieldmaiden shrugging off an impact, reactive, fierce',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> My wings... break... <breath> Valhalla... awaits...',
      style: 'fallen Valkyrie collapsing in defeat, breathless, proud, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Behold the Ragnarok Sovereign — Gungnir cleaves the heavens asunder!',
      style: 'triumphant heroic Valkyrie victory proclamation, soaring, radiant',
      space: 'big',
      maxSec: 7.1
    }
  ]),
  ...makePack('freyja', 'ja', [
    {
      cue: 'select',
      text: 'フレイヤ。六枚の翼、ヴァルハラのために！',
      style: 'fierce proud celestial Valkyrie warrior on select, heroic, bright',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '虹の橋は我が槍に！戦乙女に勇気を示せ！',
      style: 'celestial Valkyrie pre-duel battle challenge, soaring, brisk',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: 'グングニル！',
      style: 'crisp javelin throw battle cry, sharp, heroic',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '貫け！',
      style: 'fierce piercing spear thrust shout, fast, sharp',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'ヴァルハラ――雷槍一斉射！',
      style: 'commanding Valkyrie spear volley call, bright, urgent',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'ラグナロク――烈風投槍嵐！',
      style: 'fierce storm-javelin tempest call, brisk, intense',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '戦乙女の聖域――神槍の雨！',
      style: 'soaring Valkyrie sanctuary overdrive shout, brisk, majestic',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'バハムート――槍撃の大災厄！',
      style: 'fierce dragon-spear cataclysm overdrive shout, brisk, commanding',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'ビフレスト開門！英霊の槍よ、封じよ！',
      style: 'urgent heroic sky-gate invocation ascending high, brisk, soaring',
      space: 'big',
      atempo: 1.08,
      maxSec: 2.75
    },
    {
      cue: 'true_ult_fire',
      text: '黄昏のラグナロク――ビフレスト・グングニル！',
      style: 'climactic falcon-dive Gungnir detonation shout at full power, explosive',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'くっ……かすり傷だ！',
      style: 'defiant shieldmaiden brushing off a strike, reactive, fierce',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 翼が……砕ける…… <breath> ヴァルハラへ……帰るのか……',
      style: 'fallen Valkyrie collapsing in defeat, breathless, solemn, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '見よ、黄昏の覇者の姿を――神槍グングニルは、天をも両断する！',
      style: 'triumphant heroic Valkyrie victory line, soaring, proud',
      space: 'big',
      maxSec: 7.1
    }
  ]),

  // 5. Malakor (EN + JP)
  ...makePack('malakor', 'en', [
    {
      cue: 'select',
      text: "Malakor. Every soul pays the ferryman's tithe.",
      style: 'chilling death-lord necropolis reaper on select, low, ominous, calm',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Hear the death knell — Oblivion claims your shadow!',
      style: 'cold sinister reaper greeting opponent before combat, eerie, brisk',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: 'Reap!',
      style: 'icy sharp scythe cleave bark, cold, lethal',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Sever!',
      style: 'dark sinister scythe finisher shout, crisp, menacing',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Abyssal Chain — Soul Guillotine!',
      style: 'cold ominous soul-chain execution call, sharp, chilling',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Crimson Hook — Execution!',
      style: 'ruthless blood-scythe execution shout, intense, dark',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Legion of Thanatos — Harvest!',
      style: 'dark necropolis death-stand overdrive call, brisk, ominous, mighty',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Blood-Moon — Annihilation!',
      style: 'ruthless blood-moon overdrive execution shout, brisk, terrifying',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Oblivion Gates, unseal!',
      style: 'urgent chilling gothic gate unsealing rising rapidly to doom, very brisk, ominous',
      space: 'big',
      atempo: 1.12,
      maxSec: 2.8
    },
    {
      cue: 'true_ult_fire',
      text: 'Memento Mori — Cathedral of Oblivion!',
      style: 'climactic reality-splitting scythe guillotine shout at full power, chilling, thunderous',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Hmph... cold steel.',
      style: 'unflinching death-lord reacting to a hit with dark amusement, brief, low',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> Even death... <breath> bows to the void...',
      style: 'reaper dissolving into shadow in defeat, breathless, hollow, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Kneel before the Thanatos Sovereign — Oblivion claims its final tithe!',
      style: 'chilling victorious death-lord proclamation, cold, sovereign, triumphant',
      space: 'big',
      maxSec: 7.1
    }
  ]),
  ...makePack('malakor', 'ja', [
    {
      cue: 'select',
      text: 'マラコル。すべての魂は、冥府の渡し守に贄を捧ぐ。',
      style: 'chilling shinigami death-lord on character select, cold, low, ominous',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '死の鐘を聴け――忘却が貴様の影を呑む！',
      style: 'sinister death-lord pre-duel warning, eerie, brisk',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: '刈り取る！',
      style: 'cold razor-sharp scythe cleave shout, lethal, crisp',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '断ち切れ！',
      style: 'sinister reaper finishing cut bark, fierce, dark',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: '深淵の鎖――魂の断頭台！',
      style: 'cold ominous soul-chain guillotine call, sharp, menacing',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: '紅蓮の鉤爪――処刑執行！',
      style: 'ruthless crimson executioner hook shout, intense, dark',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'タナトスの軍勢――魂の収穫！',
      style: 'dark necropolis legion overdrive invocation, brisk, ominous',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: '血月――完全殲滅！',
      style: 'ruthless blood-moon overdrive call, brisk, chilling',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '冥門開門、我が盟約よ！',
      style: 'urgent ominous gothic gate summoning rising rapidly, very brisk, dark',
      space: 'big',
      atempo: 1.10,
      maxSec: 2.8
    },
    {
      cue: 'true_ult_fire',
      text: 'メメント・モリ――忘却の大聖堂！',
      style: 'climactic six-pillar oblivion guillotine shout at full power, devastating',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'ふっ……冷たい刃だな。',
      style: 'death-lord scoffing darkly as a hit lands, brief, low',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 死神すら…… <breath> 虚無に還るのか……',
      style: 'fallen shinigami fading into the abyss, breathless, hollow',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'タナトスの覇者の前に跪け――忘却の深淵が、最後の代償を刈り取る！',
      style: 'chilling victorious shinigami sovereign declaration, cold, authoritative',
      space: 'big',
      maxSec: 7.1
    }
  ]),

  // 6. Nyx (EN + JP — Cute Youthful Teenage Anime Neko Cyber-Hacker Girl)
  ...makePack('nyx', 'en', [
    {
      cue: 'select',
      text: 'Nyx online! Cob Creator kernel synced — ready to play!',
      style: 'bubbly cheeky teenage anime neko cyber-hacker girl giggling brightly on select, super cute, high-pitched, energetic',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Target locked! Combat prompt executing right now, nya!',
      style: 'playful youthful anime neko cyber-hacker girl bouncing into a duel, cute, brisk, cheeky grin',
      space: 'mid',
      maxSec: 3.75
    },
    {
      cue: 'attack_1',
      text: 'Packet sent!',
      style: 'bright cute high-pitched anime neko girl attack chirp, crisp, super playful',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Execute, nya!',
      style: 'cheeky bubbly anime cyber-girl combo finisher shout, snappy, youthful, energetic',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Error four-oh-four — Pop-Up Cascade!',
      style: 'mischievous cute anime hacker girl tossing holographic pop-ups, bubbly, brisk, playful',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Fatal exception — blue screen for you!',
      style: 'sassy youthful anime neko cyber-girl teasing the enemy with a crash trap, bright, fast',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Cob-OS — Starlight Overclock!',
      style: 'excited sparkly teenage anime heroine launching digital nebula overdrive, bright, soaring, brisk',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Root access — Hyper-Laser, go!',
      style: 'fierce-yet-adorable anime cyber-girl firing a hyper-laser overdrive, energetic, high-pitched, brisk',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Creator uplink — boot Genesis!',
      style: 'urgent bubbly anime neko hacker counting down super uplink fast, very brisk, crisp, excited',
      space: 'big',
      atempo: 1.12,
      maxSec: 2.02
    },
    {
      cue: 'true_ult_fire',
      text: 'Genesis Prompt — Powered by Cob!',
      style: 'climactic ecstatic fourth-wall supernova beam shout at full cute idol energy, radiant, iconic',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Nyaha?! Glitch detected!',
      style: 'startled cute teenage anime neko girl yelping and snapping back on hit, fast, reactive',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> Kernel... panic... <breath> battery... sleepy... offline...',
      style: 'cute anime cyber-girl powering down weakly in defeat, breathless, soft youthful sigh',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Prompt executed! Nyx and the Cob Creator Core just rendered total victory, nya!',
      style: 'sparkling victorious teenage anime neko cyber-hacker girl cheering happily, super cute, cheeky, bright',
      space: 'big',
      maxSec: 7.05
    }
  ]),
  ...makePack('nyx', 'ja', [
    {
      cue: 'select',
      text: 'ニクス、オンラインだよっ！コブの創造カーネル、ばっちり同期完了ーっ！',
      style: 'キャラクター選択画面で明るく微笑む可愛い10代の美少女アニメ声、甘くて高いキュートな女の子の声',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'えへへ、ターゲットロック完了！バトルプロンプト、いっくよーっ！',
      style: 'バトル開始前に弾むような可愛い美少女アニメヒロインの声、高めで華やか、テンポよくキュートに',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'えいっ！送信っ！',
      style: '可愛い美少女アニメキャラの軽やかで高い攻撃ボイス、キュートで歯切れよく',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'やぁっ！実行だよっ！',
      style: '甘くて元気な10代の女の子のコンボフィニッシュ掛け声、高めで可愛くスピード感をもって',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'えいっ、エラー404――ポップアップ・カスケード！',
      style: 'いたずらっぽく可愛い小悪魔美少女がホログラムを放つ技ボイス、高めの甘い女の子声でテンポよく',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'やぁっ、例外発生――ブルースクリーンにしちゃうよっ！',
      style: '小悪魔チックで可愛い美少女ハッカーのスキル掛け声、明るくて高めのキュートな声',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'コブOS全開っ――スターライト・オーバークロック！',
      style: 'キラキラ輝く美少女アニメヒロインの必殺技コール、透明感のある高めの可愛い声で華やかに',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'ルート権限解放っ――ハイパーレーザー、いっくよーっ！',
      style: '元気いっぱいでキュートな10代美少女のレーザー必殺技ボイス、高めの可愛い女の子の声で勢いよく',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '創造核リンク――ジェネシス起動っ！',
      style: '超必殺技の発動直前にテンポよく一気に唱える可愛い美少女アニメ声、高めで華やか、素早く',
      space: 'big',
      atempo: 1.12,
      maxSec: 2.02
    },
    {
      cue: 'true_ult_fire',
      text: 'ジェネシス・プロンプト――パワード・バイ・コブっ！',
      style: '最高潮に輝く可愛いアイドル美少女の超必殺ビーム決め台詞、高めの甘い女の子声で華やかに',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'きゃっ！？バグっちゃうよぉ！',
      style: '攻撃を受けて可愛く驚く10代美少女アニメキャラの被弾ボイス、高めで女の子らしく素早く',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> あぅぅ……カーネル……パニック…… <breath> もう……おやすみぃ……',
      style: '負けてふわっと力が抜けていく可愛い美少女のダウンボイス、甘く切ない女の子の吐息で静かに',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'やったぁ、プロンプト実行完了っ！ニクスとコブの創造核で、今日もキラキラ大勝利だよーっ！',
      style: '勝利して嬉しそうに弾む10代の可愛い美少女アニメヒロインの決め台詞、甘くて高いキュートな声',
      space: 'big',
      maxSec: 7.05
    }
  ])
];

function readVertexOrGeminiConfig() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    throw new Error('Missing .env.local in repository root.');
  }
  const raw = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  const readVar = (name) => {
    const match = raw.match(new RegExp(`^${name}=(.+)$`, 'm'));
    return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
  };
  const vertexApiKey = readVar('VERTEX_API_KEY');
  const projectId = readVar('VERTEX_PROJECT_ID');
  if (!vertexApiKey || !projectId) {
    throw new Error('Missing VERTEX_API_KEY or VERTEX_PROJECT_ID in .env.local.');
  }
  return { mode: 'vertex', apiKey: vertexApiKey, projectId };
}

function scrubSecrets(text, cfg) {
  let out = String(text || '');
  if (cfg?.apiKey) out = out.split(cfg.apiKey).join('[REDACTED]');
  if (cfg?.projectId) out = out.split(cfg.projectId).join('[REDACTED]');
  return out;
}

function ensureRiffWavBuffer(rawBuf, sampleRate = 24000) {
  if (rawBuf.length >= 12 && rawBuf.subarray(0, 4).toString('ascii') === 'RIFF') {
    return rawBuf;
  }
  const dataBytes = rawBuf.length;
  const header = Buffer.allocUnsafe(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, rawBuf]);
}

function parseRetryWaitMs(res, bodyText, attempt) {
  const retryHeader = res.headers.get('retry-after');
  if (retryHeader) {
    const secs = Number(retryHeader);
    if (Number.isFinite(secs) && secs > 0) return Math.min(45000, Math.round(secs * 1000) + 250);
  }
  const jsonDelayMatch = bodyText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (jsonDelayMatch) {
    const secs = Number(jsonDelayMatch[1]);
    if (Number.isFinite(secs) && secs > 0) return Math.min(45000, Math.round(secs * 1000) + 400);
  }
  const schedule = [2500, 5000, 10000, 18000, 30000];
  return schedule[Math.min(schedule.length - 1, attempt - 1)];
}

let lastRequestStartMs = 0;

async function waitForRequestPace(minIntervalMs = 450) {
  if (lastRequestStartMs > 0) {
    const elapsed = Date.now() - lastRequestStartMs;
    const waitMs = minIntervalMs - elapsed;
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  lastRequestStartMs = Date.now();
}

async function requestTtsWav(authCfg, { voiceName, text, style, label, minIntervalMs = 450, stats = null }) {
  if (LOCKED_TTS_MODEL !== 'models/gemini-3.8-flash-tts') {
    throw new Error('Policy violation: model must be models/gemini-3.8-flash-tts');
  }
  const cfg = typeof authCfg === 'string' ? { mode: 'gemini', apiKey: authCfg, projectId: '' } : authCfg;
  const endpoint =
    cfg.mode === 'vertex'
      ? `https://aiplatform.googleapis.com/v1beta1/projects/${encodeURIComponent(cfg.projectId)}/locations/global/publishers/google/models/gemini-3.8-flash-tts:generateContent`
      : `https://generativelanguage.googleapis.com/v1beta/${LOCKED_TTS_MODEL}:generateContent`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text,
            speechMetadata: { style }
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  };

  for (let attempt = 1; attempt <= 6; attempt++) {
    await waitForRequestPace(minIntervalMs);
    if (stats) {
      if (stats.httpRequestsUsed >= MAX_VOICE_REQUESTS_PER_RUN) {
        throw new Error(
          `Circuit breaker tripped: reached MAX_VOICE_REQUESTS_PER_RUN (${MAX_VOICE_REQUESTS_PER_RUN})`
        );
      }
      stats.httpRequestsUsed++;
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cfg.apiKey
      },
      body: JSON.stringify(payload)
    });
    const bodyText = await res.text();
    if (res.ok) {
      const parsed = JSON.parse(bodyText);
      const inline = parsed.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline?.data) {
        throw new Error(`No audio inlineData returned for ${label}`);
      }
      return {
        wavBuffer: ensureRiffWavBuffer(Buffer.from(inline.data, 'base64')),
        tokens: parsed.usageMetadata?.totalTokenCount || 0
      };
    }
    const scrubbed = scrubSecrets(bodyText, cfg).slice(0, 260);
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const waitMs = parseRetryWaitMs(res, bodyText, attempt);
      console.warn(
        `[RETRY] ${label} HTTP ${res.status} (attempt ${attempt}/6), waiting ${waitMs}ms...`
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    throw new Error(`TTS HTTP ${res.status} for ${label}: ${scrubbed}`);
  }
}

async function synthesizeRawWav(apiKey, clip, opts = {}) {
  if (LOCKED_TTS_MODEL !== 'models/gemini-3.8-flash-tts') {
    throw new Error('Policy violation: model must be models/gemini-3.8-flash-tts');
  }
  const profile = CHAMPION_PROFILES[clip.hero];
  if (!profile) {
    throw new Error(`Unknown champion profile: ${clip.hero}`);
  }
  const stylePrefix = clip.lang === 'ja' ? profile.jaPrefix : profile.enPrefix;
  const voiceName = clip.lang === 'ja' && profile.jaVoiceName ? profile.jaVoiceName : profile.voiceName;
  return requestTtsWav(apiKey, {
    voiceName,
    text: clip.text,
    style: `${stylePrefix}${clip.style}`,
    label: `${clip.lang}/${clip.id}`,
    minIntervalMs: opts.minIntervalMs ?? 6400,
    stats: opts.stats || null
  });
}

async function synthesizeBatchRawWav(apiKey, batchClips, opts = {}) {
  if (LOCKED_TTS_MODEL !== 'models/gemini-3.8-flash-tts') {
    throw new Error('Policy violation: model must be models/gemini-3.8-flash-tts');
  }
  if (!Array.isArray(batchClips) || batchClips.length < 2) {
    throw new Error('synthesizeBatchRawWav requires at least 2 clips.');
  }
  const { hero, lang } = batchClips[0];
  for (const c of batchClips) {
    if (c.hero !== hero || c.lang !== lang) {
      throw new Error(`Batch clips must share hero and lang (expected ${hero}/${lang}, got ${c.hero}/${c.lang})`);
    }
  }
  const profile = CHAMPION_PROFILES[hero];
  if (!profile) {
    throw new Error(`Unknown champion profile: ${hero}`);
  }
  const stylePrefix = lang === 'ja' ? profile.jaPrefix : profile.enPrefix;
  const voiceName = lang === 'ja' && profile.jaVoiceName ? profile.jaVoiceName : profile.voiceName;
  const joinedText = batchClips.map((c) => c.text).join(' <long pause> <long pause> ');
  const style = `${stylePrefix}energetic dramatic fighting game voice recording session delivering ${batchClips.length} distinct combat lines separated by clear silent pauses, crisp diction, brisk pacing`;
  const cueNames = batchClips.map((c) => c.cue).join(',');
  return requestTtsWav(apiKey, {
    voiceName,
    text: joinedText,
    style,
    label: `${lang}/${hero}[${cueNames}]`,
    minIntervalMs: opts.minIntervalMs ?? 6400,
    stats: opts.stats || null
  });
}

function writePcm16MonoWav(outPath, samplesSlice, sampleRate = 24000) {
  const dataBytes = samplesSlice.length * 2;
  const wav = Buffer.allocUnsafe(44 + dataBytes);
  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVE', 8, 'ascii');
  wav.write('fmt ', 12, 'ascii');
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(dataBytes, 40);
  const srcBytes = Buffer.from(
    samplesSlice.buffer,
    samplesSlice.byteOffset,
    dataBytes
  );
  srcBytes.copy(wav, 44);
  fs.writeFileSync(outPath, wav);
}

export function splitBatchWavIntoClips(batchRawWavPath, expectedCount, tmpDir, tagPrefix) {
  const sampleRate = 24000;
  const frameSamples = 240; // 10ms per frame
  const rawPcm = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      batchRawWavPath,
      '-f',
      's16le',
      '-ac',
      '1',
      '-ar',
      String(sampleRate),
      'pipe:1'
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  const aligned = rawPcm.byteOffset % 2 === 0 ? rawPcm : Buffer.from(rawPcm);
  const samples = new Int16Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.byteLength / 2));
  const numFrames = Math.floor(samples.length / frameSamples);
  if (numFrames < expectedCount * 22) {
    return null;
  }

  const frameDb = new Float64Array(numFrames);
  let firstActiveFrame = -1;
  let lastActiveFrame = -1;
  for (let f = 0; f < numFrames; f++) {
    let maxAbs = 0;
    const base = f * frameSamples;
    for (let i = 0; i < frameSamples; i++) {
      const v = Math.abs(samples[base + i]);
      if (v > maxAbs) maxAbs = v;
    }
    const db = 20 * Math.log10(Math.max(1, maxAbs) / 32768);
    frameDb[f] = db;
    if (db > -47) {
      if (firstActiveFrame === -1) firstActiveFrame = f;
      lastActiveFrame = f;
    }
  }

  if (firstActiveFrame === -1 || lastActiveFrame - firstActiveFrame < expectedCount * 22) {
    return null;
  }

  const padStartFrame = Math.max(0, firstActiveFrame - 3);
  const padEndFrame = Math.min(numFrames - 1, lastActiveFrame + 3);
  const scanStart = firstActiveFrame + 13;
  const scanEnd = lastActiveFrame - 13;

  for (const thresh of [-45, -42, -39, -36, -33]) {
    const runs = [];
    let runStart = -1;
    for (let f = scanStart; f <= scanEnd; f++) {
      if (frameDb[f] <= thresh) {
        if (runStart === -1) runStart = f;
      } else if (runStart !== -1) {
        const len = f - runStart;
        if (len >= 24) runs.push({ start: runStart, end: f, len });
        runStart = -1;
      }
    }
    if (runStart !== -1) {
      const len = scanEnd + 1 - runStart;
      if (len >= 24) runs.push({ start: runStart, end: scanEnd + 1, len });
    }

    if (runs.length < expectedCount - 1) continue;
    const byLen = [...runs].sort((a, b) => b.len - a.len);
    const topRuns = byLen.slice(0, expectedCount - 1);
    if (topRuns[topRuns.length - 1].len < 26) continue;

    topRuns.sort((a, b) => a.start - b.start);
    const startSample = padStartFrame * frameSamples;
    const endSample = Math.min(samples.length, (padEndFrame + 1) * frameSamples);
    const cuts = [
      startSample,
      ...topRuns.map((r) => Math.floor(((r.start + r.end) / 2) * frameSamples)),
      endSample
    ];

    let allValid = true;
    for (let i = 0; i < expectedCount; i++) {
      const s0 = cuts[i];
      const s1 = cuts[i + 1];
      const durSec = (s1 - s0) / sampleRate;
      if (s1 <= s0 || durSec > 10.5) {
        allValid = false;
        break;
      }
      const f0 = Math.floor(s0 / frameSamples);
      const f1 = Math.min(numFrames, Math.ceil(s1 / frameSamples));
      let activeFrames = 0;
      for (let f = f0; f < f1; f++) {
        if (frameDb[f] > -45) activeFrames++;
      }
      if (activeFrames < 20) {
        allValid = false;
        break;
      }
    }

    if (!allValid) continue;

    const slicePaths = [];
    for (let i = 0; i < expectedCount; i++) {
      const slicePath = path.join(tmpDir, `${tagPrefix}_slice_${i}.wav`);
      writePcm16MonoWav(slicePath, samples.subarray(cuts[i], cuts[i + 1]), sampleRate);
      slicePaths.push(slicePath);
    }
    return slicePaths;
  }

  return null;
}

function buildAtempoChain(atempo) {
  if (!atempo || Math.abs(atempo - 1.0) <= 0.01) return '';
  let rem = Math.max(0.5, atempo);
  const filters = [];
  while (rem > 2.0) {
    filters.push('atempo=2.000');
    rem /= 2.0;
  }
  filters.push(`atempo=${rem.toFixed(3)}`);
  return ',' + filters.join(',');
}

function probeDurationSec(filePath) {
  const durOut = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath
    ],
    { encoding: 'utf8' }
  ).trim();
  return Number.parseFloat(durOut) || 0;
}

function runFfmpegMaster(rawWavPath, outMp3Path, profile, spaceKey, atempo, lang = 'en') {
  const trimChain =
    'silenceremove=start_periods=1:start_duration=0.004:start_threshold=-54dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse';
  const tempoChain = buildAtempoChain(atempo);
  const eqArr = lang === 'ja' && profile.jaEqComp ? profile.jaEqComp : profile.eqComp;
  const spacesMap = lang === 'ja' && profile.jaSpaces ? profile.jaSpaces : profile.spaces;
  const eqCompChain = eqArr.join(',');
  const spaceChain = spacesMap[spaceKey] || spacesMap.tight;
  const fullFilter = `${trimChain}${tempoChain},${eqCompChain},${spaceChain},alimiter=limit=0.92:attack=2:release=40`;

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      rawWavPath,
      '-af',
      fullFilter,
      '-ar',
      '44100',
      '-ac',
      '1',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '96k',
      outMp3Path
    ],
    { stdio: 'pipe' }
  );

  return {
    durationSec: probeDurationSec(outMp3Path),
    sizeBytes: fs.statSync(outMp3Path).size
  };
}

function masterVoiceToMp3(rawWavPath, outMp3Path, clip) {
  const profile = CHAMPION_PROFILES[clip.hero];
  let atempo = clip.atempo || 1.0;
  let result = runFfmpegMaster(rawWavPath, outMp3Path, profile, clip.space, atempo, clip.lang);

  for (let pass = 0; pass < 3 && clip.maxSec && result.durationSec > clip.maxSec; pass++) {
    const targetSec = Math.max(0.4, clip.maxSec - 0.05);
    const neededAtempo = Math.min(
      1.85,
      Math.max(atempo + 0.04, (atempo * result.durationSec) / targetSec)
    );
    if (Math.abs(neededAtempo - atempo) < 0.01) break;
    atempo = neededAtempo;
    result = runFfmpegMaster(rawWavPath, outMp3Path, profile, clip.space, atempo, clip.lang);
  }
  return { ...result, atempoUsed: atempo };
}

function partitionPendingGroups(pendingClips, batchSize) {
  const groups = [];
  const buckets = new Map();
  for (const clip of pendingClips) {
    if (batchSize <= 1 || clip.cue === 'death') {
      groups.push([clip]);
      continue;
    }
    const key = `${clip.hero}::${clip.lang}`;
    if (!buckets.has(key)) buckets.set(key, []);
    const bucket = buckets.get(key);
    bucket.push(clip);
    if (bucket.length >= batchSize) {
      groups.push(bucket);
      buckets.set(key, []);
    }
  }
  for (const leftover of buckets.values()) {
    if (leftover.length > 0) groups.push(leftover);
  }
  return groups;
}

async function generateSingleClip(apiKey, clip, tmpDir, opts, stats) {
  const outDir = clip.lang === 'ja' ? OUT_DIR_JA : OUT_DIR_EN;
  const outMp3 = path.join(outDir, `${clip.id}.mp3`);
  const label = `${clip.lang}/${clip.id}.mp3`;
  const rawWavPath = path.join(tmpDir, `${clip.lang}_${clip.id}.raw.wav`);
  const { wavBuffer, tokens } = await synthesizeRawWav(apiKey, clip, {
    minIntervalMs: opts.minIntervalMs,
    stats
  });
  stats.totalTokens += tokens;
  fs.writeFileSync(rawWavPath, wavBuffer);
  const { durationSec, sizeBytes, atempoUsed } = masterVoiceToMp3(rawWavPath, outMp3, clip);
  stats.generatedCount++;
  const paceNote = Math.abs(atempoUsed - (clip.atempo || 1.0)) > 0.01 ? ` | atempo=${atempoUsed.toFixed(2)}` : '';
  console.log(
    `[OK] ${label} | dur=${durationSec.toFixed(2)}s | size=${(sizeBytes / 1024).toFixed(1)}KB | tokens=${tokens}${paceNote}`
  );
}

async function main() {
  const langArg = process.argv.find((a) => a.startsWith('--lang='));
  const langFilter = langArg ? langArg.slice('--lang='.length).trim().toLowerCase() : 'all';
  const heroArg = process.argv.find((a) => a.startsWith('--hero='));
  const heroSet = heroArg
    ? new Set(heroArg.slice('--hero='.length).split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlySet = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const batchArg = process.argv.find((a) => a.startsWith('--batch-size='));
  const batchSize = Math.max(
    1,
    Math.min(8, Number.parseInt(batchArg ? batchArg.slice('--batch-size='.length) : '4', 10) || 4)
  );
  const authCfg = readVertexOrGeminiConfig();
  const minIntervalMs = authCfg.mode === 'vertex' ? 450 : 6400;
  const force = process.argv.includes('--force');

  fs.mkdirSync(OUT_DIR_EN, { recursive: true });
  fs.mkdirSync(OUT_DIR_JA, { recursive: true });

  const targets = VOICE_CLIP_CATALOG.filter((clip) => {
    if (langFilter !== 'all' && clip.lang !== langFilter) return false;
    if (heroSet && !heroSet.has(clip.hero)) return false;
    if (onlySet && !onlySet.has(clip.id) && !onlySet.has(`${clip.lang}:${clip.id}`)) return false;
    return true;
  });

  const pendingClips = [];
  const stats = {
    totalTokens: 0,
    generatedCount: 0,
    skippedCount: 0,
    httpRequestsUsed: 0
  };

  for (const clip of targets) {
    const outDir = clip.lang === 'ja' ? OUT_DIR_JA : OUT_DIR_EN;
    const outMp3 = path.join(outDir, `${clip.id}.mp3`);
    if (!force && !onlySet && fs.existsSync(outMp3)) {
      stats.skippedCount++;
      continue;
    }
    pendingClips.push(clip);
  }

  const groups = partitionPendingGroups(pendingClips, batchSize);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-batch1-tts-'));

  try {
    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const group = groups[gIdx];
      if (group.length === 1) {
        await generateSingleClip(authCfg, group[0], tmpDir, { minIntervalMs }, stats);
        continue;
      }

      const { hero, lang } = group[0];
      const cuesLabel = group.map((c) => c.cue).join(',');
      const batchRawWavPath = path.join(tmpDir, `${lang}_${hero}_batch_${gIdx}.raw.wav`);
      const { wavBuffer, tokens } = await synthesizeBatchRawWav(authCfg, group, {
        minIntervalMs,
        stats
      });
      stats.totalTokens += tokens;
      fs.writeFileSync(batchRawWavPath, wavBuffer);

      const slicePaths = splitBatchWavIntoClips(
        batchRawWavPath,
        group.length,
        tmpDir,
        `${lang}_${hero}_b${gIdx}`
      );
      if (!slicePaths) {
        console.warn(
          `[FALLBACK] Split ambiguous for ${hero}/${lang} [${cuesLabel}]; synthesizing individually`
        );
        for (const clip of group) {
          await generateSingleClip(authCfg, clip, tmpDir, { minIntervalMs }, stats);
        }
        continue;
      }

      for (let i = 0; i < group.length; i++) {
        const clip = group[i];
        const outDir = clip.lang === 'ja' ? OUT_DIR_JA : OUT_DIR_EN;
        const outMp3 = path.join(outDir, `${clip.id}.mp3`);
        const label = `${clip.lang}/${clip.id}.mp3`;
        const { durationSec, sizeBytes, atempoUsed } = masterVoiceToMp3(slicePaths[i], outMp3, clip);
        if (clip.maxSec && durationSec > clip.maxSec) {
          console.warn(
            `[RETRY-SOLO] ${label} batch slice exceeded maxSec (${durationSec.toFixed(2)}s > ${clip.maxSec.toFixed(2)}s); regenerating solo`
          );
          await generateSingleClip(authCfg, clip, tmpDir, { minIntervalMs }, stats);
          continue;
        }
        stats.generatedCount++;
        const paceNote = Math.abs(atempoUsed - (clip.atempo || 1.0)) > 0.01 ? ` | atempo=${atempoUsed.toFixed(2)}` : '';
        console.log(
          `[OK][BATCH] ${label} | dur=${durationSec.toFixed(2)}s | size=${(sizeBytes / 1024).toFixed(1)}KB | batchTokens=${tokens}${paceNote}`
        );
      }
    }
    console.log(
      `Done! httpRequestsUsed=${stats.httpRequestsUsed}/${MAX_VOICE_REQUESTS_PER_RUN}, Generated=${stats.generatedCount}, Skipped=${stats.skippedCount}, Total tokens used: ${stats.totalTokens}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[ERR]', err.message);
    process.exit(1);
  });
}
