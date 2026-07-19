// Database helper functions for playlists and songs

// --- Playlists ---

function subscribePlaylists(userId, callback) {
  return db.collection('playlists')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .onSnapshot(function (snapshot) {
      var playlists = [];
      snapshot.forEach(function (doc) {
        playlists.push({ id: doc.id, ...doc.data() });
      });
      callback(playlists);
    }, function (error) {
      console.error('Playlists subscription error:', error);
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
    .orderBy('order', 'asc')
    .onSnapshot(function (snapshot) {
      var songs = [];
      snapshot.forEach(function (doc) {
        songs.push({ id: doc.id, ...doc.data() });
      });
      callback(songs);
    }, function (error) {
      console.error('Songs subscription error:', error);
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
    .orderBy('order', 'desc')
    .limit(1)
    .get()
    .then(function (snapshot) {
      if (snapshot.empty) return 0;
      return snapshot.docs[0].data().order + 1;
    });
}
