#!/usr/bin/env node
/**
 * Arcane vs. Steel — Champion Voice Pack Generator (Seraphina Prototype)
 *
 * STRICT API KEY POLICY:
 * - Reads `GEMINI_API_KEY` from local gitignored `.env.local` ONLY.
 * - Strictly locked to `models/gemini-3.8-flash-tts` (never calls image or general text models).
 * - Masters raw 24kHz PCM WAV via `ffmpeg` (leading/trailing silence trim, studio anime vocal EQ,
 *   gentle dynamics compression, subtle celestial cathedral reflection on ultimates, peak limiter)
 *   into compact 44.1kHz 96kbps `.mp3` assets in `assets/voices/`.
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
const OUT_DIR = path.join(REPO_ROOT, 'assets', 'voices');

// HARD-LOCKED MODEL GUARD — DO NOT CHANGE TO ANY NON-TTS MODEL
const LOCKED_TTS_MODEL = 'models/gemini-3.8-flash-tts';
const VOICE_NAME = 'Kore';
const PERSONA_STYLE_PREFIX =
  'noble crystal-clear anime Seraphic Archpriestess in a dark-fantasy fighting game, ';

export const SERAPHINA_VOICE_CLIPS = [
  {
    id: 'seraphina_select',
    text: 'Seraphina. My sanctuary stands unbroken.',
    style: 'serene yet commanding anime archpriestess, luminous, regal, confident',
    preset: 'cathedral'
  },
  {
    id: 'seraphina_intro',
    text: 'Step into the light... or be purified by it!',
    style: 'noble anime battle priestess readying her staff for a duel, resolute, dramatic',
    preset: 'combat_mid'
  },
  {
    id: 'seraphina_attack_1',
    text: 'Radiant light!',
    style: 'crisp anime combat battle cry while casting a spell, fast, sharp, energetic',
    preset: 'combat_tight'
  },
  {
    id: 'seraphina_attack_2',
    text: 'Purify!',
    style: 'fierce anime sorceress spell-cast shout, crisp, clear final syllable, energetic',
    preset: 'combat_tight'
  },
  {
    id: 'seraphina_skill_std',
    text: 'Stained-glass benediction!',
    style: 'commanding anime high priestess unleashing a sacred sanctuary spell, bright, urgent',
    preset: 'combat_mid'
  },
  {
    id: 'seraphina_skill_crimson',
    text: 'Crimson Tribunal — kneel!',
    style: 'fierce righteous inquisitor archpriestess casting divine judgment spears, intense, sharp',
    preset: 'combat_mid'
  },
  {
    id: 'seraphina_ult_std',
    text: 'Seraphim pinions — Organ of Light!',
    style: 'epic anime overdrive ultimate invocation, brisk, soaring, majestic, powerful',
    preset: 'cathedral'
  },
  {
    id: 'seraphina_ult_crimson',
    text: 'Crucible of Light — purge them!',
    style: 'wrathful celestial inquisitor unleashing an overdrive ultimate, brisk, fierce, commanding',
    preset: 'cathedral'
  },
  {
    id: 'seraphina_true_ult_charge',
    text: 'Sacred heavens, gather to my wings!',
    style: 'urgent anime supreme ultimate prayer rising rapidly in power, brisk, luminous',
    preset: 'cathedral',
    atempo: 1.18
  },
  {
    id: 'seraphina_true_ult_fire',
    text: 'Final Grace — Genesis Lumen!',
    style: 'climactic anime supreme finisher beam shout at full power, explosive, radiant, heroic',
    preset: 'cathedral'
  },
  {
    id: 'seraphina_hurt',
    text: 'Ah! Not yet!',
    style: 'sharp anime combat impact cry followed immediately by defiant grit, fast, reactive',
    preset: 'combat_tight'
  },
  {
    id: 'seraphina_death',
    text: '<gasp> Forgive me... <breath> the light... fades...',
    style: 'wounded anime heroine collapsing in defeat, breathless, sorrowful, fading',
    preset: 'cathedral'
  },
  {
    id: 'seraphina_victory',
    text: 'Six Seraphim pinions unfurl — every shadow bows before Final Grace!',
    style: 'majestic victorious anime archpriestess after winning a duel, radiant, proud, noble',
    preset: 'cathedral'
  }
];

function readApiKey() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    throw new Error('Missing .env.local in repository root.');
  }
  const raw = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  const match = raw.match(/^GEMINI_API_KEY=(.+)$/m);
  const key = match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
  if (!key) {
    throw new Error('GEMINI_API_KEY is empty or missing in .env.local.');
  }
  return key;
}

async function synthesizeRawWav(apiKey, clip) {
  if (LOCKED_TTS_MODEL !== 'models/gemini-3.8-flash-tts') {
    throw new Error(`Policy violation: model must be models/gemini-3.8-flash-tts`);
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${LOCKED_TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: clip.text,
            speechMetadata: {
              style: `${PERSONA_STYLE_PREFIX}${clip.style}`
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: VOICE_NAME
          }
        }
      }
    }
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const bodyText = await res.text();
    if (res.ok) {
      const parsed = JSON.parse(bodyText);
      const inline = parsed.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline?.data) {
        throw new Error(`No audio inlineData returned for ${clip.id}`);
      }
      return {
        wavBuffer: Buffer.from(inline.data, 'base64'),
        tokens: parsed.usageMetadata?.totalTokenCount || 0
      };
    }
    const scrubbed = bodyText.split(apiKey).join('[REDACTED]').slice(0, 260);
    if (attempt === 3) {
      throw new Error(`TTS HTTP ${res.status} for ${clip.id}: ${scrubbed}`);
    }
    await new Promise((r) => setTimeout(r, 700 * attempt));
  }
}

function masterVoiceToMp3(rawWavPath, outMp3Path, preset, atempo = 1.0) {
  // Trim ONLY leading dead air so cast barks fire on frame 0 without clipping natural breath/consonant tails!
  const trimChain = 'silenceremove=start_periods=1:start_duration=0.004:start_threshold=-56dB';
  const tempoChain = atempo && Math.abs(atempo - 1.0) > 0.01 ? `,atempo=${atempo.toFixed(2)}` : '';

  const eqCompChain = [
    'highpass=f=85',
    'equalizer=f=260:t=q:w=1.2:g=-1.5',
    'equalizer=f=3600:t=q:w=1.1:g=2.4',
    'acompressor=threshold=-16dB:ratio=2.6:attack=6:release=90:makeup=2.6dB'
  ].join(',');

  let spaceChain = 'afade=t=in:st=0:d=0.005';
  if (preset === 'cathedral') {
    spaceChain = 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.10,aecho=0.88:0.86:30|52:0.13|0.07';
  } else if (preset === 'combat_mid') {
    spaceChain = 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.90:0.88:22:0.07';
  }

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

  const durOut = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      outMp3Path
    ],
    { encoding: 'utf8' }
  ).trim();

  return {
    durationSec: Number.parseFloat(durOut) || 0,
    sizeBytes: fs.statSync(outMp3Path).size
  };
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlyIds = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null;
  const force = process.argv.includes('--force');

  const apiKey = readApiKey();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-seraphina-tts-'));

  let totalTokens = 0;
  try {
    for (const clip of SERAPHINA_VOICE_CLIPS) {
      if (onlyIds && !onlyIds.has(clip.id)) continue;
      const outMp3 = path.join(OUT_DIR, `${clip.id}.mp3`);
      if (!force && fs.existsSync(outMp3) && !onlyIds) {
        console.log(`[SKIP] ${clip.id}.mp3 already exists (pass --force to regenerate)`);
        continue;
      }
      const rawWavPath = path.join(tmpDir, `${clip.id}.raw.wav`);
      const { wavBuffer, tokens } = await synthesizeRawWav(apiKey, clip);
      totalTokens += tokens;
      fs.writeFileSync(rawWavPath, wavBuffer);
      const { durationSec, sizeBytes } = masterVoiceToMp3(
        rawWavPath,
        outMp3,
        clip.preset,
        clip.atempo || 1.0
      );
      console.log(
        `[OK] ${clip.id}.mp3 | dur=${durationSec.toFixed(2)}s | size=${(sizeBytes / 1024).toFixed(1)}KB | tokens=${tokens}`
      );
    }
    console.log(`Done! Total gemini-3.8-flash-tts tokens used: ${totalTokens}`);
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
