import {
  isAccountsConfigured,
  waitForAuthReady,
  getClient,
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

  if (!isAccountsConfigured()) {
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
    await waitForAuthReady();
    var supabase = getClient();
    var signedUp = await supabase.auth.signUp({ email: email, password: password });
    if (signedUp.error) throw signedUp.error;
    var user = signedUp.data && signedUp.data.user;
    if (!user) throw new Error('Account was created, but sign-in did not finish. Try signing in.');

    var consentAt = new Date().toISOString();
    var profile = {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      name: firstName + ' ' + lastName,
      email: email,
      consent: true,
      consent_at: consentAt,
      source: 'early-reader',
      feedback: {}
    };
    var saved = await supabase.from('readers').insert(profile);
    if (saved.error) throw saved.error;

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
    setStatus(status, friendlyAuthError(err), 'is-error');
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

  if (!isAccountsConfigured()) {
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
    var supabase = getClient();
    var result = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
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

  if (!isAccountsConfigured()) {
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
    var supabase = getClient();
    var redirectTo = new URL('login.html', window.location.href).href;
    var result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
    if (result.error) throw result.error;
    setStatus(status, 'Check your email for a password reset link.', 'is-ok');
  } catch (err) {
    setStatus(status, friendlyAuthError(err), 'is-error');
  }
}

function friendlyAuthError(err) {
  var message = ((err && (err.message || err.error_description)) || '').toLowerCase();
  if (message.indexOf('already registered') !== -1 || message.indexOf('already been registered') !== -1) {
    return 'That email already has an account. Try signing in.';
  }
  if (message.indexOf('invalid login') !== -1 || message.indexOf('invalid credentials') !== -1) {
    return 'Email or password is not right. Try again, or reset your password.';
  }
  if (message.indexOf('invalid email') !== -1) return 'Please enter a valid email address.';
  if (message.indexOf('password') !== -1 && message.indexOf('least') !== -1) {
    return 'Please choose a stronger password (at least 8 characters).';
  }
  if (message.indexOf('rate limit') !== -1 || message.indexOf('too many') !== -1) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
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
