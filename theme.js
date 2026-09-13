(() => {
  'use strict';
  const key = 'japan-guide-theme';
  const root = document.documentElement;
  const system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let preference = null;
  try { preference = localStorage.getItem(key); } catch {}
  if (preference !== 'dark' && preference !== 'light') preference = null;

  function apply() {
    const dark = preference ? preference === 'dark' : Boolean(system && system.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    const chrome = document.querySelector('meta[name="theme-color"]');
    if (chrome) chrome.content = dark ? '#0b1421' : '#142841';
    const button = document.getElementById('night-mode');
    if (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Switch to day mode' : 'Switch to night mode';
      document.getElementById('theme-icon').textContent = dark ? '☀' : '☾';
      document.getElementById('theme-label').textContent = dark ? 'Day' : 'Night';
    }
  }

  apply(); // Set the palette before the stylesheet paints.
  if (system && system.addEventListener) system.addEventListener('change', () => {
    if (!preference) apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('night-mode').addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    });
  }, { once: true });
})();
