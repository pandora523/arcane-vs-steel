#!/usr/bin/env node
/**
 * Arcane vs. Steel — Champion #13 EX RAIJIN EX ("THE TEMPEST FIST") Full EN + JP Voice Pack
 *
 * STRICT VERTEX AI TTS POLICY:
 * - Reads `VERTEX_API_KEY` and `VERTEX_PROJECT_ID` from local gitignored `.env.local` ONLY.
 * - Never logs, prints, or exposes secret keys or project IDs in stdout/stderr/errors.
 * - Strictly locked to `models/gemini-3.8-flash-tts` on Vertex AI global endpoint
 *   (`publishers/google/models/gemini-3.8-flash-tts:generateContent`), 1 clip per request.
 * - Hard safety circuit breaker (`MAX_HTTP_REQUESTS_PER_RUN = 60`) + 429/5xx retry backoff.
 * - Generates all 17 EN + 17 JP = 34 mastered 44.1kHz 96kbps mono `.mp3` files:
 *     - `assets/voices/raijin_<cue>.mp3` (English)
 *     - `assets/voices/ja/raijin_<cue>.mp3` (Japanese anime seiyuu)
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
const MAX_HTTP_REQUESTS_PER_RUN = 60;
const CONCURRENCY = 2;
const MIN_REQUEST_INTERVAL_MS = 450;

const RAIJIN_PROFILE = {
  voiceName: 'Alnilam',
  enPrefix:
    'fierce spirited anime thunder-fist martial arts brawler champion with crisp intense fighting-spirit determination in an arcade fighting game, ',
  jaPrefix:
    'Japanese anime fighting game voice acting, fierce hot-blooded thunder-fist martial artist champion, crisp intense shonen-seinen fighting-spirit Japanese seiyuu delivery, ',
  eqComp: [
    'highpass=f=76',
    'equalizer=f=180:t=q:w=1.1:g=1.8',
    'equalizer=f=275:t=q:w=1.3:g=-1.5',
    'equalizer=f=3400:t=q:w=1.1:g=2.6',
    'equalizer=f=6200:t=q:w=1.2:g=1.2',
    'acompressor=threshold=-16dB:ratio=2.8:attack=5:release=85:makeup=2.7dB'
  ],
  spaces: {
    big: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.09,aecho=0.88:0.86:26|48:0.12|0.06',
    mid: 'afade=t=in:st=0:d=0.005,apad=pad_dur=0.04,aecho=0.90:0.88:20:0.07',
    tight: 'afade=t=in:st=0:d=0.005'
  }
};

function makePack(lang, clips) {
  return clips.map((c) => ({
    hero: 'raijin',
    lang,
    id: `raijin_${c.cue}`,
    ...c
  }));
}

export const VOICE_CLIP_CATALOG = [
  ...makePack('en', [
    {
      cue: 'select',
      text: 'Raijin! Ready to trade blows with the storm?',
      style: 'confident battle-ready martial arts champion on character select, punchy, bold, warm grit',
      space: 'big'
    },
    {
      cue: 'intro',
      text: 'Step into the storm! My iron fists answer only to thunder!',
      style: 'fierce anime martial arts brawler pre-match challenge, crisp, brisk, thunderous conviction',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'Haaah!',
      style: 'explosive sharp karate punch kiai shout, punchy, tight',
      space: 'tight',
      maxSec: 0.72
    },
    {
      cue: 'attack_2',
      text: 'Break!',
      style: 'snappy thunderclap uppercut strike call, crisp, ferocious',
      space: 'tight',
      maxSec: 0.78
    },
    {
      cue: 'skill_std',
      text: 'Thunderstep Breaker — brace yourself!',
      style: 'blazing high-speed martial arts dash punch callout, fierce, urgent',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: 'Rail-Step Overvolt — pierce through!',
      style: 'high-voltage blitz shockwave fist strike shout, sharp, electric intensity',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: 'Tempest Hundred Fists — feel the sky shatter!',
      style: 'heroic anime fighting-game overdrive barrage shout, building fury and power',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: 'Storm-Emperor Hundred Fists — sky pillar, descend!',
      style: 'electrifying storm-emperor ultimate unleashing lightning barrage, triumphant, thunderous',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: 'All the thunder in heaven... Raijin stance!',
      style: 'intense focused martial arts supreme charge, brisk powerful build-up',
      space: 'big',
      maxSec: 2.95
    },
    {
      cue: 'true_ult_fire',
      text: 'Heaven-Splitting Raijin Crash!',
      style: 'all-out cataclysmic anime meteor-fist dive finisher roar, maximum power and clarity',
      space: 'big',
      maxSec: 2.35
    },
    {
      cue: 'hurt',
      text: 'Ghhk—! Solid hit!',
      style: 'gritty tough brawler taking a heavy strike and shrugging it off, tense, crisp',
      space: 'tight',
      maxSec: 1.15
    },
    {
      cue: 'hurt_short',
      text: 'Tch—!',
      style: 'short sharp gritty martial artist hit grunt, snappy arcade bark',
      space: 'tight',
      maxSec: 0.65
    },
    {
      cue: 'skill_short',
      text: 'Thunderstep!',
      style: 'crisp explosive arcade special move bark, fast and punchy',
      space: 'mid',
      maxSec: 1.35
    },
    {
      cue: 'skill_alt_short',
      text: 'Overvolt!',
      style: 'sharp electric surge arcade special bark, snappy and fierce',
      space: 'mid',
      maxSec: 1.35
    },
    {
      cue: 'ult_short',
      text: 'Hundred Fists!',
      style: 'explosive snappy overdrive burst shout, high energy arcade bark',
      space: 'big',
      maxSec: 1.75
    },
    {
      cue: 'death',
      text: 'Heh... what a storm... next round is mine...',
      style: 'defiant exhausted martial artist falling to one knee with crackling pride and breathy resolve',
      space: 'big',
      maxSec: 3.1
    },
    {
      cue: 'victory',
      text: 'The thunder never stops! Come back when your fists can shake the sky!',
      style: 'exhilarated victorious anime brawler raising his smoking fist, proud, spirited, clear',
      space: 'big',
      maxSec: 3.85
    }
  ]),
  ...makePack('ja', [
    {
      cue: 'select',
      text: '雷神だ！嵐と拳を交える覚悟はあるか？',
      style: 'confident battle-ready anime martial artist on character select, heroic bold Japanese delivery',
      space: 'big'
    },
    {
      cue: 'intro',
      text: '嵐へ踏み込め！俺の鉄拳に応えるのは雷鳴だけだ！',
      style: 'fierce spirited anime brawler pre-match challenge, brisk intense Japanese seiyuu conviction',
      space: 'mid',
      maxSec: 3.78
    },
    {
      cue: 'attack_1',
      text: 'ハァッ！',
      style: 'explosive sharp martial arts punch kiai shout, tight snappy Japanese battle cry',
      space: 'tight',
      maxSec: 0.72
    },
    {
      cue: 'attack_2',
      text: '砕けろ！',
      style: 'fierce uppercut strike shout, crisp explosive Japanese combat call',
      space: 'tight',
      maxSec: 0.78
    },
    {
      cue: 'skill_std',
      text: '雷歩砕撃！吹き飛べ！',
      style: 'blazing high-speed lightning dash punch special call, fierce urgent Japanese delivery',
      space: 'mid'
    },
    {
      cue: 'skill_alt',
      text: '極雷連歩！貫け！',
      style: 'high-voltage blitz shockwave strike shout, sharp electric Japanese intensity',
      space: 'mid'
    },
    {
      cue: 'ult_std',
      text: '疾風百烈拳！天を砕く雷を喰らえ！',
      style: 'heroic anime fighting-game overdrive fist barrage roar, surging power and passion',
      space: 'big'
    },
    {
      cue: 'ult_alt',
      text: '雷帝百烈拳！天柱よ、落ちろ！',
      style: 'thunderous storm-emperor ultimate unleashing lightning pillar, triumphant intense Japanese shout',
      space: 'big'
    },
    {
      cue: 'true_ult_charge',
      text: '天の雷よ、集え…雷神の構え！',
      style: 'focused brisk supreme martial arts charge, rising storm intensity',
      space: 'big',
      maxSec: 2.95
    },
    {
      cue: 'true_ult_fire',
      text: '裂天・雷神落！',
      style: 'all-out cataclysmic anime meteor-fist finisher roar, crisp maximum power Japanese delivery',
      space: 'big',
      maxSec: 2.35
    },
    {
      cue: 'hurt',
      text: 'ぐっ！やるな！',
      style: 'tough brisk brawler taking a heavy hit with grit, short punchy Japanese delivery',
      space: 'tight',
      maxSec: 1.2
    },
    {
      cue: 'hurt_short',
      text: 'ぐあっ！',
      style: 'sharp gritty martial artist impact grunt, crisp half-second arcade bark',
      space: 'tight',
      maxSec: 0.65
    },
    {
      cue: 'skill_short',
      text: '雷歩砕撃！',
      style: 'crisp explosive arcade special move bark, fast punchy Japanese shout',
      space: 'mid',
      maxSec: 1.35
    },
    {
      cue: 'skill_alt_short',
      text: '極雷連歩！',
      style: 'sharp electric surge arcade special bark, snappy fierce Japanese shout',
      space: 'mid',
      maxSec: 1.35
    },
    {
      cue: 'ult_short',
      text: '百烈拳！',
      style: 'explosive snappy overdrive burst shout, high energy arcade Japanese bark',
      space: 'big',
      maxSec: 1.75
    },
    {
      cue: 'death',
      text: '見事な嵐だ…次は負けん…',
      style: 'defiant exhausted martial artist dropping to one knee, crisp proud Japanese delivery',
      space: 'big',
      maxSec: 3.1
    },
    {
      cue: 'victory',
      text: '雷鳴は止まらない！空を揺らす拳を磨いて出直してこい！',
      style: 'exhilarated victorious anime martial arts champion raising his fist, proud spirited Japanese delivery',
      space: 'big',
      maxSec: 3.85
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
  const stylePrefix = clip.lang === 'ja' ? RAIJIN_PROFILE.jaPrefix : RAIJIN_PROFILE.enPrefix;
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
          prebuiltVoiceConfig: { voiceName: RAIJIN_PROFILE.voiceName }
        }
      }
    }
  };

  const label = `${clip.lang}/${clip.id}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    await waitForRequestPace(MIN_REQUEST_INTERVAL_MS);
    if (stats.httpRequestsUsed >= MAX_HTTP_REQUESTS_PER_RUN) {
      throw new Error(`Circuit breaker tripped (${MAX_HTTP_REQUESTS_PER_RUN})`);
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
      if (!inline?.data) throw new Error(`No audio inlineData returned for ${label}`);
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
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' }
  ).trim();
  return Number.parseFloat(durOut) || 0;
}

function runFfmpegMaster(rawWavPath, outMp3Path, spaceKey, atempo) {
  const trimChain =
    'silenceremove=start_periods=1:start_duration=0.004:start_threshold=-54dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse';
  const tempoChain = buildAtempoChain(atempo);
  const eqCompChain = RAIJIN_PROFILE.eqComp.join(',');
  const spaceChain = RAIJIN_PROFILE.spaces[spaceKey] || RAIJIN_PROFILE.spaces.tight;
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
  let atempo = clip.atempo || 1.0;
  let result = runFfmpegMaster(rawWavPath, outMp3Path, clip.space, atempo);
  for (let pass = 0; pass < 3 && clip.maxSec && result.durationSec > clip.maxSec; pass++) {
    const targetSec = Math.max(0.4, clip.maxSec - 0.05);
    const neededAtempo = Math.min(1.85, Math.max(atempo + 0.04, (atempo * result.durationSec) / targetSec));
    if (Math.abs(neededAtempo - atempo) < 0.01) break;
    atempo = neededAtempo;
    result = runFfmpegMaster(rawWavPath, outMp3Path, clip.space, atempo);
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
  const force = process.argv.includes('--force');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlySet = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean))
    : null;

  const vertexCfg = readVertexConfig();
  fs.mkdirSync(OUT_DIR_EN, { recursive: true });
  fs.mkdirSync(OUT_DIR_JA, { recursive: true });

  const pendingClips = [];
  const stats = { totalTokens: 0, generatedCount: 0, skippedCount: 0, httpRequestsUsed: 0 };

  for (const clip of VOICE_CLIP_CATALOG) {
    if (onlySet && !onlySet.has(clip.id) && !onlySet.has(`${clip.lang}:${clip.id}`)) continue;
    const outDir = clip.lang === 'ja' ? OUT_DIR_JA : OUT_DIR_EN;
    const outMp3 = path.join(outDir, `${clip.id}.mp3`);
    if (!force && !onlySet && fs.existsSync(outMp3)) {
      stats.skippedCount++;
      continue;
    }
    pendingClips.push(clip);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-raijin-tts-'));
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
      `Done! httpRequestsUsed=${stats.httpRequestsUsed}/${MAX_HTTP_REQUESTS_PER_RUN}, Generated=${stats.generatedCount}, Skipped=${stats.skippedCount}, Total tokens=${stats.totalTokens}`
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
