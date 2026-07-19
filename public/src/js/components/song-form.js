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
    document.getElementById('song-form-title').textContent = song ? 'Modifica Canzone' : 'Nuova Canzone';
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
      showToast('Inserisci il titolo della canzone', 'error');
      return;
    }
    if (!bpm || bpm < 1 || bpm > 400) {
      showToast('Inserisci un BPM valido (1-400)', 'error');
      return;
    }

    var self = this;
    if (songId) {
      updateSong(songId, title, bpm).then(function () {
        self.hide();
        showToast('Canzone aggiornata', 'success');
      }).catch(function (error) {
        console.error('Update song error:', error);
        showToast('Errore durante il salvataggio', 'error');
      });
    } else {
      getNextSongOrder(playlistId).then(function (order) {
        return createSong(playlistId, title, bpm, order);
      }).then(function () {
        self.hide();
        showToast('Canzone aggiunta', 'success');
      }).catch(function (error) {
        console.error('Create song error:', error);
        showToast('Errore durante il salvataggio', 'error');
      });
    }
  }
};
