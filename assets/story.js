/* The story: one document on the horizon, told in three acts as you scroll.
   Act 1, power: AI reads the whole file, flags what deviates, drafts the reply.
   Act 2, the problem: names struck out, half the file held back, then nothing at all.
   Act 3, AI-Box: the file comes back whole, the black bars turn into the AI's highlights.
   Everything is driven by one number, p (0..1), from the section's scroll position. */
(function () {
  var root = document.querySelector('[data-story]');
  if (!root) return;
  var stage = root.querySelector('.story-stage');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var caps = [].slice.call(root.querySelectorAll('.cap'));
  var acts = [].slice.call(root.querySelectorAll('.story-act span'));
  var reds = [].slice.call(root.querySelectorAll('.rd'));
  var hls = [].slice.call(root.querySelectorAll('.hl'));
  var notes = [].slice.call(root.querySelectorAll('.note'));
  var draft = root.querySelector('.draft');
  var draftText = draft ? draft.querySelector('.draft-t') : null;
  var full = draftText ? draftText.getAttribute('data-full') : '';
  var meterN = root.querySelector('.meter b');
  var meterL = root.querySelector('.meter em');
  var meterBar = root.querySelector('.meter i');
  var total = +root.getAttribute('data-pages') || 214;
  var half = Math.round(total * 0.45);
  var M = JSON.parse(root.getAttribute('data-meter') || '{}');
  var flips = [].slice.call(root.querySelectorAll('.flip'));
  var scat = [].slice.call(root.querySelectorAll('.sheet.back'));
  var scan = root.querySelector('.scan');
  function backOut(t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ramp(p, a, b) { return clamp((p - a) / (b - a)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function set(el, k, v) { el.style.setProperty(k, v); }

  var T = {
    hl: [0.05, 0.15], notes: [0.11, 0.22], draft: [0.22, 0.31],
    notesOut: [0.35, 0.39], red: [0.42, 0.5], pagesOut: [0.52, 0.58], sink: [0.6, 0.67],
    rise: [0.7, 0.76], morph: [0.75, 0.82], pagesIn: [0.75, 0.81], notesIn: [0.82, 0.9], glow: [0.68, 0.96]
  };

  function frame(p) {
    var a = p < 0.345 ? 0 : p < 0.695 ? 1 : 2;
    acts.forEach(function (s, i) { s.classList.toggle('on', i === a); });
    caps.forEach(function (c) {
      var f = +c.getAttribute('data-from'), t = +c.getAttribute('data-to');
      var on = p >= f && p < t || (t === 1 && p >= 1);
      c.classList.toggle('on', on);
      c.classList.toggle('past', p >= t && !(t === 1));
    });

    var hl = ease(ramp(p, T.hl[0], T.hl[1]));
    var notesIn = ease(ramp(p, T.notes[0], T.notes[1])) * (1 - ramp(p, T.notesOut[0], T.notesOut[1])) + ease(ramp(p, T.notesIn[0], T.notesIn[1]));
    var red = ease(ramp(p, T.red[0], T.red[1]));
    var morph = ease(ramp(p, T.morph[0], T.morph[1]));
    var pages = ease(ramp(p, T.pagesOut[0], T.pagesOut[1])) * (1 - ease(ramp(p, T.pagesIn[0], T.pagesIn[1])));
    var sink = ease(ramp(p, T.sink[0], T.sink[1])) * (1 - ease(ramp(p, T.rise[0], T.rise[1])));
    var glow = ease(ramp(p, T.glow[0], T.glow[1]));

    set(stage, '--hl', (hl * (1 - ramp(p, T.notesOut[0], T.notesOut[1]))).toFixed(3));
    set(stage, '--red', (red * (1 - morph)).toFixed(3));
    set(stage, '--morph', morph.toFixed(3));
    set(stage, '--pages', pages.toFixed(3));
    set(stage, '--sink', sink.toFixed(3));
    set(stage, '--glow', glow.toFixed(3));
    set(stage, '--dim', (red * 0.5 + pages * 0.5) * (1 - morph));
    var night = ease(ramp(p, 0.355, 0.47)) * (1 - ease(ramp(p, 0.69, 0.79)));
    var dawn = ease(ramp(p, 0.69, 0.93));
    set(stage, '--night', night.toFixed(3));
    root.classList.toggle('act2', p >= 0.4 && p < 0.69);
    set(stage, '--dawn', dawn.toFixed(3));
    /* act 1: the whole file riffles past under a reading light */
    var rf = ramp(p, 0.0, 0.095);
    flips.forEach(function (f, i) {
      var k = flips.length - 1 - i;
      var v = ease(clamp(rf * (flips.length + 2) - k));
      f.style.transform = 'rotateX(' + (v * 118).toFixed(2) + 'deg)';
      f.style.opacity = v > 0.98 ? 0 : 1;
      f.style.setProperty('--shade', Math.sin(v * Math.PI).toFixed(3));
    });
    var sc = ramp(p, 0.075, 0.15);
    set(stage, '--beam', (Math.sin(Math.PI * clamp(rf * 1.2)) * 0.8 + Math.sin(Math.PI * sc) * 0.6).toFixed(3));
    if (scan) { scan.style.opacity = (Math.sin(Math.PI * sc)).toFixed(3); scan.style.top = (sc * 100).toFixed(2) + '%'; }
    /* act 2: the held-back pages scatter toward the camera and out of focus */
    scat.forEach(function (sh, i) {
      var d = clamp(pages * 1.25 - i * 0.06);
      var dir = (i % 2 ? 1 : -1), e = ease(d);
      var bx = dir * (6 + i * 5), by = -(5 + i * 3), br = dir * (0.8 + i * 0.7);
      sh.style.transform = 'translate(calc(' + bx + 'px + ' + (dir * e * (30 + i * 9)).toFixed(2) + 'vw),calc(' + by + 'px + ' + (e * (6 - i * 4)).toFixed(2) + 'vh)) scale(' + (1 + e * (0.5 + i * 0.18)).toFixed(3) + ') rotate(' + (br + dir * e * (14 + i * 7)).toFixed(2) + 'deg)';
      sh.style.filter = 'blur(' + (e * (3 + i * 1.5)).toFixed(2) + 'px)';
      sh.style.opacity = (1 - Math.pow(e, 0.7)).toFixed(3);
    });

    reds.forEach(function (r, i) {
      var st = i / Math.max(1, reds.length) * 0.5;
      var v = clamp((red - st) / 0.5);
      set(r, '--w', (Math.max(v > 0 ? Math.min(1.04, backOut(v)) : 0, morph > 0 ? 1 : 0)).toFixed(3));
    });
    hls.forEach(function (h, i) {
      var st = i * 0.2;
      var hv = hl * (1 - ramp(p, T.notesOut[0], T.notesOut[1])) + ramp(p, T.morph[0], T.morph[1]);
      set(h, '--w', ease(clamp((hv * 1.4 - st))).toFixed(3));
    });
    notes.forEach(function (n, i) {
      var v = clamp(notesIn * 1.6 - i * 0.3);
      set(n, '--in', ease(v).toFixed(3));
    });
    if (draft) {
      var d = ramp(p, T.draft[0], T.draft[1]);
      var dOut = ramp(p, T.notesOut[0], T.notesOut[1]);
      var d3 = ramp(p, T.notesIn[0] + 0.03, 0.97);
      var shown = p < 0.5 ? d : d3;
      set(draft, '--in', ease(clamp(shown * 3) * (p < 0.5 ? 1 - dOut : 1)).toFixed(3));
      var n = Math.round(full.length * clamp(shown * 1.15));
      draftText.textContent = full.slice(0, n);
      draft.classList.toggle('typing', shown > 0 && shown < 0.87);
    }
    if (meterN) {
      var seen, label, frac;
      if (p < 0.095) { seen = Math.max(1, Math.round(total * ease(rf))); label = M.reading; frac = ease(rf); }
      else if (p < 0.42) { seen = total; label = M.full; frac = 1; }
      else if (p < 0.52) { seen = total; label = M.struck; frac = 1 - 0.38 * red; }
      else if (p < 0.6) { seen = Math.round(total - (total - half) * pages); label = M.half; frac = 0.62 - 0.17 * pages; }
      else if (p < 0.7) { seen = Math.round(half * (1 - ease(ramp(p, T.sink[0], T.sink[1])))); label = M.none; frac = 0.45 * (1 - sink); }
      else { seen = total; label = M.box; frac = 1; }
      meterN.textContent = seen;
      if (meterL.textContent !== label) meterL.textContent = label;
      set(meterBar, '--f', frac.toFixed(3));
      root.querySelector('.meter').classList.toggle('low', p >= 0.42 && p < 0.7);
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var r = root.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      frame(clamp(-r.top / span));
    });
  }
  if (reduce) { root.classList.add('still'); frame(1); return; }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  window.__story = frame;
})();
