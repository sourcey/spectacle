// Scroll tracker — IntersectionObserver-based active nav link highlighting
(function () {
  var navLinks = document.querySelectorAll('#nav a');
  var targets = document.querySelectorAll('[data-traverse-target]');
  if (!targets.length) return;

  var currentId = null;

  // Map of traverse-target id → nav link element
  var linkMap = {};
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href.charAt(0) === '#') linkMap[href.slice(1)] = link;
  });

  function activate(id) {
    if (id === currentId) return;
    currentId = id;
    navLinks.forEach(function (link) { link.classList.remove('active'); });
    var active = linkMap[id];
    if (active) {
      active.classList.add('active');
      active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }

  // Track which sections are visible; pick the topmost one
  var visibleSections = new Map();

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var id = entry.target.getAttribute('data-traverse-target');
      if (entry.isIntersecting) {
        visibleSections.set(id, entry.target);
      } else {
        visibleSections.delete(id);
      }
    });

    // Pick the topmost visible section (lowest boundingClientRect.top)
    var best = null;
    var bestTop = Infinity;
    visibleSections.forEach(function (el, id) {
      var top = el.getBoundingClientRect().top;
      if (top < bestTop) { bestTop = top; best = id; }
    });

    // Fallback: if nothing visible, find the last section above viewport
    if (!best) {
      for (var i = targets.length - 1; i >= 0; i--) {
        if (targets[i].getBoundingClientRect().top < 10) {
          best = targets[i].getAttribute('data-traverse-target');
          break;
        }
      }
    }

    if (best) activate(best);
  }, {
    // Trigger when section header enters top 20% of viewport
    rootMargin: '0px 0px -80% 0px',
    threshold: 0
  });

  targets.forEach(function (el) { observer.observe(el); });

  // Activate on initial load based on hash or first section
  var hash = window.location.hash.slice(1);
  if (hash && linkMap[hash]) {
    activate(hash);
  } else if (targets.length) {
    activate(targets[0].getAttribute('data-traverse-target'));
  }
})();
