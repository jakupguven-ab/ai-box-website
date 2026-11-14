/* "Den gör jobbet": five cuts, one sentence. Scroll picks the cut; within each cut,
   the local progress t (0..1) acts out its line. The bubbles in cut 3 always move. */
(function () {
  var root = document.querySelector('[data-mont]');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cuts = [].slice.call(root.querySelectorAll('.cut'));
  var ticks = [].slice.call(root.querySelectorAll('.ticks i'));
  function q(c, s) { return [].slice.call(cuts[c].querySelectorAll(s)); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ramp(t, a, b) { return clamp((t - a) / (b - a)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function out(t) { return 1 - Math.pow(1 - t, 3); }
  function tf(el, s) { el.setAttribute('transform', s); }

  /* cut 1: the file flies in under the page, a reading light passes, three lines light up */
  var flies = q(0, '.fly'), beam = q(0, '.beam')[0], hlr = q(0, '.hlr'), cnt = q(0, '.cnt')[0], page = q(0, '.page')[0];
  function c1(t) {
    flies.forEach(function (f, k) {
      var s = .02 + k * .055, v = out(ramp(t, s, s + .2)), side = k % 2 ? 1 : -1;
      var x0 = 800 + side * (760 + k * 40), y0 = -160 + (k % 3) * 120, r0 = side * (24 + k * 5);
      var x = x0 + (800 - x0) * v, y = y0 + (262 - y0) * v - Math.sin(v * Math.PI) * 90, r = r0 * (1 - v);
      tf(f, 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + r.toFixed(2) + ') scale(' + (1 - .06 * v).toFixed(3) + ')');
      f.style.opacity = v >= 1 ? 0 : 1;
    });
    tf(page, 'translate(0 ' + (Math.sin(ramp(t, .4, .5) * Math.PI) * -6).toFixed(2) + ')');
    var b = ramp(t, .42, .86);
    tf(beam, 'translate(0 ' + (b * 270).toFixed(1) + ')');
    beam.style.opacity = Math.sin(b * Math.PI).toFixed(3);
    hlr.forEach(function (h) {
      var i = +h.getAttribute('data-i'), y = (i * 20) / 270;
      var v = ease(clamp((b - y) * 6));
      h.style.transform = 'scaleX(' + v.toFixed(3) + ')';
    });
    if (cnt) cnt.textContent = 's. ' + Math.max(1, Math.round(214 * ease(ramp(t, .02, .62)))) + ' av 214';
  }

  /* cut 2: the draft writes itself, a warm caret leads */
  var lt = q(1, '.lt'), caret = q(1, '.caret')[0], full = lt.map(function (l) { return l.getAttribute('data-full'); });
  var total = full.reduce(function (a, s) { return a + s.length; }, 0);
  function c2(t, now) {
    var n = Math.round(total * ramp(t, .08, .82)), cx = 580, cy = 134;
    for (var i = 0; i < lt.length; i++) {
      var k = Math.max(0, Math.min(full[i].length, n));
      if (lt[i].textContent.length !== k) lt[i].textContent = full[i].slice(0, k);
      n -= full[i].length;
      if (k > 0) { cx = 580 + (k ? lt[i].getComputedTextLength() : 0) + 4; cy = +lt[i].getAttribute('y') - 27; }
    }
    caret.setAttribute('x', cx.toFixed(1)); caret.setAttribute('y', cy);
    caret.style.opacity = (t > .86 ? (Math.sin(now / 260) > 0 ? 1 : 0) : 1);
  }

  /* cut 3: bubbles rise inside the light; one leaves it and becomes Tuesday 10.00 */
  var bubs = q(2, '.bub').map(function (g, i) {
    var r = [26, 14, 38, 18, 30, 12, 22, 10, 16, 20, 9, 11, 24, 15, 13, 28][i % 16];
    return { g: g, r: r, x: 420 + ((i * 97) % 760), ph: (i * .137) % 1, sp: .035 + (i % 5) * .01, w: 6 + (i % 4) * 4 };
  });
  bubs.forEach(function (b) { b.g.children[0].setAttribute('r', b.r); b.g.children[1].setAttribute('r', (b.r * .18).toFixed(2)); b.g.children[1].setAttribute('cx', -b.r * .35); b.g.children[1].setAttribute('cy', -b.r * .35); });
  var riser = q(2, '.riser')[0], slot = q(2, '.slot')[0];
  function c3(t, now) {
    var s = now / 1000;
    bubs.forEach(function (b, i) {
      var u = (b.ph + s * b.sp) % 1, y = 980 - u * 440, x = b.x + Math.sin(s * .9 + i) * b.w;
      tf(b.g, 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      b.g.style.opacity = (Math.min(1, u * 5) * Math.min(1, (1 - u) * 4)).toFixed(3);
    });
    var v = ease(ramp(t, .14, .56)), x0 = 800, y0 = 640, x1 = 668 + 5, y1 = 235;
    var x = x0 + (x1 - x0) * v + Math.sin(v * 9) * 10 * (1 - v), y = y0 + (y1 - y0) * v;
    var pop = ramp(t, .56, .66);
    tf(riser, 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (1 + v * .5 + pop * 1.4).toFixed(3) + ')');
    riser.style.opacity = (Math.min(1, ramp(t, .1, .16) * 1) * (1 - pop)).toFixed(3);
    slot.style.opacity = ease(ramp(t, .58, .72)).toFixed(3);
  }

  /* cut 4: it asks; you approve */
  var card = q(3, '.card')[0], ask = q(3, '.ask')[0], done = q(3, '.done')[0], ok = q(3, '.ok')[0], cur = q(3, '.cur')[0];
  function c4(t) {
    var r = out(ramp(t, .02, .22));
    tf(card, 'translate(0 ' + ((1 - r) * 160).toFixed(1) + ')'); card.style.opacity = r.toFixed(3);
    var m = ease(ramp(t, .26, .52)), cx = 1260 + (636 - 1260) * m, cy = 760 + (322 - 760) * m - Math.sin(m * Math.PI) * 60;
    var press = Math.sin(Math.PI * ramp(t, .54, .62));
    tf(cur, 'translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ') scale(' + (1 - press * .15).toFixed(3) + ')');
    cur.style.opacity = (ramp(t, .2, .28) * (1 - ramp(t, .7, .78))).toFixed(3);
    ok.style.transform = 'scale(' + (1 - press * .05).toFixed(3) + ')';
    ok.firstElementChild.setAttribute('fill', t > .58 ? '#B8661F' : '#1B1914');
    var d = ease(ramp(t, .66, .8));
    ask.style.opacity = (1 - d).toFixed(3); done.style.opacity = d.toFixed(3);
    tf(done, 'translate(0 ' + ((1 - d) * 14).toFixed(1) + ')');
  }

  /* cut 5: everything it did comes home, into one point of light */
  var homes = q(4, '.home'), halo = q(4, '.halo')[0];
  var start = [[540, 140, -12], [720, 90, 8], [890, 120, -6], [1060, 150, 10]];
  function c5(t) {
    var got = 0;
    homes.forEach(function (h, k) {
      var a = .06 + k * .12, v = ease(ramp(t, a, a + .32)), s = start[k];
      var x = s[0] + (800 - s[0]) * v, y = s[1] + (602 - s[1]) * v;
      tf(h, 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (s[2] * (1 - v)).toFixed(2) + ') scale(' + (1.25 - 1.2 * v).toFixed(3) + ')');
      h.style.opacity = (Math.min(1, ramp(t, a - .06, a)) * (1 - ramp(v, .88, 1))).toFixed(3);
      got += ramp(v, .9, 1);
    });
    halo.setAttribute('r', (24 + got * 14 + Math.sin(ramp(t, .5, 1) * Math.PI) * 10).toFixed(1));
    halo.style.opacity = (.3 + got * .1).toFixed(3);
  }
  var R = [c1, c2, c3, c4, c5];

  var cur_ = -1, raf = 0, last = { j: 0, t: 0 };
  function frame(now) {
    raf = 0;
    var r = root.getBoundingClientRect(), span = r.height - innerHeight;
    var p = clamp(-r.top / span), n = cuts.length;
    var j = Math.min(n - 1, Math.floor(p * n)), t = reduce ? 1 : clamp(p * n - j);
    if (j !== cur_) {
      cuts.forEach(function (c, i) { c.classList.toggle('on', i === j); });
      ticks.forEach(function (k, i) { k.classList.toggle('on', i <= j); });
      cur_ = j;
    }
    R[j](t, now || performance.now());
    if (j === 2 && !reduce && r.top < innerHeight && r.bottom > 0) raf = requestAnimationFrame(frame);
    if (j === 1 && t > .86 && !reduce && r.top < innerHeight && r.bottom > 0) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  /* paint every cut once at its start so a jump never shows an empty frame */
  R.forEach(function (f, i) { f(reduce ? 1 : 0, 0); });
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  kick();
  window.__mont = function (j, t) { cuts.forEach(function (c, i) { c.classList.toggle('on', i === j); }); cur_ = j; R[j](t, performance.now()); };
})();
