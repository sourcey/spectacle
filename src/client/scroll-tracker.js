// Scroll tracker — highlights the active sidebar nav link as user scrolls.
//
// Observes [data-traverse-target] section anchors and toggles .active
// on the matching #nav .nav-link. All visual styling is in sourcey.css;
// this file only manages the class.
(function () {
  var navLinks = document.querySelectorAll('#nav .nav-link');
  var targets = document.querySelectorAll('[data-traverse-target]');

  // For prose pages, also track heading elements that TOC links point to
  var tocHeadingEls = [];
  document.querySelectorAll('#toc .toc-item').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href.indexOf('#') !== -1) {
      var el = document.getElementById(href.split('#')[1]);
      if (el) tocHeadingEls.push(el);
    }
  });

  if (!targets.length && !tocHeadingEls.length) return;
  if (!navLinks.length && !tocHeadingEls.length) return;

  var currentId = null;
  var clickedId = null; // When set, overrides scroll-based activation
  var clickTimer = null;

  // Map traverse-target id → nav link element (by matching href fragment)
  var linkMap = {};
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href.indexOf('#') !== -1) {
      linkMap[href.split('#')[1]] = link;
    }
  });

  // If no fragment-based links found, bail (e.g. markdown pages)
  if (!Object.keys(linkMap).length) return;

  // TOC links (right sidebar) — share the same scroll tracking
  var tocLinks = document.querySelectorAll('#toc .toc-item');
  var tocMap = {};
  tocLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href.indexOf('#') !== -1) {
      tocMap[href.split('#')[1]] = link;
    }
  });

  function activate(id, force) {
    if (id === currentId && !force) return;
    currentId = id;

    navLinks.forEach(function (link) {
      link.classList.remove('active');
    });
    tocLinks.forEach(function (link) {
      link.classList.remove('active');
    });

    var active = linkMap[id];
    if (active) {
      active.classList.add('active');
      active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }

    var tocActive = tocMap[id];
    if (tocActive) {
      tocActive.classList.add('active');
    }
  }

  // When a nav link is clicked, force-activate it immediately.
  // This handles the case where the target is near the bottom of the page
  // and the browser can't scroll far enough for the scroll tracker to pick it up.
  var tocEl = document.getElementById('toc');
  if (tocEl) {
    tocEl.addEventListener('click', function (e) {
      var link = e.target.closest('.toc-item');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.indexOf('#') === -1) return;
      var id = href.split('#')[1];
      if (!id) return;
      clickedId = id;
      activate(id, true);
      clearTimeout(clickTimer);
      clickTimer = setTimeout(function () { clickedId = null; }, 800);
    });
  }

  document.getElementById('nav').addEventListener('click', function (e) {
    var link = e.target.closest('.nav-link');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.indexOf('#') === -1) return;

    var id = href.split('#')[1];
    if (!id) return;

    clickedId = id;
    activate(id, true);

    // Clear the override after scroll settles so scroll-based tracking resumes
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function () {
      clickedId = null;
    }, 800);
  });

  // Use scroll event for reliable activation at all positions.
  function onScroll() {
    // If a nav link was just clicked, don't override it until scroll settles
    if (clickedId) return;

    // Measure the actual header element to handle any template/theme height
    var header = document.getElementById('header');
    var threshold = (header ? header.offsetHeight : 112) + 20;
    var best = null;

    // Check API traverse targets
    for (var i = 0; i < targets.length; i++) {
      var top = targets[i].getBoundingClientRect().top;
      if (top <= threshold) {
        best = targets[i].getAttribute('data-traverse-target');
      } else {
        break;
      }
    }

    // Check TOC heading elements (prose pages)
    for (var j = 0; j < tocHeadingEls.length; j++) {
      var hTop = tocHeadingEls[j].getBoundingClientRect().top;
      if (hTop <= threshold) {
        best = tocHeadingEls[j].id;
      } else {
        break;
      }
    }

    // At top of page, default to first section
    var allTargets = targets.length ? targets : tocHeadingEls;
    if (!best && allTargets.length) {
      best = targets.length
        ? allTargets[0].getAttribute('data-traverse-target')
        : allTargets[0].id;
    }

    // At bottom of page, force last section active
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 10) {
      var last = allTargets[allTargets.length - 1];
      best = targets.length ? last.getAttribute('data-traverse-target') : last.id;
    }

    if (best) activate(best);
  }

  // Throttle scroll handler
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    }
  }, { passive: true });

  // Activate on initial load based on URL hash or scroll position
  var hash = window.location.hash.slice(1);
  if (hash && linkMap[hash]) {
    activate(hash);
  } else {
    onScroll();
  }
})();
