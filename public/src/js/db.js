// Database helper functions for playlists and songs

// --- Playlists ---

function subscribePlaylists(userId, callback) {
  return db.collection('playlists')
    .where('userId', '==', userId)
    .onSnapshot(function (snapshot) {
      var playlists = [];
      snapshot.forEach(function (doc) {
        playlists.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side to avoid composite index requirement
      playlists.sort(function (a, b) {
        var aTime = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate().getTime() : 0) : 0;
        var bTime = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate().getTime() : 0) : 0;
        return bTime - aTime;
      });
      callback(playlists);
    }, function (error) {
      console.error('Playlists subscription error:', error);
      if (window.showToast) showToast('Error loading playlists. Check console.', 'error');
      callback([]);
    });
}

function createPlaylist(name, userId) {
  return db.collection('playlists').add({
    name: name,
    userId: userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function updatePlaylist(playlistId, name) {
  return db.collection('playlists').doc(playlistId).update({
    name: name,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deletePlaylist(playlistId) {
  return db.collection('playlists').doc(playlistId).delete();
}

// --- Songs ---

function subscribeSongs(playlistId, callback) {
  return db.collection('songs')
    .where('playlistId', '==', playlistId)
    .onSnapshot(function (snapshot) {
      var songs = [];
      snapshot.forEach(function (doc) {
        songs.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side to avoid composite index requirement
      songs.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      callback(songs);
    }, function (error) {
      console.error('Songs subscription error:', error);
      if (window.showToast) showToast('Error loading songs', 'error');
      callback([]);
    });
}

function createSong(playlistId, title, bpm, order) {
  return db.collection('songs').add({
    playlistId: playlistId,
    title: title,
    bpm: parseInt(bpm, 10),
    order: order,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function updateSong(songId, title, bpm) {
  return db.collection('songs').doc(songId).update({
    title: title,
    bpm: parseInt(bpm, 10)
  });
}

function deleteSong(songId) {
  return db.collection('songs').doc(songId).delete();
}

function deleteAllSongsInPlaylist(playlistId) {
  return db.collection('songs')
    .where('playlistId', '==', playlistId)
    .get()
    .then(function (snapshot) {
      var batch = db.batch();
      snapshot.forEach(function (doc) {
        batch.delete(doc.ref);
      });
      return batch.commit();
    });
}

function getNextSongOrder(playlistId) {
  return db.collection('songs')
    .where('playlistId', '==', playlistId)
    .get()
    .then(function (snapshot) {
      if (snapshot.empty) return 0;
      var maxOrder = 0;
      snapshot.forEach(function (doc) {
        var o = doc.data().order || 0;
        if (o > maxOrder) maxOrder = o;
      });
      return maxOrder + 1;
    });
}
