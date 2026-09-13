(function () {
  'use strict';

  /* Header scroll state */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobile menu */
  var toggle = document.querySelector('.menu-toggle');
  var mobileNav = document.querySelector('.nav-mobile');

  function closeMenu() {
    if (!toggle || !mobileNav) return;
    toggle.classList.remove('is-open');
    mobileNav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    mobileNav.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function openMenu() {
    if (!toggle || !mobileNav) return;
    toggle.classList.add('is-open');
    mobileNav.classList.add('is-open');
    mobileNav.removeAttribute('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      if (mobileNav.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* Scroll reveal */
  var revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* Contact form — send to heyjude201@gmail.com via FormSubmit */
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var honey = contactForm.querySelector('.form-honey');
      if (honey && honey.value) return;

      var btn = contactForm.querySelector('button[type="submit"]');
      var statusEl = document.getElementById('form-status');
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending...';
      if (statusEl) statusEl.textContent = '';

      fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          }).catch(function () {
            return { ok: response.ok, data: null };
          });
        })
        .then(function (result) {
          var data = result.data || {};
          var success = result.ok && String(data.success) !== 'false';
          var message = (data.message || '').toLowerCase();
          var needsActivation =
            message.indexOf('confirm') !== -1 ||
            message.indexOf('activate') !== -1 ||
            message.indexOf('activation') !== -1;

          if (needsActivation) {
            btn.textContent = 'Check Judy\'s email to activate';
            if (statusEl) {
              statusEl.textContent =
                'FormSubmit sent an activation email to heyjude201@gmail.com. Open that inbox (check Spam/Junk), click the confirmation link once, then try the form again.';
            }
            return;
          }

          if (success) {
            btn.textContent = 'Message Sent';
            if (statusEl) {
              statusEl.textContent = 'Thank you — your message was sent. Judy will get back to you soon.';
            }
            contactForm.reset();
            return;
          }

          btn.textContent = 'Could not send — please email directly';
          if (statusEl) {
            statusEl.textContent =
              'The form could not deliver your message. Please email heyjude201@gmail.com directly.';
          }
        })
        .catch(function () {
          btn.textContent = 'Could not send — please email directly';
          if (statusEl) {
            statusEl.textContent =
              'The form could not deliver your message. Please email heyjude201@gmail.com directly.';
          }
        })
        .finally(function () {
          setTimeout(function () {
            btn.textContent = originalText;
            btn.disabled = false;
          }, 6000);
        });
    });
  }
})();
