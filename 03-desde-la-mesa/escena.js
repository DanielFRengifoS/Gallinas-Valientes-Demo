'use strict';
(function () {
  // House controls preserved
  var house = document.querySelector('.house-controls');
  if (house) {
    house.hidden = false;
    var hbtns = [].slice.call(house.querySelectorAll('button'));
    hbtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        hbtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        document.querySelector('.house-grid').dataset.focus = btn.dataset.key;
      });
    });
  }
})();
