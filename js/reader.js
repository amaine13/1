import { isFirebaseConfigured, waitForAuthReady, getFirebase } from './auth.js';

var CHAPTERS = [
  { id: 'intro', title: "There's Always Another Bus", label: 'Introduction' },
  { id: '1', title: 'Meet Your Bus!', label: 'Ch. 1' },
  { id: '2', title: 'How Passengers Board the Bus', label: 'Ch. 2' },
  { id: '3', title: 'Emotional Baggage', label: 'Ch. 3' }
];

var currentId = 'intro';
var cache = {};

function show(id, on) {
  var el = document.getElementById(id);
  if (el) el.hidden = !on;
}

function renderTabs() {
  var tabs = document.getElementById('chapter-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  CHAPTERS.forEach(function (ch) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chapter-tab' + (ch.id === currentId ? ' is-active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', ch.id === currentId ? 'true' : 'false');
    btn.textContent = (ch.label || ch.id) + ' — ' + ch.title;
    btn.addEventListener('click', function () {
      currentId = ch.id;
      renderTabs();
      renderChapter();
    });
    tabs.appendChild(btn);
  });
}

async function loadChapter(id) {
  if (cache[id]) return cache[id];
  var firebase = getFirebase();
  var storeMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
  var snap = await storeMod.getDoc(storeMod.doc(firebase.db, 'chapters', id));
  if (!snap.exists()) {
    throw new Error('Chapter is not seeded yet.');
  }
  cache[id] = snap.data();
  return cache[id];
}

async function loadFeedback(uid) {
  var firebase = getFirebase();
  var storeMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
  var snap = await storeMod.getDoc(storeMod.doc(firebase.db, 'readers', uid));
  if (!snap.exists()) return {};
  return (snap.data().feedback || {});
}

async function renderChapter() {
  var body = document.getElementById('chapter-body');
  var feedback = document.getElementById('feedback');
  var status = document.getElementById('feedback-status');
  if (status) status.textContent = '';
  if (body) body.innerHTML = '<p>Loading the chapter…</p>';

  try {
    var data = await loadChapter(currentId);
    if (body) {
      var heading = document.createElement('h1');
      var meta = CHAPTERS.find(function (ch) { return ch.id === currentId; });
      heading.textContent = (meta && meta.label ? meta.label + ' — ' : '') + (data.title || meta.title || '');
      body.innerHTML = '';
      body.appendChild(heading);
      var wrap = document.createElement('div');
      wrap.innerHTML = data.html || '';
      body.appendChild(wrap);
    }
    var state = await waitForAuthReady();
    if (state.user && feedback) {
      var notes = await loadFeedback(state.user.uid);
      feedback.value = notes[currentId] || '';
    }
  } catch (err) {
    if (body) {
      body.innerHTML =
        '<p>This piece is not available yet. After Firebase is connected, run the seed script so the introduction and Chapters 1–3 can be read here.</p>';
    }
  }
}

async function saveFeedback(e) {
  e.preventDefault();
  var status = document.getElementById('feedback-status');
  var btn = document.getElementById('feedback-submit');
  var field = document.getElementById('feedback');
  var state = await waitForAuthReady();
  if (!state.configured || !state.user) {
    if (status) {
      status.textContent = 'Sign in to save a note.';
      status.classList.add('is-error');
    }
    return;
  }

  btn.disabled = true;
  try {
    var firebase = getFirebase();
    var storeMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    var update = { feedbackUpdatedAt: storeMod.serverTimestamp() };
    update['feedback.' + currentId] = (field && field.value) || '';
    await storeMod.setDoc(
      storeMod.doc(firebase.db, 'readers', state.user.uid),
      update,
      { merge: true }
    );
    if (status) {
      status.textContent = 'Saved. Thank you.';
      status.classList.remove('is-error');
      status.classList.add('is-ok');
    }
  } catch (err) {
    if (status) {
      status.textContent = 'Could not save that note. Please try again.';
      status.classList.add('is-error');
    }
  } finally {
    btn.disabled = false;
  }
}

waitForAuthReady().then(function (state) {
  if (!isFirebaseConfigured() || !state.configured) {
    show('reader-pending', true);
    show('reader-locked', true);
    show('reader-live', false);
    return;
  }

  if (!state.user) {
    show('reader-pending', false);
    show('reader-locked', true);
    show('reader-live', false);
    return;
  }

  show('reader-pending', false);
  show('reader-locked', false);
  show('reader-live', true);
  renderTabs();
  renderChapter();
});

var feedbackForm = document.getElementById('feedback-form');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', saveFeedback);
}
