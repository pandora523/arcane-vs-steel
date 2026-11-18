#!/usr/bin/env node
/**
 * Arcane vs. Steel — Champion Voice Pack Rollout Batch 2 (Final 5 Champions, EN + JP)
 *
 * STRICT VERTEX AI TTS POLICY:
 * - Reads `VERTEX_API_KEY` and `VERTEX_PROJECT_ID` from local gitignored `.env.local` ONLY.
 * - Never logs, prints, or exposes secret keys or project IDs in stdout/stderr/errors.
 * - Strictly locked to `models/gemini-3.8-flash-tts` on Vertex AI global endpoint
 *   (`publishers/google/models/gemini-3.8-flash-tts:generateContent`), 1 clip per request (solo pure synthesis).
 * - Hard safety circuit breaker (`MAX_HTTP_REQUESTS_PER_RUN = 180`) + 429/5xx retry backoff.
 * - Masters raw 24kHz WAV via `ffmpeg` (silence trim, per-hero EQ/comp/space, auto `maxSec` atempo calibration,
 *   and peak limiter) into 44.1kHz 96kbps mono `.mp3` files in:
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
const MAX_HTTP_REQUESTS_PER_RUN = 180;
const CONCURRENCY = 2;
const MIN_REQUEST_INTERVAL_MS = 450;

const CHAMPION_PROFILES = {
  lyra: {
    voiceName: 'Callirrhoe',
    enPrefix:
      'regal crystalline anime Glacial Cryo-Empress sorceress sovereign in a dark-fantasy fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, regal crystalline Glacial Cryo-Empress sorceress queen, poised ice-sovereign Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=88',
      'equalizer=f=255:t=q:w=1.2:g=-1.6',
      'equalizer=f=4100:t=q:w=1.1:g=2.6',
      'equalizer=f=7200:t=q:w=1.2:g=1.4',
      'acompressor=threshold=-16dB:ratio=2.6:attack=6:release=90:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.11,aecho=0.87:0.85:32|58:0.15|0.08',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.90:0.88:24:0.08',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  sylvara: {
    voiceName: 'Leda',
    enPrefix:
      'swift noble anime Astral Elven Bowmaster starlight warden in a dark-fantasy fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, swift noble Astral Elven Bowmaster huntress, crisp agile Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=90',
      'equalizer=f=265:t=q:w=1.2:g=-1.5',
      'equalizer=f=3950:t=q:w=1.1:g=2.5',
      'equalizer=f=6800:t=q:w=1.2:g=1.3',
      'acompressor=threshold=-16dB:ratio=2.6:attack=5:release=84:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.89:0.87:24|44:0.11|0.05',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.03,aecho=0.91:0.89:18:0.06',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  vex09: {
    voiceName: 'Autonoe',
    enPrefix:
      'composed lethal anime Positron Tactical Mecha-Android Valkyrie unit in a sci-fi fantasy fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, composed Positron Tactical Mecha-Android Valkyrie unit, cool razor-crisp Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=98',
      'equalizer=f=250:t=q:w=1.3:g=-1.8',
      'equalizer=f=3400:t=q:w=1.1:g=2.7',
      'equalizer=f=5200:t=q:w=1.2:g=1.8',
      'acompressor=threshold=-16dB:ratio=2.8:attack=4:release=78:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.06,aecho=0.90:0.88:9|19:0.18|0.08',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.03,aecho=0.91:0.89:9:0.14',
      tight: 'afade=t=in:st=0:d=0.005,aecho=0.92:0.90:8:0.10'
    }
  },
  chronos: {
    voiceName: 'Iapetus',
    enPrefix:
      'enigmatic commanding anime Grand Horologium Time-Sovereign archon in a dark-fantasy fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, enigmatic commanding Grand Horologium Time-Sovereign archon, deep archaic Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=72',
      'equalizer=f=175:t=q:w=1.1:g=1.6',
      'equalizer=f=280:t=q:w=1.3:g=-1.4',
      'equalizer=f=3450:t=q:w=1.1:g=2.4',
      'acompressor=threshold=-16dB:ratio=2.7:attack=6:release=92:makeup=2.6dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.11,aecho=0.87:0.85:33|66:0.14|0.07',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.89:0.87:24:0.08',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  },
  torgar: {
    voiceName: 'Algenib',
    enPrefix:
      'thunderous booming anime Volcanic Iron-Bastion Colossus Forge-King juggernaut in a fighting game, ',
    jaPrefix:
      'Japanese anime fighting game voice acting, thunderous Volcanic Iron-Bastion Colossus Forge-King, booming heroic Japanese seiyuu delivery, ',
    eqComp: [
      'highpass=f=52',
      'equalizer=f=98:t=q:w=0.95:g=3.0',
      'equalizer=f=270:t=q:w=1.3:g=-1.5',
      'equalizer=f=3100:t=q:w=1.1:g=2.3',
      'acompressor=threshold=-16dB:ratio=2.8:attack=6:release=96:makeup=2.7dB'
    ],
    spaces: {
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.10,aecho=0.87:0.85:28|54:0.13|0.07',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.89:0.87:22:0.07',
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
  // 1. Lyra (EN + JP)
  ...makePack('lyra', 'en', [
    {
      cue: 'select',
      text: 'Lyra. Even eternity bows before absolute zero.',
      style: 'regal poised ice empress on character select, crystalline, serene, commanding',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Step onto my mirror ice — freeze where you stand!',
      style: 'imperious anime cryo-empress issuing a duel decree, crisp, brisk, regal',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'Shatter!',
      style: 'sharp crystalline spell strike shout, crisp, energetic',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Diamond rime!',
      style: 'piercing ice-lance attack call, crisp, clear final syllable',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Borealis Prism — crush them!',
      style: 'commanding ice queen unleashing twin crystal monoliths, urgent, imperious',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Diamond Guillotine — freeze solid!',
      style: 'ruthless cryo-empress slamming glacier jaws shut, fierce, sharp',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Nine Ice-Swords — Winter Coronation!',
      style: 'majestic overdrive ultimate invocation, soaring, regal, brisk',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Amethyst Claymores — Execution of Nine Blades!',
      style: 'merciless high-tempo overdrive battle invocation, intense, regal',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Aurora Sanctum, seal this realm in zero Kelvin!',
      style: 'urgent supreme ultimate incantation rising in glacial grandeur, brisk',
      space: 'big',
      atempo: 1.08,
      maxSec: 2.98
    },
    {
      cue: 'true_ult_fire',
      text: 'Absolute Zero — Diamond Dust Cathedral!',
      style: 'climactic supreme finisher shatter shout at full power, resonant, triumphant',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Kh! Mere frostbite!',
      style: 'proud empress snapping back through a hit, fast, reactive, defiant',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> My crown... fractures... <breath> winter... fades...',
      style: 'fallen ice empress collapsing as frost shatters, breathless, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Silent, flawless, eternal — every flame kneels within my crystal sanctum!',
      style: 'victorious regal cryo-empress proclamation after winning, serene, proud',
      space: 'big',
      maxSec: 7.05
    }
  ]),
  ...makePack('lyra', 'ja', [
    {
      cue: 'select',
      text: 'ライラ。永遠さえも、絶対零度の前に跪くわ。',
      style: 'regal poised ice empress character select pledge, serene, commanding',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '鏡の氷へ踏み込みなさい――その場で凍てつくがいいわ！',
      style: 'imperious anime ice queen pre-duel decree, crisp, brisk, dramatic',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: '砕けなさい！',
      style: 'sharp crystalline spell strike shout, crisp, fast',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '氷華よ！',
      style: 'piercing ice-lance attack bark, brisk, sharp',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'ボレアリス・プリズム――噛み砕きなさい！',
      style: 'commanding ice queen unleashing twin crystal monoliths, urgent, noble',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: '氷晶の断頭台――凍りつきなさい！',
      style: 'ruthless cryo-empress slamming glacier jaws shut, fierce, sharp',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '九振りの氷剣よ――極光の戴冠式！',
      style: 'majestic overdrive ultimate invocation, soaring, regal, brisk',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: '紫水晶の大剣よ――九剣処刑！',
      style: 'merciless overdrive invocation, intense, brisk, commanding',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '極光の聖域よ、すべてを零度に封じなさい！',
      style: 'urgent supreme ultimate incantation rising in power, brisk, crystalline',
      space: 'big',
      atempo: 1.08,
      maxSec: 2.98
    },
    {
      cue: 'true_ult_fire',
      text: 'アブソリュート・ゼロ――氷晶大聖堂、破砕！',
      style: 'climactic supreme finisher shatter shout at full power, radiant, explosive',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'くっ……浅いわ！',
      style: 'proud empress snapping back on impact, fast, defiant',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 氷の冠が……砕ける…… <breath> 冬が……遠ざかるわ……',
      style: 'fallen ice empress collapsing in defeat, breathless, sorrowful, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '静寂にして完全――いかなる業火も、我が氷晶の玉座にひれ伏すのよ！',
      style: 'victorious regal cryo-empress proclamation, proud, serene, noble',
      space: 'big',
      maxSec: 7.05
    }
  ]),

  // 2. Sylvara (EN + JP)
  ...makePack('sylvara', 'en', [
    {
      cue: 'select',
      text: 'Sylvara. Every star in the canopy guides my bowstring.',
      style: 'noble agile elven bowmaster on character select, clear, confident, luminous',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Draw if you dare — the wind has already marked your heart!',
      style: 'spirited elven warden duel challenge, brisk, sharp, poised',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'Pierce!',
      style: 'crisp bow-release battle cry, fast, piercing',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Starflight!',
      style: 'agile archer volley bark, sharp, energetic',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Starwood Volley — arrow rain!',
      style: 'dynamic elven bowmaster loosing rapid arrow rain, urgent, bright',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Zodiac Deadeye — pin them down!',
      style: 'razor-focused sniper shot battle cry, intense, brisk',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Zephyr Starlock — Twelve-Star Rain!',
      style: 'soaring acrobatic overdrive invocation, heroic, brisk, luminous',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Supernova Starlock — golden seekers, fly!',
      style: 'blistering overdrive barrage shout, fierce, soaring',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'World-Tree, guide my bow!',
      style: 'fast urgent supreme bow-draw invocation before launch, crisp, brisk',
      space: 'mid',
      atempo: 1.08,
      maxSec: 1.42
    },
    {
      cue: 'true_ult_fire',
      text: 'Arrow of Yggdrasil — Astral Supernova!',
      style: 'climactic supreme finisher piercing shout at full power, soaring, triumphant',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Tch! Still on the wind!',
      style: 'agile ranger recovering mid-stride from a blow, fast, defiant',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> My bowstring... snaps... <breath> Yggdrasil... carry me...',
      style: 'wounded elven ranger falling in battle, breathless, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Swift as starlight, true as the World-Tree — no shadow outruns my arrow!',
      style: 'triumphant noble elven bowmaster sign-off, bright, proud, serene',
      space: 'big',
      maxSec: 7.05
    }
  ]),
  ...makePack('sylvara', 'ja', [
    {
      cue: 'select',
      text: 'シルヴァラ。樹海に煌めくすべての星が、我が弦を導く。',
      style: 'noble agile elven bowmaster character select line, clear, serene',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '構えるがいいわ――風はすでに、あなたの心臓を捉えている！',
      style: 'spirited elven huntress duel challenge, brisk, poised, dramatic',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: '貫け！',
      style: 'crisp bow-release battle cry, sharp, fast',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '星風よ！',
      style: 'agile archer volley bark, crisp, energetic',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: '星樹の連射――降り注げ！',
      style: 'dynamic elven bowmaster loosing arrow rain, urgent, bright',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'ゾディアック狙撃――縫い止める！',
      style: 'razor-focused sniper shot battle cry, intense, sharp',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'ゼファー・スターロック――十二星雨！',
      style: 'soaring acrobatic overdrive invocation, heroic, brisk',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'スーパーノヴァ照準――黄金の追尾矢よ、翔べ！',
      style: 'blistering overdrive barrage shout, intense, soaring',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '世界樹よ、我が弓に！',
      style: 'fast urgent supreme bow-draw cry before release, crisp, brisk',
      space: 'mid',
      atempo: 1.08,
      maxSec: 1.42
    },
    {
      cue: 'true_ult_fire',
      text: 'ユグドラシルの矢――アストラル・スーパーノヴァ！',
      style: 'climactic supreme finisher piercing shout at full power, radiant, heroic',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'くっ！風は止まらない！',
      style: 'agile ranger recovering from a hit, fast, reactive',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 弦が……切れる…… <breath> 世界樹よ……還ります……',
      style: 'wounded elven huntress falling in defeat, breathless, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '星光のごとく疾く、世界樹のごとく気高く――我が矢を逃れる影などないわ！',
      style: 'victorious noble elven huntress proclamation, proud, luminous',
      space: 'big',
      maxSec: 7.05
    }
  ]),

  // 3. VEX-09 (EN + JP)
  ...makePack('vex09', 'en', [
    {
      cue: 'select',
      text: 'Unit VEX-Zero-Nine online. Combat telemetry locked.',
      style: 'composed tactical mecha-android boot greeting, crisp, cool, steady',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Hostile signature acquired — initiating Positron purge!',
      style: 'cool cybernetic valkyrie combat lock-on call, crisp, brisk, focused',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'Sever!',
      style: 'precision plasma blade strike bark, fast, clinical',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Plasma cut!',
      style: 'decisive cyber slash shout, crisp, sharp',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Fin-Funnels — diamond grid, fire!',
      style: 'composed mecha pilot commanding autonomous funnels, urgent, tactical',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Positron Rail-Cross — EMP lock!',
      style: 'high-output overdrive beam command, sharp, lethal',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Valkyrie Frame — Hyper-Prism Barrage!',
      style: 'dramatic orbital overdrive deployment call, brisk, commanding',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Limiter off — Hyper-Positron Annihilator!',
      style: 'cool intense limiter-release ultimate shout, fierce, crisp',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Orbital relay — target locked!',
      style: 'rapid tactical satellite lock call before buster beam, crisp, brisk',
      space: 'mid',
      atempo: 1.08,
      maxSec: 1.50
    },
    {
      cue: 'true_ult_fire',
      text: 'Project Gung-Zero-Nine — Singularity Buster!',
      style: 'climactic full-output orbital rail-cannon discharge shout, explosive, resolute',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Kh! Shield holding!',
      style: 'armored cyber android absorbing impact without flinching, fast, tight',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> Core reactor... critical... <breath> VEX-Zero-Nine... offline...',
      style: 'damaged mecha android powering down in defeat, breathless, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Target neutralized with zero margin of error — Singularity Valkyrie standing by.',
      style: 'composed victorious mecha-android mission report, cool, confident',
      space: 'big',
      maxSec: 7.05
    }
  ]),
  ...makePack('vex09', 'ja', [
    {
      cue: 'select',
      text: '機体番号ヴェクス・ゼロナイン、起動。戦闘テレメトリ完了。',
      style: 'composed tactical mecha-android boot greeting, cool, crisp, steady',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '敵性反応を捕捉――ポジトロン殲滅プロトコルを開始する！',
      style: 'cool cyber valkyrie pre-battle lock-on call, crisp, brisk, focused',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: '斬り裂く！',
      style: 'precision plasma blade strike bark, fast, sharp',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'プラズマ斬！',
      style: 'decisive cyber slash shout, crisp, tight',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'フィン・ファンネル展開――斉射！',
      style: 'composed mecha pilot commanding autonomous funnels, urgent, crisp',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'ポジトロン十字砲火――電磁ロック！',
      style: 'high-output overdrive beam command, sharp, lethal',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'ヴァルキリー・フレーム――ハイパープリズム一斉掃射！',
      style: 'dramatic orbital overdrive deployment call, brisk, commanding',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'リミッター解除――ハイパーポジトロン殲滅砲！',
      style: 'intense limiter-release ultimate shout, fierce, crisp',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '衛星ロック――発射準備！',
      style: 'rapid clipped tactical lock-on command before buster fire, fast, crisp',
      space: 'mid',
      atempo: 1.06,
      maxSec: 1.50
    },
    {
      cue: 'true_ult_fire',
      text: 'プロジェクト・グングゼロナイン――シンギュラリティ・バスター！',
      style: 'climactic full-output orbital rail-cannon discharge shout, explosive, resolute',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'くっ！シールド健在！',
      style: 'armored cyber android absorbing impact, fast, controlled',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> コア炉心……臨界…… <breath> ヴェクス・ゼロナイン……機能停止……',
      style: 'damaged mecha android shutting down in defeat, breathless, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '誤差ゼロで標的沈黙を確認――シンギュラリティ・ヴァルキリー、待機へ移行する。',
      style: 'composed victorious mecha-android mission sign-off, cool, confident',
      space: 'big',
      maxSec: 7.05
    }
  ]),

  // 4. Chronos (EN + JP)
  ...makePack('chronos', 'en', [
    {
      cue: 'select',
      text: 'Chronos. Past, present, and ruin turn upon my dial.',
      style: 'enigmatic sovereign of time on character select, deep, archaic, composed',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Your final second has already been inscribed in brass!',
      style: 'omen-laden temporal archon duel challenge, crisp, commanding, brisk',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'Sever time!',
      style: 'sharp dual clock-glaive slash cry, fast, crisp',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Twelfth cut!',
      style: 'decisive temporal blade finisher bark, sharp, cold',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'Chrono-Schism — rewind the thread!',
      style: 'commanding time archon snapping temporal rifts, urgent, dramatic',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Paradox Scissors — carve their fate!',
      style: 'merciless paradox assassin slash call, sharp, intense',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Paradox Convergence — Astrolabe Shatter!',
      style: 'grand overdrive temporal convergence call, resonant, brisk',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Broken Timelines — converge and rend!',
      style: 'fierce mirage-clone overdrive shout, urgent, dramatic',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'Halt, world! Hear the Twelfth Bell!',
      style: 'brisk imperious time-stop incantation spoken swiftly without long pauses, resonant, crisp',
      space: 'big',
      atempo: 1.05,
      maxSec: 3.15
    },
    {
      cue: 'true_ult_fire',
      text: 'Eternal Zero — shatter across eternity!',
      style: 'climactic supreme finisher glass-shatter shout at full power, echoing, explosive',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Ghh! Mere scratch in time!',
      style: 'composed archon shrugging off a sudden hit, fast, gritty',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> The pendulum... stills... <breath> even eternity... ends...',
      style: 'fallen time-sovereign fading as the clock stops, breathless, hollow',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Twelve bells toll across a frozen cosmos — every timeline converges in my hand!',
      style: 'triumphant enigmatic time-sovereign proclamation, majestic, composed',
      space: 'big',
      maxSec: 7.05
    }
  ]),
  ...makePack('chronos', 'ja', [
    {
      cue: 'select',
      text: 'クロノス。過去も未来も終焉も、すべては我が文字盤の上だ。',
      style: 'enigmatic time-sovereign character select line, deep, composed, archaic',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '貴様の最期の秒針は、すでに黄金の歯車へ刻まれている！',
      style: 'commanding temporal archon duel declaration, crisp, ominous, brisk',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: '時を断つ！',
      style: 'sharp dual clock-glaive slash cry, fast, crisp',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '刻め！',
      style: 'decisive temporal blade finisher bark, sharp, intense',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'クロノ・スキズム――因果を巻き戻す！',
      style: 'commanding time archon snapping temporal rifts, urgent, dramatic',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'パラドックス断頭刃――運命ごと裂けろ！',
      style: 'merciless paradox assassin slash call, sharp, intense',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'パラドックス収束――天球儀よ、砕けろ！',
      style: 'grand overdrive temporal convergence call, resonant, brisk',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: '交錯せよ破断世界線――すべてを斬り刻め！',
      style: 'fierce mirage-clone overdrive shout, urgent, dramatic',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '時よ止まれ――第十二の鐘！',
      style: 'brisk imperious time-stop incantation spoken swiftly without long pauses, resonant, crisp',
      space: 'big',
      atempo: 1.05,
      maxSec: 3.15
    },
    {
      cue: 'true_ult_fire',
      text: 'エターナル・ゼロ――時空ごと砕け散れ！',
      style: 'climactic supreme finisher shatter shout at full power, echoing, explosive',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'ぐっ……刹那の傷だ！',
      style: 'composed archon reacting to an impact, fast, gritty',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 振り子が、止まる……永遠も、終わるか……',
      style: 'fallen time-sovereign collapsing in defeat, breathless, fading',
      space: 'big',
      maxSec: 7.50
    },
    {
      cue: 'victory',
      text: '凍てついた宇宙に十二の鐘が鳴り響く――あらゆる時間軸は我が掌中に収束した！',
      style: 'victorious time-sovereign proclamation, majestic, deep, composed',
      space: 'big',
      maxSec: 7.05
    }
  ]),

  // 5. Torgar (EN + JP)
  ...makePack('torgar', 'en', [
    {
      cue: 'select',
      text: 'Torgar! My anvil forged the bones of this world!',
      style: 'thunderous dwarf-king juggernaut greeting, booming bass warmth, proud',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Brace your spine! The World-Forge comes crashing down!',
      style: 'booming earth-shaker duel challenge, fierce, heroic, brisk',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'Crush!',
      style: 'heavy war-maul slam grunt-shout, explosive, deep',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: 'Anvil smash!',
      style: 'thunderous maul finisher bark, forceful, gritty',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: "Runic Anvil — ricochet and flatten 'em!",
      style: 'boisterous forge-king slamming a runic anvil monolith, urgent, booming',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Volcanic Ricochet — magma breaker!',
      style: 'explosive magma-strike battle cry, fierce, thunderous',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Crucible Halo — Ragnarok Grand-Slam!',
      style: 'epic world-breaker home-run overdrive shout, booming, triumphant',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Caldera Meteor — smash through the wall!',
      style: 'ferocious seismic grand-slam call, explosive, deep',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'World-Forge — awaken!',
      style: 'fast urgent one-breath war-cry before sky-leap, crisp, booming, rapid pace',
      space: 'mid',
      atempo: 1.06,
      maxSec: 2.12
    },
    {
      cue: 'true_ult_fire',
      text: 'Mjolnir Genesis — Continental Sunder!',
      style: 'earth-shattering supreme meteor-spike impact roar at full power, volcanic, triumphant',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'Grah! Iron holds!',
      style: 'unyielding iron colossus shrugging off heavy damage, gruff, fast',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> The forge... cools... <breath> stand firm... mountain...',
      style: 'giant warrior king toppling like a mountain, breathless, deep, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: 'Bedrock split and steel tempered in magma — none withstand the World-Breaker King!',
      style: 'booming victorious forge-king laugh-free proclamation, proud, resonant',
      space: 'big',
      maxSec: 7.05
    }
  ]),
  ...makePack('torgar', 'ja', [
    {
      cue: 'select',
      text: 'トルガーだ！この大地の骨組みは、俺の鉄床が鍛え上げた！',
      style: 'thunderous forge-king juggernaut character select roar, warm deep bass, proud',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '歯を食いしばれ！世界炉の鉄槌が真っ向から叩き潰すぞ！',
      style: 'booming earth-shaker duel challenge, fierce, heroic, brisk',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: '潰れろ！',
      style: 'heavy war-maul slam battle cry, explosive, deep',
      space: 'tight'
    },
    {
      cue: 'attack_2',
      text: '鉄槌だ！',
      style: 'thunderous maul finisher bark, forceful, gritty',
      space: 'tight'
    },
    {
      cue: 'skill_std',
      text: 'ルーンの鉄床よ――跳ね回って薙ぎ倒せ！',
      style: 'boisterous forge-king slamming a runic anvil monolith, urgent, booming',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: '噴火連弾――マグマごとぶち抜け！',
      style: 'explosive magma-strike battle cry, fierce, thunderous',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '坩堝の後光よ燃えろ――ラグナロク大粉砕！',
      style: 'epic world-breaker grand-slam overdrive shout, booming, heroic',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'カルデラ隕石打撃――壁まで吹き飛べ！',
      style: 'ferocious seismic grand-slam call, explosive, deep',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '世界炉よ――目覚めろ！',
      style: 'fast urgent one-breath war-cry before sky-leap, crisp, booming, rapid pace',
      space: 'mid',
      atempo: 1.06,
      maxSec: 2.12
    },
    {
      cue: 'true_ult_fire',
      text: 'ミョルニル・ジェネシス――大陸粉砕！',
      style: 'earth-shattering supreme meteor-spike impact roar at full power, volcanic',
      space: 'big'
    },
    {
      cue: 'hurt',
      text: 'ぐおっ！鋼は砕けん！',
      style: 'unyielding iron colossus taking a hit, gruff, fast',
      space: 'tight'
    },
    {
      cue: 'death',
      text: '<gasp> 炉の火が……消える…… <breath> 揺るぐなよ……鉄の砦……',
      style: 'giant warrior king falling in defeat, breathless, deep, fading',
      space: 'big'
    },
    {
      cue: 'victory',
      text: '岩盤を割りマグマで鋼を鍛える――世界砕きの王の前に立てる奴などおらんわ！',
      style: 'booming victorious forge-king proclamation, proud, resonant, heroic',
      space: 'big',
      maxSec: 7.05
    }
  ])
];

function readVertexConfig() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    throw new Error('Missing .env.local in repository root.');
  }
  const raw = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  const keyMatch = raw.match(/^VERTEX_API_KEY=(.+)$/m);
  const projMatch = raw.match(/^VERTEX_PROJECT_ID=(.+)$/m);
  const apiKey = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
  const projectId = projMatch ? projMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
  if (!apiKey || !projectId) {
    throw new Error('VERTEX_API_KEY or VERTEX_PROJECT_ID is empty or missing in .env.local.');
  }
  return { apiKey, projectId };
}

function scrubSecrets(text, apiKey, projectId) {
  return String(text || '')
    .split(apiKey)
    .join('[REDACTED]')
    .split(projectId)
    .join('[REDACTED]');
}

function parseRetryWaitMs(res, bodyText, attempt) {
  const retryHeader = res.headers.get('retry-after');
  if (retryHeader) {
    const secs = Number(retryHeader);
    if (Number.isFinite(secs) && secs > 0) return Math.min(35000, Math.round(secs * 1000) + 250);
  }
  const jsonDelayMatch = bodyText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (jsonDelayMatch) {
    const secs = Number(jsonDelayMatch[1]);
    if (Number.isFinite(secs) && secs > 0) return Math.min(35000, Math.round(secs * 1000) + 350);
  }
  const schedule = [1800, 3600, 7500, 14000, 24000];
  return schedule[Math.min(schedule.length - 1, attempt - 1)];
}

let paceChain = Promise.resolve();
let lastRequestStartMs = 0;

function waitForRequestPace(minIntervalMs = MIN_REQUEST_INTERVAL_MS) {
  const slot = paceChain.then(async () => {
    if (lastRequestStartMs > 0) {
      const elapsed = Date.now() - lastRequestStartMs;
      const waitMs = minIntervalMs - elapsed;
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    lastRequestStartMs = Date.now();
  });
  paceChain = slot.catch(() => {});
  return slot;
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

async function requestVertexTtsWav({ apiKey, projectId }, clip, stats) {
  if (LOCKED_TTS_MODEL !== 'models/gemini-3.8-flash-tts') {
    throw new Error('Policy violation: model must be models/gemini-3.8-flash-tts');
  }
  const profile = CHAMPION_PROFILES[clip.hero];
  if (!profile) {
    throw new Error(`Unknown champion profile: ${clip.hero}`);
  }
  const stylePrefix = clip.lang === 'ja' ? profile.jaPrefix : profile.enPrefix;
  const endpoint = `https://aiplatform.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}/locations/global/publishers/google/models/gemini-3.8-flash-tts:generateContent`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: clip.text,
            speechMetadata: { style: `${stylePrefix}${clip.style}` }
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: profile.voiceName }
        }
      }
    }
  };

  const label = `${clip.lang}/${clip.id}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    await waitForRequestPace(MIN_REQUEST_INTERVAL_MS);
    if (stats.httpRequestsUsed >= MAX_HTTP_REQUESTS_PER_RUN) {
      throw new Error(
        `Circuit breaker tripped: reached MAX_HTTP_REQUESTS_PER_RUN (${MAX_HTTP_REQUESTS_PER_RUN})`
      );
    }
    stats.httpRequestsUsed++;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
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
    const scrubbed = scrubSecrets(bodyText, apiKey, projectId).slice(0, 260);
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const waitMs = parseRetryWaitMs(res, bodyText, attempt);
      console.warn(`[RETRY] ${label} HTTP ${res.status} (attempt ${attempt}/5), waiting ${waitMs}ms...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    throw new Error(`Vertex TTS HTTP ${res.status} for ${label}: ${scrubbed}`);
  }
  throw new Error(`Vertex TTS exhausted retries for ${label}`);
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

function runFfmpegMaster(rawWavPath, outMp3Path, profile, spaceKey, atempo) {
  const trimChain =
    'silenceremove=start_periods=1:start_duration=0.004:start_threshold=-54dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse';
  const tempoChain = buildAtempoChain(atempo);
  const eqCompChain = profile.eqComp.join(',');
  const spaceChain = profile.spaces[spaceKey] || profile.spaces.tight;
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
  let result = runFfmpegMaster(rawWavPath, outMp3Path, profile, clip.space, atempo);

  for (let pass = 0; pass < 3 && clip.maxSec && result.durationSec > clip.maxSec; pass++) {
    const targetSec = Math.max(0.4, clip.maxSec - 0.05);
    const neededAtempo = Math.min(
      1.85,
      Math.max(atempo + 0.04, (atempo * result.durationSec) / targetSec)
    );
    if (Math.abs(neededAtempo - atempo) < 0.01) break;
    atempo = neededAtempo;
    result = runFfmpegMaster(rawWavPath, outMp3Path, profile, clip.space, atempo);
  }
  return { ...result, atempoUsed: atempo };
}

async function generateSingleClip(vertexCfg, clip, tmpDir, stats) {
  const outDir = clip.lang === 'ja' ? OUT_DIR_JA : OUT_DIR_EN;
  const outMp3 = path.join(outDir, `${clip.id}.mp3`);
  const label = `${clip.lang}/${clip.id}.mp3`;
  const rawWavPath = path.join(tmpDir, `${clip.lang}_${clip.id}.raw.wav`);
  const { wavBuffer, tokens } = await requestVertexTtsWav(vertexCfg, clip, stats);
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
  const force = process.argv.includes('--force');

  const vertexCfg = readVertexConfig();
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

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-batch2-tts-'));
  let cursor = 0;

  try {
    const workers = [];
    for (let w = 0; w < Math.min(CONCURRENCY, pendingClips.length); w++) {
      workers.push(
        (async () => {
          while (cursor < pendingClips.length) {
            const clip = pendingClips[cursor++];
            await generateSingleClip(vertexCfg, clip, tmpDir, stats);
          }
        })()
      );
    }
    await Promise.all(workers);
    console.log(
      `Done! httpRequestsUsed=${stats.httpRequestsUsed}/${MAX_HTTP_REQUESTS_PER_RUN}, Generated=${stats.generatedCount}, Skipped=${stats.skippedCount}, Total tokens used: ${stats.totalTokens}`
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
