// Playlist detail component - shows songs with BPM

var PlaylistDetailComponent = {
  playlistId: null,
  playlistName: '',
  songs: [],
  unsubscribe: null,
  dragData: null,
  wasDrag: false,

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
        I18n.t('confirmDeletePlaylist'),
        function () {
          deleteAllSongsInPlaylist(self.playlistId).then(function () {
            return deletePlaylist(self.playlistId);
          }).then(function () {
            App.goBack();
            showToast(I18n.t('playlistDeleted'), 'success');
          }).catch(function () {
            showToast(I18n.t('deleteError'), 'error');
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

    countEl.textContent = I18n.t('songsCount')(this.songs.length);

    if (this.songs.length === 0) {
      container.innerHTML = '';
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      var self = this;
      container.innerHTML = this.songs.map(function (song, index) {
        var bpmClass = getBpmClass(song.bpm);
        return '\
          <div class="song-item" data-id="' + song.id + '" data-index="' + index + '" draggable="false">\
            <span class="song-pos">' + (index + 1) + '</span>\
            <div class="song-info">\
              <span class="song-title">' + escapeHtml(song.title) + '</span>\
            </div>\
            <div class="song-bpm-badge ' + bpmClass + '">\
              <span class="song-bpm-value">' + song.bpm + '</span>\
              <span class="song-bpm-label">BPM</span>\
            </div>\
            <div class="song-actions">\
              <button class="btn-icon btn-sm edit-song-btn" data-id="' + song.id + '" title="' + I18n.t('editSongTitle') + '" aria-label="' + I18n.t('editSongTitle') + '">\
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>\
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>\
                </svg>\
              </button>\
              <button class="btn-icon btn-sm btn-danger delete-song-btn" data-id="' + song.id + '" title="' + I18n.t('deleteSongTitle') + '" aria-label="' + I18n.t('deleteSongTitle') + '">\
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\
                  <polyline points="3 6 5 6 21 6"/>\
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>\
                </svg>\
              </button>\
              <span class="song-drag-handle" title="Reorder">\
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>\
              </span>\
            </div>\
          </div>';
      }).join('');

      // Wire up buttons
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
            I18n.t('confirmDeleteSong') + ' "' + song.title + '"?',
            function () {
              deleteSong(songId).catch(function () {
                showToast(I18n.t('deleteError'), 'error');
              });
            }
          );
        });
      });

      // Song tap → BPM pulse (skip if was a drag)
      container.querySelectorAll('.song-item').forEach(function (item) {
        item.addEventListener('click', function (e) {
          if (self.wasDrag) return;
          if (e.target.closest('.song-actions') || e.target.closest('.song-drag-handle')) return;
          var songId = this.dataset.id;
          var song = self.songs.find(function (s) { return s.id === songId; });
          if (song) App.showBpmPulse(song);
        });
      });

      // Drag and drop
      this.setupDragAndDrop(container);
    }

    // Bottom action bar
    var existingBar = document.getElementById('playlist-actions-bar');
    if (!existingBar) {
      var bar = document.createElement('div');
      bar.id = 'playlist-actions-bar';
      bar.className = 'playlist-actions-bar';
      bar.innerHTML = '\
        <button id="btn-add-song-bar" class="btn btn-primary">\
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>\
          ' + I18n.t('addSong') + '\
        </button>\
        <button id="btn-yt-import-bar" class="btn btn-outline">\
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>\
          YouTube\
        </button>';
      bar.querySelector('#btn-add-song-bar').addEventListener('click', function () {
        App.showSongForm(self.playlistId, null);
      });
      bar.querySelector('#btn-yt-import-bar').addEventListener('click', function () {
        YoutubeImportComponent.show(self.playlistId);
      });
      document.getElementById('view-playlist-detail').appendChild(bar);
    }
  },

  setupDragAndDrop: function (container) {
    var self = this;
    var items = container.querySelectorAll('.song-item');
    var draggedEl = null;
    var draggedIndex = -1;
    var placeholder = null;
    var touchY = 0;

    function createPlaceholder() {
      var el = document.createElement('div');
      el.className = 'song-placeholder';
      return el;
    }

    function onPointerDown(e) {
      var handle = e.target.closest('.song-drag-handle');
      if (!handle) return;
      e.preventDefault();
      self.wasDrag = false;
      draggedEl = e.target.closest('.song-item');
      if (!draggedEl) return;
      draggedIndex = Array.from(container.children).indexOf(draggedEl);

      placeholder = createPlaceholder();
      placeholder.style.height = draggedEl.offsetHeight + 'px';
      container.insertBefore(placeholder, draggedEl);
      draggedEl.classList.add('dragging');
      draggedEl.style.position = 'fixed';
      draggedEl.style.zIndex = '100';
      draggedEl.style.left = draggedEl.getBoundingClientRect().left + 'px';
      draggedEl.style.width = draggedEl.offsetWidth + 'px';
      touchY = e.clientY;
      draggedEl.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!draggedEl) return;
      self.wasDrag = true;
      var dy = e.clientY - touchY;
      draggedEl.style.top = (draggedEl.getBoundingClientRect().top + dy) + 'px';
      touchY = e.clientY;

      // Find closest item to swap placeholder
      var allItems = Array.from(container.querySelectorAll('.song-item:not(.dragging)'));
      var targetItem = null;
      var minDist = Infinity;
      allItems.forEach(function (item) {
        var rect = item.getBoundingClientRect();
        var midY = rect.top + rect.height / 2;
        var dist = Math.abs(e.clientY - midY);
        if (dist < minDist && dist < rect.height) {
          minDist = dist;
          targetItem = item;
        }
      });

      if (targetItem && placeholder.nextSibling !== targetItem) {
        container.insertBefore(placeholder, targetItem);
      } else if (!targetItem && e.clientY > allItems[allItems.length - 1]?.getBoundingClientRect().bottom) {
        container.appendChild(placeholder);
      }
    }

    function onPointerUp(e) {
      if (!draggedEl) return;
      draggedEl.classList.remove('dragging');
      draggedEl.style.position = '';
      draggedEl.style.zIndex = '';
      draggedEl.style.left = '';
      draggedEl.style.top = '';
      draggedEl.style.width = '';

      // Insert at placeholder position
      if (placeholder && placeholder.parentNode) {
        container.insertBefore(draggedEl, placeholder);
        placeholder.remove();
      }
      placeholder = null;

      // Calculate new order and update Firestore
      var newItems = container.querySelectorAll('.song-item');
      var newIndex = Array.from(newItems).indexOf(draggedEl);
      if (newIndex !== draggedIndex) {
        self.updateSongOrder(newItems);
      }

      draggedEl = null;
      draggedIndex = -1;
    }

    items.forEach(function (item) {
      item.addEventListener('pointerdown', onPointerDown);
    });
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  },

  updateSongOrder: function (items) {
    var self = this;
    var updates = [];
    items.forEach(function (item, index) {
      var songId = item.dataset.id;
      var song = self.songs.find(function (s) { return s.id === songId; });
      if (song && song.order !== index) {
        updates.push({ id: songId, order: index });
      }
    });

    if (updates.length === 0) return;

    var batch = db.batch();
    updates.forEach(function (u) {
      batch.update(db.collection('songs').doc(u.id), { order: u.order });
    });
    batch.commit().catch(function (error) {
      console.error('Reorder error:', error);
    });
  },

  show: function (playlistId, playlistName) {
    this.load(playlistId, playlistName);
    showSubView('view-playlist-detail');
    document.getElementById('header-title').textContent = playlistName;
    document.getElementById('btn-back').classList.remove('hidden');
  }
};
