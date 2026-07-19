// Firebase configuration for LiveTempo
const firebaseConfig = {
  apiKey: 'AIzaSyAIVkxSZ6xhqyWxL8dM_1gvC5wPaMWd7ls',
  authDomain: 'livetempo.firebaseapp.com',
  projectId: 'livetempo',
  storageBucket: 'livetempo.firebasestorage.app',
  messagingSenderId: '69546808824',
  appId: '1:69546808824:web:f98b1ddc19c50c9a8a720d'
};

// YouTube Data API key (same GCP project)
const YOUTUBE_API_KEY = 'AIzaSyAWg_iHGo2DTvoSOqphZ2HZsarODA7ya2Y';

// Initialize Firebase (compat / namespace SDK)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
