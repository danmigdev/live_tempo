// Tap Tempo component
// Calculates BPM based on user taps

var TapTempoComponent = {
  taps: [],
  maxTaps: 8,
  resetTimeout: null,
  lastBpm: 0,

  init: function () {
    var self = this;
    var btn = document.getElementById('btn-tap-tempo');

    btn.addEventListener('click', function () {
      self.tap();
    });

    // Keyboard shortcut: spacebar triggers tap when song form is open
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !document.getElementById('modal-song-form').classList.contains('hidden')) {
        var active = document.activeElement;
        // Don't trigger if typing in an input
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        self.tap();
      }
    });
  },

  tap: function () {
    var now = Date.now();

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

    // Calculate BPM from intervals
    var intervals = [];
    for (var i = 1; i < this.taps.length; i++) {
      intervals.push(this.taps[i] - this.taps[i - 1]);
    }

    // Average interval in ms
    var avgInterval = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
    var bpm = Math.round(60000 / avgInterval);

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

  reset: function () {
    this.taps = [];
    this.lastBpm = 0;
    document.getElementById('tap-tempo-display').textContent = '-- BPM';
    document.getElementById('tap-tempo-display').className = 'tap-tempo-display';
    document.getElementById('tap-tempo-count').classList.add('hidden');
    document.getElementById('btn-use-tap-bpm').classList.add('hidden');
  }
};
