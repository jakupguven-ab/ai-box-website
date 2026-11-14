/* "Den gör jobbet": a short film of the AI working in the firm's own programs, and asking first.
   Plays once when it comes into view; the replay button runs it again. */
(function () {
  [].forEach.call(document.querySelectorAll('[data-work]'), function (el) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var typed = el.querySelector('[data-type]'), full = typed ? typed.getAttribute('data-type') : '';
    var timers = [];
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function stage(n) { el.setAttribute('data-step', n); }
    function type(ms) {
      var i = 0, n = full.length, dt = ms / n;
      (function tick() { typed.textContent = full.slice(0, i); if (i++ <= n) timers.push(setTimeout(tick, dt)); })();
    }
    function play() {
      timers.forEach(clearTimeout); timers = [];
      if (typed) typed.textContent = '';
      if (reduce) { stage(5); if (typed) typed.textContent = full; return; }
      stage(1); at(1500, function () { stage(2); type(2600); }); at(4700, function () { stage(3); });
      at(6600, function () { stage(4); }); at(8800, function () { stage(5); });
    }
    var done = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting && !done) { done = true; play(); } }, { threshold: .45 }).observe(el);
    else play();
    var r = el.querySelector('.replay'); if (r) r.addEventListener('click', play);
  });
  /* reveal-on-scroll for ordinary sections */
  var rv = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) { [].forEach.call(rv, function (e) { e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
  [].forEach.call(rv, function (e) { io.observe(e); });
  /* header: solid after the hero, mobile menu */
  var top = document.querySelector('.top');
  if (top) {
    var solid = function () { top.classList.toggle('solid', window.scrollY > 40 || !document.querySelector('.hero:not(.sub)')); };
    window.addEventListener('scroll', solid, { passive: true }); solid();
    var b = top.querySelector('.menu-b');
    if (b) b.addEventListener('click', function () { var o = top.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
  }
})();
