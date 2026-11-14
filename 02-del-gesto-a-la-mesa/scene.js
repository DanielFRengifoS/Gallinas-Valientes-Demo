'use strict';
(function () {
  var menu = document.getElementById('carta');
  if (!menu) return;
  var index = [].slice.call(menu.querySelectorAll('.menu-index a'));

  function markFamily(hash) {
    index.forEach(function (link) {
      var active = link.hash === hash;
      var heading = document.getElementById(link.hash.slice(1));
      var section = heading && heading.closest('section');
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      if (section) section.toggleAttribute('data-family-active', active);
    });
  }

  index.forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      markFamily(link.hash);
    });
  });
  window.addEventListener('hashchange', function () { markFamily(location.hash); });
  menu.setAttribute('data-family-in-place', '');
  markFamily(location.hash);
})();
