// Live tempo check for the tempo view
// Listens to the band and shows the detected BPM next to the song's set BPM

var LiveTempoComponent = {
  listening: false,
  targetBpm: 0,
  bpm: 0,
  stable: false,

  init: function () {
    var self = this;

    document.getElementById('btn-live-tempo').addEventListener('click', function () {
      if (self.listening) {
        self.stop();
      } else {
        self.start();
      }
    });

    // Never keep the microphone open in the background
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self.stop();
    });
  },

  // The tempo view shows a (new) song: compare against its BPM from now on.
  // The set BPM never pulls the reading; the detector only uses it to choose
  // between readings the music supports equally (e.g. 85 vs 113 in a groove).
  setTarget: function (bpm) {
    this.targetBpm = bpm;
    this.bpm = 0;
    this.stable = false;
    if (this.listening) BpmDetector.restart(bpm);
    this.render();
  },

  start: function () {
    var self = this;
    this.listening = true;
    this.bpm = 0;
    this.stable = false;
    this.onLevel(0);
    this.render();

    BpmDetector.start(function (estimate) {
      self.onEstimate(estimate);
    }, function (level) {
      self.onLevel(level);
    }, this.analyzerOptions()).catch(function (err) {
      self.stop();
      showToast(TapTempoComponent.micErrorMessage(err), 'error');
    });
  },

  // Tracking tuned for following a band, updated four times a second; see
  // BpmAnalyzer.follow() (tests/bpm-analyzer.test.js measures it)
  analyzerOptions: function () {
    return {
      follow: true,
      referenceBpm: this.targetBpm,
      minBpm: 40,
      maxBpm: 240,
      historySeconds: 12,
      estimateSeconds: 0.25,
      // The first lock waits for 1.5 s of agreement: early readings of a
      // syncopated groove can briefly favour a 4:3 tempo
      agreeCount: 6
    };
  },

  stop: function () {
    if (!this.listening) return;
    this.listening = false;
    BpmDetector.stop();
    this.render();
  },

  onEstimate: function (estimate) {
    // Nothing is shown until the tracker has locked: no provisional readings
    if (!this.listening || !estimate.bpm || !estimate.stable) return;
    this.bpm = estimate.bpm;
    // A locked value is shown as tentative while the music has no clear beat
    this.stable = estimate.stable && estimate.beat;
    this.render();
  },

  onLevel: function (rms) {
    document.getElementById('live-level-bar').style.transform = 'scaleX(' + BpmDetector.levelFill(rms) + ')';
  },

  render: function () {
    var btn = document.getElementById('btn-live-tempo');
    var panel = document.getElementById('bpm-live');
    var valueEl = document.getElementById('bpm-live-value');
    var diffEl = document.getElementById('bpm-live-diff');
    var adviceEl = document.getElementById('bpm-live-advice');
    var label = I18n.t(this.listening ? 'stopListening' : 'liveTempo');

    btn.classList.toggle('listening', this.listening);
    btn.setAttribute('aria-pressed', this.listening ? 'true' : 'false');
    btn.title = label;
    btn.setAttribute('aria-label', label);
    document.getElementById('live-level').classList.toggle('hidden', !this.listening);

    if (!this.listening) {
      panel.className = 'bpm-live hidden';
      return;
    }
    if (!this.bpm) {
      panel.className = 'bpm-live';
      valueEl.textContent = '--';
      diffEl.textContent = ' ';
      adviceEl.textContent = I18n.t('micListening');
      return;
    }

    var shown = Math.round(BpmDetector.alignOctave(this.bpm, this.targetBpm));
    var diff = shown - this.targetBpm;
    var drift = Math.abs(shown - this.targetBpm) / this.targetBpm;
    var advice = drift <= 0.02 ? 'onTempo' : (diff > 0 ? 'slowDown' : 'speedUp');
    var state = drift <= 0.02 ? 'ok' : (drift <= 0.05 ? 'warn' : 'bad');

    valueEl.textContent = shown;
    diffEl.textContent = (diff > 0 ? '+' : (diff === 0 ? '±' : '')) + diff;
    adviceEl.textContent = I18n.t(advice);
    panel.className = 'bpm-live ' + (this.stable ? 'bpm-live-' + state : 'bpm-live-tentative');
  }
};
