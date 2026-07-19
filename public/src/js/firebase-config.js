// Firebase configuration for LiveTempo
const firebaseConfig = {
  apiKey: 'AIzaSyAIVkxSZ6xhqyWxL8dM_1gvC5wPaMWd7ls',
  authDomain: 'livetempo.firebaseapp.com',
  projectId: 'livetempo',
  storageBucket: 'livetempo.firebasestorage.app',
  messagingSenderId: '69546808824',
  appId: '1:69546808824:web:f98b1ddc19c50c9a8a720d'
};

// Initialize Firebase
const { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = window.FIREBASE_MODULES;
const { getFirestore, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, getDocs, writeBatch } = window.FIREBASE_MODULES;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
