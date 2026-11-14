/* Homepage scroll scenes: story lines, montage cuts, the usage dial. */
(function () {
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function prog(el) { var r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); }

  var story = document.getElementById('story');
  var lines = story ? story.querySelectorAll('.line') : [];
  var mont = document.querySelector('.hz-mont');
  var cuts = mont ? mont.querySelectorAll('.cut') : [];
  var ticks = mont ? mont.querySelectorAll('.ticks i') : [];
  var dial = document.querySelector('.hz-dial');
  var needle = document.getElementById('needle');
  var count = document.getElementById('qcount');
  var loc = (document.querySelector('.readout') || {}).dataset ? document.querySelector('.readout').dataset.locale : 'sv-SE';
  var lastS = -1, lastC = -1, raf = 0;

  function set(list, i) { for (var k = 0; k < list.length; k++) list[k].classList.toggle('on', k === i); }

  function frame() {
    raf = 0;
    if (story && lines.length) {
      var p = prog(story);
      var i = clamp(Math.floor(p * (lines.length + .3)), 0, lines.length - 1);
      if (i !== lastS) { set(lines, i); lastS = i; }
    }
    if (mont && cuts.length) {
      var q = prog(mont);
      var j = clamp(Math.floor(q * cuts.length), 0, cuts.length - 1);
      if (j !== lastC) { set(cuts, j); for (var t = 0; t < ticks.length; t++) ticks[t].classList.toggle('on', t <= j); lastC = j; }
    }
    if (dial && needle) {
      var r = dial.getBoundingClientRect();
      var d = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
      var u = clamp((d - .15) / .6, 0, 1);
      var jitter = Math.sin(performance.now() / 90) * 1.2 * u;
      needle.style.transform = 'rotate(' + (-50 + 100 * u + jitter).toFixed(2) + 'deg)';
      if (count) count.textContent = Math.round(10 * Math.pow(1000, u)).toLocaleString(loc);
      if (d > 0 && d < 1) raf = requestAnimationFrame(frame);
    }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  kick();
})();
