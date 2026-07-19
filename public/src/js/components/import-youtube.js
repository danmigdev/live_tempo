// YouTube playlist import component

var YoutubeImportComponent = {
  currentPlaylistId: null,
  fetchedSongs: [],

  init: function () {
    var self = this;

    document.getElementById('btn-close-yt-import').addEventListener('click', function () {
      self.hide();
    });

    document.getElementById('btn-cancel-yt-import').addEventListener('click', function () {
      self.hide();
    });

    document.getElementById('btn-fetch-yt').addEventListener('click', function () {
      self.fetchPlaylist();
    });

    document.getElementById('btn-import-selected').addEventListener('click', function () {
      self.importSelected();
    });
  },

  show: function (playlistId) {
    this.currentPlaylistId = playlistId;
    this.fetchedSongs = [];
    document.getElementById('yt-url-input').value = '';
    document.getElementById('yt-results').classList.add('hidden');
    document.getElementById('yt-loading').classList.add('hidden');
    document.getElementById('yt-error').classList.add('hidden');
    document.getElementById('btn-import-selected').classList.add('hidden');

    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-yt-import').classList.remove('hidden');
    document.getElementById('yt-url-input').focus();
  },

  hide: function () {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById('modal-yt-import').classList.add('hidden');
  },

  fetchPlaylist: function () {
    var self = this;
    var url = document.getElementById('yt-url-input').value.trim();
    var playlistId = this.extractPlaylistId(url);

    if (!playlistId) {
      this.showError('URL non valido. Usa un link di una playlist YouTube (es. https://www.youtube.com/playlist?list=...)');
      return;
    }

    document.getElementById('yt-loading').classList.remove('hidden');
    document.getElementById('yt-results').classList.add('hidden');
    document.getElementById('yt-error').classList.add('hidden');

    this.fetchAllPlaylistItems(playlistId, [], '')
      .then(function (songs) {
        self.fetchedSongs = songs;
        document.getElementById('yt-loading').classList.add('hidden');
        if (songs.length === 0) {
          self.showError('Nessun video trovato nella playlist.');
          return;
        }
        self.renderResults(songs);
      })
      .catch(function (error) {
        document.getElementById('yt-loading').classList.add('hidden');
        console.error('YouTube API error:', error);
        self.showError('Errore nel recuperare la playlist. Verifica che l\'URL sia corretto e che la playlist sia pubblica.');
      });
  },

  fetchAllPlaylistItems: function (playlistId, accumulated, pageToken) {
    var self = this;
    var url = 'https://www.googleapis.com/youtube/v3/playlistItems' +
      '?part=snippet' +
      '&maxResults=50' +
      '&playlistId=' + encodeURIComponent(playlistId) +
      '&key=' + YOUTUBE_API_KEY;

    if (pageToken) {
      url += '&pageToken=' + pageToken;
    }

    return fetch(url)
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.error) {
          throw new Error(data.error.message);
        }

        var items = data.items || [];
        items.forEach(function (item) {
          accumulated.push({
            title: item.snippet.title,
            videoId: item.snippet.resourceId.videoId
          });
        });

        if (data.nextPageToken) {
          return self.fetchAllPlaylistItems(playlistId, accumulated, data.nextPageToken);
        }
        return accumulated;
      });
  },

  renderResults: function (songs) {
    var container = document.getElementById('yt-songs-list');
    container.innerHTML = songs.map(function (song, index) {
      return '\
        <div class="yt-song-item">\
          <input type="checkbox" class="yt-song-check" data-index="' + index + '" checked>\
          <div class="yt-song-info">\
            <span class="yt-song-title">' + escapeHtml(song.title) + '</span>\
          </div>\
          <div class="yt-song-bpm-input">\
            <input type="number" class="form-input yt-bpm-input" data-index="' + index + '" placeholder="BPM" min="1" max="400" style="width:80px;padding:8px;text-align:center">\
          </div>\
        </div>';
    }).join('');

    document.getElementById('yt-results').classList.remove('hidden');
    document.getElementById('btn-import-selected').classList.remove('hidden');
  },

  importSelected: function () {
    var self = this;
    var checkboxes = document.querySelectorAll('.yt-song-check:checked');
    var imported = 0;

    var promises = [];
    checkboxes.forEach(function (cb) {
      var index = parseInt(cb.dataset.index);
      var song = self.fetchedSongs[index];
      var bpmInput = document.querySelector('.yt-bpm-input[data-index="' + index + '"]');
      var bpm = bpmInput ? parseInt(bpmInput.value) || 0 : 0;

      promises.push(
        getNextSongOrder(self.currentPlaylistId).then(function (order) {
          return createSong(self.currentPlaylistId, song.title, bpm || 120, order);
        })
      );
    });

    Promise.all(promises).then(function () {
      self.hide();
      showToast(checkboxes.length + ' songs imported', 'success');
    }).catch(function () {
      showToast('Error importing songs', 'error');
    });
  },

  extractPlaylistId: function (url) {
    var match = url.match(/[?&]list=([^&]+)/);
    if (match) return match[1];

    // Handle youtu.be or short URLs
    match = url.match(/youtube\.com\/playlist\?list=([^&]+)/);
    if (match) return match[1];

    return null;
  },

  showError: function (message) {
    var el = document.getElementById('yt-error');
    el.textContent = message;
    el.classList.remove('hidden');
  }
};
