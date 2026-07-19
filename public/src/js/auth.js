// Auth state
var currentUser = null;
var authReady = false;
var authCallbacks = [];

function onAuthChange(callback) {
  authCallbacks.push(callback);
  if (authReady) callback(currentUser);
}

function notifyAuthChange(user) {
  currentUser = user;
  authCallbacks.forEach(function (cb) { cb(user); });
}

// Init auth state listener
auth.onAuthStateChanged(function (user) {
  authReady = true;
  if (user) {
    currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  } else {
    currentUser = null;
  }
  notifyAuthChange(currentUser);
});

// Google Sign-In
function signInWithGoogle() {
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return auth.signInWithPopup(provider)
    .then(function (result) {
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      };
    })
    .catch(function (error) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        console.error('Google sign-in error:', error);
        throw error;
      }
      return null;
    });
}

// Sign out
function signOutUser() {
  return auth.signOut();
}
