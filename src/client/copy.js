// Copy button — clipboard copy with "Copied!" feedback
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy-btn');
    if (!btn) return;
    var wrapper = btn.closest('.code-block-wrapper');
    if (!wrapper) return;
    var code = wrapper.querySelector('code');
    if (!code) return;

    navigator.clipboard.writeText(code.textContent || '').then(function () {
      var span = btn.querySelector('span');
      if (span) span.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function () {
        if (span) span.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  });
})();
