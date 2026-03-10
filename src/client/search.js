// Search — client-side search dialog with keyboard navigation
(function () {
  var dialog = document.getElementById('search-dialog');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var openBtn = document.getElementById('search-open');
  if (!dialog || !input || !results) return;

  // Build search index from nav links + operations
  var entries = [];
  document.querySelectorAll('[data-traverse-target]').forEach(function (el) {
    var id = el.getAttribute('data-traverse-target');
    var method = '', path = '', summary = '', tag = '';

    var methodEl = el.querySelector('.operation-method');
    var pathEl = el.querySelector('.operation-path');
    var summaryEl = el.querySelector('.operation-summary');

    if (methodEl) method = methodEl.textContent.trim();
    if (pathEl) path = pathEl.textContent.trim();
    if (summaryEl) summary = summaryEl.textContent.trim();

    // For non-operations, use the heading text
    if (!method && !path) {
      var heading = el.querySelector('h1, h2');
      if (heading) summary = heading.textContent.trim();
    }

    // Find parent tag
    var tagGroup = el.closest('.tag-group');
    if (tagGroup) {
      var tagLabel = tagGroup.querySelector('.tag-header h1');
      if (tagLabel) tag = tagLabel.textContent.trim();
    }

    entries.push({
      id: id,
      method: method,
      path: path,
      summary: summary,
      tag: tag,
      searchText: [method, path, summary, tag].join(' ').toLowerCase()
    });
  });

  var activeIndex = -1;
  var filtered = [];

  function open() {
    dialog.classList.add('open');
    input.value = '';
    input.focus();
    showResults('');
    document.addEventListener('keydown', onDialogKey);
  }

  function close() {
    dialog.classList.remove('open');
    document.removeEventListener('keydown', onDialogKey);
  }

  function showResults(query) {
    var q = query.toLowerCase().trim();
    if (!q) {
      filtered = entries.slice(0, 20);
    } else {
      var terms = q.split(/\s+/);
      filtered = entries.filter(function (e) {
        return terms.every(function (t) { return e.searchText.indexOf(t) !== -1; });
      });
    }

    activeIndex = filtered.length ? 0 : -1;
    render();
  }

  function render() {
    results.innerHTML = filtered.map(function (e, i) {
      var cls = 'search-result' + (i === activeIndex ? ' active' : '');
      var label = e.method
        ? '<span class="search-result-method method-' + e.method.toLowerCase() + '">' + e.method + '</span> ' +
          '<span class="search-result-path">' + escapeHtml(e.path) + '</span>'
        : '<span class="search-result-path">' + escapeHtml(e.summary) + '</span>';
      var tagLine = e.tag ? '<span class="search-result-tag">' + escapeHtml(e.tag) + '</span>' : '';
      var summaryLine = e.method && e.summary ? '<span class="search-result-summary">' + escapeHtml(e.summary) + '</span>' : '';
      return '<a href="#' + e.id + '" class="' + cls + '" data-index="' + i + '">' +
        '<div class="search-result-main">' + label + summaryLine + '</div>' +
        tagLine + '</a>';
    }).join('');
  }

  function escapeHtml(s) {
    var el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  function navigate(index) {
    if (index < 0 || index >= filtered.length) return;
    var entry = filtered[index];
    close();
    var target = document.getElementById(entry.id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.location.hash = '#' + entry.id;
    }
  }

  function onDialogKey(e) {
    if (e.key === 'Escape') { close(); e.preventDefault(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      render();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) navigate(activeIndex);
      return;
    }
  }

  input.addEventListener('input', function () {
    showResults(input.value);
  });

  results.addEventListener('click', function (e) {
    var result = e.target.closest('.search-result');
    if (result) {
      e.preventDefault();
      navigate(parseInt(result.getAttribute('data-index'), 10));
    }
  });

  // Open search
  if (openBtn) openBtn.addEventListener('click', open);

  // Keyboard shortcut: Ctrl+K or /
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      open();
    }
    if (e.key === '/' && !isEditable(e.target)) {
      e.preventDefault();
      open();
    }
  });

  // Close on backdrop click
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) close();
  });

  function isEditable(el) {
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }
})();
