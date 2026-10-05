// Accuracy test for BpmAnalyzer on synthetic band recordings.
// Run with: node tests/bpm-analyzer.test.js [--verbose]

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'src', 'js', 'bpm-detector.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const BpmAnalyzer = sandbox.BpmAnalyzer;
const BpmDetector = sandbox.BpmDetector;

const verbose = process.argv.includes('--verbose');

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(random) {
  return Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());
}

// --- Instruments: each adds a sound starting at sample `at` ---

function addKick(out, sr, at, vel) {
  let phase = 0;
  const len = Math.round(0.3 * sr);
  for (let i = 0; i < len && at + i < out.length; i++) {
    const t = i / sr;
    phase += 2 * Math.PI * (50 + 90 * Math.exp(-t / 0.03)) / sr;
    out[at + i] += vel * Math.sin(phase) * Math.exp(-t / 0.12);
  }
}

function addNoiseHit(out, sr, at, vel, decay, random, highpass) {
  const len = Math.round(decay * 6 * sr);
  let prev = 0;
  for (let i = 0; i < len && at + i < out.length; i++) {
    const x = random() * 2 - 1;
    const y = highpass ? x - prev : x;
    prev = x;
    out[at + i] += vel * y * Math.exp(-i / sr / decay);
  }
}

function addSnare(out, sr, at, vel, random) {
  addNoiseHit(out, sr, at, vel * 0.6, 0.08, random, false);
  const len = Math.round(0.2 * sr);
  for (let i = 0; i < len && at + i < out.length; i++) {
    const t = i / sr;
    out[at + i] += vel * 0.4 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.05);
  }
}

function addTone(out, sr, at, vel, freqs, attack, decay, length) {
  const len = Math.round(length * sr);
  for (let i = 0; i < len && at + i < out.length; i++) {
    const t = i / sr;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay) * Math.min(1, (length - t) / 0.02);
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    out[at + i] += vel * env * s / freqs.length;
  }
}

function addClick(out, sr, at, vel, freq) {
  addTone(out, sr, at, vel, [freq], 0.001, 0.01, 0.04);
}

const ROOTS = [55, 65.4, 73.4, 49];
const CHORDS = [[220, 277, 330], [262, 330, 392], [294, 370, 440], [196, 247, 294]];

// steps are 16th notes within a 4/4 bar unless the pattern says otherwise
const PATTERNS = {
  rock: { steps: 16, kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 2, 8, 10, 12], chords: true },
  four: { steps: 16, kick: [0, 4, 8, 12], snare: [4, 12], openhat: [2, 6, 10, 14], hat: [1, 3, 5, 7, 9, 11, 13, 15], bass: [2, 6, 10, 14] },
  funk: { steps: 16, kick: [0, 3, 6, 10], snare: [4, 12], ghost: [7, 9, 15], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], bass: [0, 3, 6, 10, 11] },
  sparse: { steps: 16, kick: [0, 8], snare: [4, 12], bass: [0, 4, 8, 12], chords: true },
  strum: { steps: 16, strum: [0, 4, 6, 10, 12, 14], bass: [0, 8] },
  shuffle: { steps: 12, kick: [0, 6], snare: [3, 9], hat: [0, 2, 3, 5, 6, 8, 9, 11], bass: [0, 2, 3, 5, 6, 8, 9, 11] },
  click: { steps: 4, click: [0, 1, 2, 3] },
  waltz: { steps: 12, beats: 3, kick: [0], snare: [4, 8], hat: [0, 2, 4, 6, 8, 10], bass: [0], chords: true }
};

function render(opts) {
  const sr = opts.sr;
  const random = rng(opts.seed);
  const out = new Float32Array(Math.round(opts.seconds * sr));
  const pattern = PATTERNS[opts.pattern];
  const beats = pattern.beats || 4;

  // opts.bpmAt(seconds) lets the band change tempo along the recording
  for (let bar = 0, barStart = 0, barSeconds = 0; barStart < opts.seconds; bar++, barStart += barSeconds) {
    barSeconds = beats * 60 / (opts.bpmAt ? opts.bpmAt(barStart) : opts.bpm);
    const stepSeconds = barSeconds / pattern.steps;
    const root = ROOTS[bar % ROOTS.length];
    const chord = CHORDS[bar % CHORDS.length];
    const hitAt = (step) => {
      const t = barStart + step * stepSeconds + gauss(random) * opts.jitterMs / 1000;
      return Math.max(0, Math.round(t * sr));
    };
    const vel = () => 0.8 + 0.2 * random();

    for (const s of pattern.kick || []) addKick(out, sr, hitAt(s), vel());
    for (const s of pattern.snare || []) addSnare(out, sr, hitAt(s), 0.8 * vel(), random);
    for (const s of pattern.ghost || []) addSnare(out, sr, hitAt(s), 0.2 * vel(), random);
    for (const s of pattern.hat || []) addNoiseHit(out, sr, hitAt(s), 0.25 * vel(), 0.02, random, true);
    for (const s of pattern.openhat || []) addNoiseHit(out, sr, hitAt(s), 0.25 * vel(), 0.12, random, true);
    for (const s of pattern.bass || []) addTone(out, sr, hitAt(s), 0.45 * vel(), [root], 0.005, 0.25, stepSeconds * 2);
    for (const s of pattern.strum || []) addTone(out, sr, hitAt(s), 0.4 * vel(), chord.concat([chord[0] * 2, chord[1] * 2]), 0.008, 0.3, stepSeconds * 4);
    for (const s of pattern.click || []) addClick(out, sr, hitAt(s), 0.8, s === 0 ? 1500 : 1000);
    if (pattern.chords) addTone(out, sr, hitAt(0), 0.12, chord, 0.03, 4, barSeconds);
  }

  // Phone microphone: weak low end, then a little room reverb
  let prevIn = 0;
  let prevOut = 0;
  const a = Math.exp(-2 * Math.PI * 150 / sr);
  for (let i = 0; i < out.length; i++) {
    const y = a * (prevOut + out[i] - prevIn);
    prevIn = out[i];
    prevOut = y;
    out[i] = y;
  }
  if (opts.reverb) {
    const delays = [0.0297, 0.0371, 0.0411, 0.0437].map((d) => Math.round(d * sr));
    const wet = new Float32Array(out.length);
    for (const d of delays) {
      const buf = new Float32Array(out.length);
      for (let i = 0; i < out.length; i++) {
        buf[i] = out[i] + (i >= d ? 0.78 * buf[i - d] : 0);
        wet[i] += buf[i] / delays.length;
      }
    }
    for (let i = 0; i < out.length; i++) out[i] = out[i] + opts.reverb * wet[i];
  }

  // Normalise to the requested level, then add room noise
  let sum = 0;
  for (let i = 0; i < out.length; i++) sum += out[i] * out[i];
  const gain = Math.pow(10, opts.levelDb / 20) / Math.sqrt(sum / out.length);
  const noiseRms = Math.pow(10, (opts.levelDb - opts.snrDb) / 20);
  let pink = 0;
  for (let i = 0; i < out.length; i++) {
    pink = 0.97 * pink + 0.03 * gauss(random);
    out[i] = out[i] * gain + noiseRms * (0.7 * gauss(random) + 4 * pink);
  }
  return out;
}

// Hand taps on a table: one hit per beat with human timing (jitter and drift)
function renderTaps(bpm, seconds, seed) {
  const sr = 48000;
  const random = rng(seed);
  const out = new Float32Array(seconds * sr);
  let drift = 0;
  for (let t = 0.3; t < seconds; t += 60 / (bpm + drift)) {
    const at = Math.round((t + gauss(random) * 0.03) * sr);
    const vel = 0.6 + 0.4 * random();
    for (let i = 0; i < 0.12 * sr && at + i < out.length; i++) {
      const x = i / sr;
      out[at + i] += vel * (0.8 * Math.sin(2 * Math.PI * 180 * x) * Math.exp(-x / 0.035) + 0.5 * (random() * 2 - 1) * Math.exp(-x / 0.008));
    }
    drift = 0.9 * drift + 0.2 * gauss(random);
  }
  for (let i = 0; i < out.length; i++) out[i] = 0.05 * out[i] + 0.002 * gauss(random);
  return out;
}

// Streams audio in 2048-sample batches (like the worklet) and records estimates
function analyze(signal, sr, options) {
  const analyzer = new BpmAnalyzer(sr, options);
  const estimates = [];
  for (let i = 0; i < signal.length; i += 2048) {
    const est = analyzer.push(signal.subarray(i, Math.min(signal.length, i + 2048)));
    if (est) estimates.push({ time: (i + 2048) / sr, bpm: est.bpm, confidence: est.confidence, stable: est.stable, beat: est.beat });
  }
  return estimates;
}

function firstStable(estimates) {
  return estimates.find((e) => e.stable) || null;
}

function classify(detected, truth) {
  if (!detected) return 'none';
  if (Math.abs(detected - truth) <= 1) return 'ok';
  for (const r of [2, 0.5, 1.5, 2 / 3, 3, 1 / 3]) {
    if (Math.abs(detected - truth * r) <= 1 * Math.max(1, r)) return 'x' + (Math.round(r * 100) / 100);
  }
  return 'wrong';
}

const cases = [];
const tempos = [62, 70, 78, 85, 92, 98, 104, 110, 116, 123.4, 128, 134, 140, 148, 156, 165, 174, 186, 198, 210];
let seed = 1;
for (const pattern of Object.keys(PATTERNS)) {
  for (const bpm of tempos) {
    cases.push({ pattern, bpm, sr: 48000, seconds: 15, jitterMs: 6, levelDb: -30, snrDb: 20, reverb: 0.3, seed: seed++ });
  }
}
// Different capture rates and input levels
for (const sr of [44100, 16000]) {
  for (const bpm of [80, 120, 160]) cases.push({ pattern: 'rock', bpm, sr, seconds: 15, jitterMs: 6, levelDb: -30, snrDb: 20, reverb: 0.3, seed: seed++ });
}
for (const levelDb of [-55, -12]) {
  for (const bpm of [80, 120, 160]) cases.push({ pattern: 'rock', bpm, sr: 48000, seconds: 15, jitterMs: 6, levelDb, snrDb: 20, reverb: 0.3, seed: seed++ });
}
for (const snrDb of [10, 5]) {
  for (const bpm of [80, 120, 160]) cases.push({ pattern: 'four', bpm, sr: 48000, seconds: 15, jitterMs: 6, levelDb: -30, snrDb, reverb: 0.3, seed: seed++ });
}

const tally = {};
const started = Date.now();
let audioSeconds = 0;
for (const c of cases) {
  const signal = render(c);
  audioSeconds += c.seconds;
  const estimates = analyze(signal, c.sr);
  const stable = firstStable(estimates);
  const final = estimates[estimates.length - 1];
  const finalBpm = final && final.stable ? final.bpm : 0;
  const verdict = classify(finalBpm, c.bpm);
  c.verdict = verdict;
  tally[verdict] = (tally[verdict] || 0) + 1;
  if (verbose || verdict !== 'ok') {
    console.log(
      (c.pattern + '        ').slice(0, 8) +
      ' bpm ' + String(c.bpm).padStart(5) +
      ' sr ' + c.sr + ' lvl ' + c.levelDb + ' snr ' + c.snrDb +
      ' | lock ' + (stable ? stable.time.toFixed(1) + 's@' + stable.bpm.toFixed(1) : '--') +
      ' | final ' + (finalBpm ? finalBpm.toFixed(2) : '--') +
      ' conf ' + (final ? final.confidence.toFixed(2) : '--') +
      ' -> ' + verdict
    );
  }
}

// Inputs without a beat must never lock
const noBeat = [];
for (const kind of ['noise', 'silence', 'drone']) {
  const sr = 48000;
  const random = rng(seed++);
  const signal = new Float32Array(15 * sr);
  for (let i = 0; i < signal.length; i++) {
    if (kind === 'noise') signal[i] = 0.03 * gauss(random);
    if (kind === 'drone') signal[i] = 0.05 * Math.sin(2 * Math.PI * 220 * i / sr) + 0.001 * gauss(random);
  }
  const estimates = analyze(signal, sr);
  const locked = estimates.some((e) => e.stable);
  noBeat.push(kind + ': ' + (locked ? 'LOCKED (bad)' : 'no lock'));
  if (locked) tally.falseLock = (tally.falseLock || 0) + 1;
}

// Live check in the tempo view, with the same settings as LiveTempoComponent.
// The set BPM is only a reference for equally supported readings; like the
// UI, readings are expressed at the song's level when half or double time.
const LIVE = { follow: true, minBpm: 40, maxBpm: 240, historySeconds: 12, estimateSeconds: 0.25, agreeCount: 6 };
const shownLive = (e, target) => BpmDetector.alignOctave(e.bpm, target);
const offBy = (e, tempoAt, target) => Math.abs(shownLive(e, target) - tempoAt(e.time)) / tempoAt(e.time);
// Jumps: once the reading has been right (within 2%), readings that stray more
// than 8% from the real tempo. Readings that are wrong before ever being right
// (a slow start on an ambiguous groove) are counted separately.
const strays = (estimates, tempoAt, target) => {
  const right = estimates.findIndex((e) => e.stable && offBy(e, tempoAt, target) <= 0.02);
  return right < 0 ? [] : estimates.slice(right).filter((e) => offBy(e, tempoAt, target) > 0.08);
};
const wrongStart = (estimates, tempoAt, target) => {
  const right = estimates.findIndex((e) => e.stable && offBy(e, tempoAt, target) <= 0.02);
  return estimates.slice(0, right < 0 ? estimates.length : right).filter((e) => e.stable).length;
};
const liveCases = [];
for (const pattern of Object.keys(PATTERNS)) {
  for (const target of [62, 85, 100, 128, 160, 190]) {
    for (const drift of [-0.05, 0, 0.04]) {
      liveCases.push({ pattern, target, bpm: target * (1 + drift), sr: 48000, seconds: 12, jitterMs: 6, levelDb: -30, snrDb: 20, reverb: 0.3, seed: seed++ });
    }
  }
}
let liveOk = 0;
let liveStrays = 0;
let liveWrongStart = 0;
for (const c of liveCases) {
  audioSeconds += c.seconds;
  const estimates = analyze(render(c), c.sr, Object.assign({ referenceBpm: c.target }, LIVE));
  const final = estimates[estimates.length - 1];
  const ok = final && final.stable && final.beat && Math.abs(shownLive(final, c.target) - c.bpm) <= 1;
  const stray = strays(estimates, () => c.bpm, c.target);
  const early = wrongStart(estimates, () => c.bpm, c.target);
  if (ok) liveOk++;
  liveStrays += stray.length;
  liveWrongStart += early;
  if (verbose || !ok || stray.length || early) {
    const stable = firstStable(estimates);
    console.log('live ' + (c.pattern + '        ').slice(0, 8) + ' set ' + c.target + ' playing ' + c.bpm.toFixed(1) +
      ' | lock ' + (stable ? stable.time.toFixed(1) + 's' : '--') +
      ' | final ' + (final && final.bpm ? shownLive(final, c.target).toFixed(2) : '--') +
      (early ? ' | wrong for ' + (early * LIVE.estimateSeconds).toFixed(1) + 's before right' : '') +
      (stray.length ? ' | ' + stray.length + ' jumps' : '') + (ok ? '' : ' -> FAIL'));
  }
}

// The band changes tempo mid-song: how long until the reading follows?
const followTimes = [];
const changes = [['rock', 100, 106], ['four', 100, 106], ['funk', 100, 106], ['strum', 100, 106], ['rock', 128, 121], ['shuffle', 128, 121]];
for (const [pattern, from, to] of changes) {
  const sr = 48000;
  const signal = render({ pattern, bpmAt: (t) => (t < 16 ? from : to), sr, seconds: 30, jitterMs: 6, levelDb: -30, snrDb: 20, reverb: 0.3, seed: seed++ });
  audioSeconds += 30;
  const estimates = analyze(signal, sr, Object.assign({ referenceBpm: from }, LIVE));
  const atChange = estimates.filter((e) => e.time <= 16).pop();
  const followed = estimates.find((e, i) => e.time > 16 && e.stable &&
    estimates.slice(i).every((later) => Math.abs(shownLive(later, from) - to) <= 1));
  const delay = followed ? followed.time - 16 : Infinity;
  followTimes.push(delay);
  // During the change itself readings pass through the values in between,
  // so strays are only counted away from it
  const stray = strays(estimates.filter((e) => e.time < 16 || e.time > 16 + delay), (t) => (t < 16 ? from : to), from);
  liveStrays += stray.length;
  console.log('tempo change ' + pattern + ': ' + (atChange && atChange.stable ? shownLive(atChange, from).toFixed(1) : '--') +
    ' before, follows ' + to + ' after ' + (followed ? delay.toFixed(1) + 's' : 'NEVER') +
    (stray.length ? ', ' + stray.length + ' jumps' : ''));
}

// Someone tapping well below a song's set BPM: the reading must follow the
// taps, never jump to (near) their double
let tapJumps = 0;
for (const bpm of [64, 66, 70]) {
  for (const tapSeed of [1, 2]) {
    audioSeconds += 24;
    const estimates = analyze(renderTaps(bpm, 24, seed++ + tapSeed), 48000, Object.assign({ referenceBpm: 100 }, LIVE));
    const jumps = estimates.filter((e) => e.stable && (shownLive(e, 100) > bpm * 1.3 || shownLive(e, 100) < bpm * 0.8));
    tapJumps += jumps.length;
    if (verbose || jumps.length) {
      console.log('taps ' + bpm + ' on a song set to 100: ' + jumps.length + ' jumped readings' +
        (jumps.length ? ' (e.g. ' + jumps[0].bpm.toFixed(1) + ' at ' + jumps[0].time.toFixed(1) + 's)' : ''));
    }
  }
}

const elapsed = (Date.now() - started) / 1000;
console.log('\nResults over ' + cases.length + ' recordings:', tally);
console.log('No-beat inputs: ' + noBeat.join(', '));
console.log('Analysis speed: ' + (audioSeconds / elapsed).toFixed(0) + 'x real time (including synthesis)');

// Half/double-time is inherently ambiguous at the extremes (the UI offers
// x2 and 1/2 buttons), so exact matches are required only in the core range.
const percent = (n, d) => (100 * n / d).toFixed(1) + '%';
const core = cases.filter((c) => c.bpm >= 85 && c.bpm <= 160);
const coreOk = core.filter((c) => c.verdict === 'ok').length;
const octaveOrOk = cases.filter((c) => c.verdict === 'ok' || c.verdict === 'x2' || c.verdict === 'x0.5').length;
console.log('Exact (+-1 BPM) in 85-160 BPM: ' + percent(coreOk, core.length) +
  ', exact overall: ' + percent(tally.ok || 0, cases.length) +
  ', exact or octave overall: ' + percent(octaveOrOk, cases.length));
console.log('Live check, exact (+-1 BPM): ' + percent(liveOk, liveCases.length) +
  ', jumps away from a right reading: ' + liveStrays +
  ', wrong readings before the first right one: ' + (100 * liveWrongStart / (liveCases.length * 12 / LIVE.estimateSeconds)).toFixed(1) + '%' +
  ', follows a tempo change within ' + Math.max.apply(null, followTimes).toFixed(1) + 's');
if (coreOk / core.length < 0.95 || octaveOrOk / cases.length < 0.95 || tally.falseLock) process.exit(1);
console.log('Taps far below the set BPM: ' + tapJumps + ' jumped readings');
if (liveOk / liveCases.length < 0.97 || liveStrays || Math.max.apply(null, followTimes) > 5 || tapJumps) process.exit(1);
