// Birth-date boxes open their calendar at 14 years ago (TeenWork's starting age), not today.
// A browser opens an empty date box at its max when today is past it, so while the box is empty
// and being used we set max to 14 years ago, then take it off again so any age can still be typed or picked.
(function () {
  var IDS = { 'su-age': 1, 'su-dob': 1, 'adm39-new-dob': 1 };
  function startDate() {
    var d = new Date(); d.setFullYear(d.getFullYear() - 14);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function release(el) { if (el.getAttribute('data-tw-dob-max')) { el.removeAttribute('max'); el.removeAttribute('data-tw-dob-max'); } }
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || el.type !== 'date' || !IDS[el.id] || el.value || el.hasAttribute('max')) return;
    el.setAttribute('max', startDate()); el.setAttribute('data-tw-dob-max', '1');
  });
  document.addEventListener('input', function (e) { if (e.target && e.target.value) release(e.target); }, true);
  document.addEventListener('change', function (e) { if (e.target && e.target.type === 'date') release(e.target); }, true);
  document.addEventListener('focusout', function (e) { if (e.target && e.target.type === 'date') release(e.target); });
})();
