// Language tabs — switch tabs within a group, sync across page
(function () {
  var selectedLang = null;

  document.addEventListener('click', function (e) {
    var tab = e.target.closest('.code-samples-tab');
    if (!tab) return;

    var container = tab.closest('.code-samples');
    var index = tab.getAttribute('data-tab-index');
    var lang = tab.textContent.trim();

    // Activate this tab locally
    activateTab(container, index);

    // Sync: activate same language in all other code-sample groups
    if (lang !== selectedLang) {
      selectedLang = lang;
      document.querySelectorAll('.code-samples').forEach(function (group) {
        if (group === container) return;
        var matching = group.querySelector('.code-samples-tab[data-tab-index]');
        // Find tab with same language name
        group.querySelectorAll('.code-samples-tab').forEach(function (t) {
          if (t.textContent.trim() === lang) {
            activateTab(group, t.getAttribute('data-tab-index'));
          }
        });
      });
    }
  });

  function activateTab(container, index) {
    container.querySelectorAll('.code-samples-tab').forEach(function (t) {
      var isActive = t.getAttribute('data-tab-index') === index;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    container.querySelectorAll('.code-samples-panel').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-panel-index') === index);
    });
  }
})();
