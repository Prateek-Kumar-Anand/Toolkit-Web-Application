/* ============================================================
   LIGHT / DARK MODE TOGGLE
   The actual theme is applied via the `data-theme` attribute on
   <html>, which is set as early as possible by a small inline
   script in <head> (before first paint, to avoid a light-mode
   flash). This file just handles the toggle button clicks and
   keeps every toggle button's icon in sync with the current
   theme, plus remembers the choice for next visit.
   ============================================================ */

function applyThemeToggleIcon(){
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const icon = theme === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('.js-theme-toggle').forEach(btn => {
    btn.textContent = icon;
  });
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try{
    localStorage.setItem('toolkitTheme', next);
  } catch(e){
    // localStorage unavailable (private browsing, etc.) — theme just
    // won't persist across visits, which is fine.
  }
  applyThemeToggleIcon();
}

applyThemeToggleIcon();
