// Firebase setup: the modular SDK bundled with the app (scripts/copy-firebase.js).
// Auth is initialised for email/password only: without a popup/redirect
// resolver the SDK never loads Google's sign-in iframe or gapi scripts.
// Exposes what the classic scripts (auth.js, db.js) use as the FB global.

import { initializeApp } from '/vendor/firebase-11.6.0/firebase-app.js';
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from '/vendor/firebase-11.6.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from '/vendor/firebase-11.6.0/firebase-firestore.js';

var app = initializeApp(firebaseConfig);

window.FB = {
  // Same persistence as before, so existing sessions stay signed in
  auth: initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }),
  db: getFirestore(app),
  onAuthStateChanged: onAuthStateChanged,
  createUserWithEmailAndPassword: createUserWithEmailAndPassword,
  signInWithEmailAndPassword: signInWithEmailAndPassword,
  sendPasswordResetEmail: sendPasswordResetEmail,
  signOut: signOut,
  collection: collection,
  doc: doc,
  query: query,
  where: where,
  onSnapshot: onSnapshot,
  getDocs: getDocs,
  addDoc: addDoc,
  updateDoc: updateDoc,
  deleteDoc: deleteDoc,
  writeBatch: writeBatch,
  serverTimestamp: serverTimestamp
};
