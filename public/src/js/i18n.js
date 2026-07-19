// Internationalization
var I18n = {
  lang: 'it',

  strings: {
    it: {
      appDescription: 'Gestisci le tue playlist e tieni il tempo giusto per ogni canzone',
      signInGoogle: 'Accedi con Google',
      signingIn: 'Accesso in corso...',
      signOut: 'Esci',
      loginError: 'Errore durante l\'accesso. Riprova.',
      myPlaylists: 'Le mie Playlist',
      noPlaylists: 'Nessuna playlist',
      noPlaylistsHint: 'Crea la tua prima playlist per iniziare',
      noSongs: 'Aggiungi la prima canzone',
      newPlaylist: 'Nuova Playlist',
      renamePlaylist: 'Rinomina Playlist',
      playlistNameLabel: 'Nome playlist',
      playlistNamePlaceholder: 'Es. Live Estate 2026',
      playlistCreated: 'Playlist creata',
      playlistRenamed: 'Playlist rinominata',
      playlistDeleted: 'Playlist eliminata',
      confirmDeletePlaylist: 'Eliminare playlist e tutte le sue canzoni?',
      newSong: 'Nuova Canzone',
      editSong: 'Modifica Canzone',
      songsCount: function(n) { return n + ' canzone' + (n !== 1 ? 'i' : ''); },
      songTitleLabel: 'Titolo canzone',
      songTitlePlaceholder: 'Es. Bohemian Rhapsody',
      bpmLabel: 'BPM',
      bpmPlaceholder: 'Es. 120',
      tapTempoLabel: 'Tap Tempo',
      tapTempoBtn: 'TAP',
      tapTempoBpm: 'BPM',
      useThisBpm: 'Usa questo BPM',
      save: 'Salva',
      cancel: 'Annulla',
      close: 'Chiudi',
      delete: 'Elimina',
      confirm: 'Conferma',
      back: 'Indietro',
      addSong: 'Aggiungi canzone',
      addPlaylist: 'Nuova playlist',
      editSongTitle: 'Modifica',
      deleteSongTitle: 'Elimina',
      renamePlaylistTitle: 'Rinomina playlist',
      deletePlaylistTitle: 'Elimina playlist',
      songAdded: 'Canzone aggiunta',
      songUpdated: 'Canzone aggiornata',
      songDeleted: 'Canzone eliminata',
      enterPlaylistName: 'Inserisci un nome per la playlist',
      enterSongTitle: 'Inserisci il titolo della canzone',
      enterValidBpm: 'Inserisci un BPM valido (1-400)',
      saveError: 'Errore durante il salvataggio',
      deleteError: 'Errore durante l\'eliminazione',
      createError: 'Errore durante la creazione',
      today: 'Oggi',
      yesterday: 'Ieri',
      daysAgo: function(n) { return n + ' giorni fa'; },
      language: 'Lingua',
      confirmDeleteSong: 'Eliminare la canzone?',
    },
    en: {
      appDescription: 'Manage your playlists and keep the right tempo for every song',
      signInGoogle: 'Sign in with Google',
      signingIn: 'Signing in...',
      signOut: 'Sign out',
      loginError: 'Login error. Please try again.',
      myPlaylists: 'My Playlists',
      noPlaylists: 'No playlists',
      noPlaylistsHint: 'Create your first playlist to get started',
      noSongs: 'Add the first song',
      newPlaylist: 'New Playlist',
      renamePlaylist: 'Rename Playlist',
      playlistNameLabel: 'Playlist name',
      playlistNamePlaceholder: 'e.g. Summer Tour 2026',
      playlistCreated: 'Playlist created',
      playlistRenamed: 'Playlist renamed',
      playlistDeleted: 'Playlist deleted',
      confirmDeletePlaylist: 'Delete playlist and all its songs?',
      newSong: 'New Song',
      editSong: 'Edit Song',
      songsCount: function(n) { return n + ' song' + (n !== 1 ? 's' : ''); },
      songTitleLabel: 'Song title',
      songTitlePlaceholder: 'e.g. Bohemian Rhapsody',
      bpmLabel: 'BPM',
      bpmPlaceholder: 'e.g. 120',
      tapTempoLabel: 'Tap Tempo',
      tapTempoBtn: 'TAP',
      tapTempoBpm: 'BPM',
      useThisBpm: 'Use this BPM',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      confirm: 'Confirm',
      back: 'Back',
      addSong: 'Add song',
      addPlaylist: 'Add playlist',
      editSongTitle: 'Edit',
      deleteSongTitle: 'Delete',
      renamePlaylistTitle: 'Rename playlist',
      deletePlaylistTitle: 'Delete playlist',
      songAdded: 'Song added',
      songUpdated: 'Song updated',
      songDeleted: 'Song deleted',
      enterPlaylistName: 'Enter a playlist name',
      enterSongTitle: 'Enter the song title',
      enterValidBpm: 'Enter a valid BPM (1-400)',
      saveError: 'Error saving',
      deleteError: 'Error deleting',
      createError: 'Error creating',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: function(n) { return n + ' days ago'; },
      language: 'Language',
      confirmDeleteSong: 'Delete this song?',
    }
  },

  init: function () {
    var saved = localStorage.getItem('livetempo-lang');
    if (saved && (saved === 'it' || saved === 'en')) {
      this.lang = saved;
    }
    this.apply();
    this.initSelector();
  },

  setLang: function (lang) {
    this.lang = lang;
    localStorage.setItem('livetempo-lang', lang);
    this.apply();
    // Update dynamic content
    if (window.App && App.refreshUi) App.refreshUi();
  },

  t: function (key) {
    var val = this.strings[this.lang][key];
    if (val === undefined) return key;
    if (typeof val === 'function') return val;
    return val;
  },

  apply: function () {
    document.documentElement.lang = this.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = I18n.strings[I18n.lang][key];
      if (val !== undefined && typeof val !== 'function') {
        el.textContent = val;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = I18n.strings[I18n.lang][key];
      if (val !== undefined && typeof val !== 'function') {
        el.placeholder = val;
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var val = I18n.strings[I18n.lang][key];
      if (val !== undefined && typeof val !== 'function') {
        el.title = val;
        el.setAttribute('aria-label', val);
      }
    });
  },

  initSelector: function () {
    var selector = document.getElementById('lang-selector');
    if (!selector) return;
    selector.value = this.lang;
    var self = this;
    selector.addEventListener('change', function () {
      self.setLang(this.value);
    });
  }
};
