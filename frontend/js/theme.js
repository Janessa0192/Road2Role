/*
 * Light / dark theme toggle.
 * Loaded as a normal (blocking) <script> inside <head> so the saved theme is
 * applied BEFORE the page paints -> no white flash when a dark-mode user reloads.
 */
(function () {
  var KEY = 'r2r-theme';
  var root = document.documentElement;

  function getSaved() {
    try {
      return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light'; // storage blocked (private mode etc.) -> default to light
    }
  }

  function save(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
  }

  function paintButton(btn, theme) {
    var isDark = theme === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  // 1) apply immediately
  apply(getSaved());

  // 2) add the button to the navbar once the DOM exists
  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.site-nav');
    if (!nav || nav.querySelector('.theme-toggle')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    paintButton(btn, root.getAttribute('data-theme'));

    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      save(next);
      paintButton(btn, next);
    });

    // put it just before the login/account area (nav.js re-renders only [data-auth-area])
    var authArea = nav.querySelector('[data-auth-area]');
    nav.insertBefore(btn, authArea || null);
  });
})();
