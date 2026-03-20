// Mobile sidebar drawer — toggle visibility on small screens.
//
// The sidebar is CSS-hidden on mobile (hidden lg:block). This script
// overrides inline styles to show it as a fullscreen overlay when the
// hamburger menu is tapped. Escape key and nav link clicks close it.
(function () {
  var sidebar = document.getElementById('sidebar');
  var openBtns = document.querySelectorAll('[data-drawer-slide]');
  if (!sidebar) return;

  function open() {
    var isDark = document.documentElement.classList.contains('dark');
    sidebar.style.display = 'block';
    sidebar.style.position = 'fixed';
    sidebar.style.inset = '0';
    sidebar.style.zIndex = '50';
    sidebar.style.background = isDark
      ? 'rgb(var(--color-background-dark))'
      : 'rgb(var(--color-background-light))';
    document.addEventListener('keydown', onKey);
  }

  function close() {
    sidebar.style.display = '';
    sidebar.style.position = '';
    sidebar.style.inset = '';
    sidebar.style.zIndex = '';
    sidebar.style.background = '';
    document.removeEventListener('keydown', onKey);
  }

  function isOpen() {
    return sidebar.style.display === 'block';
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  openBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (isOpen()) {
        close();
      } else {
        open();
      }
    });
  });

  // Close drawer on nav link click (mobile)
  sidebar.addEventListener('click', function (e) {
    if (e.target.closest('#nav a') && isOpen()) close();
  });
})();
