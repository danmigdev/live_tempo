// Copies the Firebase SDK (modular browser builds) from node_modules into
// public/vendor, so the app ships it instead of loading it from
// www.gstatic.com at startup. Runs after `npm install` / `npm ci`
// (postinstall), before `npx cap sync`.

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sdk = path.join(root, 'node_modules', 'firebase');
const version = JSON.parse(fs.readFileSync(path.join(sdk, 'package.json'), 'utf8')).version;
const files = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'];
const vendor = path.join(root, 'public', 'vendor');
const target = path.join(vendor, 'firebase-' + version);
const cdnApp = 'https://www.gstatic.com/firebasejs/' + version + '/firebase-app.js';

// The versioned folder keeps long-lived HTTP caches from serving an old SDK,
// so the app has to import exactly the installed version
const loader = fs.readFileSync(path.join(root, 'public', 'src', 'js', 'firebase.js'), 'utf8');
if (!loader.includes('/vendor/firebase-' + version + '/')) {
  console.error('public/src/js/firebase.js does not import /vendor/firebase-' + version + '/: update its imports');
  process.exit(1);
}

fs.rmSync(vendor, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const file of files) {
  // These builds import the app module from the CDN: point them at the local copy
  const code = fs.readFileSync(path.join(sdk, file), 'utf8')
    .split('from"' + cdnApp + '"').join('from"./firebase-app.js"');
  if (/(from|import)\s*["']https?:/.test(code)) {
    console.error(file + ' still imports a module from the network');
    process.exit(1);
  }
  fs.writeFileSync(path.join(target, file), code);
}
console.log('Copied the Firebase ' + version + ' SDK to public/vendor/firebase-' + version);
