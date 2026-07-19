# LiveTempo

Gestisci playlist di canzoni con BPM per le tue performance live. Ogni canzone ha un BPM di riferimento così sai sempre come prendere il tempo prima di iniziare.

## Funzionalita'

- **Google OAuth** -- accedi con il tuo account Google
- **Playlist** -- crea, rinomina ed elimina playlist
- **Canzoni con BPM** -- aggiungi canzoni con titolo e BPM
- **Tap Tempo** -- calcola il BPM battendo il ritmo sul pulsante
- **PWA** -- installabile su Android come app nativa
- **Dark theme** -- ottimizzato per ambienti live con poca luce
- **Color-coded BPM** -- BPM lenti (blu), medi (verde), veloci (arancione)

## Setup

### 1. Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuovo progetto (o usane uno esistente)
3. Attiva **Authentication** > Sign-in method > **Google** (abilitalo)
4. Attiva **Cloud Firestore** in modalita' produzione
5. Vai su Project Settings > General > Your apps > Web app (</>)
6. Registra l'app e copia la configurazione `firebaseConfig`

### 2. Configurazione

Modifica `public/src/js/firebase-config.js` con i valori del tuo progetto Firebase:

```js
const firebaseConfig = {
  apiKey: 'AIzaSy...',
  authDomain: 'tuo-progetto.firebaseapp.com',
  projectId: 'tuo-progetto',
  storageBucket: 'tuo-progetto.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123...'
};
```

Modifica `.firebaserc` con l'ID del tuo progetto Firebase.

### 3. Deploy (Hosting Web - gratuito)

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

L'app sara' disponibile su `https://TUO-PROGETTO.web.app`

### 4. Deploy Android APK (per F-Droid)

L'APK Android viene generato automaticamente da GitHub Actions quando crei un tag.

```bash
# Crea una nuova versione
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions buildera' l'APK e lo pubblichera' come Release.

### 5. Pubblicazione su F-Droid

1. Assicurati che il repository GitHub sia pubblico
2. Vai su [F-Droid Data](https://gitlab.com/fdroid/fdroiddata)
3. Crea una merge request aggiungendo il file metadata per LiveTempo
4. Una volta accettata, F-Droid buildera' automaticamente l'app ad ogni nuovo tag/release su GitHub

Esempio di metadata F-Droid (`metadata/it.livetempo.app.yml`):

```yaml
Categories:
  - Multimedia
License: MIT
AuthorName: Tuo Nome
SourceCode: https://github.com/TUO-USERNAME/live_tempo
IssueTracker: https://github.com/TUO-USERNAME/live_tempo/issues

AutoUpdateMode: Version
UpdateCheckMode: Tags
CurrentVersion: 1.0.0
CurrentVersionCode: 1
```

### 6. Firestore Security Rules

Per proteggere i dati, imposta queste regole su Firestore:

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

## Sviluppo locale

```bash
# Avvia un server locale
npx serve public
# Oppure con Python
python -m http.server 8080 -d public
```

Apri `http://localhost:8080` nel browser.

## Tecnologie

- **Frontend**: Vanilla HTML/CSS/JS (PWA)
- **Auth**: Firebase Authentication (Google OAuth)
- **Database**: Firebase Firestore
- **Hosting**: Firebase Hosting (gratuito)
- **Android**: Capacitor (WebView wrapper per APK nativo)
- **CI/CD**: GitHub Actions

## Licenza

MIT
