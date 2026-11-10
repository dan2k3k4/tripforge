// Runs before first paint so a saved light/dark choice never flashes. Loaded as a classic script (CSP: script-src 'self').
try {
  var t = localStorage.getItem('tripforge:theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
