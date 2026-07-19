// Song form modal component

var SongFormComponent = {
  init: function () {
    var self = this;

    document.getElementById('form-song').addEventListener('submit', function (e) {
      e.preventDefault();
      self.save();
    });

    document.getElementById('btn-close-song-form').addEventListener('click', function () {
      self.hide();
    });

    document.getElementById('btn-cancel-song').addEventListener('click', function () {
      self.hide();
    });

    document.getElementById('btn-use-tap-bpm').addEventListener('click', function () {
      var tapBpm = TapTempoComponent.getBpm();
      if (tapBpm > 0) {
        document.getElementById('song-bpm').value = tapBpm;
        document.getElementById('btn-use-tap-bpm').classList.add('hidden');
      }
    });
  },

  show: function (playlistId, song) {
    document.getElementById('song-id').value = song ? song.id : '';
    document.getElementById('song-playlist-id').value = playlistId;
    document.getElementById('song-title').value = song ? song.title : '';
    document.getElementById('song-bpm').value = song ? song.bpm : '';
    document.getElementById('song-form-title').textContent = song ? I18n.t('editSong') : I18n.t('newSong');
    document.getElementById('btn-use-tap-bpm').classList.add('hidden');
    TapTempoComponent.reset();

    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-song-form').classList.remove('hidden');
    document.getElementById('song-title').focus();
  },

  hide: function () {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById('modal-song-form').classList.add('hidden');
    document.getElementById('form-song').reset();
  },

  save: function () {
    var songId = document.getElementById('song-id').value;
    var playlistId = document.getElementById('song-playlist-id').value;
    var title = document.getElementById('song-title').value.trim();
    var bpm = parseInt(document.getElementById('song-bpm').value, 10);

    if (!title) {
      showToast(I18n.t('enterSongTitle'), 'error');
      return;
    }
    if (!bpm || bpm < 1 || bpm > 400) {
      showToast(I18n.t('enterValidBpm'), 'error');
      return;
    }

    var self = this;
    if (songId) {
      updateSong(songId, title, bpm).then(function () {
        self.hide();
        showToast(I18n.t('songUpdated'), 'success');
      }).catch(function () {
        showToast(I18n.t('saveError'), 'error');
      });
    } else {
      getNextSongOrder(playlistId).then(function (order) {
        return createSong(playlistId, title, bpm, order);
      }).then(function () {
        self.hide();
        showToast(I18n.t('songAdded'), 'success');
      }).catch(function () {
        showToast(I18n.t('saveError'), 'error');
      });
    }
  }
};
