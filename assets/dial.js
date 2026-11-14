/* "Priset står still": the needle swings with use, people and questions count up, the price stays at 0 kr. */
(function () {
  var dial = document.querySelector('.dial'); if (!dial) return;
  var needle = document.getElementById('needle'), q = document.getElementById('qcount'), pc = document.getElementById('pcount');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, raf = 0, sU = 0;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function frame(now) {
    raf = 0;
    var r = dial.getBoundingClientRect(), d = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
    var u = reduce ? .75 : clamp((d - .2) / .5, 0, 1);
    sU += (u - sU) * (reduce ? 1 : .12);
    var jit = reduce ? 0 : Math.sin(now / 90) * 1.1 * sU + Math.sin(now / 37) * .5 * sU;
    needle.style.transform = 'rotate(' + (-50 + 100 * sU + jit).toFixed(2) + 'deg)';
    q.textContent = Math.round(10 * Math.pow(1000, sU)).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'sv-SE');
    pc.textContent = String(1 + Math.round(7 * clamp(sU * 1.25, 0, 1)));
    if (!reduce && d > 0 && d < 1) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick); kick();
})();
