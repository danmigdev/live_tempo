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

function userFromFirebase(user) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  };
}

// Init auth state listener
auth.onAuthStateChanged(function (user) {
  authReady = true;
  currentUser = user ? userFromFirebase(user) : null;
  notifyAuthChange(currentUser);
});

// Email/password auth
function signUpWithEmail(email, password) {
  return auth.createUserWithEmailAndPassword(email, password)
    .then(function (result) { return userFromFirebase(result.user); });
}

function signInWithEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password)
    .then(function (result) { return userFromFirebase(result.user); });
}

function sendPasswordReset(email) {
  return auth.sendPasswordResetEmail(email);
}

// Sign out
function signOutUser() {
  return auth.signOut();
}
