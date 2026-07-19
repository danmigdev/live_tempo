// Main App Router and Controller

var App = {
  currentView: null,
  currentPlaylistId: null,
  currentPlaylistName: '',
  previousView: null,
  confirmCallback: null,

  init: function () {
    var self = this;

    // Init all components
    LoginComponent.init();
    PlaylistListComponent.init();
    PlaylistDetailComponent.init();
    SongFormComponent.init();
    TapTempoComponent.init();

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
  },

  handleAuthChange: function (user) {
    if (user) {
      // Update avatar
      var avatar = document.getElementById('user-avatar');
      if (user.photoURL) {
        avatar.src = user.photoURL;
        avatar.style.display = 'block';
      } else {
        avatar.style.display = 'none';
      }

      // Show app view
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
    this.previousView = 'playlist-list';
    this.currentPlaylistId = playlistId;
    this.currentPlaylistName = playlist.name;
    PlaylistDetailComponent.show(playlistId, playlist.name);
  },

  goBack: function () {
    if (SongFormComponent.hide) SongFormComponent.hide();
    this.navigateToPlaylistList();
  },

  // Song form
  showSongForm: function (playlistId, song) {
    SongFormComponent.show(playlistId, song);
  },

  // Playlist name modal
  showPlaylistNameModal: function (playlistId, currentName) {
    document.getElementById('playlist-id').value = playlistId || '';
    document.getElementById('playlist-name').value = currentName || '';
    document.getElementById('playlist-modal-title').textContent = playlistId ? 'Rinomina Playlist' : 'Nuova Playlist';
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
      showToast('Inserisci un nome per la playlist', 'error');
      return;
    }

    var self = this;
    if (playlistId) {
      updatePlaylist(playlistId, name).then(function () {
        self.hidePlaylistNameModal();
        showToast('Playlist rinominata', 'success');
      }).catch(function (error) {
        console.error('Update playlist error:', error);
        showToast('Errore durante il salvataggio', 'error');
      });
    } else {
      var user = currentUser;
      if (!user) return;
      createPlaylist(name, user.uid).then(function () {
        self.hidePlaylistNameModal();
        showToast('Playlist creata', 'success');
      }).catch(function (error) {
        console.error('Create playlist error:', error);
        showToast('Errore durante la creazione', 'error');
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

  // Hide FABs from other views
  var fab = document.getElementById('fab-add-song');
  if (fab) fab.remove();
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

  if (days === 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  if (days < 7) return days + ' giorni fa';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getBpmClass(bpm) {
  if (bpm < 90) return 'bpm-slow';
  if (bpm <= 130) return 'bpm-medium';
  return 'bpm-fast';
}

// Toast notification system
var toastTimer = null;
function showToast(message, type) {
  var container = document.getElementById('toast-container');
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(function () {
    toast.classList.add('toast-visible');
  });

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('toast-visible');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2500);
}

// Bootstrap the app
document.addEventListener('DOMContentLoaded', function () {
  App.init();
});
