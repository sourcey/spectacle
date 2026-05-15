// Search — client-side search dialog with keyboard navigation
(function () {
  function init() {
    var dialog = document.getElementById('search-dialog');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var openBtn = document.getElementById('search-open');
    if (!dialog || !input || !results) return;

    var entries = [];
    var activeIndex = -1;
    var filtered = [];
    var indexLoaded = false;

    // Always load from JSON search index
    var searchMeta = document.querySelector('meta[name="sourcey-search"]');

    function loadJsonIndex(callback) {
      if (indexLoaded) { callback(); return; }
      if (!searchMeta) { indexLoaded = true; callback(); return; }
      var url = searchMeta.getAttribute('content');
      fetch(url).then(function (r) { return r.json(); }).then(function (data) {
        entries = data.map(function (e) {
          var title = e.title || '';
          var qualifiedName = e.qualifiedName || '';
          var owner = e.owner || '';
          var tab = e.tab || '';
          return {
            url: e.url,
            method: e.method || '',
            path: e.path || '',
            title: title,
            summary: qualifiedName || title,
            tag: owner ? owner : tab,
            content: e.content || '',
            category: e.category || '',
            featured: !!e.featured,
            symbolKind: e.symbolKind || '',
            owner: owner,
            ownerKind: e.ownerKind || '',
            namespace: e.namespace || '',
            qualifiedName: qualifiedName,
            titleLower: title.toLowerCase(),
            pathLower: (e.path || '').toLowerCase(),
            qualifiedLower: qualifiedName.toLowerCase(),
            ownerLower: owner.toLowerCase(),
            searchText: [
              e.method || '',
              e.path || '',
              title,
              qualifiedName,
              owner,
              e.ownerKind || '',
              e.namespace || '',
              e.symbolKind || '',
              e.content || '',
              tab
            ].join(' ').toLowerCase()
          };
        });
        indexLoaded = true;
        callback();
      }).catch(function () {
        indexLoaded = true;
        callback();
      });
    }

    var dialogInner = dialog.querySelector('.search-dialog-inner');

    function positionDialog() {
      if (!openBtn || !dialogInner) return;
      var rect = openBtn.getBoundingClientRect();
      dialogInner.style.position = 'absolute';
      dialogInner.style.top = (rect.top - 4) + 'px';
      var extraWidth = Math.min(rect.width * 0.5, 200);
      dialogInner.style.left = (rect.left - extraWidth / 2) + 'px';
      dialogInner.style.width = (rect.width + extraWidth) + 'px';
      dialogInner.style.maxWidth = 'none';
      dialogInner.style.transform = 'none';
      dialogInner.style.margin = '0';
    }

    function open() {
      positionDialog();
      dialog.classList.add('open');
      input.value = '';
      input.focus();
      if (!indexLoaded) {
        results.innerHTML = '<div class="search-loading">Loading…</div>';
        loadJsonIndex(function () { showResults(''); });
      } else {
        showResults('');
      }
      document.addEventListener('keydown', onDialogKey);
    }

    function close() {
      dialog.classList.remove('open');
      document.removeEventListener('keydown', onDialogKey);
    }

    function showResults(query) {
      var q = query.toLowerCase().trim();
      if (!q) {
        // Show featured pages first, then endpoints
        var featured = entries.filter(function (e) { return e.featured; });
        var rest = entries.filter(function (e) { return !e.featured && e.category !== 'Sections'; });
        filtered = featured.concat(rest).slice(0, 30);
      } else {
        var terms = q.split(/\s+/);
        filtered = entries.map(function (e) {
          return { entry: e, score: scoreEntry(e, q, terms) };
        }).filter(function (result) {
          return result.score > 0;
        });
        var categoryOrder = {
          Pages: 0,
          Endpoints: 1,
          Models: 2,
          Functions: 3,
          Types: 4,
          Enums: 5,
          'Enum Values': 6,
          Variables: 7,
          Friends: 8,
          Properties: 9,
          Members: 10,
          Sections: 20
        };
        filtered.sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return (categoryOrder[a.entry.category] || 19) - (categoryOrder[b.entry.category] || 19);
        });
        filtered = filtered.map(function (result) { return result.entry; }).slice(0, 50);
      }

      activeIndex = filtered.length ? 0 : -1;
      render();
    }

    function scoreEntry(e, q, terms) {
      if (!terms.every(function (t) { return e.searchText.indexOf(t) !== -1; })) return 0;

      var compactQuery = q.replace(/\s+/g, '');
      var qualified = e.qualifiedLower || '';
      var title = e.titleLower || '';
      var path = e.pathLower || '';
      var owner = e.ownerLower || '';
      var score = 1;

      if (qualified && qualified === compactQuery) score += 1200;
      if (title && title === q) score += 900;
      if (path && path === q) score += 850;
      if (qualified && qualified.endsWith('::' + compactQuery)) score += 780;
      if (owner && compactQuery === owner + '::' + title) score += 760;
      if (qualified && compactQuery.indexOf('::') !== -1 && qualified.indexOf(compactQuery) !== -1) score += 700;
      if (title && title.indexOf(q) === 0) score += 500;
      if (qualified && qualified.indexOf(compactQuery) !== -1) score += 420;
      if (owner && owner.indexOf(compactQuery) !== -1) score += 240;
      if (path && path.indexOf(q) !== -1) score += 180;
      if (e.content.toLowerCase().indexOf(q) !== -1) score += 80;

      if (e.category === 'Sections') score -= 70;
      if (e.symbolKind) score += 35;
      if (e.featured) score += 20;
      return score;
    }

    function render() {
      var html = '';
      var lastCategory = '';

      for (var i = 0; i < filtered.length; i++) {
        var e = filtered[i];
        var cat = e.category || 'Results';

        if (cat !== lastCategory) {
          html += '<div class="search-category">' + escapeHtml(cat) + '</div>';
          lastCategory = cat;
        }

        var cls = 'search-result' + (i === activeIndex ? ' active' : '');
        var label = e.method
          ? '<span class="search-result-method method-' + e.method.toLowerCase() + '">' + e.method + '</span> ' +
            '<span class="search-result-path">' + escapeHtml(e.path) + '</span>'
          : '<span class="search-result-path">' + escapeHtml(e.summary) + '</span>';
        var tagLine = e.tag ? '<span class="search-result-tag">' + escapeHtml(e.tag) + '</span>' : '';
        var summaryLine = e.method && e.summary ? '<span class="search-result-summary">' + escapeHtml(e.summary) + '</span>' : '';

        html += '<a href="' + e.url + '" class="' + cls + '" data-index="' + i + '">' +
          '<div class="search-result-main">' + label + summaryLine + '</div>' +
          tagLine + '</a>';
      }

      results.innerHTML = html;

      // Scroll active result into view
      var activeEl = results.querySelector('.search-result.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
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
      window.location.href = entry.url;
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

    // Also bind mobile search button
    var mobileBtn = document.getElementById('search-open-mobile');
    if (mobileBtn) mobileBtn.addEventListener('click', open);

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
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(init, { timeout: 250 });
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
