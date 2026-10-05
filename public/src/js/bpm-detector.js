// Automatic BPM detection from the microphone
// BpmAnalyzer turns raw samples into tempo estimates (spectral-flux onset
// envelope + autocorrelation); BpmDetector handles microphone capture.

// options.minBpm / options.maxBpm: search range (default 50-220)
// options.follow: live tracking, see follow()
// options.referenceBpm: tempo the music is expected near (the song's set BPM),
//   only used to choose between equally supported readings, see estimate()
// options.historySeconds: analysis window, shorter reacts faster to tempo changes
//   (in follow mode: the window of the overall reading, see follow())
// options.decaySeconds: weight recent audio more (time constant), 0 = uniform
// options.estimateSeconds: how often a new estimate is made
// options.agreeCount: consecutive agreeing estimates needed to (re)lock
function BpmAnalyzer(sampleRate, options) {
  options = options || {};
  this.sampleRate = sampleRate;
  this.fftSize = sampleRate > 32000 ? 1024 : 512;
  this.hop = Math.round(sampleRate / 100);
  this.frameRate = sampleRate / this.hop;

  this.historyFrames = Math.round((options.historySeconds || 12) * this.frameRate);
  this.minFrames = Math.round(4 * this.frameRate);
  this.estimateEvery = Math.round((options.estimateSeconds || 0.5) * this.frameRate);
  this.decayFrames = (options.decaySeconds || 0) * this.frameRate;
  this.agreeCount = options.agreeCount || 4;
  this.minBpm = options.minBpm || 50;
  this.maxBpm = options.maxBpm || 220;
  this.following = !!options.follow;
  this.referenceBpm = options.referenceBpm || 0;
  this.switchCount = Math.round(2 / (options.estimateSeconds || 0.5));

  var n = this.fftSize;
  this.window = new Float64Array(n);
  for (var i = 0; i < n; i++) {
    this.window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
  }
  this.cosTable = new Float64Array(n / 2);
  this.sinTable = new Float64Array(n / 2);
  for (i = 0; i < n / 2; i++) {
    this.cosTable[i] = Math.cos(2 * Math.PI * i / n);
    this.sinTable[i] = Math.sin(2 * Math.PI * i / n);
  }
  this.bitReverse = new Uint32Array(n);
  var bits = Math.round(Math.log(n) / Math.LN2);
  for (i = 0; i < n; i++) {
    var r = 0;
    for (var b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1);
    this.bitReverse[i] = r;
  }
  this.re = new Float64Array(n);
  this.im = new Float64Array(n);
  this.magnitudeScale = 4 / n;

  this.bands = this.makeBands();
  this.prevBandLevels = new Float64Array(this.bands.length);

  this.reset();
}

BpmAnalyzer.prototype.reset = function () {
  this.ring = new Float64Array(this.fftSize);
  this.ringPos = 0;
  this.samplesSeen = 0;
  this.sinceHop = 0;
  this.hasPrevFrame = false;
  this.envelope = new Float64Array(this.historyFrames);
  this.envelopePos = 0;
  this.frameCount = 0;
  this.framesSinceEstimate = 0;
  this.recent = [];
  this.locked = 0;
  this.followed = [];
  this.challenger = 0;
  this.challengerBpm = 0;
};

// Log-spaced bands (3 per octave, 30 Hz - 12 kHz) over the FFT bins
BpmAnalyzer.prototype.makeBands = function () {
  var binHz = this.sampleRate / this.fftSize;
  var maxBin = Math.min(this.fftSize / 2 - 1, Math.floor(12000 / binHz));
  var bands = [];
  var lo = Math.max(1, Math.round(30 / binHz));
  var f = 30;
  while (lo <= maxBin) {
    f *= Math.pow(2, 1 / 3);
    var hi = Math.min(maxBin, Math.max(lo, Math.round(f / binHz) - 1));
    bands.push([lo, hi]);
    lo = hi + 1;
  }
  return bands;
};

// Feed mono samples; returns a fresh estimate about twice per second, else null.
// An estimate is { bpm, confidence, stable, beat }: bpm is 0 until a beat is
// found, stable once locked, beat whether this window itself had a clear beat.
BpmAnalyzer.prototype.push = function (samples) {
  var result = null;
  for (var i = 0; i < samples.length; i++) {
    this.ring[this.ringPos] = samples[i];
    this.ringPos = (this.ringPos + 1) % this.fftSize;
    this.samplesSeen++;
    if (++this.sinceHop < this.hop) continue;
    this.sinceHop = 0;
    if (this.samplesSeen < this.fftSize) continue;
    this.processFrame();
    if (this.frameCount >= this.minFrames && ++this.framesSinceEstimate >= this.estimateEvery) {
      this.framesSinceEstimate = 0;
      var overall = this.estimate(this.historyFrames, this.following ? 0 : this.decayFrames);
      result = this.following && this.locked ? this.follow(overall) : this.track(overall);
    }
  }
  return result;
};

BpmAnalyzer.prototype.processFrame = function () {
  var n = this.fftSize;
  var re = this.re;
  var im = this.im;
  for (var i = 0; i < n; i++) {
    re[i] = this.ring[(this.ringPos + i) % n] * this.window[i];
    im[i] = 0;
  }
  this.fft(re, im);

  // Positive log-magnitude flux summed over bands
  var flux = 0;
  for (var b = 0; b < this.bands.length; b++) {
    var lo = this.bands[b][0];
    var hi = this.bands[b][1];
    var sum = 0;
    for (var k = lo; k <= hi; k++) {
      sum += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    }
    var level = Math.log(1 + 1000 * this.magnitudeScale * sum / (hi - lo + 1));
    if (this.hasPrevFrame && level > this.prevBandLevels[b]) {
      flux += level - this.prevBandLevels[b];
    }
    this.prevBandLevels[b] = level;
  }
  this.hasPrevFrame = true;

  this.envelope[this.envelopePos] = flux;
  this.envelopePos = (this.envelopePos + 1) % this.historyFrames;
  this.frameCount++;
};

BpmAnalyzer.prototype.fft = function (re, im) {
  var n = re.length;
  var i, j, t;
  for (i = 0; i < n; i++) {
    j = this.bitReverse[i];
    if (j > i) {
      t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (var size = 2; size <= n; size <<= 1) {
    var half = size >> 1;
    var step = n / size;
    for (var start = 0; start < n; start += size) {
      for (var k = 0; k < half; k++) {
        var wr = this.cosTable[k * step];
        var wi = -this.sinTable[k * step];
        var a = start + k;
        var c = a + half;
        var xr = re[c] * wr - im[c] * wi;
        var xi = re[c] * wi + im[c] * wr;
        re[c] = re[a] - xr;
        im[c] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
};

// Tempo of the buffered onset envelope: { bpm, confidence }
// Tempo of the last `frames` of the onset envelope, recent frames weighted by
// exp(-age / decay) when decay > 0: { bpm, confidence }
BpmAnalyzer.prototype.estimate = function (frames, decay) {
  var count = Math.min(this.frameCount, this.historyFrames, Math.round(frames));
  var start = (this.envelopePos - count + this.historyFrames) % this.historyFrames;
  var env = new Float64Array(count);
  for (var i = 0; i < count; i++) {
    env[i] = this.envelope[(start + i) % this.historyFrames];
  }

  // Light smoothing, then keep only what rises above the local mean
  var smooth = new Float64Array(count);
  for (i = 0; i < count; i++) {
    var prev = env[i > 0 ? i - 1 : i];
    var next = env[i < count - 1 ? i + 1 : i];
    smooth[i] = 0.25 * prev + 0.5 * env[i] + 0.25 * next;
  }
  var prefix = new Float64Array(count + 1);
  for (i = 0; i < count; i++) prefix[i + 1] = prefix[i] + smooth[i];
  var half = Math.round(0.2 * this.frameRate);
  // Recent frames can weigh more, so tempo changes show up sooner
  var weight = new Float64Array(count);
  var onset = new Float64Array(count);
  var mean = 0;
  var weightSum = 0;
  for (i = 0; i < count; i++) {
    var lo = Math.max(0, i - half);
    var hi = Math.min(count - 1, i + half);
    var local = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
    weight[i] = decay ? Math.exp((i - count + 1) / decay) : 1;
    onset[i] = Math.max(0, smooth[i] - local);
    mean += weight[i] * onset[i];
    weightSum += weight[i];
  }
  mean /= weightSum;
  for (i = 0; i < count; i++) onset[i] = (onset[i] - mean) * weight[i];

  // Autocorrelation normalised by the overlapping weight (unbiased when
  // uniform), then scaled to 1 at lag 0
  var maxPeriod = 60 * this.frameRate / this.minBpm;
  var maxLag = Math.min(Math.ceil(6 * maxPeriod) + 2, Math.floor(count * 0.6));
  var acf = new Float64Array(maxLag + 1);
  for (var lag = 0; lag <= maxLag; lag++) {
    var sum = 0;
    var overlap = 0;
    for (i = 0; i + lag < count; i++) {
      sum += onset[i] * onset[i + lag];
      overlap += weight[i] * weight[i + lag];
    }
    acf[lag] = sum / overlap;
  }
  if (acf[0] <= 0) return { bpm: 0, confidence: 0 };
  for (lag = maxLag; lag >= 0; lag--) acf[lag] /= acf[0];

  // Comb over the first beat multiples; the curve is kept for follow(). The
  // pick uses a broad tempo prior around 120 BPM against octave confusions,
  // or the reference tempo when there is one (see pickNearReference)
  var step = this.curveStep;
  var points = Math.floor((this.maxBpm - this.minBpm) / step) + 1;
  var curve = new Float64Array(points);
  var scores = new Float64Array(points);
  var bestIdx = 0;
  for (var k = 0; k < points; k++) {
    var bpm = this.minBpm + k * step;
    var octaves = Math.log(bpm / 120) / Math.LN2;
    curve[k] = this.combScore(acf, maxLag, 60 * this.frameRate / bpm);
    scores[k] = curve[k] * Math.exp(-0.5 * octaves * octaves);
    if (scores[k] > scores[bestIdx]) bestIdx = k;
  }
  this.curve = curve;

  if (this.referenceBpm) bestIdx = this.pickNearReference(scores);
  return { bpm: this.refinePeak(scores, bestIdx), confidence: curve[bestIdx] };
};

// Music often supports more than one reading about equally well (half/double
// time, or 4:3 in syncopated grooves): among the peaks of the prior-weighted
// scores at least 85% as strong as the strongest, take the one closest to the
// reference. A clearly stronger tempo always wins, however far from it.
BpmAnalyzer.prototype.pickNearReference = function (scores) {
  var strongest = 0;
  for (var k = 1; k < scores.length; k++) {
    if (scores[k] > scores[strongest]) strongest = k;
  }
  var pick = strongest;
  var pickDistance = Infinity;
  for (k = 1; k < scores.length - 1; k++) {
    var isPeak = scores[k] >= scores[k - 1] && scores[k] >= scores[k + 1];
    if (!isPeak || scores[k] < 0.85 * scores[strongest]) continue;
    var distance = Math.abs(Math.log((this.minBpm + k * this.curveStep) / this.referenceBpm));
    if (distance < pickDistance) {
      pick = k;
      pickDistance = distance;
    }
  }
  return pick;
};

BpmAnalyzer.prototype.curveStep = 0.1;

// Parabolic refinement of a grid peak, in BPM
BpmAnalyzer.prototype.refinePeak = function (values, idx) {
  var bpm = this.minBpm + idx * this.curveStep;
  if (idx > 0 && idx < values.length - 1) {
    var denom = values[idx - 1] - 2 * values[idx] + values[idx + 1];
    if (denom < 0) bpm += this.curveStep * 0.5 * (values[idx - 1] - values[idx + 1]) / denom;
  }
  return bpm;
};

// Strongest tempo within +-fraction of `bpm` on the last comb curve
BpmAnalyzer.prototype.peakNear = function (bpm, fraction) {
  var lo = Math.max(0, Math.ceil((bpm / (1 + fraction) - this.minBpm) / this.curveStep));
  var hi = Math.min(this.curve.length - 1, Math.floor((bpm * (1 + fraction) - this.minBpm) / this.curveStep));
  var best = lo;
  for (var k = lo; k <= hi; k++) {
    if (this.curve[k] > this.curve[best]) best = k;
  }
  return { bpm: this.refinePeak(this.curve, best), comb: this.curve[best] };
};

BpmAnalyzer.prototype.combScore = function (acf, maxLag, period) {
  var sum = 0;
  var hits = 0;
  for (var m = 1; m <= 6; m++) {
    var lag = m * period;
    if (lag > maxLag - 2) break;
    sum += this.interpolate(acf, lag);
    hits++;
  }
  return hits ? sum / hits : 0;
};

// Catmull-Rom interpolation of a sampled curve at a fractional index
BpmAnalyzer.prototype.interpolate = function (data, x) {
  var i = Math.floor(x);
  var t = x - i;
  var p0 = data[i > 0 ? i - 1 : 0];
  var p1 = data[i];
  var p2 = data[i + 1];
  var p3 = data[i + 2];
  return 0.5 * (2 * p1 + (p2 - p0) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
};

// Consensus over recent estimates: stable once agreeCount of them agree.
// Moving a lock by more than 10% takes three times as many, so a stray
// reading cannot make the shown tempo jump while small drifts stay quick.
BpmAnalyzer.prototype.minConfidence = 0.12;

BpmAnalyzer.prototype.track = function (estimate) {
  var minConfidence = this.minConfidence;
  if (estimate.confidence < minConfidence) {
    this.recent = [];
    return { bpm: this.locked, confidence: estimate.confidence, stable: this.locked > 0, beat: false };
  }

  // Once locked, keep the octave: half/double-time readings are folded back
  var bpm = estimate.bpm;
  if (this.locked) {
    if (Math.abs(bpm / 2 - this.locked) <= this.locked * 0.03) bpm /= 2;
    else if (Math.abs(bpm * 2 - this.locked) <= this.locked * 0.03) bpm *= 2;
  }

  this.recent.push(bpm);
  if (this.recent.length > this.agreeCount * 3) this.recent.shift();

  // agreeCount readings at least, and every one of the last agreeCount + 1
  var count = Math.min(this.recent.length, this.agreeCount + 1);
  if (this.recent.length >= this.agreeCount && this.agrees(count)) {
    var median = this.recentMedian(count);
    var jump = this.locked && Math.abs(median - this.locked) > this.locked * 0.1;
    if (!jump || this.agrees(this.agreeCount * 3)) this.locked = median;
  }

  return {
    bpm: this.locked || bpm,
    confidence: estimate.confidence,
    stable: this.locked > 0,
    beat: true
  };
};

// Live tracking once locked. Two readings per estimate:
// - overall: the whole history (12 s), uniform; robust, decides which tempo
// - recent: a short window weighted towards the last beats (at least 6 s /
//   8 beats, time constant 2 s / 3 beats), so changes show up quickly
// The lock follows the strongest recent tempo within 8% of it, so it moves with
// the band instead of hopping between unrelated peaks; without a convincing
// tempo nearby (a pause, noise) it is held. It moves elsewhere only when a
// reading keeps pointing at the same other tempo: the recent one for ~2 s when
// nothing convincing is left nearby (a real change), the overall one for ~4 s
// otherwise (an early lock on a 4:3 or 3:2 reading). Half/double time of the
// lock never moves it.
BpmAnalyzer.prototype.follow = function (overall) {
  var beatFrames = 60 * this.frameRate / this.locked;
  var recent = this.estimate(Math.max(6 * this.frameRate, 8 * beatFrames), Math.max(2 * this.frameRate, 3 * beatFrames));
  var near = this.peakNear(this.locked, 0.08);
  var nearOk = near.comb >= this.minConfidence && near.comb >= 0.6 * recent.confidence;

  var reading = nearOk ? overall : recent;
  var ratio = reading.bpm / this.locked;
  var octave = Math.abs(ratio - 2) <= 0.08 || Math.abs(ratio - 0.5) <= 0.02;
  var contender = reading.confidence >= this.minConfidence && Math.abs(ratio - 1) > 0.08 && !octave;
  if (contender && this.challenger && Math.abs(reading.bpm - this.challengerBpm) <= this.challengerBpm * 0.02) {
    this.challenger++;
  } else {
    this.challenger = contender ? 1 : 0;
    this.challengerBpm = reading.bpm;
  }
  if (this.challenger >= this.switchCount * (nearOk ? 2 : 1)) {
    this.locked = reading.bpm;
    this.followed = [reading.bpm];
    this.challenger = 0;
    return { bpm: this.locked, confidence: reading.confidence, stable: true, beat: true };
  }

  if (!nearOk) return { bpm: this.locked, confidence: near.comb, stable: true, beat: false };
  this.followed.push(near.bpm);
  if (this.followed.length > 3) this.followed.shift();
  var sorted = this.followed.slice().sort(function (a, b) { return a - b; });
  this.locked = sorted[Math.floor(sorted.length / 2)];
  return { bpm: this.locked, confidence: near.comb, stable: true, beat: true };
};

BpmAnalyzer.prototype.recentMedian = function (count) {
  var sorted = this.recent.slice(-count).sort(function (a, b) { return a - b; });
  return sorted[Math.floor(sorted.length / 2)];
};

// Whether the last `count` estimates all lie within 1.5% of their median
BpmAnalyzer.prototype.agrees = function (count) {
  if (this.recent.length < count) return false;
  var median = this.recentMedian(count);
  return this.recent.slice(-count).every(function (bpm) {
    return Math.abs(bpm - median) <= median * 0.015;
  });
};

var BpmDetector = {
  session: 0,
  context: null,
  stream: null,
  source: null,
  node: null,
  sink: null,
  analyzer: null,
  options: null,

  isSupported: function () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
      (window.AudioContext || window.webkitAudioContext));
  },

  // Starts listening; onEstimate receives analyzer estimates, onLevel the input RMS (0-1),
  // options go to BpmAnalyzer. Rejects with the getUserMedia error (NotAllowedError, ...).
  start: function (onEstimate, onLevel, options) {
    var self = this;
    this.stop();
    var session = this.session;
    this.options = {};
    for (var key in options) this.options[key] = options[key];

    if (!this.isSupported()) {
      var unsupported = new Error('Microphone capture is not supported');
      unsupported.name = 'NotSupportedError';
      return Promise.reject(unsupported);
    }

    // Created synchronously so it is still inside the user gesture
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    var context = new AudioCtx();
    this.context = context;

    var handleSamples = function (samples) {
      if (session !== self.session) return;
      var sum = 0;
      for (var i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      onLevel(Math.sqrt(sum / samples.length));
      var estimate = self.analyzer.push(samples);
      if (estimate) onEstimate(estimate);
    };

    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    }).then(function (stream) {
      if (session !== self.session) {
        self.stopTracks(stream);
        return;
      }
      self.stream = stream;
      self.analyzer = new BpmAnalyzer(context.sampleRate, self.options);
      self.source = context.createMediaStreamSource(stream);
      // Muted path to the destination keeps the capture node pulled by the graph
      self.sink = context.createGain();
      self.sink.gain.value = 0;
      self.sink.connect(context.destination);
      return self.createCaptureNode(context, handleSamples).then(function (node) {
        if (session !== self.session) return;
        self.node = node;
        self.source.connect(node);
        node.connect(self.sink);
        return context.resume();
      });
    }).catch(function (err) {
      if (session !== self.session) return;
      self.stop();
      throw err;
    });
  },

  createCaptureNode: function (context, handleSamples) {
    var self = this;
    if (context.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      return context.audioWorklet.addModule('/src/js/bpm-worklet.js').then(function () {
        var node = new AudioWorkletNode(context, 'bpm-capture', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1]
        });
        node.port.onmessage = function (e) { handleSamples(e.data); };
        return node;
      }).catch(function () {
        return self.createScriptProcessor(context, handleSamples);
      });
    }
    return Promise.resolve(this.createScriptProcessor(context, handleSamples));
  },

  createScriptProcessor: function (context, handleSamples) {
    var node = context.createScriptProcessor(2048, 1, 1);
    node.onaudioprocess = function (e) {
      handleSamples(e.inputBuffer.getChannelData(0));
    };
    return node;
  },

  stop: function () {
    this.session++;
    if (this.node) {
      if (this.node.port) this.node.port.onmessage = null;
      this.node.onaudioprocess = null;
      this.node.disconnect();
    }
    if (this.source) this.source.disconnect();
    if (this.stream) this.stopTracks(this.stream);
    if (this.context && this.context.state !== 'closed') {
      this.context.close().catch(function () {});
    }
    this.context = null;
    this.stream = null;
    this.source = null;
    this.node = null;
    this.sink = null;
    this.analyzer = null;
  },

  // Start the analysis over for the next song without closing the microphone
  restart: function (referenceBpm) {
    if (this.options) this.options.referenceBpm = referenceBpm;
    if (this.analyzer) {
      this.analyzer.referenceBpm = referenceBpm || 0;
      this.analyzer.reset();
    }
  },

  // Half or double time of a reference tempo is the same tempo for a band:
  // express it at the reference's level; anything else is returned as is
  alignOctave: function (bpm, reference) {
    if (reference > 0) {
      if (Math.abs(bpm * 2 - reference) <= reference * 0.06) return bpm * 2;
      if (Math.abs(bpm / 2 - reference) <= reference * 0.06) return bpm / 2;
    }
    return bpm;
  },

  // Input RMS mapped onto a 0-1 meter (-60..0 dBFS)
  levelFill: function (rms) {
    var db = rms > 0 ? 20 * Math.log(rms) / Math.LN10 : -60;
    return Math.max(0, Math.min(1, (db + 60) / 60));
  },

  stopTracks: function (stream) {
    stream.getTracks().forEach(function (track) { track.stop(); });
  }
};
