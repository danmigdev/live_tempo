# LiveTempo

Manage song playlists with BPM references for live performances. Each song has a reference BPM so you always know how to set the tempo before starting.

## Features

- **Google OAuth** -- sign in with your Google account
- **Playlists** -- create, rename, and delete playlists
- **Songs with BPM** -- add songs with title and BPM
- **Tap Tempo** -- calculate BPM by tapping the rhythm on a button
- **PWA** -- installable on Android as a native app
- **Dark theme** -- optimized for low-light live environments
- **Color-coded BPM** -- slow (blue), medium (green), fast (orange)

## Setup

### 1. Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Authentication** > Sign-in method > **Google** (enable it)
4. Enable **Cloud Firestore** in production mode
5. Go to Project Settings > General > Your apps > Web app (</>)
6. Register the app and copy the `firebaseConfig` object

### 2. Configuration

Edit `public/src/js/firebase-config.js` with your Firebase project values:

```js
const firebaseConfig = {
  apiKey: 'AIzaSy...',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123...'
};
```

Edit `.firebaserc` with your Firebase project ID.

### 3. Deploy (Web Hosting - free)

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

The app will be available at `https://YOUR-PROJECT.web.app`

### 4. Deploy Android APK (for F-Droid)

The Android APK is automatically built by GitHub Actions when you create a tag.

```bash
# Create a new release
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will build the APK and publish it as a Release.

### 5. Publishing on F-Droid

1. Make sure the GitHub repository is public
2. Go to [F-Droid Data](https://gitlab.com/fdroid/fdroiddata)
3. Create a merge request adding the metadata file for LiveTempo
4. Once accepted, F-Droid will automatically build the app on every new tag/release on GitHub

The metadata template is in `fdroid/metadata.yml`.

### 6. Firestore Security Rules

To protect data, set these rules in Firestore:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /playlists/{playlistId} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /songs/{songId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
  }
}
```

## Local Development

```bash
# Start a local server
npx serve public
# Or with Python
python -m http.server 8080 -d public
```

Open `http://localhost:8080` in the browser.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (PWA)
- **Auth**: Firebase Authentication (Google OAuth)
- **Database**: Firebase Firestore
- **Hosting**: Firebase Hosting (free tier)
- **Android**: Capacitor (WebView wrapper for native APK)
- **CI/CD**: GitHub Actions

## License

MIT
