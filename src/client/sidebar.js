// Mobile navigation drawer using native <dialog>.
//
// Opens as a modal dialog with backdrop. Closes on:
// backdrop click, nav link click, Escape (native dialog behavior).
// Dropdown toggles list visibility for tab selection.
(function () {
  function init() {
    var dialog = document.getElementById('mobile-nav');
    var openBtns = document.querySelectorAll('[data-drawer-slide]');
    if (!dialog) return;

    // Sync active state from desktop sidebar to drawer on open
    function syncActiveState() {
      var activeDesktop = document.querySelector('#nav .nav-link.active');
      if (!activeDesktop) return;
      var activeHref = activeDesktop.getAttribute('href');
      if (!activeHref) return;

      dialog.querySelectorAll('.nav-link').forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === activeHref);
      });
    }

    openBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncActiveState();
        dialog.showModal();
      });
    });

    // Close on backdrop click (click on dialog element itself, not its children)
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });

    // Close on nav link or close button click
    dialog.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target.closest('[data-close-drawer]')) dialog.close();
    });

    // Dropdown: toggle list visibility
    var toggle = document.getElementById('drawer-group-toggle');
    var list = document.getElementById('drawer-group-list');
    if (!toggle || !list) return;

    function closeDropdown() {
      list.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var open = list.style.display !== 'none';
      if (open) {
        closeDropdown();
      } else {
        list.style.display = '';
        toggle.setAttribute('aria-expanded', 'true');
      }
    });

    // Close dropdown when clicking outside it
    dialog.addEventListener('click', function (e) {
      if (list.style.display !== 'none' && !e.target.closest('.drawer-dropdown')) {
        closeDropdown();
      }
    });
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(init, { timeout: 250 });
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
