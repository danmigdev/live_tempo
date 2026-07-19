// Database helper functions for playlists and songs

// --- Playlists ---

function getPlaylistsRef() {
  return collection(db, 'playlists');
}

function subscribePlaylists(userId, callback) {
  const q = query(
    getPlaylistsRef(),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, function (snapshot) {
    const playlists = [];
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
  return addDoc(getPlaylistsRef(), {
    name: name,
    userId: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

function updatePlaylist(playlistId, name) {
  return updateDoc(doc(db, 'playlists', playlistId), {
    name: name,
    updatedAt: serverTimestamp()
  });
}

function deletePlaylist(playlistId) {
  return deleteDoc(doc(db, 'playlists', playlistId));
}

// --- Songs ---

function getSongsRef() {
  return collection(db, 'songs');
}

function subscribeSongs(playlistId, callback) {
  const q = query(
    getSongsRef(),
    where('playlistId', '==', playlistId),
    orderBy('order', 'asc')
  );
  return onSnapshot(q, function (snapshot) {
    const songs = [];
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
  return addDoc(getSongsRef(), {
    playlistId: playlistId,
    title: title,
    bpm: parseInt(bpm, 10),
    order: order,
    createdAt: serverTimestamp()
  });
}

function updateSong(songId, title, bpm) {
  return updateDoc(doc(db, 'songs', songId), {
    title: title,
    bpm: parseInt(bpm, 10)
  });
}

function deleteSong(songId) {
  return deleteDoc(doc(db, 'songs', songId));
}

function deleteAllSongsInPlaylist(playlistId) {
  var q = query(getSongsRef(), where('playlistId', '==', playlistId));
  return getDocs(q).then(function (snapshot) {
    var batch = writeBatch(db);
    snapshot.forEach(function (doc) {
      batch.delete(doc.ref);
    });
    return batch.commit();
  });
}

function getNextSongOrder(playlistId) {
  var q = query(
    getSongsRef(),
    where('playlistId', '==', playlistId),
    orderBy('order', 'desc')
  );
  return getDocs(q).then(function (snapshot) {
    if (snapshot.empty) return 0;
    return snapshot.docs[0].data().order + 1;
  });
}
