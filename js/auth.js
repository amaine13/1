import { supabaseConfig, isAccountsConfigured } from './supabase-config.js';

const SIGNUP_NOTIFY_URL = 'https://formsubmit.co/ajax/heyjude201@gmail.com';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let client;
let ready;

export { isAccountsConfigured };

export function getClient() {
  return client;
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

function wireSignOut(root) {
  if (!root || !client) return;
  root.querySelectorAll('[data-signout]').forEach(function (btn) {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      client.auth.signOut().then(function () {
        window.location.href = 'index.html';
      });
    });
  });
}

function paintHeader(user) {
  var signedIn = Boolean(user);
  document.querySelectorAll('[data-auth-slot]').forEach(function (slot) {
    setShown(slot, signedIn);
    if (client) wireSignOut(slot);
  });
}

async function loadSdk() {
  const { createClient } = await import(SDK_URL);
  client = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  return client;
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
  if (!isAccountsConfigured()) {
    paintHeader(null);
    return { configured: false, user: null };
  }

  try {
    await loadSdk();
    var first = await client.auth.getSession();
    var user = first.data && first.data.session ? first.data.session.user : null;
    paintHeader(user);

    client.auth.onAuthStateChange(function (_event, session) {
      paintHeader(session && session.user);
    });

    return { configured: true, user: user, client: client };
  } catch (err) {
    console.warn('Accounts failed to start.', err);
    paintHeader(null);
    return { configured: false, user: null, error: err };
  }
})();
