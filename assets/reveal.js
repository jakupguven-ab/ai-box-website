/* The box reveal: the AI-Box rises over the horizon in warm light and turns as you scroll.
   Same horizon, paper and light as the story above it. three.js r128. */
(function () {
  var root = document.querySelector('[data-reveal]');
  if (!root || !window.THREE) return;
  var canvas = root.querySelector('canvas');
  var stage = root.querySelector('.reveal-stage');
  var caps = [].slice.call(root.querySelectorAll('.cap'));
  var cards = [].slice.call(root.querySelectorAll('.spec'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var T = THREE, renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { root.classList.add('no-gl'); return; }
  root.classList.add('gl-on');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(24, 1, 0.05, 60);

  /* warm paper studio for reflections: a bright sky, a warm horizon band, a darker floor */
  var env = new T.Scene();
  env.add(new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x2a251e, side: T.BackSide })));
  function softbox(w, h, x, y, z, col) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: col, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0.2, 0); env.add(m); }
  softbox(8, 2.2, -2.5, 4.6, 2, new T.Color(1.5, 1.45, 1.35));
  softbox(1.2, 6, 5, 1.5, 0.8, new T.Color(1.1, 1.0, .9));
  softbox(10, 0.9, 0, 0.6, -5, new T.Color(2.6, 1.7, .8));
  softbox(1.2, 6, -5, 1.5, -0.5, new T.Color(.9, .85, .8));
  var pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.04).texture;

  function tex(w, h, draw, srgb) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; }

  /* ---- the box ---- */
  var W = 0.18, H = 0.41, D = 0.47, FEET = 0.012;
  var box = new T.Group(); scene.add(box);
  var r = 0.01, sh = new T.Shape();
  sh.moveTo(-W / 2 + r, -H / 2); sh.lineTo(W / 2 - r, -H / 2); sh.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
  sh.lineTo(W / 2, H / 2 - r); sh.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2); sh.lineTo(-W / 2 + r, H / 2);
  sh.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - r); sh.lineTo(-W / 2, -H / 2 + r); sh.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
  var bev = 0.006;
  var bodyGeo = new T.ExtrudeGeometry(sh, { depth: D - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 5, curveSegments: 8 });
  bodyGeo.center();
  var body = new T.Mesh(bodyGeo, new T.MeshPhysicalMaterial({ color: 0x0b0b0d, metalness: 0.55, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.45, envMapIntensity: 1.1 }));
  body.castShadow = true; body.receiveShadow = true;
  body.position.y = H / 2 + FEET; box.add(body);
  var FZ = D / 2 + 0.0004, CY = H / 2 + FEET;

  /* front: diamond mesh grille */
  var gW = W * 0.54, gH = H * 0.88, gX = -W / 2 + 0.012 + gW / 2;
  var grilleMap = tex(256, 512, function (c, w, h) {
    c.fillStyle = '#2a2d31'; c.fillRect(0, 0, w, h);
    var s = 14; c.fillStyle = '#020203';
    for (var y = -s; y < h + s; y += s) for (var x = -s; x < w + s; x += s) {
      var ox = ((y / s) % 2) ? s / 2 : 0;
      c.beginPath(); c.moveTo(x + ox, y - s * 0.42); c.lineTo(x + ox + s * 0.38, y); c.lineTo(x + ox, y + s * 0.42); c.lineTo(x + ox - s * 0.38, y); c.closePath(); c.fill();
    }
  }, true);
  var grilleBump = grilleMap.clone(); grilleBump.encoding = T.LinearEncoding; grilleBump.needsUpdate = true;
  var grille = new T.Mesh(new T.PlaneGeometry(gW, gH), new T.MeshStandardMaterial({ map: grilleMap, bumpMap: grilleBump, bumpScale: 0.0025, metalness: 0.7, roughness: 0.45 }));
  grille.position.set(gX, CY + 0.004, FZ + 0.0006); box.add(grille);
  var frameMat = new T.MeshPhysicalMaterial({ color: 0x141518, metalness: 0.6, roughness: 0.3, clearcoat: 0.5 });
  [gH / 2 + 0.0015, -gH / 2 - 0.0015].forEach(function (dy) { var m = new T.Mesh(new T.BoxGeometry(gW + 0.006, 0.003, 0.003), frameMat); m.position.set(gX, CY + 0.004 + dy, FZ + 0.001); box.add(m); });

  /* front: control panel, power button, status light (warm, the site's accent) */
  var pW = W - gW - 0.03, pX = W / 2 - 0.009 - pW / 2;
  var panelMap = tex(128, 512, function (c, w, h) {
    var g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#101114'); g.addColorStop(1, '#17181b'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#26292e'; c.fillRect(14, 120, w - 28, 3);
    c.fillStyle = '#060607'; c.fillRect(54, 160, 20, 46);
    c.strokeStyle = '#34383e'; c.lineWidth = 2;
    [[30, 236], [72, 236], [30, 264], [72, 264]].forEach(function (p) { c.strokeRect(p[0], p[1], 26, 14); c.fillStyle = '#0a0a0b'; c.fillRect(p[0] + 4, p[1] + 4, 18, 6); });
    c.beginPath(); c.arc(64, 300, 8, 0, Math.PI * 2); c.stroke();
  }, true);
  var panel = new T.Mesh(new T.PlaneGeometry(pW, H * 0.88), new T.MeshPhysicalMaterial({ map: panelMap, metalness: 0.5, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
  panel.position.set(pX, CY + 0.004, FZ + 0.0006); box.add(panel);
  var pwr = new T.Mesh(new T.CylinderGeometry(0.0085, 0.0085, 0.004, 40), new T.MeshPhysicalMaterial({ color: 0x1a1b1e, metalness: 0.9, roughness: 0.25, clearcoat: 1 }));
  pwr.rotation.x = Math.PI / 2; pwr.position.set(pX, CY + H * 0.39, FZ + 0.002); box.add(pwr);
  var pring = new T.Mesh(new T.TorusGeometry(0.0088, 0.0007, 12, 48), new T.MeshStandardMaterial({ color: 0x8c9096, metalness: 1, roughness: 0.2 }));
  pring.position.set(pX, CY + H * 0.39, FZ + 0.004); box.add(pring);
  var ledMat = new T.MeshStandardMaterial({ color: 0x2a2010, emissive: new T.Color(0xE8C48A), emissiveIntensity: 0 });
  var led = new T.Mesh(new T.SphereGeometry(0.0022, 16, 12), ledMat); led.position.set(pX, CY + H * 0.345, FZ + 0.0015); box.add(led);
  var ledLight = new T.PointLight(0xE8C48A, 0, 0.35, 2); ledLight.position.set(pX, CY + H * 0.345, FZ + 0.03); box.add(ledLight);

  /* metal badge */
  var badgeMap = tex(512, 160, function (c, w, h) {
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d9dcdf'); g.addColorStop(0.5, '#9fa4aa'); g.addColorStop(1, '#c9ccd0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16181b'; c.font = '600 64px "Instrument Sans", Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AI-Box', w / 2, h / 2 + 2);
  }, true);
  var metal = function () { return new T.MeshStandardMaterial({ color: 0xaab0b6, metalness: 1, roughness: 0.3 }); };
  var badge = new T.Mesh(new T.BoxGeometry(W * 0.42, 0.024, 0.004), [metal(), metal(), metal(), metal(), new T.MeshStandardMaterial({ map: badgeMap, metalness: 0.85, roughness: 0.28 }), metal()]);
  badge.position.set(W / 2 - W * 0.21 - 0.004, CY - H * 0.08, FZ + 0.002); box.add(badge);

  /* back: vents and ports */
  var backMap = tex(256, 512, function (c, w, h) {
    c.fillStyle = '#0d0e10'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#030304'; for (var i = 0; i < 18; i++) c.fillRect(30 + i * 11, 40, 6, 120);
    c.strokeStyle = '#2b2e33'; c.lineWidth = 2; c.strokeRect(40, 200, 120, 150);
    c.fillStyle = '#050506'; for (var j = 0; j < 6; j++) c.fillRect(52, 214 + j * 22, 96, 12);
    c.strokeRect(40, 380, 176, 60); c.beginPath(); c.arc(190, 220, 18, 0, Math.PI * 2); c.stroke();
  }, true);
  var backBump = backMap.clone(); backBump.encoding = T.LinearEncoding; backBump.needsUpdate = true;
  var back = new T.Mesh(new T.PlaneGeometry(W * 0.9, H * 0.9), new T.MeshStandardMaterial({ map: backMap, bumpMap: backBump, bumpScale: 0.002, metalness: 0.6, roughness: 0.45 }));
  back.rotation.y = Math.PI; back.position.set(0, CY, -FZ - 0.0006); box.add(back);

  var footMat = new T.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) { var f = new T.Mesh(new T.BoxGeometry(0.022, FEET, 0.05), footMat); f.position.set(p[0] * (W / 2 - 0.016), FEET / 2, p[1] * (D / 2 - 0.04)); f.castShadow = true; box.add(f); });


  /* contact shadow on the horizon */
  var csMap = tex(256, 256, function (c, w, h) { var g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(40,28,12,.55)'); g.addColorStop(0.5, 'rgba(40,28,12,.22)'); g.addColorStop(1, 'rgba(40,28,12,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  var cs = new T.Mesh(new T.PlaneGeometry(W * 3.6, D * 2.0), new T.MeshBasicMaterial({ map: csMap, transparent: true, depthWrite: false }));
  cs.rotation.x = -Math.PI / 2; cs.position.y = 0.0015; box.add(cs);

  var key = new T.DirectionalLight(0xfff4e6, 1.1); key.position.set(-1.4, 2.6, 1.6); scene.add(key);
  var warm = new T.SpotLight(0xffb25e, 6, 6, 0.7, 0.9, 1.2); warm.position.set(0.4, 0.5, -2.2); warm.target.position.set(0, 0.2, 0); scene.add(warm); scene.add(warm.target);
  var warm2 = new T.SpotLight(0xffcf8a, 2.5, 6, 0.6, 0.9, 1.2); warm2.position.set(-1.8, 0.4, -1.0); warm2.target.position.set(0, 0.2, 0); scene.add(warm2); scene.add(warm2.target);
  var fill = new T.DirectionalLight(0xf2e8d8, 0.45); fill.position.set(1.6, 0.8, 2.5); scene.add(fill);
  scene.add(new T.HemisphereLight(0xf5ecdc, 0x6b5a44, 0.35));

  var hz = 0.74;
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    hz = parseFloat(getComputedStyle(stage).getPropertyValue('--hzf')) || 0.74;
    draw(lastP, true);
  }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  var lastP = -1, t0 = performance.now();
  var v = new T.Vector3();
  function draw(p, force) {
    if (!force && Math.abs(p - lastP) < 1e-4) return; lastP = p;
    var rise = smooth(0.0, 0.2, p);
    var turn = smooth(0.12, 0.95, p);
    ledMat.emissiveIntensity = 2.4 * smooth(0.12, 0.2, p); ledLight.intensity = 0.4 * smooth(0.12, 0.2, p);
    box.rotation.y = 0.42 - turn * 0.95;
    box.position.y = -(1 - rise) * (H + 0.05);
    /* camera framing: box height about 46% of the stage, feet on the horizon */
    var mobile = camera.aspect < 0.8;
    var dist = (mobile ? 4.4 : 2.7) + turn * 0.1;
    var ang = 0.06;
    camera.position.set(Math.sin(ang) * dist, 0.30, Math.cos(ang) * dist);
    camera.lookAt(0, 0.2, 0);
    camera.updateMatrixWorld();
    /* shift the view so that y=0 projects onto the CSS horizon line */
    camera.setViewOffset(1000, 1000, 0, 0, 1000, 1000);
    v.set(0, 0, 0).project(camera);
    var want = 1 - 2 * hz;  /* NDC y of the horizon */
    var dy = -(v.y - want) / 2 * 1000;
    camera.setViewOffset(1000, 1000, 0, dy, 1000, 1000);
    warm.intensity = 6 * smooth(0.05, 0.3, p);
    renderer.render(scene, camera);
  }

  function prog() {
    var r = root.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1);
  }
  function ui(p) {
    stage.style.setProperty('--glow', smooth(0.02, 0.3, p).toFixed(3));
    caps.forEach(function (c) { var f = +c.dataset.from, t = +c.dataset.to; c.classList.toggle('on', p >= f && (p < t || t === 1)); c.classList.toggle('past', p >= t && t !== 1); });
    var last = -1;
    cards.forEach(function (c, i) { var on = p >= +c.dataset.from; c.classList.toggle('on', on); if (on) last = i; });
    cards.forEach(function (c, i) { c.classList.toggle('cur', i === last); });
    var u = root.querySelector('.under'); if (u) u.classList.toggle('on', p >= +u.dataset.from);
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; var p = reduce ? 0.6 : prog(); ui(p); draw(p); });
  }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  resize(); onScroll();
})();
