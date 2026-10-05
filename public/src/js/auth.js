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

// Start the auth state listener (FB is set up by firebase.js, a module that
// runs after the classic scripts, so this is called from App.init)
function initAuth() {
  FB.onAuthStateChanged(FB.auth, function (user) {
    authReady = true;
    currentUser = user ? userFromFirebase(user) : null;
    notifyAuthChange(currentUser);
  });
}

// Email/password auth
function signUpWithEmail(email, password) {
  return FB.createUserWithEmailAndPassword(FB.auth, email, password)
    .then(function (result) { return userFromFirebase(result.user); });
}

function signInWithEmail(email, password) {
  return FB.signInWithEmailAndPassword(FB.auth, email, password)
    .then(function (result) { return userFromFirebase(result.user); });
}

function sendPasswordReset(email) {
  return FB.sendPasswordResetEmail(FB.auth, email);
}

// Sign out
function signOutUser() {
  return FB.signOut(FB.auth);
}
