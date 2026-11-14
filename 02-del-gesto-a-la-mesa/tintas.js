'use strict';
(function () {
  var root = document.getElementById('tintas');
  if (!root) return;

  var controls = root.querySelector('.tintas-head');
  var buttons = Array.from(controls.querySelectorAll('[data-house]'));
  var views = Array.from(root.querySelectorAll('.tintas-view'));
  var current = 'room';
  var wanted = current;
  var revision = 0;
  var fading = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function update() {
    if (fading || wanted === current) return;
    var next = wanted;
    var ticket = revision;
    var view = views.find(function (item) { return item.dataset.view === next; });
    var outgoing = views.find(function (item) { return item.dataset.view === current; });
    if (!view || !outgoing) return;
    var photo = view.querySelector('img');

    function reveal() {
      if (ticket !== revision || fading || next === current || (photo.complete && !photo.naturalWidth)) return;
      var animated = !reduce.matches;
      var timer;
      function complete(event) {
        if (event && (event.target !== view || event.animationName !== 'tintas-photo-in')) return;
        clearTimeout(timer);
        view.removeEventListener('animationend', complete);
        outgoing.hidden = true;
        outgoing.classList.remove('is-outgoing', 'is-revealing');
        fading = false;
        update();
      }
      current = next;
      fading = animated;
      outgoing.setAttribute('aria-hidden', 'true');
      view.removeAttribute('aria-hidden');
      if (animated) {
        outgoing.classList.add('is-outgoing');
        view.classList.add('is-revealing');
        view.addEventListener('animationend', complete);
        timer = setTimeout(complete, 560);
      }
      view.hidden = false;
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.house === next));
      });
      if (!animated) complete();
    }

    if (photo.complete || !photo.decode) reveal();
    else photo.decode().then(reveal, reveal);
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      wanted = button.dataset.house;
      ++revision;
      update();
    });
  });
  controls.hidden = false;
})();
