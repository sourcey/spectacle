// Sidebar — open/close toggle, close on nav click (mobile), outside click, Escape
(function () {
  var sidebar = document.getElementById('sidebar');
  var openBtn = document.querySelector('[data-drawer-slide]');
  var closeBtn = document.querySelector('[data-drawer-close]');
  if (!sidebar) return;

  function open() {
    sidebar.classList.add('open');
    document.addEventListener('keydown', onKey);
    // Delay so the click that opened doesn't immediately close
    requestAnimationFrame(function () {
      document.addEventListener('click', onOutside);
    });
  }

  function close() {
    sidebar.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onOutside);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function onOutside(e) {
    if (!sidebar.contains(e.target) && e.target !== openBtn) close();
  }

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);

  // Close sidebar on nav link click (mobile)
  sidebar.addEventListener('click', function (e) {
    var link = e.target.closest('#nav a');
    if (link) close();
  });
})();
