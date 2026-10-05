// Database helper functions for playlists and songs (Firestore via FB, see firebase.js)

// --- Playlists ---

function subscribePlaylists(userId, callback) {
  var userPlaylists = FB.query(FB.collection(FB.db, 'playlists'), FB.where('userId', '==', userId));
  return FB.onSnapshot(userPlaylists, function (snapshot) {
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
  return FB.addDoc(FB.collection(FB.db, 'playlists'), {
    name: name,
    userId: userId,
    createdAt: FB.serverTimestamp(),
    updatedAt: FB.serverTimestamp()
  });
}

function updatePlaylist(playlistId, name) {
  return FB.updateDoc(FB.doc(FB.db, 'playlists', playlistId), {
    name: name,
    updatedAt: FB.serverTimestamp()
  });
}

function deletePlaylist(playlistId) {
  return FB.deleteDoc(FB.doc(FB.db, 'playlists', playlistId));
}

// --- Songs ---

function songsInPlaylist(playlistId) {
  return FB.query(FB.collection(FB.db, 'songs'), FB.where('playlistId', '==', playlistId));
}

function subscribeSongs(playlistId, callback) {
  return FB.onSnapshot(songsInPlaylist(playlistId), function (snapshot) {
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
  return FB.addDoc(FB.collection(FB.db, 'songs'), {
    playlistId: playlistId,
    title: title,
    bpm: parseInt(bpm, 10),
    order: order,
    createdAt: FB.serverTimestamp()
  });
}

function updateSong(songId, title, bpm) {
  return FB.updateDoc(FB.doc(FB.db, 'songs', songId), {
    title: title,
    bpm: parseInt(bpm, 10)
  });
}

function deleteSong(songId) {
  return FB.deleteDoc(FB.doc(FB.db, 'songs', songId));
}

function deleteAllSongsInPlaylist(playlistId) {
  return FB.getDocs(songsInPlaylist(playlistId)).then(function (snapshot) {
    var batch = FB.writeBatch(FB.db);
    snapshot.forEach(function (doc) {
      batch.delete(doc.ref);
    });
    return batch.commit();
  });
}

function getNextSongOrder(playlistId) {
  return FB.getDocs(songsInPlaylist(playlistId)).then(function (snapshot) {
    if (snapshot.empty) return 0;
    var maxOrder = 0;
    snapshot.forEach(function (doc) {
      var o = doc.data().order || 0;
      if (o > maxOrder) maxOrder = o;
    });
    return maxOrder + 1;
  });
}
