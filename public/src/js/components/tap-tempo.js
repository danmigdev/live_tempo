// Tap Tempo component
// Calculates BPM based on user taps, or detects it from the microphone

var TapTempoComponent = {
  taps: [],
  maxTaps: 8,
  resetTimeout: null,
  lastBpm: 0,

  // Microphone detection
  listening: false,
  listenTimeout: null,
  listenStartedAt: 0,
  maxListenMs: 60000,
  micBpm: 0,
  micStable: false,
  micFactor: 1,
  micNoBeat: false,

  init: function () {
    var self = this;
    var btn = document.getElementById('btn-tap-tempo');

    // Count the tap when the finger lands (not on release), at the event's own timestamp
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      self.tap(e.timeStamp);
    });
    // Keyboard activation (Enter) only produces a click
    btn.addEventListener('click', function (e) {
      if (e.detail === 0) self.tap(e.timeStamp);
    });

    // Keyboard shortcut: spacebar triggers tap when song form is open
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !document.getElementById('modal-song-form').classList.contains('hidden')) {
        var active = document.activeElement;
        // Don't trigger if typing in an input
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        if (e.repeat) return;
        self.tap(e.timeStamp);
      }
    });

    document.getElementById('btn-listen-tempo').addEventListener('click', function () {
      if (self.listening) {
        self.stopListening();
      } else {
        self.startListening();
      }
    });
    document.getElementById('btn-bpm-half').addEventListener('click', function () {
      self.scaleMicBpm(0.5);
    });
    document.getElementById('btn-bpm-double').addEventListener('click', function () {
      self.scaleMicBpm(2);
    });

    // Never keep the microphone open in the background
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self.stopListening();
    });
  },

  tap: function (timeStamp) {
    // Event timestamps share performance.now()'s clock and are taken when the
    // input happened, so a busy main thread does not delay the tap
    var now = performance.now();
    if (timeStamp && timeStamp <= now) now = timeStamp;

    // A manual tap takes over from microphone detection
    if (this.listening || this.micBpm) this.clearMic();

    // Clear reset timeout
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    // Keep only recent taps
    this.taps.push(now);
    if (this.taps.length > this.maxTaps) {
      this.taps.shift();
    }

    this.updateDisplay();
    this.animateButton();

    // Auto-reset after 2 seconds of no taps
    var self = this;
    this.resetTimeout = setTimeout(function () {
      self.reset();
    }, 2000);
  },

  updateDisplay: function () {
    var display = document.getElementById('tap-tempo-display');
    var countEl = document.getElementById('tap-tempo-count');
    var useBtn = document.getElementById('btn-use-tap-bpm');

    if (this.taps.length < 2) {
      display.textContent = '-- BPM';
      display.className = 'tap-tempo-display';
      countEl.classList.add('hidden');
      useBtn.classList.add('hidden');
      return;
    }

    var bpm = Math.round(60000 / this.tapInterval());

    // Clamp to reasonable range
    if (bpm < 30 || bpm > 400) {
      display.textContent = '-- BPM';
      display.className = 'tap-tempo-display';
      countEl.classList.add('hidden');
      useBtn.classList.add('hidden');
      return;
    }

    this.lastBpm = bpm;

    display.textContent = bpm + ' BPM';
    display.className = 'tap-tempo-display tap-active';

    countEl.textContent = this.taps.length + ' tap';
    countEl.classList.remove('hidden');

    useBtn.classList.remove('hidden');
  },

  // Least-squares beat interval over all taps: every tap contributes, so one
  // early or late tap is averaged out instead of skewing first-to-last timing
  tapInterval: function () {
    var n = this.taps.length;
    var meanIndex = (n - 1) / 2;
    var meanTime = 0;
    for (var i = 0; i < n; i++) meanTime += this.taps[i];
    meanTime /= n;

    var num = 0;
    var den = 0;
    for (i = 0; i < n; i++) {
      num += (i - meanIndex) * (this.taps[i] - meanTime);
      den += (i - meanIndex) * (i - meanIndex);
    }
    return num / den;
  },

  animateButton: function () {
    var btn = document.getElementById('btn-tap-tempo');
    btn.classList.add('tap-flash');
    setTimeout(function () {
      btn.classList.remove('tap-flash');
    }, 150);
  },

  getBpm: function () {
    return this.lastBpm;
  },

  startListening: function () {
    var self = this;
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    this.taps = [];
    this.micBpm = 0;
    this.micStable = false;
    this.micFactor = 1;
    this.micNoBeat = false;
    this.listening = true;
    this.listenStartedAt = Date.now();
    this.listenTimeout = setTimeout(function () {
      self.stopListening();
    }, this.maxListenMs);
    this.onMicLevel(0);
    this.renderMic();

    BpmDetector.start(function (estimate) {
      self.onMicEstimate(estimate);
    }, function (level) {
      self.onMicLevel(level);
    }).catch(function (err) {
      self.stopListening();
      showToast(self.micErrorMessage(err), 'error');
    });
  },

  stopListening: function () {
    if (!this.listening) return;
    this.listening = false;
    clearTimeout(this.listenTimeout);
    this.listenTimeout = null;
    BpmDetector.stop();
    this.micNoBeat = !this.micBpm && Date.now() - this.listenStartedAt > 8000;
    this.renderMic();
  },

  clearMic: function () {
    this.stopListening();
    this.micBpm = 0;
    this.micStable = false;
    this.micFactor = 1;
    this.micNoBeat = false;
    this.renderMic();
  },

  onMicEstimate: function (estimate) {
    if (!this.listening || !estimate.bpm) return;
    this.micBpm = estimate.bpm;
    this.micStable = estimate.stable;
    this.renderMic();
  },

  onMicLevel: function (rms) {
    document.getElementById('listen-level-bar').style.transform = 'scaleX(' + BpmDetector.levelFill(rms) + ')';
  },

  // Fixes half/double-time readings
  scaleMicBpm: function (factor) {
    var bpm = Math.round(this.micBpm * this.micFactor * factor);
    if (bpm < 30 || bpm > 400) return;
    this.micFactor *= factor;
    this.renderMic();
  },

  renderMic: function () {
    var display = document.getElementById('tap-tempo-display');
    var countEl = document.getElementById('tap-tempo-count');
    var listenBtn = document.getElementById('btn-listen-tempo');
    var bpm = this.micBpm ? Math.round(this.micBpm * this.micFactor) : 0;

    this.lastBpm = bpm;

    var label = I18n.t(this.listening ? 'stopListening' : 'listenTempo');
    listenBtn.classList.toggle('listening', this.listening);
    listenBtn.setAttribute('aria-pressed', this.listening ? 'true' : 'false');
    listenBtn.title = label;
    listenBtn.setAttribute('aria-label', label);
    document.getElementById('listen-level').classList.toggle('hidden', !this.listening);

    display.textContent = bpm ? bpm + ' BPM' : '-- BPM';
    display.className = 'tap-tempo-display' + (bpm ? (this.micStable ? ' tap-active' : ' tap-tentative') : '');

    var status = '';
    if (this.listening) {
      status = I18n.t(!bpm ? 'micListening' : (this.micStable ? 'micDetected' : 'micAnalyzing'));
    } else if (this.micNoBeat) {
      status = I18n.t('micNoBeat');
    }
    countEl.textContent = status;
    countEl.classList.toggle('hidden', !status);

    var showResult = bpm > 0 && (this.micStable || !this.listening);
    var halfBtn = document.getElementById('btn-bpm-half');
    var doubleBtn = document.getElementById('btn-bpm-double');
    document.getElementById('btn-use-tap-bpm').classList.toggle('hidden', !showResult);
    halfBtn.classList.toggle('hidden', !showResult);
    doubleBtn.classList.toggle('hidden', !showResult);
    halfBtn.disabled = Math.round(bpm / 2) < 30;
    doubleBtn.disabled = bpm * 2 > 400;
  },

  micErrorMessage: function (err) {
    var name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
      return I18n.t('micDenied');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      return I18n.t('micNotFound');
    }
    if (name === 'NotSupportedError') return I18n.t('micUnsupported');
    return I18n.t('micError');
  },

  reset: function () {
    this.taps = [];
    this.clearMic();
  }
};
