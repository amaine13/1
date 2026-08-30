import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const SIGNUP_NOTIFY_URL = 'https://formsubmit.co/ajax/heyjude201@gmail.com';

let app;
let auth;
let db;
let ready;

export { isFirebaseConfigured };

export function getFirebase() {
  return { app, auth, db };
}

export function waitForAuthReady() {
  return ready;
}

function setShown(root, signedIn) {
  if (!root) return;
  root.classList.toggle('is-signed-in', signedIn);
  root.querySelectorAll('[data-show="guest"]').forEach(function (el) {
    el.hidden = signedIn;
  });
  root.querySelectorAll('[data-show="user"]').forEach(function (el) {
    el.hidden = !signedIn;
  });
}

function wireSignOut(root, authInstance) {
  if (!root || !authInstance) return;
  root.querySelectorAll('[data-signout]').forEach(function (btn) {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      authInstance.signOut().then(function () {
        window.location.href = 'index.html';
      });
    });
  });
}

function paintHeader(user) {
  var signedIn = Boolean(user);
  document.querySelectorAll('[data-auth-slot]').forEach(function (slot) {
    setShown(slot, signedIn);
    if (auth) wireSignOut(slot, auth);
  });
}

async function loadSdk() {
  const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
  ]);
  app = initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  db = firestoreMod.getFirestore(app);
  return { authMod, firestoreMod };
}

export async function notifyJudyOfSignup(profile) {
  var body = new FormData();
  body.append('_subject', 'New Early Reader — Who\'s Driving Your Bus');
  body.append('_template', 'table');
  body.append('_captcha', 'false');
  body.append('source', 'early-reader');
  body.append('firstName', profile.firstName || '');
  body.append('lastName', profile.lastName || '');
  body.append('name', profile.name || '');
  body.append('email', profile.email || '');
  body.append('consent', profile.consent ? 'yes' : 'no');
  body.append('consentAt', profile.consentAt || '');
  try {
    await fetch(SIGNUP_NOTIFY_URL, {
      method: 'POST',
      body: body,
      headers: { Accept: 'application/json' }
    });
  } catch (err) {
    console.warn('Could not email Judy about the new Early Reader.', err);
  }
}

ready = (async function init() {
  if (!isFirebaseConfigured()) {
    paintHeader(null);
    return { configured: false, user: null };
  }

  try {
    const { authMod } = await loadSdk();
    return await new Promise(function (resolve) {
      authMod.onAuthStateChanged(auth, function (user) {
        paintHeader(user);
        resolve({ configured: true, user: user, auth: auth, db: db, authMod: authMod });
      });
    });
  } catch (err) {
    console.warn('Firebase failed to start.', err);
    paintHeader(null);
    return { configured: false, user: null, error: err };
  }
})();
