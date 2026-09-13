/**
 * Early Reader admin dashboard logic.
 */
(function () {
  'use strict';

  var ER = window.EarlyReader;
  if (!ER) return;

  var loginView = document.getElementById('admin-login');
  var deniedView = document.getElementById('admin-denied');
  var dashView = document.getElementById('admin-dashboard');
  var tbody = document.getElementById('admin-tbody');
  var statsEl = document.getElementById('admin-stats');
  var statusEl = document.getElementById('admin-status');
  var modal = document.getElementById('detail-modal');
  var modalBody = document.getElementById('modal-body');
  var modalTitle = document.getElementById('modal-title');

  var applicants = [];
  var currentFilter = 'all';

  function show(view) {
    loginView.hidden = view !== 'login';
    deniedView.hidden = view !== 'denied';
    dashView.hidden = view !== 'dashboard';
  }

  function feedbackRow(row) {
    var fb = row.early_reader_feedback;
    if (!fb) return null;
    if (Array.isArray(fb)) return fb[0] || null;
    return fb;
  }

  function hasFeedback(row) {
    return !!feedbackRow(row);
  }

  function renderStats() {
    var total = applicants.length;
    var pending = 0;
    var approved = 0;
    var accessSent = 0;
    var feedback = 0;
    applicants.forEach(function (r) {
      if (r.status === 'pending') pending += 1;
      if (r.status === 'approved') approved += 1;
      if (r.access_sent) accessSent += 1;
      if (hasFeedback(r)) feedback += 1;
    });
    statsEl.innerHTML =
      '<div class="er-stat"><strong>' + total + '</strong><span>Total</span></div>' +
      '<div class="er-stat"><strong>' + pending + '</strong><span>Pending</span></div>' +
      '<div class="er-stat"><strong>' + approved + '</strong><span>Approved</span></div>' +
      '<div class="er-stat"><strong>' + accessSent + '</strong><span>Access Sent</span></div>' +
      '<div class="er-stat"><strong>' + feedback + '</strong><span>Feedback</span></div>';
  }

  function filteredRows() {
    return applicants.filter(function (r) {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'pending') return r.status === 'pending';
      if (currentFilter === 'approved') return r.status === 'approved';
      if (currentFilter === 'declined') return r.status === 'declined';
      if (currentFilter === 'access_sent') return !!r.access_sent;
      if (currentFilter === 'feedback') return hasFeedback(r);
      return true;
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderTable() {
    var rows = filteredRows();
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8">No applications in this filter.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map(function (r) {
        var fb = hasFeedback(r);
        return (
          '<tr data-id="' + escapeHtml(r.id) + '">' +
          '<td>' + escapeHtml(r.first_name + ' ' + r.last_name) + '</td>' +
          '<td><button type="button" class="er-linkish" data-action="copy-email" data-email="' + escapeHtml(r.email) + '">' + escapeHtml(r.email) + '</button></td>' +
          '<td>' + escapeHtml(ER.formatDate(r.created_at)) + '</td>' +
          '<td><span class="er-badge er-badge--' + escapeHtml(r.status) + '">' + escapeHtml(r.status) + '</span></td>' +
          '<td>' + (r.agreement_accepted ? 'Yes' : 'No') + '</td>' +
          '<td>' + (r.access_sent ? 'Yes · ' + escapeHtml(ER.formatDate(r.access_sent_at)) : 'No') + '</td>' +
          '<td>' + (fb ? 'Yes' : '—') + '</td>' +
          '<td class="er-actions">' +
          '<button type="button" class="btn btn--secondary er-btn-sm" data-action="view">View</button> ' +
          (r.status === 'pending'
            ? '<button type="button" class="btn btn--primary er-btn-sm" data-action="approve">Approve</button> ' +
              '<button type="button" class="btn btn--secondary er-btn-sm" data-action="decline">Decline</button> '
            : '') +
          (r.status === 'approved' && !r.access_sent
            ? '<button type="button" class="btn btn--gold er-btn-sm" data-action="access-sent">Mark Access Sent</button> '
            : '') +
          (fb ? '<button type="button" class="btn btn--secondary er-btn-sm" data-action="feedback">Feedback</button>' : '') +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  function findById(id) {
    for (var i = 0; i < applicants.length; i += 1) {
      if (applicants[i].id === id) return applicants[i];
    }
    return null;
  }

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = '';
  }

  function viewApplication(row) {
    openModal(
      row.first_name + ' ' + row.last_name,
      '<p><strong>Email:</strong> ' + escapeHtml(row.email) + '</p>' +
        '<p><strong>Applied:</strong> ' + escapeHtml(ER.formatDate(row.created_at)) + '</p>' +
        '<p><strong>Status:</strong> ' + escapeHtml(row.status) + '</p>' +
        '<p><strong>Agreement:</strong> ' + (row.agreement_accepted ? 'Accepted ' + escapeHtml(ER.formatDate(row.agreement_accepted_at)) : 'No') + '</p>' +
        '<p><strong>Book updates opt-in:</strong> ' + (row.book_updates_opt_in ? 'Yes' : 'No') + '</p>' +
        '<p><strong>Access sent:</strong> ' + (row.access_sent ? 'Yes · ' + escapeHtml(ER.formatDate(row.access_sent_at)) : 'No') + '</p>' +
        '<p><strong>Why they want to read:</strong></p>' +
        '<p class="er-modal-quote">' + escapeHtml(row.reason || '—') + '</p>' +
        '<p class="er-admin-workflow">Next: Approve if appropriate → copy email → add as Viewer in the private Google Doc → Mark Access Sent.</p>'
    );
  }

  function viewFeedback(row) {
    var fb = feedbackRow(row);
    if (!fb) return;
    openModal(
      'Feedback — ' + row.first_name,
      '<p><strong>Submitted:</strong> ' + escapeHtml(ER.formatDate(fb.submitted_at)) + '</p>' +
        '<p><strong>Testimonial permission:</strong> ' + (fb.testimonial_permission ? 'Yes — may quote using first name' : 'No') + '</p>' +
        '<hr class="er-modal-rule">' +
        '<p><strong>1. What resonated / what didn’t</strong></p><p class="er-modal-quote">' + escapeHtml(fb.resonated || '—') + '</p>' +
        '<p><strong>2. Clarity</strong></p><p class="er-modal-quote">' + escapeHtml(fb.clarity || '—') + '</p>' +
        '<p><strong>3. Wanting to keep reading</strong></p><p class="er-modal-quote">' + escapeHtml(fb.keep_reading || '—') + '</p>' +
        '<p><strong>4. Slow / lost attention</strong></p><p class="er-modal-quote">' + escapeHtml(fb.slow_sections || '—') + '</p>' +
        '<p><strong>5. Especially true or moving</strong></p><p class="er-modal-quote">' + escapeHtml(fb.true_or_moving || '—') + '</p>' +
        '<p><strong>6. Anything else</strong></p><p class="er-modal-quote">' + escapeHtml(fb.additional_comments || '—') + '</p>'
    );
  }

  function refresh() {
    return ER.listApplicants()
      .then(function (rows) {
        applicants = rows;
        renderStats();
        renderTable();
      })
      .catch(function (err) {
        ER.setStatus(statusEl, ER.friendlyError(err), 'error');
      });
  }

  function copyEmail(email) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(email).then(function () {
        ER.setStatus(statusEl, 'Copied: ' + email, 'success');
      });
    }
    ER.setStatus(statusEl, email, 'info');
    return Promise.resolve();
  }

  function bootDashboard() {
    show('dashboard');
    refresh();
  }

  function initAuth() {
    if (!ER.configReady()) {
      show('login');
      ER.setStatus(
        document.getElementById('admin-login-status'),
        'Supabase is not configured yet. Paste URL and anon key into assets/js/supabase-config.js.',
        'info'
      );
      document.getElementById('admin-login-btn').disabled = true;
      return;
    }

    ER.requireAdmin()
      .then(function (state) {
        if (!state.session) {
          show('login');
          return;
        }
        if (!state.isAdmin) {
          show('denied');
          return;
        }
        bootDashboard();
      })
      .catch(function (err) {
        show('login');
        ER.setStatus(document.getElementById('admin-login-status'), ER.friendlyError(err), 'error');
      });
  }

  document.getElementById('admin-login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('admin-email').value.trim();
    var password = document.getElementById('admin-password').value;
    var btn = document.getElementById('admin-login-btn');
    var loginStatus = document.getElementById('admin-login-status');
    btn.disabled = true;
    ER.signIn(email, password)
      .then(function () {
        return ER.isAdmin();
      })
      .then(function (ok) {
        if (!ok) {
          show('denied');
          return;
        }
        bootDashboard();
      })
      .catch(function (err) {
        ER.setStatus(loginStatus, ER.friendlyError(err), 'error');
      })
      .finally(function () {
        btn.disabled = false;
      });
  });

  function doLogout() {
    ER.signOut()
      .catch(function () {})
      .then(function () {
        show('login');
      });
  }

  document.getElementById('admin-logout').addEventListener('click', doLogout);
  document.getElementById('denied-logout').addEventListener('click', doLogout);

  document.getElementById('admin-filters').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-filter]');
    if (!btn) return;
    currentFilter = btn.getAttribute('data-filter');
    document.querySelectorAll('.er-filter').forEach(function (el) {
      el.classList.toggle('is-active', el === btn);
    });
    renderTable();
  });

  tbody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var tr = btn.closest('tr');
    var id = tr && tr.getAttribute('data-id');
    var row = findById(id);
    if (!row) return;
    var action = btn.getAttribute('data-action');

    if (action === 'copy-email') {
      copyEmail(btn.getAttribute('data-email') || row.email);
      return;
    }
    if (action === 'view') {
      viewApplication(row);
      return;
    }
    if (action === 'feedback') {
      viewFeedback(row);
      return;
    }
    if (action === 'approve') {
      btn.disabled = true;
      ER.updateApplicant(id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        declined_at: null
      })
        .then(function () {
          ER.setStatus(statusEl, 'Approved. Copy the email, add them as a Viewer in Google Docs, then mark Access Sent.', 'success');
          return refresh();
        })
        .catch(function (err) {
          ER.setStatus(statusEl, ER.friendlyError(err), 'error');
        });
      return;
    }
    if (action === 'decline') {
      btn.disabled = true;
      ER.updateApplicant(id, {
        status: 'declined',
        declined_at: new Date().toISOString()
      })
        .then(function () {
          ER.setStatus(statusEl, 'Marked as declined.', 'info');
          return refresh();
        })
        .catch(function (err) {
          ER.setStatus(statusEl, ER.friendlyError(err), 'error');
        });
      return;
    }
    if (action === 'access-sent') {
      btn.disabled = true;
      ER.updateApplicant(id, {
        access_sent: true,
        access_sent_at: new Date().toISOString()
      })
        .then(function () {
          ER.setStatus(statusEl, 'Access marked as sent.', 'success');
          return refresh();
        })
        .catch(function (err) {
          ER.setStatus(statusEl, ER.friendlyError(err), 'error');
        });
    }
  });

  modal.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close-modal')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  initAuth();
})();
