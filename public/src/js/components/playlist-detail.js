// Playlist detail component - shows songs with BPM

var PlaylistDetailComponent = {
  playlistId: null,
  playlistName: '',
  songs: [],
  unsubscribe: null,

  init: function () {
    var self = this;

    document.getElementById('btn-back').addEventListener('click', function () {
      App.goBack();
    });

    document.getElementById('btn-rename-playlist').addEventListener('click', function () {
      App.showPlaylistNameModal(self.playlistId, self.playlistName);
    });

    document.getElementById('btn-delete-playlist').addEventListener('click', function () {
      App.showConfirmModal(
        'Eliminare "' + self.playlistName + '" e tutte le sue canzoni?',
        function () {
          deleteAllSongsInPlaylist(self.playlistId).then(function () {
            return deletePlaylist(self.playlistId);
          }).then(function () {
            App.goBack();
            showToast('Playlist eliminata', 'success');
          }).catch(function (error) {
            console.error('Delete playlist error:', error);
            showToast('Errore durante l\'eliminazione', 'error');
          });
        }
      );
    });
  },

  load: function (playlistId, playlistName) {
    var self = this;
    this.playlistId = playlistId;
    this.playlistName = playlistName;

    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = subscribeSongs(playlistId, function (songs) {
      self.songs = songs;
      self.render();
    });

    document.getElementById('detail-playlist-name').textContent = playlistName;
  },

  unload: function () {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },

  render: function () {
    var container = document.getElementById('song-list');
    var emptyEl = document.getElementById('empty-songs');
    var countEl = document.getElementById('detail-song-count');

    countEl.textContent = this.songs.length + ' canzone' + (this.songs.length !== 1 ? ' (coming soon: plural)' : '');

    // Fix plural
    countEl.textContent = this.songs.length + ' canzone' + (this.songs.length !== 1 ? 'i' : '');

    if (this.songs.length === 0) {
      container.innerHTML = '';
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      container.innerHTML = this.songs.map(function (song) {
        var bpmClass = getBpmClass(song.bpm);
        return '\
          <div class="song-item" data-id="' + song.id + '" data-title="' + escapeHtml(song.title) + '" data-bpm="' + song.bpm + '">\
            <div class="song-info">\
              <span class="song-title">' + escapeHtml(song.title) + '</span>\
            </div>\
            <div class="song-bpm-badge ' + bpmClass + '">\
              <span class="song-bpm-value">' + song.bpm + '</span>\
              <span class="song-bpm-label">BPM</span>\
            </div>\
            <div class="song-actions">\
              <button class="btn-icon btn-sm edit-song-btn" data-id="' + song.id + '" title="Modifica" aria-label="Modifica">\
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>\
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>\
                </svg>\
              </button>\
              <button class="btn-icon btn-sm btn-danger delete-song-btn" data-id="' + song.id + '" title="Elimina" aria-label="Elimina">\
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\
                  <polyline points="3 6 5 6 21 6"/>\
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>\
                </svg>\
              </button>\
            </div>\
          </div>';
      }).join('');

      var self = this;
      container.querySelectorAll('.edit-song-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var songId = this.dataset.id;
          var song = self.songs.find(function (s) { return s.id === songId; });
          if (song) App.showSongForm(self.playlistId, song);
        });
      });

      container.querySelectorAll('.delete-song-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var songId = this.dataset.id;
          var song = self.songs.find(function (s) { return s.id === songId; });
          if (!song) return;
          App.showConfirmModal(
            'Eliminare "' + song.title + '"?',
            function () {
              deleteSong(songId).catch(function (error) {
                console.error('Delete song error:', error);
                showToast('Errore durante l\'eliminazione', 'error');
              });
            }
          );
        });
      });

      container.querySelectorAll('.song-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var songId = this.dataset.id;
          var song = self.songs.find(function (s) { return s.id === songId; });
          if (song) App.showSongForm(self.playlistId, song);
        });
      });
    }

    // Add song FAB
    var existingFab = document.getElementById('fab-add-song');
    if (!existingFab) {
      var fab = document.createElement('button');
      fab.id = 'fab-add-song';
      fab.className = 'fab';
      fab.title = 'Aggiungi canzone';
      fab.setAttribute('aria-label', 'Aggiungi canzone');
      fab.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      fab.addEventListener('click', function () {
        App.showSongForm(self.playlistId, null);
      });
      document.getElementById('view-playlist-detail').appendChild(fab);
    }
  },

  show: function (playlistId, playlistName) {
    this.load(playlistId, playlistName);
    showSubView('view-playlist-detail');
    document.getElementById('header-title').textContent = playlistName;
    document.getElementById('btn-back').classList.remove('hidden');
  }
};
