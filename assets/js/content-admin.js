(function () {
  'use strict';

  var ER = window.EarlyReader;
  if (!ER) return;

  var PAGES = [
    ['index.html', 'Home'],
    ['about.html', 'About Judy'],
    ['framework.html', 'The Framework'],
    ['book.html', 'The Book'],
    ['work-with-judy.html', 'Work With Judy'],
    ['contact.html', 'Contact']
  ];

  var loginView = document.getElementById('content-login');
  var deniedView = document.getElementById('content-denied');
  var editorView = document.getElementById('content-editor');
  var fieldsEl = document.getElementById('content-fields');
  var statusEl = document.getElementById('content-status');

  function show(name) {
    loginView.hidden = name !== 'login';
    deniedView.hidden = name !== 'denied';
    editorView.hidden = name !== 'editor';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadSlots() {
    return Promise.all(PAGES.map(function (page) {
      return fetch(page[0]).then(function (res) {
        return res.text();
      }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var slots = [];
        doc.querySelectorAll('[data-cms]').forEach(function (el) {
          var kind = el.getAttribute('data-cms-kind') === 'image' ? 'image' : 'text';
          slots.push({
            key: el.getAttribute('data-cms'),
            label: el.getAttribute('data-cms-label') || el.getAttribute('data-cms'),
            kind: kind,
            page: page[1],
            fallback: kind === 'image' ? (el.getAttribute('src') || '') : (el.textContent || '').trim()
          });
        });
        return slots;
      });
    })).then(function (groups) {
      var slots = [];
      groups.forEach(function (group) {
        group.forEach(function (slot) { slots.push(slot); });
      });
      return slots;
    });
  }

  function loadSaved() {
    return ER.getClient().from('site_content').select('key, value').then(function (res) {
      if (res.error) throw res.error;
      var map = {};
      (res.data || []).forEach(function (row) { map[row.key] = row.value || ''; });
      return map;
    });
  }

  function render(slots, saved) {
    var html = '';
    var currentPage = '';
    slots.forEach(function (slot) {
      if (slot.page !== currentPage) {
        currentPage = slot.page;
        html += '<h2 class="er-content-page">' + escapeHtml(currentPage) + '</h2>';
      }
      var value = saved[slot.key] || slot.fallback;
      html += '<div class="form-group er-content-field" data-key="' + escapeHtml(slot.key) + '" data-kind="' + slot.kind + '">';
      html += '<label>' + escapeHtml(slot.label) + '</label>';
      if (slot.kind === 'image') {
        html += '<img class="er-content-preview" alt="" src="' + escapeHtml(value) + '">';
        html += '<input type="url" class="er-content-url" value="' + escapeHtml(value) + '" placeholder="Image address">';
        html += '<input type="file" class="er-content-file" accept="image/*">';
      } else {
        html += '<textarea rows="4">' + escapeHtml(value) + '</textarea>';
      }
      html += '</div>';
    });
    fieldsEl.innerHTML = html || '<p>No editable text or photos were found.</p>';
  }

  function uploadImage(file, key) {
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = key.replace(/[^a-z0-9.-]/gi, '-') + '-' + Date.now() + '.' + ext;
    var client = ER.getClient();
    return client.storage.from('site-images').upload(path, file, { upsert: true }).then(function (res) {
      if (res.error) throw res.error;
      var pub = client.storage.from('site-images').getPublicUrl(path);
      return pub.data.publicUrl;
    });
  }

  function saveAll() {
    var fields = fieldsEl.querySelectorAll('.er-content-field');
    var uploads = [];
    fields.forEach(function (field) {
      if (field.getAttribute('data-kind') !== 'image') return;
      var fileInput = field.querySelector('.er-content-file');
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      uploads.push(
        uploadImage(fileInput.files[0], field.getAttribute('data-key')).then(function (url) {
          field.querySelector('.er-content-url').value = url;
          field.querySelector('.er-content-preview').src = url;
        })
      );
    });

    return Promise.all(uploads).then(function () {
      var rows = [];
      fields.forEach(function (field) {
        var kind = field.getAttribute('data-kind');
        var value = kind === 'image'
          ? field.querySelector('.er-content-url').value.trim()
          : field.querySelector('textarea').value.trim();
        rows.push({
          key: field.getAttribute('data-key'),
          kind: kind,
          value: value
        });
      });
      return ER.getClient().from('site_content').upsert(rows, { onConflict: 'key' }).then(function (res) {
        if (res.error) throw res.error;
      });
    });
  }

  function openEditor() {
    show('editor');
    ER.setStatus(statusEl, 'Loading the current text and photos…', 'info');
    Promise.all([loadSlots(), loadSaved()])
      .then(function (result) {
        render(result[0], result[1]);
        ER.setStatus(statusEl, '', 'info');
      })
      .catch(function (err) {
        ER.setStatus(statusEl, ER.friendlyError(err), 'error');
      });
  }

  document.getElementById('content-login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('content-login-btn');
    btn.disabled = true;
    ER.signIn(
      document.getElementById('admin-email').value.trim(),
      document.getElementById('admin-password').value
    )
      .then(function () { return ER.isAdmin(); })
      .then(function (ok) {
        if (!ok) { show('denied'); return; }
        openEditor();
      })
      .catch(function (err) {
        ER.setStatus(document.getElementById('content-login-status'), ER.friendlyError(err), 'error');
      })
      .finally(function () { btn.disabled = false; });
  });

  function logout() {
    ER.signOut().catch(function () {}).then(function () { show('login'); });
  }
  document.getElementById('content-logout').addEventListener('click', logout);
  document.getElementById('denied-logout').addEventListener('click', logout);

  document.getElementById('content-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('content-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    saveAll()
      .then(function () {
        ER.setStatus(statusEl, 'Saved. Refresh the public page to see the change.', 'success');
      })
      .catch(function (err) {
        ER.setStatus(statusEl, ER.friendlyError(err), 'error');
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Save changes';
      });
  });

  if (!ER.configReady()) {
    show('login');
    ER.setStatus(document.getElementById('content-login-status'), 'Supabase is not configured yet.', 'info');
    return;
  }

  ER.requireAdmin().then(function (state) {
    if (!state.session) { show('login'); return; }
    if (!state.isAdmin) { show('denied'); return; }
    openEditor();
  }).catch(function () { show('login'); });
})();
