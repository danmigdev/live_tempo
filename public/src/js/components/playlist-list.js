// Playlist list component

var PlaylistListComponent = {
  playlists: [],
  unsubscribe: null,

  init: function () {
    document.getElementById('btn-empty-manual').addEventListener('click', function () {
      App.showPlaylistNameModal(null);
    });
    document.getElementById('btn-empty-yt').addEventListener('click', function () {
      YoutubeImportComponent.show(null);
    });
  },

  load: function (userId) {
    var self = this;
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = subscribePlaylists(userId, function (playlists) {
      self.playlists = playlists;
      self.render();
    });
  },

  unload: function () {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },

  render: function () {
    var container = document.getElementById('playlist-list');
    var emptyEl = document.getElementById('empty-playlists');

    // Show empty state
    if (this.playlists.length === 0) {
      container.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    container.innerHTML = this.playlists.map(function (pl) {
      return '\
        <div class="playlist-card" data-id="' + pl.id + '">\
          <div class="playlist-card-icon">\
            <svg width="32" height="32" viewBox="0 0 64 64" fill="none" stroke="#FFB74D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">\
              <circle cx="32" cy="32" r="24"/>\
              <polygon points="26,20 26,44 46,32" fill="#FFB74D" stroke="none"/>\
            </svg>\
          </div>\
          <div class="playlist-card-info">\
            <h3 class="playlist-card-name">' + escapeHtml(pl.name) + '</h3>\
            <span class="playlist-card-date">' + formatDate(pl.updatedAt) + '</span>\
          </div>\
          <div class="playlist-card-arrow">\
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">\
              <polyline points="9 18 15 12 9 6"/>\
            </svg>\
          </div>\
        </div>';
    }).join('');

    var self = this;
    container.querySelectorAll('.playlist-card').forEach(function (card) {
      card.addEventListener('click', function () {
        App.openPlaylist(this.dataset.id);
      });
    });
  },

  show: function () {
    showSubView('view-playlist-list');
    document.getElementById('header-title').textContent = I18n.t('myPlaylists');
    document.getElementById('btn-back').classList.add('hidden');

    // Bottom action bar
    var existingBar = document.getElementById('home-actions-bar');
    if (!existingBar) {
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'home-actions-bar';
      bar.className = 'playlist-actions-bar';
      bar.innerHTML = '\
        <button id="btn-home-manual" class="btn btn-primary">\
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>\
          Nuova Playlist\
        </button>\
        <button id="btn-home-yt" class="btn btn-outline">\
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>\
          Importa playlist da YouTube\
        </button>';
      bar.querySelector('#btn-home-manual').addEventListener('click', function () {
        App.showPlaylistNameModal(null);
      });
      bar.querySelector('#btn-home-yt').addEventListener('click', function () {
        YoutubeImportComponent.show(null);
      });
      document.getElementById('view-playlist-list').appendChild(bar);
    }
  }
};
