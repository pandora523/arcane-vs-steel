#!/usr/bin/env node
/**
 * Arcane vs. Steel — Snappy Arcade Combat Bark Pack Generator (96 New Short MP3s)
 *
 * STRICT VERTEX AI TTS POLICY:
 * - Reads `VERTEX_API_KEY` and `VERTEX_PROJECT_ID` from local gitignored `.env.local` ONLY.
 * - Never logs, prints, or exposes secret keys or project IDs in stdout/stderr/errors.
 * - Strictly locked to `models/gemini-3.8-flash-tts` on Vertex AI global endpoint
 *   (`publishers/google/models/gemini-3.8-flash-tts:generateContent`), 1 clip per request (solo pure synthesis).
 * - Hard safety circuit breaker (`MAX_HTTP_REQUESTS_PER_RUN = 165`) + 429/5xx retry backoff.
 * - Generates 4 short snappy cues x 12 personas x EN+JP = 96 new `.mp3` files (`44.1kHz`, `96kbps`, mono):
 *     - `<prefix>_hurt_short.mp3`      (<= 0.70s, tight)
 *     - `<prefix>_skill_short.mp3`     (<= 1.45s, mid)
 *     - `<prefix>_skill_alt_short.mp3` (<= 1.45s, mid)
 *     - `<prefix>_ult_short.mp3`       (<= 1.85s, big)
 * - Never touches or overwrites any existing full voice MP3s!
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
const MAX_HTTP_REQUESTS_PER_RUN = 165;
const CONCURRENCY = 2;
const MIN_REQUEST_INTERVAL_MS = 450;

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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.88:0.86:30|52:0.13|0.07',
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.88:0.86:28|50:0.13|0.07',
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.88:0.86:26|48:0.12|0.06',
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.87:0.85:34|62:0.14|0.08',
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.86:0.84:34|66:0.15|0.08',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.88:0.86:26:0.09',
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
  },
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.87:0.85:32|58:0.15|0.08',
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.07,aecho=0.89:0.87:24|44:0.11|0.05',
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.87:0.85:33|66:0.14|0.07',
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
      big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.08,aecho=0.87:0.85:28|54:0.13|0.07',
      mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.89:0.87:22:0.07',
      tight: 'afade=t=in:st=0:d=0.005'
    }
  }
};

function makeSnappyPack(hero, enLines, jaLines) {
  const buildSet = (lang, lines) => {
    const hurtStyle =
      hero === 'nyx' && lang === 'ja'
        ? '一瞬で可愛く驚いた10代美少女アニメキャラの単音被弾声、後ろに言葉を続けず極短く素早く'
        : 'crisp single-syllable arcade fighting-game impact grunt/gasp ONLY with zero trailing words, ultra-short, sharp, reactive';
    const skillStyle =
      hero === 'nyx' && lang === 'ja'
        ? '可愛い美少女アニメヒロインのテンポ抜群で歯切れ良い短い必殺スキル名コール、高めのキュートな声'
        : 'snappy crisp arcade fighting-game skill name callout, brisk, punchy, urgent';
    const ultStyle =
      hero === 'nyx' && lang === 'ja'
        ? 'キラキラ元気な美少女アニメヒロインの勢いある短いオーバードライブ技コール、高めの甘い声で一気に'
        : 'punchy high-tempo arcade overdrive name shout, crisp, explosive, brisk';

    return [
      {
        hero,
        lang,
        id: `${hero}_hurt_short`,
        cue: 'hurt_short',
        text: lines.hurt,
        style: hurtStyle,
        space: 'tight',
        maxSec: 0.64,
        hardMaxSec: 0.70
      },
      {
        hero,
        lang,
        id: `${hero}_skill_short`,
        cue: 'skill_short',
        text: lines.skill,
        style: skillStyle,
        space: 'mid',
        maxSec: 1.38,
        hardMaxSec: 1.45
      },
      {
        hero,
        lang,
        id: `${hero}_skill_alt_short`,
        cue: 'skill_alt_short',
        text: lines.skillAlt,
        style: skillStyle,
        space: 'mid',
        maxSec: 1.38,
        hardMaxSec: 1.45
      },
      {
        hero,
        lang,
        id: `${hero}_ult_short`,
        cue: 'ult_short',
        text: lines.ult,
        style: ultStyle,
        space: 'big',
        maxSec: 1.78,
        hardMaxSec: 1.85
      }
    ];
  };
  return [...buildSet('en', enLines), ...buildSet('ja', jaLines)];
}

export const SNAPPY_BARK_CATALOG = [
  ...makeSnappyPack(
    'seraphina',
    {
      hurt: 'Ah!',
      skill: 'Benediction!',
      skillAlt: 'Crimson Spears!',
      ult: 'Organ of Light!'
    },
    {
      hurt: 'くっ！',
      skill: '祝福よ！',
      skillAlt: '紅蓮の槍！',
      ult: '光の聖堂！'
    }
  ),
  ...makeSnappyPack(
    'aethelgard',
    {
      hurt: 'Ghh!',
      skill: 'Trinity Rush!',
      skillAlt: 'Dragoon Dive!',
      ult: 'Pentagram Blitz!'
    },
    {
      hurt: 'ぐあっ！',
      skill: 'トリニティ・ラッシュ！',
      skillAlt: 'ヘヴンズフォール！',
      ult: '五芒星乱舞！'
    }
  ),
  ...makeSnappyPack(
    'kazemaru',
    {
      hurt: 'Tch!',
      skill: 'Zantetsuken!',
      skillAlt: 'Ten-Fold Sever!',
      ult: 'Sixfold Blitz!'
    },
    {
      hurt: 'うあっ！',
      skill: 'らいもん一閃！',
      skillAlt: '十文字斬り！',
      ult: '六道雷迅！'
    }
  ),
  ...makeSnappyPack(
    'ignissol',
    {
      hurt: 'Gah!',
      skill: 'Solar Trinity!',
      skillAlt: 'Meteor Triad!',
      ult: 'Black-Sun Eclipse!'
    },
    {
      hurt: 'ぐあっ！',
      skill: '太陽三柱！',
      skillAlt: 'メテオ連弾！',
      ult: '黒日蝕！'
    }
  ),
  ...makeSnappyPack(
    'freyja',
    {
      hurt: 'Ngh!',
      skill: 'Lightning Javelins!',
      skillAlt: 'Javelin Tempest!',
      ult: 'Valkyrie Volley!'
    },
    {
      hurt: 'うっ！',
      skill: '雷槍斉射！',
      skillAlt: '烈風投槍！',
      ult: '神槍の雨！'
    }
  ),
  ...makeSnappyPack(
    'malakor',
    {
      hurt: 'Hmph!',
      skill: 'Soul Guillotine!',
      skillAlt: 'Crimson Hook!',
      ult: 'Thanatos Harvest!'
    },
    {
      hurt: 'ぬっ！',
      skill: '魂の鎖！',
      skillAlt: '処刑の鉤！',
      ult: '冥府の収穫！'
    }
  ),
  ...makeSnappyPack(
    'nyx',
    {
      hurt: 'Kya!',
      skill: 'Pop-Up!',
      skillAlt: 'Blue Screen!',
      ult: 'Starlight Overclock!'
    },
    {
      hurt: 'きゃっ！',
      skill: 'ポップアップ！',
      skillAlt: 'ブルースクリーン！',
      ult: 'スター・オーバークロック！'
    }
  ),
  ...makeSnappyPack(
    'lyra',
    {
      hurt: 'Ngh!',
      skill: 'Borealis Prism!',
      skillAlt: 'Ice Guillotine!',
      ult: 'Winter Coronation!'
    },
    {
      hurt: 'あっ！',
      skill: '氷晶プリズム！',
      skillAlt: '氷の断頭台！',
      ult: '極光の戴冠！'
    }
  ),
  ...makeSnappyPack(
    'sylvara',
    {
      hurt: 'Nnh!',
      skill: 'Starwood Volley!',
      skillAlt: 'Zodiac Deadeye!',
      ult: 'Twelve-Star Rain!'
    },
    {
      hurt: 'うっ！',
      skill: '星樹の連射！',
      skillAlt: 'ゾディアック狙撃！',
      ult: '十二星雨！'
    }
  ),
  ...makeSnappyPack(
    'vex09',
    {
      hurt: 'Ngh!',
      skill: 'Fin-Funnels!',
      skillAlt: 'Rail-Cross!',
      ult: 'Hyper-Prism Barrage!'
    },
    {
      hurt: 'うっ！',
      skill: 'ファンネル射出！',
      skillAlt: '十字砲火！',
      ult: 'プリズム斉射！'
    }
  ),
  ...makeSnappyPack(
    'chronos',
    {
      hurt: 'Ghh!',
      skill: 'Chrono-Schism!',
      skillAlt: 'Paradox Scissors!',
      ult: 'Astrolabe Shatter!'
    },
    {
      hurt: 'ぐっ！',
      skill: '時空断絶！',
      skillAlt: 'パラドックス刃！',
      ult: '天球破砕！'
    }
  ),
  ...makeSnappyPack(
    'torgar',
    {
      hurt: 'Grah!',
      skill: 'Runic Anvil!',
      skillAlt: 'Magma Breaker!',
      ult: 'Ragnarok Slam!'
    },
    {
      hurt: 'ぬおっ！',
      skill: 'ルーンの鉄床！',
      skillAlt: '噴火連弾！',
      ult: 'ラグナロク粉砕！'
    }
  )
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
  const voiceName = clip.lang === 'ja' && profile.jaVoiceName ? profile.jaVoiceName : profile.voiceName;
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
          prebuiltVoiceConfig: { voiceName }
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

function runFfmpegMaster(rawWavPath, outMp3Path, profile, spaceKey, atempo, lang = 'en', hardCapSec = null) {
  const trimChain =
    'silenceremove=start_periods=1:start_duration=0.004:start_threshold=-56dB,areverse,silenceremove=start_periods=1:start_duration=0.025:start_threshold=-50dB,areverse';
  const tempoChain = buildAtempoChain(atempo);
  const eqArr = lang === 'ja' && profile.jaEqComp ? profile.jaEqComp : profile.eqComp;
  const spacesMap = lang === 'ja' && profile.jaSpaces ? profile.jaSpaces : profile.spaces;
  const eqCompChain = eqArr.join(',');
  const spaceChain = spacesMap[spaceKey] || spacesMap.tight;
  const tailCap =
    hardCapSec && hardCapSec > 0.2
      ? `,afade=t=out:st=${(hardCapSec - 0.06).toFixed(3)}:d=0.035`
      : '';
  const fullFilter = `${trimChain}${tempoChain},${eqCompChain},${spaceChain},alimiter=limit=0.92:attack=2:release=40${tailCap}`;

  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    rawWavPath,
    '-af',
    fullFilter
  ];
  if (hardCapSec && hardCapSec > 0.2) {
    args.push('-t', (hardCapSec - 0.025).toFixed(3));
  }
  args.push('-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', outMp3Path);

  execFileSync('ffmpeg', args, { stdio: 'pipe' });

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
    const targetSec = Math.max(0.32, clip.maxSec - 0.04);
    const neededAtempo = Math.min(
      1.68,
      Math.max(atempo + 0.04, (atempo * result.durationSec) / targetSec)
    );
    if (Math.abs(neededAtempo - atempo) < 0.01) break;
    atempo = neededAtempo;
    result = runFfmpegMaster(rawWavPath, outMp3Path, profile, clip.space, atempo, clip.lang);
  }

  if (clip.hardMaxSec && result.durationSec > clip.hardMaxSec) {
    result = runFfmpegMaster(
      rawWavPath,
      outMp3Path,
      profile,
      clip.space,
      atempo,
      clip.lang,
      clip.hardMaxSec
    );
  }
  return { ...result, atempoUsed: atempo };
}

async function generateSingleClip(vertexCfg, clip, tmpDir, stats) {
  const outDir = clip.lang === 'ja' ? OUT_DIR_JA : OUT_DIR_EN;
  const outMp3 = path.join(outDir, `${clip.id}.mp3`);
  const label = `${clip.lang}/${clip.id}.mp3`;
  const rawWavPath = path.join(tmpDir, `${clip.lang}_${clip.id}.raw.wav`);
  let mastered = null;
  for (let tryNum = 1; tryNum <= 2; tryNum++) {
    const { wavBuffer, tokens } = await requestVertexTtsWav(vertexCfg, clip, stats);
    stats.totalTokens += tokens;
    fs.writeFileSync(rawWavPath, wavBuffer);
    mastered = { ...masterVoiceToMp3(rawWavPath, outMp3, clip), tokens };
    if (mastered.durationSec >= 0.22 || tryNum === 2) break;
    console.warn(`[RETRY-SHORT] ${label} dur=${mastered.durationSec.toFixed(2)}s < 0.22s, retrying synthesis...`);
  }
  const { durationSec, sizeBytes, atempoUsed, tokens } = mastered;
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

  const targets = SNAPPY_BARK_CATALOG.filter((clip) => {
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

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-snappy-tts-'));
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
