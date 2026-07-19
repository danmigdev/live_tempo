// YouTube playlist import component

var YoutubeImportComponent = {
  currentPlaylistId: null, // null = create new playlist from YT
  fetchedSongs: [],
  playlistTitle: '',

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

  // playlistId = null means create a new playlist from the YouTube data
  show: function (playlistId) {
    this.currentPlaylistId = playlistId || null;
    this.fetchedSongs = [];
    this.playlistTitle = '';
    document.getElementById('yt-url-input').value = '';
    document.getElementById('yt-results').classList.add('hidden');
    document.getElementById('yt-loading').classList.add('hidden');
    document.getElementById('yt-error').classList.add('hidden');
    document.getElementById('btn-import-selected').classList.add('hidden');
    if (playlistId) {
      document.getElementById('btn-import-selected').textContent = 'Import Selected';
    } else {
      document.getElementById('btn-import-selected').textContent = 'Create Playlist & Import';
    }

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

    // Fetch playlist info + items in parallel
    Promise.all([
      this.fetchPlaylistInfo(playlistId),
      this.fetchAllPlaylistItems(playlistId)
    ])
      .then(function (results) {
        self.playlistTitle = results[0];
        self.fetchedSongs = results[1];
        document.getElementById('yt-loading').classList.add('hidden');
        if (self.fetchedSongs.length === 0) {
          self.showError('Nessun video trovato nella playlist.');
          return;
        }
        self.renderResults(self.playlistTitle, self.fetchedSongs);
      })
      .catch(function (error) {
        document.getElementById('yt-loading').classList.add('hidden');
        console.error('YouTube API error:', error);
        self.showError('Errore nel recuperare la playlist. Verifica che l\'URL sia corretto e che la playlist sia pubblica.');
      });
  },

  fetchPlaylistInfo: function (playlistId) {
    var url = 'https://www.googleapis.com/youtube/v3/playlists' +
      '?part=snippet' +
      '&id=' + encodeURIComponent(playlistId) +
      '&key=' + YOUTUBE_API_KEY;

    return fetch(url)
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.items && data.items.length > 0) {
          return data.items[0].snippet.title;
        }
        return 'YouTube Playlist';
      });
  },

  fetchAllPlaylistItems: function (playlistId) {
    var self = this;
    var accumulated = [];

    function fetchPage(pageToken) {
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
          if (data.error) throw new Error(data.error.message);

          (data.items || []).forEach(function (item) {
            accumulated.push({
              title: item.snippet.title,
              videoId: item.snippet.resourceId.videoId
            });
          });

          if (data.nextPageToken) {
            return fetchPage(data.nextPageToken);
          }
          return accumulated;
        });
    }

    return fetchPage('');
  },

  renderResults: function (playlistTitle, songs) {
    var container = document.getElementById('yt-songs-list');

    var titleHtml = '';
    if (!this.currentPlaylistId && playlistTitle) {
      titleHtml = '<div class="yt-playlist-title">Playlist: ' + escapeHtml(playlistTitle) + '</div>';
    }

    container.innerHTML = titleHtml + songs.map(function (song, index) {
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

    if (checkboxes.length === 0) {
      showToast('Select at least one song', 'error');
      return;
    }

    // If no playlistId, create a new playlist first
    var createPromise;
    if (this.currentPlaylistId) {
      createPromise = Promise.resolve(this.currentPlaylistId);
    } else {
      var playlistName = this.playlistTitle || 'YouTube Import';
      createPromise = createPlaylist(playlistName, currentUser.uid).then(function (ref) {
        return ref.id;
      });
    }

    createPromise.then(function (playlistId) {
      var promises = [];
      checkboxes.forEach(function (cb) {
        var index = parseInt(cb.dataset.index);
        var song = self.fetchedSongs[index];
        var bpmInput = document.querySelector('.yt-bpm-input[data-index="' + index + '"]');
        var bpm = bpmInput ? parseInt(bpmInput.value) || 0 : 0;

        promises.push(
          getNextSongOrder(playlistId).then(function (order) {
            return createSong(playlistId, song.title, bpm || 120, order);
          })
        );
      });

      return Promise.all(promises).then(function () {
        return playlistId;
      });
    }).then(function (playlistId) {
      self.hide();
      showToast(checkboxes.length + ' songs imported', 'success');
      // Navigate to the new playlist
      if (!self.currentPlaylistId) {
        App.openPlaylist(playlistId);
      }
    }).catch(function (error) {
      console.error('Import error:', error);
      showToast('Error importing songs', 'error');
    });
  },

  extractPlaylistId: function (url) {
    var match = url.match(/[?&]list=([^&\s]+)/);
    if (match) return match[1];
    return null;
  },

  showError: function (message) {
    var el = document.getElementById('yt-error');
    el.textContent = message;
    el.classList.remove('hidden');
  }
};
