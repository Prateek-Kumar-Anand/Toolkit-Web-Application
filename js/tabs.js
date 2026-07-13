/* ============================================================
   VIEW SWITCHING
   Eleven views total: home, resume, pdf, excel, zip, image,
   compress, qr, convert, ocr, share.
   Home shows the big tool cards. Once inside a tool, a slim
   top bar appears with a Home link and quick tab switches.
   ============================================================ */
function showView(viewName){
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + viewName).classList.add('active');

  const topbar = document.getElementById('topbar');
  if(viewName === 'home'){
    topbar.style.display = 'none';
  } else {
    topbar.style.display = 'flex';
    document.querySelectorAll('.topbar-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
  }

  window.scrollTo(0, 0);
  syncTopbarHeight();
}

/* The topbar can wrap onto two lines on narrower screens (more tools =
   more tabs). Layouts elsewhere assume a --topbar-h value for their
   "fill the rest of the viewport" sizing, so keep it measured and
   accurate instead of a hardcoded guess. */
function syncTopbarHeight(){
  const topbar = document.getElementById('topbar');
  const h = (topbar.style.display === 'none') ? 0 : topbar.offsetHeight;
  if(h > 0){
    document.documentElement.style.setProperty('--topbar-h', h + 'px');
  }
}

window.addEventListener('resize', syncTopbarHeight);
