/**
 * Apply saved text and image overrides. If Supabase is unavailable,
 * the original HTML stays in place.
 */
(function () {
  'use strict';

  var nodes = document.querySelectorAll('[data-cms]');
  if (!nodes.length) return;
  var cfg = window.WDYB_SUPABASE || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
  if (String(cfg.SUPABASE_URL).indexOf('YOUR_') === 0) return;
  if (!window.supabase || !window.supabase.createClient) return;

  var client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  client
    .from('site_content')
    .select('key, value')
    .then(function (res) {
      if (res.error || !res.data) return;
      var map = {};
      res.data.forEach(function (row) {
        if (row.value) map[row.key] = row.value;
      });
      nodes.forEach(function (el) {
        var key = el.getAttribute('data-cms');
        var value = map[key];
        if (!value) return;
        if (el.tagName === 'IMG') {
          el.src = value;
          return;
        }
        if (el.tagName === 'A' && (el.getAttribute('href') || '').indexOf('mailto:') === 0) {
          el.textContent = value;
          el.setAttribute('href', 'mailto:' + value);
          return;
        }
        el.textContent = value;
      });
    })
    .catch(function () {});
})();
