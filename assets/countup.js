/* Counts the speed figures up from zero over one second, once they have scrolled up past the lower third of the screen
   (not the moment they peek in at the bottom, or they are done before anyone looks at them). */
(function () {
  var els = [].slice.call(document.querySelectorAll("[data-count]"));
  if (!els.length || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function fmt(v, dec) { return v.toLocaleString("sv-SE", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  els.forEach(function (el) {
    var to = parseFloat(el.getAttribute("data-count")), dec = +(el.getAttribute("data-dec") || 0), done = false;
    el.textContent = fmt(0, dec);
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || done) return;
      done = true; io.disconnect();
      var t0 = performance.now();
      (function step(now) {
        var k = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(to * e, dec);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }, { rootMargin: "0px 0px -35% 0px", threshold: 1 });
    io.observe(el);
  });
})();
