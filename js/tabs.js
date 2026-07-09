/* ============================================================
   VIEW SWITCHING
   Seven views total: home, resume, pdf, excel, zip, image, convert.
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
}
