// Code sample language dropdown + response code tabs + copy button.
//
// Handles three interaction patterns:
// 1. Language dropdown — toggles .code-lang-menu, switches .code-lang-panel
// 2. Response tabs — switches .response-tab active state + .response-panel
// 3. Copy button — copies code from the active panel to clipboard
(function () {
  function init() {
    var selectedLang = null;

    // ── Language Dropdown ──────────────────────────────────────────────

    // Toggle dropdown open/close
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('.code-lang-trigger');

      // Close all open dropdowns first
      document.querySelectorAll('.code-lang-menu').forEach(function (menu) {
        if (!trigger || !menu.parentElement.contains(trigger)) {
          menu.classList.add('hidden');
          var btn = menu.parentElement.querySelector('.code-lang-trigger');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });

      if (!trigger) return;
      e.stopPropagation();

      var menu = trigger.nextElementSibling;
      if (!menu) return;

      var isOpen = !menu.classList.contains('hidden');
      menu.classList.toggle('hidden', isOpen);
      trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });

    // Select a language from the dropdown
    document.addEventListener('click', function (e) {
      var option = e.target.closest('.code-lang-option');
      if (!option) return;

      var container = option.closest('.code-group');
      var index = option.getAttribute('data-lang-index');
      var lang = option.textContent.trim();

      // Close the menu
      var menu = option.closest('.code-lang-menu');
      if (menu) {
        menu.classList.add('hidden');
        var trigger = menu.parentElement.querySelector('.code-lang-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }

      var scrollY = window.scrollY;
      activateLang(container, index);

      // Sync language across all code-sample groups
      if (lang !== selectedLang) {
        selectedLang = lang;
        document.querySelectorAll('.code-group').forEach(function (group) {
          if (group === container || !group.querySelector('.code-lang-dropdown')) return;
          group.querySelectorAll('.code-lang-option').forEach(function (opt) {
            if (opt.textContent.trim() === lang) {
              activateLang(group, opt.getAttribute('data-lang-index'));
            }
          });
        });
      }

      window.scrollTo(0, scrollY);
    });

    function activateLang(container, index) {
      // Update dropdown label
      var options = container.querySelectorAll('.code-lang-option');
      var label = container.querySelector('.code-lang-label');
      options.forEach(function (opt) {
        var isActive = opt.getAttribute('data-lang-index') === index;
        opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
        opt.className = opt.className.replace(/(dark:)?text-\[rgb\([^\]]+\)\]/g, '').trim();
        if (isActive) {
          opt.classList.add('text-[rgb(var(--color-primary))]', 'dark:text-[rgb(var(--color-primary-light))]');
          if (label) label.textContent = opt.textContent.trim();
          // Update trigger icon to match selected language
          var triggerIcon = container.querySelector('.code-lang-trigger .code-lang-icon');
          var optIcon = opt.querySelector('.lang-icon');
          if (triggerIcon && optIcon) {
            triggerIcon.innerHTML = optIcon.outerHTML;
          }
        } else {
          opt.classList.add('text-[rgb(var(--color-stone-600))]', 'dark:text-[rgb(var(--color-stone-400))]');
        }
      });

      // Update panels
      container.querySelectorAll('.code-lang-panel').forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-lang-panel') === index);
      });
    }

    // ── Response Tabs ──────────────────────────────────────────────────

    document.addEventListener('click', function (e) {
      var tab = e.target.closest('.response-tab');
      if (!tab) return;

      var container = tab.closest('.response-tabs');
      var index = tab.getAttribute('data-response-index');
      var scrollY = window.scrollY;

      // Update tabs
      container.querySelectorAll('.response-tab').forEach(function (t) {
        var isActive = t.getAttribute('data-response-index') === index;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      // Update panels
      container.querySelectorAll('.response-panel').forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-response-panel') === index);
      });

      window.scrollTo(0, scrollY);
    });

    // ── Copy Button ────────────────────────────────────────────────────

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-btn');
      if (!btn) return;

      var container = btn.closest('.code-group') || btn.closest('.prose-code-block');
      if (!container) return;

      // Find the active panel's code, or the nearest code element
      var activePanel = container.querySelector('.code-lang-panel.active, .response-panel.active');
      var codeEl = activePanel
        ? activePanel.querySelector('code, .code-block, .font-mono')
        : container.querySelector('code, .code-block, .font-mono');

      if (!codeEl) return;

      var text = codeEl.textContent || '';
      navigator.clipboard.writeText(text).then(function () {
        btn.classList.add('copied');
        var tooltip = btn.nextElementSibling;
        if (tooltip && tooltip.classList.contains('copy-tooltip')) {
          tooltip.textContent = 'Copied!';
        }
        setTimeout(function () {
          btn.classList.remove('copied');
          if (tooltip && tooltip.classList.contains('copy-tooltip')) {
            tooltip.textContent = 'Copy';
          }
        }, 2000);
      });
    });

    // Close dropdowns on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.code-lang-menu').forEach(function (menu) {
          menu.classList.add('hidden');
          var btn = menu.parentElement.querySelector('.code-lang-trigger');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // ── Directive Tabs (:::tabs and :::code-group) ────────────────────

    document.addEventListener('click', function (e) {
      var tab = e.target.closest('.directive-tab');
      if (!tab) return;

      var group = tab.getAttribute('data-tab-group');
      var index = tab.getAttribute('data-tab-index');
      var scrollY = window.scrollY;

      // Update tab buttons
      document.querySelectorAll('.directive-tab[data-tab-group="' + group + '"]').forEach(function (t) {
        t.classList.toggle('active', t.getAttribute('data-tab-index') === index);
      });

      // Update panels
      document.querySelectorAll('.directive-tab-panel[data-tab-group="' + group + '"]').forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-tab-index') === index);
      });

      window.scrollTo(0, scrollY);
    });
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(init, { timeout: 250 });
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
