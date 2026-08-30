import {
  isFirebaseConfigured,
  waitForAuthReady,
  getFirebase,
  notifyJudyOfSignup
} from './auth.js';

function showPending() {
  var banner = document.getElementById('account-pending');
  if (banner) banner.hidden = false;
}

function setStatus(el, message, kind) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove('is-error', 'is-ok');
  if (kind) el.classList.add(kind);
}

function nextPath() {
  var params = new URLSearchParams(window.location.search);
  return params.get('next') || 'read.html';
}

function markPendingForms() {
  showPending();
  document.querySelectorAll('#join-form, #login-form').forEach(function (form) {
    form.setAttribute('data-accounts', 'pending');
  });
}

async function handleJoin(form) {
  var status = document.getElementById('join-status');
  var btn = document.getElementById('join-submit');
  var firstName = form.firstName.value.trim();
  var lastName = form.lastName.value.trim();
  var email = form.email.value.trim();
  var password = form.password.value;
  var consent = form.consent.checked;

  if (!firstName || !lastName || !email || !password) {
    setStatus(status, 'Please fill in every field.', 'is-error');
    return;
  }
  if (!consent) {
    setStatus(status, 'Please check the consent box to create an account.', 'is-error');
    return;
  }
  if (password.length < 8) {
    setStatus(status, 'Please choose a password with at least 8 characters.', 'is-error');
    return;
  }

  if (!isFirebaseConfigured()) {
    showPending();
    setStatus(
      status,
      'Accounts are being connected. Your details were not saved. Write Judy at heyjude201@gmail.com if you want to be added by hand.',
      'is-error'
    );
    return;
  }

  btn.disabled = true;
  var original = btn.textContent;
  btn.textContent = 'Creating account…';
  setStatus(status, '');

  try {
    var state = await waitForAuthReady();
    var firebase = getFirebase();
    var authMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    var storeMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    var cred = await authMod.createUserWithEmailAndPassword(firebase.auth, email, password);
    var consentAt = new Date().toISOString();
    var profile = {
      firstName: firstName,
      lastName: lastName,
      name: firstName + ' ' + lastName,
      email: email,
      consent: true,
      consentAt: consentAt,
      createdAt: storeMod.serverTimestamp(),
      source: 'early-reader',
      feedback: {}
    };
    await storeMod.setDoc(storeMod.doc(firebase.db, 'readers', cred.user.uid), profile);
    await notifyJudyOfSignup({
      firstName: firstName,
      lastName: lastName,
      name: profile.name,
      email: email,
      consent: true,
      consentAt: consentAt
    });
    window.location.href = nextPath();
  } catch (err) {
    var message = friendlyAuthError(err);
    setStatus(status, message, 'is-error');
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function handleLogin(form) {
  var status = document.getElementById('login-status');
  var btn = document.getElementById('login-submit');
  var email = form.email.value.trim();
  var password = form.password.value;

  if (!email || !password) {
    setStatus(status, 'Please enter your email and password.', 'is-error');
    return;
  }

  if (!isFirebaseConfigured()) {
    showPending();
    setStatus(status, 'Accounts are being connected. Sign-in is not live yet.', 'is-error');
    return;
  }

  btn.disabled = true;
  var original = btn.textContent;
  btn.textContent = 'Signing in…';
  setStatus(status, '');

  try {
    await waitForAuthReady();
    var firebase = getFirebase();
    var authMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    await authMod.signInWithEmailAndPassword(firebase.auth, email, password);
    window.location.href = nextPath();
  } catch (err) {
    setStatus(status, friendlyAuthError(err), 'is-error');
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function handleReset() {
  var status = document.getElementById('login-status');
  var emailInput = document.getElementById('email');
  var email = emailInput && emailInput.value.trim();

  if (!isFirebaseConfigured()) {
    showPending();
    setStatus(status, 'Accounts are being connected. Password reset is not live yet.', 'is-error');
    return;
  }
  if (!email) {
    setStatus(status, 'Enter your email above, then click Forgot password.', 'is-error');
    return;
  }

  try {
    await waitForAuthReady();
    var firebase = getFirebase();
    var authMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    await authMod.sendPasswordResetEmail(firebase.auth, email);
    setStatus(status, 'Check your email for a password reset link.', 'is-ok');
  } catch (err) {
    setStatus(status, friendlyAuthError(err), 'is-error');
  }
}

function friendlyAuthError(err) {
  var code = (err && err.code) || '';
  if (code === 'auth/email-already-in-use') return 'That email already has an account. Try signing in.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/weak-password') return 'Please choose a stronger password (at least 8 characters).';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Email or password is not right. Try again, or reset your password.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a moment and try again.';
  return (err && err.message) || 'Something went wrong. Please try again.';
}

function prefillJoinFromQuery() {
  var form = document.getElementById('join-form');
  if (!form) return;
  var params = new URLSearchParams(window.location.search);
  var first = params.get('first');
  var email = params.get('email');
  if (first && form.firstName) form.firstName.value = first;
  if (email && form.email) form.email.value = email;
}

waitForAuthReady().then(function (state) {
  if (!state.configured) markPendingForms();
  if (state.configured && state.user && document.getElementById('join-form')) {
    window.location.replace(nextPath());
  }
});

prefillJoinFromQuery();

var joinForm = document.getElementById('join-form');
if (joinForm) {
  joinForm.addEventListener('submit', function (e) {
    e.preventDefault();
    handleJoin(joinForm);
  });
}

var loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    handleLogin(loginForm);
  });
}

var resetBtn = document.getElementById('reset-password');
if (resetBtn) {
  resetBtn.addEventListener('click', handleReset);
}
