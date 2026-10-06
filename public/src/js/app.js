// Main App Router and Controller

var App = {
  currentView: null,
  currentPlaylistId: null,
  currentPlaylistName: '',
  previousView: null,
  confirmCallback: null,
  currentPulseSong: null,
  pulseAnimations: null,
  currentPulseOverlay: null,
  currentPulseCircle: null,
  currentPulseValueEl: null,

  init: function () {
    var self = this;

    // Init i18n first
    I18n.init();

    // Init all components
    LoginComponent.init();
    PlaylistListComponent.init();
    PlaylistDetailComponent.init();
    SongFormComponent.init();
    TapTempoComponent.init();
    LiveTempoComponent.init();
    YoutubeImportComponent.init();

    // Init MIDI once, set up navigation callbacks
    MidiController.init();
    MidiController.connect(
      function () { self.midiNextSong(); },
      function () { self.midiPrevSong(); },
      function () { self.midiOpenCurrent(); }
    );

    // Modal backdrop closes modals
    document.getElementById('modal-backdrop').addEventListener('click', function () {
      if (!document.getElementById('modal-song-form').classList.contains('hidden')) {
        SongFormComponent.hide();
      }
      if (!document.getElementById('modal-playlist-name').classList.contains('hidden')) {
        self.hidePlaylistNameModal();
      }
      if (!document.getElementById('modal-confirm').classList.contains('hidden')) {
        self.hideConfirmModal();
      }
      if (!document.getElementById('modal-yt-import').classList.contains('hidden')) {
        YoutubeImportComponent.hide();
      }
      if (!document.getElementById('modal-settings').classList.contains('hidden')) {
        self.hideSettings();
      }
    });

    // Playlist name modal events
    document.getElementById('form-playlist-name').addEventListener('submit', function (e) {
      e.preventDefault();
      self.savePlaylistName();
    });
    document.getElementById('btn-close-playlist-modal').addEventListener('click', function () {
      self.hidePlaylistNameModal();
    });
    document.getElementById('btn-cancel-playlist').addEventListener('click', function () {
      self.hidePlaylistNameModal();
    });

    // Confirm modal events
    document.getElementById('btn-close-confirm').addEventListener('click', function () {
      self.hideConfirmModal();
    });
    document.getElementById('btn-cancel-confirm').addEventListener('click', function () {
      self.hideConfirmModal();
    });
    document.getElementById('btn-confirm-delete').addEventListener('click', function () {
      if (self.confirmCallback) {
        self.confirmCallback();
        self.confirmCallback = null;
      }
      self.hideConfirmModal();
    });

    // Settings
    document.getElementById('btn-settings').addEventListener('click', function () {
      self.showSettings();
    });
    document.getElementById('btn-close-settings').addEventListener('click', function () {
      self.hideSettings();
    });

    // Font family selector
    var fontSelect = document.getElementById('font-family-select');
    fontSelect.addEventListener('change', function () {
      var font = this.value;
      localStorage.setItem('livetempo-font-family', font);
      self.applyFontFamily(font);
      self.refreshUi();
    });

    // Font size slider (real-time update)
    var sizeSlider = document.getElementById('font-size-slider');
    var sizeValue = document.getElementById('font-size-value');
    sizeSlider.addEventListener('input', function () {
      var size = parseFloat(this.value);
      sizeValue.textContent = size.toFixed(2);
      localStorage.setItem('livetempo-font-size', size);
      document.documentElement.style.setProperty('--song-font-size', size + 'rem');
      self.refreshUi();
    });

    // Pulse font family
    var pulseFontSelect = document.getElementById('pulse-font-family-select');
    pulseFontSelect.addEventListener('change', function () {
      localStorage.setItem('livetempo-pulse-font-family', this.value);
      self.applyPulseFont(this.value);
    });

    // Pulse BPM size slider
    var pulseBpmSlider = document.getElementById('pulse-bpm-size-slider');
    var pulseBpmValue = document.getElementById('pulse-bpm-size-value');
    pulseBpmSlider.addEventListener('input', function () {
      var size = parseFloat(this.value);
      pulseBpmValue.textContent = size.toFixed(1);
      localStorage.setItem('livetempo-pulse-bpm-size', size);
      document.documentElement.style.setProperty('--pulse-bpm-size', size + 'rem');
    });

    // Pulse title size slider
    var pulseTitleSlider = document.getElementById('pulse-title-size-slider');
    var pulseTitleValue = document.getElementById('pulse-title-size-value');
    pulseTitleSlider.addEventListener('input', function () {
      var size = parseFloat(this.value);
      pulseTitleValue.textContent = size.toFixed(2);
      localStorage.setItem('livetempo-pulse-title-size', size);
      document.documentElement.style.setProperty('--pulse-title-size', size + 'rem');
    });

    // Load saved font settings
    var savedSize = localStorage.getItem('livetempo-font-size') || '1.05';
    var savedFont = localStorage.getItem('livetempo-font-family') || 'system';
    document.documentElement.style.setProperty('--song-font-size', savedSize + 'rem');
    sizeSlider.value = parseFloat(savedSize);
    sizeValue.textContent = parseFloat(savedSize).toFixed(2);
    fontSelect.value = savedFont;
    this.applyFontFamily(savedFont);

    // Load pulse settings
    var savedPulseFont = localStorage.getItem('livetempo-pulse-font-family') || 'system';
    var savedPulseBpm = localStorage.getItem('livetempo-pulse-bpm-size') || '5';
    var savedPulseTitle = localStorage.getItem('livetempo-pulse-title-size') || '2';
    pulseFontSelect.value = savedPulseFont;
    pulseBpmSlider.value = parseFloat(savedPulseBpm);
    pulseBpmValue.textContent = parseFloat(savedPulseBpm).toFixed(1);
    pulseTitleSlider.value = parseFloat(savedPulseTitle);
    pulseTitleValue.textContent = parseFloat(savedPulseTitle).toFixed(2);
    this.applyPulseFont(savedPulseFont);
    document.documentElement.style.setProperty('--pulse-bpm-size', savedPulseBpm + 'rem');
    document.documentElement.style.setProperty('--pulse-title-size', savedPulseTitle + 'rem');

    // Logout button
    document.getElementById('btn-logout').addEventListener('click', function () {
      signOutUser().catch(function (error) {
        console.error('Sign out error:', error);
      });
    });

    // Listen for auth changes
    onAuthChange(function (user) {
      self.handleAuthChange(user);
    });
    initAuth();

    this.initBackNavigation();
  },

  // Back closes the topmost layer instead of leaving the app. In the Android app
  // MainActivity calls handleBack() directly. In a browser, while anything is
  // open above the playlist list, one extra history entry is kept, and going
  // back to it closes that layer.
  initBackNavigation: function () {
    var self = this;
    var isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    if (isNativeApp) return;

    var guarded = false;
    var ignorePop = false;
    var scheduled = false;

    var sync = function () {
      scheduled = false;
      var open = self.openLayers().length > 0;
      if (open && !guarded) {
        history.pushState({ layer: true }, '');
        guarded = true;
      } else if (!open && guarded) {
        // Everything was closed from the UI: drop the extra entry, so the
        // next back leaves the app instead of doing nothing
        guarded = false;
        ignorePop = true;
        history.back();
      }
    };

    window.addEventListener('popstate', function () {
      if (ignorePop) {
        ignorePop = false;
        return;
      }
      guarded = false;
      self.handleBack();
      sync();
    });

    // Layers open and close by toggling the hidden class: follow those changes
    var observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      Promise.resolve().then(sync);
    });
    ['view-app', 'view-playlist-detail', 'bpm-pulse', 'modal-song-form', 'modal-playlist-name',
      'modal-confirm', 'modal-yt-import', 'modal-settings'].forEach(function (id) {
      observer.observe(document.getElementById(id), { attributes: true, attributeFilter: ['class'] });
    });
  },

  // Closes the topmost open layer; false when there is nothing to close
  handleBack: function () {
    var layers = this.openLayers();
    if (!layers.length) return false;
    layers[0].close();
    return true;
  },

  // Open layers above the playlist list, topmost first, with how to close each
  openLayers: function () {
    var self = this;
    var visible = function (id) { return !document.getElementById(id).classList.contains('hidden'); };
    var layers = [
      { id: 'bpm-pulse', close: function () { self.closeBpmPulse(); } },
      { id: 'modal-confirm', close: function () { self.hideConfirmModal(); } },
      { id: 'modal-playlist-name', close: function () { self.hidePlaylistNameModal(); } },
      { id: 'modal-song-form', close: function () { SongFormComponent.hide(); } },
      { id: 'modal-yt-import', close: function () { YoutubeImportComponent.hide(); } },
      { id: 'modal-settings', close: function () { self.hideSettings(); } },
      { id: 'view-playlist-detail', close: function () { self.goBack(); } }
    ];
    if (!visible('view-app')) return [];
    return layers.filter(function (layer) { return visible(layer.id); });
  },

  refreshUi: function () {
    // Re-apply i18n to static HTML elements
    I18n.apply();
    // If on playlist list, re-render
    if (this.currentPlaylistId === null && currentUser) {
      PlaylistListComponent.render();
    }
    // If on playlist detail, re-render
    if (this.currentPlaylistId && PlaylistDetailComponent.playlistId) {
      PlaylistDetailComponent.render();
    }
  },

  handleAuthChange: function (user) {
    if (user) {
      var avatar = document.getElementById('user-avatar');
      if (user.photoURL) {
        avatar.src = user.photoURL;
        avatar.style.display = 'block';
      } else {
        avatar.style.display = 'none';
      }

      showView('view-app');
      this.navigateToPlaylistList();
      PlaylistListComponent.load(user.uid);
    } else {
      showView('view-login');
      PlaylistListComponent.unload();
      PlaylistDetailComponent.unload();
    }
  },

  // Navigation
  navigateToPlaylistList: function () {
    this.currentPlaylistId = null;
    this.previousView = null;
    PlaylistDetailComponent.unload();
    PlaylistListComponent.show();
  },

  openPlaylist: function (playlistId) {
    var playlist = PlaylistListComponent.playlists.find(function (p) { return p.id === playlistId; });
    if (!playlist) return;
    this.openPlaylistDirect(playlistId, playlist.name);
  },

  openPlaylistDirect: function (playlistId, playlistName) {
    this.previousView = 'playlist-list';
    this.currentPlaylistId = playlistId;
    this.currentPlaylistName = playlistName;
    PlaylistDetailComponent.show(playlistId, playlistName);
  },

  goBack: function () {
    SongFormComponent.hide();
    this.navigateToPlaylistList();
  },

  // Song form
  showSongForm: function (playlistId, song) {
    SongFormComponent.show(playlistId, song);
  },

  // BPM visual pulse / metronome
  showBpmPulse: function (song) {
    var self = this;
    var overlay = document.getElementById('bpm-pulse');
    var circle = document.getElementById('bpm-pulse-circle');
    var valueEl = document.getElementById('bpm-pulse-value');
    var beatBar = document.getElementById('bpm-pulse-beat');

    // Show song number and title
    var songs = PlaylistDetailComponent.songs;
    var songIndex = -1;
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === song.id) { songIndex = i; break; }
    }
    document.getElementById('bpm-pulse-num').textContent = songIndex >= 0 ? (songIndex + 1) : '';
    document.getElementById('bpm-pulse-title').textContent = song.title;
    valueEl.textContent = song.bpm;

    var bpmClass = getBpmClass(song.bpm);
    circle.style.borderColor = 'var(--' + bpmClass + ')';
    valueEl.style.color = 'var(--' + bpmClass + ')';

    // Create 4 beat dots
    beatBar.innerHTML = '';
    for (var i = 0; i < 4; i++) {
      var dot = document.createElement('div');
      dot.className = 'bpm-pulse-beat-dot';
      var lit = document.createElement('span');
      lit.className = 'bpm-pulse-beat-lit';
      dot.appendChild(lit);
      beatBar.appendChild(dot);
    }

    overlay.classList.remove('hidden');

    // Show MIDI status
    var midiStatus = document.getElementById('bpm-midi-status');
    if (MidiController.isConnected()) {
      midiStatus.textContent = 'MIDI: ' + MidiController.getDeviceName();
      midiStatus.className = 'bpm-midi-status midi-connected';
    } else {
      midiStatus.textContent = 'MIDI: not connected';
      midiStatus.className = 'bpm-midi-status';
    }

    // Start the metronome — runs infinitely until dismissed
    this.startPulseAnimation(song.bpm);
    LiveTempoComponent.setTarget(song.bpm);
    PlaylistDetailComponent.setCurrentSong(song.id);

    // Keep reference for MIDI
    self.currentPulseSong = song;
    self.currentPulseOverlay = overlay;
    self.currentPulseCircle = circle;
    self.currentPulseValueEl = valueEl;

    // Close on tap (on the background, also beside the BPM circle)
    overlay.onclick = function (e) {
      if (e.target === overlay || e.target.classList.contains('bpm-pulse-row')) {
        self.closeBpmPulse();
      }
    };

    // Double-tap circle to edit (the song shown now, also after MIDI navigation)
    circle.ondblclick = function () {
      self.stopPulseAnimation();
      LiveTempoComponent.stop();
      overlay.classList.add('hidden');
      self.showSongForm(PlaylistDetailComponent.playlistId, self.currentPulseSong);
    };

    circle.title = 'Double-tap to edit';
  },

  closeBpmPulse: function () {
    this.stopPulseAnimation();
    LiveTempoComponent.stop();
    this.currentPulseSong = null;
    document.getElementById('bpm-pulse').classList.add('hidden');
  },

  // The beat flash runs as Web Animations on opacity/transform only: the browser
  // drives them from its own frame clock (on the compositor where possible), so
  // they don't drift like setInterval, aren't delayed by a busy main thread and
  // don't repaint the whole screen on every beat
  startPulseAnimation: function (bpm) {
    this.stopPulseAnimation();
    if (!Element.prototype.animate) return;

    var beatMs = 60000 / bpm;
    var flashEnd = Math.min(100, beatMs / 2) / beatMs;
    var beatTiming = { duration: beatMs, iterations: Infinity };
    var barTiming = { duration: beatMs * 4, iterations: Infinity };
    var flash = [
      { opacity: 1, offset: 0, easing: 'step-end' },
      { opacity: 0, offset: flashEnd },
      { opacity: 0, offset: 1 }
    ];

    var animations = [
      document.getElementById('bpm-pulse-flash').animate(flash, beatTiming),
      document.getElementById('bpm-pulse-glow').animate(flash, beatTiming),
      document.getElementById('bpm-pulse-circle').animate([
        { transform: 'scale(1.08)', offset: 0, easing: 'step-end' },
        { transform: 'scale(1)', offset: flashEnd },
        { transform: 'scale(1)', offset: 1 }
      ], beatTiming)
    ];
    var lights = document.querySelectorAll('#bpm-pulse-beat .bpm-pulse-beat-lit');
    for (var i = 0; i < lights.length; i++) {
      animations.push(lights[i].animate(this.beatDotKeyframes(i, lights.length), barTiming));
    }

    // One shared start time keeps every element on the same beat
    var start = document.timeline && document.timeline.currentTime;
    if (start !== null && start !== undefined) {
      animations.forEach(function (a) { a.startTime = start; });
    }
    this.pulseAnimations = animations;
  },

  stopPulseAnimation: function () {
    if (!this.pulseAnimations) return;
    this.pulseAnimations.forEach(function (a) { a.cancel(); });
    this.pulseAnimations = null;
  },

  // Dot `index` of `count` stays lit during its own beat of the bar
  beatDotKeyframes: function (index, count) {
    var on = index / count;
    var off = (index + 1) / count;
    var frames = index === 0
      ? [{ opacity: 1, offset: 0, easing: 'step-end' }]
      : [{ opacity: 0, offset: 0, easing: 'step-end' }, { opacity: 1, offset: on, easing: 'step-end' }];
    if (off < 1) {
      frames.push({ opacity: 0, offset: off }, { opacity: 0, offset: 1 });
    } else {
      frames.push({ opacity: 1, offset: 1 });
    }
    return frames;
  },

  // Playlist name modal
  showPlaylistNameModal: function (playlistId, currentName) {
    document.getElementById('playlist-id').value = playlistId || '';
    document.getElementById('playlist-name').value = currentName || '';
    document.getElementById('playlist-modal-title').textContent = playlistId ? I18n.t('renamePlaylist') : I18n.t('newPlaylist');
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-playlist-name').classList.remove('hidden');
    document.getElementById('playlist-name').focus();
  },

  hidePlaylistNameModal: function () {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById('modal-playlist-name').classList.add('hidden');
    document.getElementById('form-playlist-name').reset();
  },

  savePlaylistName: function () {
    var playlistId = document.getElementById('playlist-id').value;
    var name = document.getElementById('playlist-name').value.trim();

    if (!name) {
      showToast(I18n.t('enterPlaylistName'), 'error');
      return;
    }

    var self = this;
    if (playlistId) {
      updatePlaylist(playlistId, name).then(function () {
        self.hidePlaylistNameModal();
        showToast(I18n.t('playlistRenamed'), 'success');
      }).catch(function () {
        showToast(I18n.t('saveError'), 'error');
      });
    } else {
      var user = currentUser;
      if (!user) return;
      createPlaylist(name, user.uid).then(function () {
        self.hidePlaylistNameModal();
        showToast(I18n.t('playlistCreated'), 'success');
      }).catch(function () {
        showToast(I18n.t('createError'), 'error');
      });
    }
  },

  // Confirm modal
  showConfirmModal: function (message, callback) {
    this.confirmCallback = callback;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-confirm').classList.remove('hidden');
    document.getElementById('btn-confirm-delete').focus();
  },

  hideConfirmModal: function () {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById('modal-confirm').classList.add('hidden');
  },

  // Settings
  showSettings: function () {
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-settings').classList.remove('hidden');
  },

  hideSettings: function () {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById('modal-settings').classList.add('hidden');
  },

  applyFontFamily: function (font) {
    var cssFont = font === 'system' ? 'var(--font-system)' : font;
    document.documentElement.style.setProperty('--song-font-family', cssFont + ', sans-serif');
  },

  applyPulseFont: function (font) {
    var cssFont = font === 'system' ? 'var(--font-system)' : font;
    document.documentElement.style.setProperty('--pulse-font-family', cssFont + ', sans-serif');
  },

  // MIDI navigation
  midiNextSong: function () {
    var songs = PlaylistDetailComponent.songs;
    if (!songs.length) return;
    // If pulse view is open, navigate within it
    if (this.currentPulseSong && this.currentPulseOverlay && !this.currentPulseOverlay.classList.contains('hidden')) {
      var idx = -1;
      for (var i = 0; i < songs.length; i++) {
        if (songs[i].id === this.currentPulseSong.id) { idx = i; break; }
      }
      if (idx < songs.length - 1) {
        this.currentPulseSong = songs[idx + 1];
        this.updatePulseDisplay();
      }
    } else {
      // Navigate from list view: open the song after the highlighted one
      if (!this.currentPlaylistId) return;
      var startIdx = this.currentSongIndex(-1);
      var nextIdx = startIdx + 1;
      if (nextIdx >= songs.length) nextIdx = 0;
      this.currentPulseSong = songs[nextIdx];
      this.showBpmPulse(songs[nextIdx]);
    }
  },

  midiPrevSong: function () {
    var songs = PlaylistDetailComponent.songs;
    if (!songs.length) return;
    if (this.currentPulseSong && this.currentPulseOverlay && !this.currentPulseOverlay.classList.contains('hidden')) {
      var idx = -1;
      for (var i = 0; i < songs.length; i++) {
        if (songs[i].id === this.currentPulseSong.id) { idx = i; break; }
      }
      if (idx > 0) {
        this.currentPulseSong = songs[idx - 1];
        this.updatePulseDisplay();
      }
    } else {
      if (!this.currentPlaylistId) return;
      var startIdx = this.currentSongIndex(songs.length);
      var prevIdx = startIdx - 1;
      if (prevIdx < 0) prevIdx = songs.length - 1;
      this.currentPulseSong = songs[prevIdx];
      this.showBpmPulse(songs[prevIdx]);
    }
  },

  midiOpenCurrent: function () {
    var songs = PlaylistDetailComponent.songs;
    var current = this.currentPulseSong || songs[this.currentSongIndex(-1)];
    if (current) {
      this.showBpmPulse(current);
    }
  },

  // Index of the highlighted song in the open playlist, or fallback
  currentSongIndex: function (fallback) {
    var id = PlaylistDetailComponent.currentSongId;
    var songs = PlaylistDetailComponent.songs;
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === id) return i;
    }
    return fallback;
  },

  updatePulseDisplay: function () {
    var song = this.currentPulseSong;
    if (!song || !this.currentPulseOverlay) return;
    var songs = PlaylistDetailComponent.songs;
    var idx = -1;
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === song.id) { idx = i; break; }
    }
    document.getElementById('bpm-pulse-num').textContent = idx >= 0 ? (idx + 1) : '';
    document.getElementById('bpm-pulse-title').textContent = song.title;
    this.currentPulseValueEl.textContent = song.bpm;
    var cls = getBpmClass(song.bpm);
    this.currentPulseCircle.style.borderColor = 'var(--' + cls + ')';
    this.currentPulseValueEl.style.color = 'var(--' + cls + ')';
    // Pulse at the new song's tempo, not the one the view was opened with
    this.startPulseAnimation(song.bpm);
    LiveTempoComponent.setTarget(song.bpm);
    PlaylistDetailComponent.setCurrentSong(song.id);
  }
};

// --- Utility functions ---

function showView(viewId) {
  document.querySelectorAll('.view').forEach(function (v) {
    v.classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

function showSubView(viewId) {
  document.querySelectorAll('.subview').forEach(function (v) {
    v.classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');

  var fab = document.getElementById('fab-add-song');
  if (fab) fab.remove();
  var bar1 = document.getElementById('playlist-actions-bar');
  if (bar1) bar1.remove();
  var bar2 = document.getElementById('home-actions-bar');
  if (bar2) bar2.remove();
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  var d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  var now = new Date();
  var diff = now - d;
  var days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return I18n.t('today');
  if (days === 1) return I18n.t('yesterday');
  return I18n.t('daysAgo')(days);
}

function getBpmClass(bpm) {
  if (bpm < 90) return 'bpm-slow';
  if (bpm <= 130) return 'bpm-medium';
  return 'bpm-fast';
}

// Toast notification system
function showToast(message, type) {
  var container = document.getElementById('toast-container');
  // The same message already on screen is not stacked again
  for (var i = 0; i < container.children.length; i++) {
    if (container.children[i].textContent === message) return;
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.textContent = message;
  container.appendChild(toast);

  // Each toast removes itself, timed from when it is actually on screen
  // (animation frames wait while the app is in the background)
  requestAnimationFrame(function () {
    toast.classList.add('toast-visible');
    setTimeout(function () {
      toast.classList.remove('toast-visible');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  });
}

// Bootstrap the app
document.addEventListener('DOMContentLoaded', function () {
  App.init();
});
