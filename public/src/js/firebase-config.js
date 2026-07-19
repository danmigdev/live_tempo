// Replace these values with your Firebase project configuration
// 1. Go to https://console.firebase.google.com/
// 2. Create a project (or use existing)
// 3. Project Settings > General > Your apps > Web app
// 4. Copy the firebaseConfig object here

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

// Initialize Firebase
const { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = window.FIREBASE_MODULES;
const { getFirestore, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, getDocs, writeBatch } = window.FIREBASE_MODULES;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
