#!/usr/bin/env node
/**
 * Arcane vs. Steel — 11-Track Original Soundtrack Generator (Lyria 3 + FFmpeg Seamless Loop Mastering)
 *
 * STRICT MODEL & SPEND POLICY:
 * - Reads `VERTEX_API_KEY`, `VERTEX_PROJECT_ID`, and (fallback-only) `GEMINI_API_KEY` from `.env.local`.
 * - NEVER prints or logs any API key or project ID.
 * - Strictly locked to Lyria models (`lyria-3-pro-preview`, `lyria-3.5`, `lyria-3-clip-preview`, `lyria-002`).
 * - Hard circuit breaker: `MAX_BGM_REQUESTS_PER_RUN = 22`.
 * - Masters every track into `44.1kHz`, `112kbps` stereo `.mp3` at `-15 LUFS`, trimmed to `~60s–105s`
 *   with a circular `acrossfade` loop seam (`0` click, `0` dead air).
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
const OUT_DIR = path.join(REPO_ROOT, 'assets', 'bgm');

export const ALLOWED_LYRIA_MODELS = [
  'lyria-3-pro-preview',
  'lyria-3.5',
  'lyria-3-clip-preview',
  'lyria-002'
];
export const MAX_BGM_REQUESTS_PER_RUN = 22;

const STRICT_INSTRUMENTAL_GUARD =
  '100% instrumental video game soundtrack, strictly no vocals, no sung lyrics, no spoken words, continuous energetic loop-friendly arrangement without long silent pauses or fade-outs.';

export const BGM_TRACK_CATALOG = [
  {
    id: 'bgm_title_select',
    prompt:
      'Noble dark-fantasy RPG fighting game title screen and champion select theme at 96 BPM, crisp baroque harpsichord arpeggios, warm sweeping minor-key strings, solemn heroic French horn brass, and distant atmospheric wordless cathedral choir pads, regal gothic anticipation, full stereo mix, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_cathedral',
    prompt:
      'Gothic Sanctuary cathedral fighting game battle soundtrack at 138 BPM, soaring dramatic pipe organ lead, urgent staccato string ostinatos, heroic dark-fantasy brass stabs, and driving symphonic battle percussion with timpani and taiko punch, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_sanctuary',
    prompt:
      'Celestial Radiant Sanctuary temple battle soundtrack at 142 BPM, luminous sparkling concert harp runs, soaring wordless angelic choir pads, triumphant noble trumpets, bright uplifting strings, and crisp heroic orchestral fighting percussion, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_sylvan',
    prompt:
      'Sylvan Starlight Grove forest arena battle theme at 140 BPM, mystical expressive wooden Celtic flute melody, agile elven spiccato strings, shimmering harp, acoustic bodhran and swift duel hand-drum percussion, strictly no choir and no vocals, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_boneyard',
    prompt:
      'Abyssal Necropolis Boneyard dark arena soundtrack at 134 BPM, ominous deep contrabass and low brass swells, haunting gothic minor harpsichord, bone-rattling timpani, and dark dramatic wordless requiem choir, tense relentless combat pulse, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_clocktower',
    prompt:
      'Grand Horologium Clocktower fighting stage theme at 148 BPM, crisp ticking mechanical clockwork woodblock and gear polyrhythms, virtuosic rapid baroque-romantic solo violin lead, bright harpsichord, and driving chrono-symphony orchestra, strictly no vocals and no choir, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_inferno',
    prompt:
      'Laywaste of Inferno volcanic domain overdrive battle theme at 156 BPM, scorching apocalyptic low brass, blazing intense wordless orchestral choir swells, heavy distorted rhythm guitars, and thunderous double-kick symphonic metal percussion, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_shogunate',
    prompt:
      'Shogunate Storm Japanese castle battle theme at 154 BPM, ferocious virtuosic Tsugaru shamisen lead, thunderous o-daiko and shime-daiko taiko drums, fierce shakuhachi bamboo flute phrases, and razor-sharp samurai battle rock electric guitar and bass, strictly no vocals and no choir, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_cob_monitor',
    prompt:
      'Cute playful high-BPM cyber-pop darksynth and orchestral hybrid battle theme at 162 BPM, sparkling bright anime chiptune bell melodies, bouncy punchy synthwave bassline, crisp electronic drums, and dramatic pizzicato plus string orchestra stabs, vibrant energetic cyber-hacker idol battle vibe, strictly instrumental with zero vocals and zero lyrics, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_adventure_pilgrimage',
    prompt:
      'Sweeping HD-2D JRPG expedition battle march at 136 BPM, heroic French horn fanfare, soaring adventurous string melody, crisp snare drum march, lively woodwinds, and epic fantasy exploration momentum, strictly no vocals and no spoken words, ' +
      STRICT_INSTRUMENTAL_GUARD
  },
  {
    id: 'bgm_boss_malphas',
    prompt:
      'Terrifying colossal demon boss battle theme at 160 BPM, monumental cathedral pipe organ, menacing gothic wordless choir, abyssal low trombones and tuba, and crushing double-kick symphonic metal boss percussion, relentless climactic intensity, ' +
      STRICT_INSTRUMENTAL_GUARD
  }
];

function readEnvConfig() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    throw new Error('Missing .env.local in repository root.');
  }
  const raw = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  const getVar = (name) => {
    const m = raw.match(new RegExp(`^${name}=(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
  };
  const vertexApiKey = getVar('VERTEX_API_KEY');
  const projectId = getVar('VERTEX_PROJECT_ID');
  const geminiApiKey = getVar('GEMINI_API_KEY');
  if (!vertexApiKey && !geminiApiKey) {
    throw new Error('Missing VERTEX_API_KEY or GEMINI_API_KEY in .env.local.');
  }
  return { vertexApiKey, projectId, geminiApiKey };
}

function scrubSecrets(text, cfg) {
  let out = String(text || '');
  for (const sec of [cfg?.vertexApiKey, cfg?.projectId, cfg?.geminiApiKey]) {
    if (sec) out = out.split(sec).join('[REDACTED]');
  }
  return out;
}

function detectAudioExtension(buf, mimeType = '') {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'RIFF') return '.wav';
  if (buf.length >= 3 && buf.subarray(0, 3).toString('ascii') === 'ID3') return '.mp3';
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return '.mp3';
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'OggS') return '.ogg';
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'fLaC') return '.flac';
  if (/mp3|mpeg/i.test(mimeType)) return '.mp3';
  if (/wav/i.test(mimeType)) return '.wav';
  if (/ogg/i.test(mimeType)) return '.ogg';
  if (/flac/i.test(mimeType)) return '.flac';
  return '.mp3';
}

function extractInlineAudio(parsed) {
  const candidates = parsed?.candidates || [];
  for (const cand of candidates) {
    const parts = cand?.content?.parts || [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return {
          buf: Buffer.from(part.inlineData.data, 'base64'),
          mimeType: part.inlineData.mimeType || ''
        };
      }
    }
  }
  const pred = parsed?.predictions?.[0];
  if (pred?.audioContent) {
    return {
      buf: Buffer.from(pred.audioContent, 'base64'),
      mimeType: pred.mimeType || 'audio/wav'
    };
  }
  return null;
}

function buildLyriaCandidateSpecs(cfg, prompt) {
  const specs = [];
  const gcBody = (withModalities) =>
    withModalities
      ? {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['AUDIO', 'TEXT'] }
        }
      : {
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        };

  if (cfg.vertexApiKey && cfg.projectId) {
    specs.push({
      tag: 'vertex:lyria-3-pro-preview',
      model: 'lyria-3-pro-preview',
      url: `https://aiplatform.googleapis.com/v1beta1/projects/${encodeURIComponent(cfg.projectId)}/locations/global/publishers/google/models/lyria-3-pro-preview:generateContent`,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.vertexApiKey },
      body: gcBody(true),
      fallbackBodyNoModalities: gcBody(false)
    });
  }
  if (cfg.geminiApiKey) {
    for (const model of ['lyria-3-pro-preview', 'lyria-3.5', 'lyria-3-clip-preview']) {
      specs.push({
        tag: `gemini:${model}`,
        model,
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.geminiApiKey },
        body: gcBody(true),
        fallbackBodyNoModalities: gcBody(false)
      });
    }
  }
  if (cfg.vertexApiKey && cfg.projectId) {
    specs.push({
      tag: 'vertex:lyria-002',
      model: 'lyria-002',
      url: `https://us-central1-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/locations/us-central1/publishers/google/models/lyria-002:predict`,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.vertexApiKey },
      body: {
        instances: [{ prompt, negative_prompt: 'vocals, singing, speech, lyrics, voiceover' }],
        parameters: { sample_count: 1 }
      }
    });
  }
  return specs;
}

async function fetchLyriaTrackAudio(cfg, track, stats) {
  const specs = buildLyriaCandidateSpecs(cfg, track.prompt);
  let lastErr = null;
  for (const spec of specs) {
    if (!ALLOWED_LYRIA_MODELS.includes(spec.model)) {
      throw new Error(`Policy violation: disallowed model ${spec.model}`);
    }
    const payloads = spec.fallbackBodyNoModalities
      ? [spec.body, spec.fallbackBodyNoModalities]
      : [spec.body];
    for (let pIdx = 0; pIdx < payloads.length; pIdx++) {
      for (let retry = 0; retry < 2; retry++) {
        if (stats.httpRequestsUsed >= MAX_BGM_REQUESTS_PER_RUN) {
          throw new Error(
            `Circuit breaker tripped: reached MAX_BGM_REQUESTS_PER_RUN (${MAX_BGM_REQUESTS_PER_RUN})`
          );
        }
        stats.httpRequestsUsed++;
        const res = await fetch(spec.url, {
          method: 'POST',
          headers: spec.headers,
          body: JSON.stringify(payloads[pIdx])
        });
        const bodyText = await res.text();
        if (res.ok) {
          const parsed = JSON.parse(bodyText);
          const audio = extractInlineAudio(parsed);
          if (audio && audio.buf.length > 4096) {
            return { ...audio, modelTag: spec.tag };
          }
          lastErr = new Error(`Empty audio response from ${spec.tag} for ${track.id}`);
          break;
        }
        const scrubbed = scrubSecrets(bodyText, cfg).slice(0, 260);
        lastErr = new Error(`${spec.tag} HTTP ${res.status}: ${scrubbed}`);
        if (res.status === 400 && pIdx === 0 && payloads.length > 1) {
          break; // try payload without responseModalities
        }
        if ((res.status === 429 || res.status >= 500) && retry === 0) {
          await new Promise((r) => setTimeout(r, 3500));
          continue;
        }
        pIdx = payloads.length; // move to next endpoint spec
        break;
      }
    }
  }
  throw lastErr || new Error(`All Lyria endpoints failed for ${track.id}`);
}

function probeDurationSec(filePath) {
  const out = execFileSync(
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
  return Number.parseFloat(out) || 0;
}

function runFfmpeg(args) {
  return execFileSync('ffmpeg', ['-y', '-hide_banner', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024
  });
}

function masterSeamlessBgm(rawInputPath, outMp3Path, tmpDir, trackId) {
  const trimmedWav = path.join(tmpDir, `${trackId}.trimmed.wav`);
  const bodyWav = path.join(tmpDir, `${trackId}.body.wav`);
  const normWav = path.join(tmpDir, `${trackId}.norm.wav`);

  // Step 1: Decode to 44.1kHz stereo WAV & trim leading/trailing dead air
  runFfmpeg([
    '-loglevel',
    'error',
    '-i',
    rawInputPath,
    '-af',
    'highpass=f=32,silenceremove=start_periods=1:start_duration=0.015:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_duration=0.015:start_threshold=-48dB,areverse',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    trimmedWav
  ]);

  const trimmedDur = probeDurationSec(trimmedWav);
  // Step 2: Fit continuous loop body into ~68s..96s before 3.0s circular acrossfade -> ~65s..93s final
  if (trimmedDur > 97.0) {
    const startSec = trimmedDur > 106.0 ? 2.5 : 1.0;
    const takeSec = Math.min(94.0, Math.max(70.0, trimmedDur - startSec - 1.5));
    runFfmpeg([
      '-loglevel',
      'error',
      '-ss',
      startSec.toFixed(3),
      '-t',
      takeSec.toFixed(3),
      '-i',
      trimmedWav,
      '-c:a',
      'pcm_s16le',
      bodyWav
    ]);
  } else if (trimmedDur < 66.0) {
    const repeats = trimmedDur < 36.0 ? 3 : 2;
    const cf = Math.min(2.5, Math.max(0.8, trimmedDur * 0.08));
    if (repeats === 3) {
      runFfmpeg([
        '-loglevel',
        'error',
        '-i',
        trimmedWav,
        '-i',
        trimmedWav,
        '-i',
        trimmedWav,
        '-filter_complex',
        `[0:a][1:a]acrossfade=d=${cf.toFixed(2)}:c1=qsin:c2=qsin[a01];[a01][2:a]acrossfade=d=${cf.toFixed(2)}:c1=qsin:c2=qsin[out]`,
        '-map',
        '[out]',
        '-t',
        '92.0',
        '-c:a',
        'pcm_s16le',
        bodyWav
      ]);
    } else {
      runFfmpeg([
        '-loglevel',
        'error',
        '-i',
        trimmedWav,
        '-i',
        trimmedWav,
        '-filter_complex',
        `[0:a][1:a]acrossfade=d=${cf.toFixed(2)}:c1=qsin:c2=qsin[out]`,
        '-map',
        '[out]',
        '-t',
        '92.0',
        '-c:a',
        'pcm_s16le',
        bodyWav
      ]);
    }
  } else {
    fs.copyFileSync(trimmedWav, bodyWav);
  }

  // Step 3: Two-pass EBU R128 loudness normalization targeting -15.0 LUFS (-1.2 dBTP)
  let statsJson = null;
  try {
    const res = execFileSync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-i',
        bodyWav,
        '-af',
        'loudnorm=I=-15:TP=-1.2:LRA=9:print_format=json',
        '-f',
        'null',
        '-'
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }
    );
    const matches = res.match(/\{[\s\S]*"input_i"[\s\S]*?\}/g);
    if (matches && matches.length > 0) {
      statsJson = JSON.parse(matches[matches.length - 1]);
    }
  } catch (err) {
    const stderrText = String(err.stderr || err.message || '');
    const matches = stderrText.match(/\{[\s\S]*"input_i"[\s\S]*?\}/g);
    if (matches && matches.length > 0) {
      try {
        statsJson = JSON.parse(matches[matches.length - 1]);
      } catch (_) {}
    }
  }

  const loudnormFilter =
    statsJson && Number.isFinite(Number(statsJson.input_i))
      ? `loudnorm=I=-15:TP=-1.2:LRA=9:measured_I=${statsJson.input_i}:measured_TP=${statsJson.input_tp}:measured_LRA=${statsJson.input_lra}:measured_thresh=${statsJson.input_thresh}:offset=${statsJson.target_offset}:linear=true`
      : 'loudnorm=I=-15:TP=-1.2:LRA=9';

  runFfmpeg([
    '-loglevel',
    'error',
    '-i',
    bodyWav,
    '-af',
    loudnormFilter,
    '-ar',
    '44100',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    normWav
  ]);

  // Step 4: Seamless circular acrossfade loop seam (3.0s overlap: tail wraps continuously to start)
  const normDur = probeDurationSec(normWav);
  const overlap = Math.min(3.0, Math.max(1.5, normDur * 0.05));
  runFfmpeg([
    '-loglevel',
    'error',
    '-i',
    normWav,
    '-filter_complex',
    `[0:a]atrim=0:${overlap.toFixed(3)},asetpts=PTS-STARTPTS[head];[0:a]atrim=${overlap.toFixed(3)},asetpts=PTS-STARTPTS[body];[body][head]acrossfade=d=${overlap.toFixed(3)}:c1=qsin:c2=qsin,alimiter=limit=0.84:level=false:attack=3:release=50[out]`,
    '-map',
    '[out]',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-c:a',
    'libmp3lame',
    '-b:a',
    '112k',
    outMp3Path
  ]);

  return {
    durationSec: probeDurationSec(outMp3Path),
    sizeBytes: fs.statSync(outMp3Path).size
  };
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlySet = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const force = process.argv.includes('--force');

  const cfg = readEnvConfig();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const targets = BGM_TRACK_CATALOG.filter((t) => !onlySet || onlySet.has(t.id));
  const pending = [];
  let skippedCount = 0;

  for (const track of targets) {
    const outPath = path.join(OUT_DIR, `${track.id}.mp3`);
    if (!force && !onlySet && fs.existsSync(outPath)) {
      skippedCount++;
      continue;
    }
    pending.push(track);
  }

  const stats = { httpRequestsUsed: 0, generatedCount: 0, skippedCount };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avs-lyria3-bgm-'));
  let cursor = 0;

  try {
    const workers = [];
    const CONCURRENCY = 2;
    for (let w = 0; w < Math.min(CONCURRENCY, pending.length); w++) {
      workers.push(
        (async () => {
          while (cursor < pending.length) {
            const track = pending[cursor++];
            const outPath = path.join(OUT_DIR, `${track.id}.mp3`);
            const { buf, mimeType, modelTag } = await fetchLyriaTrackAudio(cfg, track, stats);
            const ext = detectAudioExtension(buf, mimeType);
            const rawPath = path.join(tmpDir, `${track.id}.raw${ext}`);
            fs.writeFileSync(rawPath, buf);
            const { durationSec, sizeBytes } = masterSeamlessBgm(rawPath, outPath, tmpDir, track.id);
            stats.generatedCount++;
            console.log(
              `[OK][${modelTag}] ${track.id}.mp3 | dur=${durationSec.toFixed(2)}s | size=${(sizeBytes / 1024).toFixed(1)}KB`
            );
          }
        })()
      );
    }
    await Promise.all(workers);
    console.log(
      `Done! httpRequestsUsed=${stats.httpRequestsUsed}/${MAX_BGM_REQUESTS_PER_RUN}, Generated=${stats.generatedCount}, Skipped=${stats.skippedCount}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const isCliEntry =
  process.argv[1] &&
  fs.existsSync(process.argv[1]) &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename);

if (isCliEntry) {
  main().catch((err) => {
    console.error('[ERR]', err.message);
    process.exit(1);
  });
}
