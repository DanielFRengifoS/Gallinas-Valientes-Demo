'use strict';
(function () {
  var scene = document.getElementById('puerta');
  if (!scene) return;

  var toggle = scene.querySelector('.puerta-toggle');
  var hint = toggle.querySelector('span');
  var controls = scene.querySelector('.puerta-controls');
  var buttons = controls.querySelectorAll('[data-door]');
  var pass = scene.querySelector('.puerta-pass');
  var state = 'closed';

  function setDoor(next) {
    if (next === state) return;
    state = next;
    var open = state === 'open';
    scene.dataset.doorState = state;
    toggle.setAttribute('aria-expanded', String(open));
    pass.setAttribute('aria-hidden', String(!open));
    hint.textContent = open ? 'Cerrar puerta ↙' : 'Abrir puerta ↗';
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.door === state));
    });
  }

  toggle.addEventListener('click', function () {
    setDoor(state === 'open' ? 'closed' : 'open');
  });
  buttons.forEach(function (button) {
    button.addEventListener('click', function () { setDoor(button.dataset.door); });
  });
  toggle.hidden = false;
  controls.hidden = false;
})();
