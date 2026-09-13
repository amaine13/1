/**
 * Early Reader helpers — applications, feedback RPC, admin checks.
 * No reader accounts. No manuscript access.
 */
(function (global) {
  'use strict';

  var client = null;

  function configReady() {
    var cfg = global.WDYB_SUPABASE || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return false;
    if (String(cfg.SUPABASE_URL).indexOf('YOUR_') === 0) return false;
    if (String(cfg.SUPABASE_ANON_KEY).indexOf('YOUR_') === 0) return false;
    return true;
  }

  function getClient() {
    if (client) return client;
    if (!global.supabase || !global.supabase.createClient) {
      throw new Error('Supabase library failed to load.');
    }
    if (!configReady()) {
      throw new Error('Supabase is not configured.');
    }
    var cfg = global.WDYB_SUPABASE;
    client = global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  function friendlyError(err) {
    if (!err) return 'Something went wrong. Please try again.';
    var msg = (err.message || String(err)).toLowerCase();
    var code = err.code || '';

    if (
      code === '23505' ||
      msg.indexOf('duplicate') !== -1 ||
      msg.indexOf('unique') !== -1 ||
      msg.indexOf('already exists') !== -1
    ) {
      return 'It looks like you’ve already submitted an Early Reader request with this email address.';
    }
    if (msg.indexOf('invalid login') !== -1 || msg.indexOf('invalid credentials') !== -1) {
      return 'That email or password is incorrect.';
    }
    if (msg.indexOf('not configured') !== -1 || msg.indexOf('your_supabase') !== -1) {
      return 'Early Reader is not configured yet. Please try again later.';
    }
    if (msg.indexOf('network') !== -1 || msg.indexOf('fetch') !== -1) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    return 'Something went wrong. Please try again.';
  }

  function setStatus(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('er-status--error', 'er-status--success', 'er-status--info');
    if (!message) return;
    el.classList.add('er-status--' + (type || 'info'));
  }

  function submitApplication(payload) {
    var now = new Date().toISOString();
    return getClient()
      .from('early_readers')
      .insert({
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: String(payload.email).trim().toLowerCase(),
        reason: payload.reason || null,
        agreement_accepted: true,
        agreement_accepted_at: now,
        book_updates_opt_in: !!payload.bookUpdatesOptIn,
        status: 'pending',
        access_sent: false
      })
      .then(function (res) {
        if (res.error) throw res.error;
        return res;
      });
  }

  function submitFeedback(payload) {
    return getClient()
      .rpc('submit_early_reader_feedback', {
        p_email: String(payload.email).trim().toLowerCase(),
        p_resonated: payload.resonated || null,
        p_clarity: payload.clarity || null,
        p_keep_reading: payload.keepReading || null,
        p_slow_sections: payload.slowSections || null,
        p_true_or_moving: payload.trueOrMoving || null,
        p_additional_comments: payload.additionalComments || null,
        p_testimonial_permission: !!payload.testimonialPermission
      })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  function getSession() {
    return getClient().auth.getSession().then(function (res) {
      if (res.error) throw res.error;
      return res.data.session;
    });
  }

  function signIn(email, password) {
    return getClient()
      .auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  function signOut() {
    return getClient().auth.signOut().then(function (res) {
      if (res.error) throw res.error;
    });
  }

  function isAdmin() {
    return getClient()
      .rpc('is_site_admin')
      .then(function (res) {
        if (res.error) throw res.error;
        return !!res.data;
      });
  }

  function requireAdmin() {
    return getSession().then(function (session) {
      if (!session) return { session: null, isAdmin: false };
      return isAdmin().then(function (ok) {
        return { session: session, isAdmin: ok };
      });
    });
  }

  function listApplicants() {
    return getClient()
      .from('early_readers')
      .select('*, early_reader_feedback(id, submitted_at, testimonial_permission, resonated, clarity, keep_reading, slow_sections, true_or_moving, additional_comments)')
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  function updateApplicant(id, patch) {
    return getClient()
      .from('early_readers')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '—';
    }
  }

  global.EarlyReader = {
    configReady: configReady,
    getClient: getClient,
    friendlyError: friendlyError,
    setStatus: setStatus,
    submitApplication: submitApplication,
    submitFeedback: submitFeedback,
    getSession: getSession,
    signIn: signIn,
    signOut: signOut,
    isAdmin: isAdmin,
    requireAdmin: requireAdmin,
    listApplicants: listApplicants,
    updateApplicant: updateApplicant,
    formatDate: formatDate
  };
})(window);
