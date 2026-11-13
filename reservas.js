/* Configuración compartida por las tres demos.
   Pega solo el enlace HTTPS oficial y confirmado por el restaurante.
   Si se deja vacío, «Reservar» lleva al aviso de la demo. */
(function () {
  'use strict';
  var RESERVATION_URL = '';

  if (!RESERVATION_URL.trim()) return;
  var booking;
  try {
    booking = new URL(RESERVATION_URL.trim());
  } catch (_) {
    return;
  }
  if (booking.protocol !== 'https:' || booking.username || booking.password) return;

  function pointToBooking(link) {
    link.href = booking.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Reservar en el canal oficial (abre en otra pestaña)');
  }

  document.querySelectorAll('[data-booking-link]').forEach(pointToBooking);
  var status = document.querySelector('[data-booking-status]');
  if (status) {
    var link = document.createElement('a');
    link.textContent = 'Abrir el canal oficial de reservas';
    pointToBooking(link);
    status.replaceChildren(link);
  }
})();
