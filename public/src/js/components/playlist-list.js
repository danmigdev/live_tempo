// Playlist list component

var PlaylistListComponent = {
  playlists: [],
  unsubscribe: null,

  init: function () {
    document.getElementById('btn-new-playlist').addEventListener('click', function () {
      App.showPlaylistNameModal(null);
    });
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
  }
};
