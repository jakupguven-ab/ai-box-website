/* The box reveal. A workstation tower (the proportions of a Precision 5820: integrated carry
   handles front and back, a full-height perforated front, a control strip on top) made in
   AI-Box's own finish: graphite, brushed aluminium, one warm light. It rises over the horizon,
   wakes (a warm ring, a fan turning behind the grille) and turns as you scroll. three.js r128. */
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
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.physicallyCorrectLights = false;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(22, 1, 0.05, 60);

  /* ---- studio for reflections: long soft boxes give black surfaces their shape ---- */
  var env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(20, 32, 16), new T.MeshBasicMaterial({ color: 0x0d0b09, side: T.BackSide })));
  function softbox(w, h, x, y, z, col, look) {
    var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: col, side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(look ? look[0] : 0, look ? look[1] : 0.2, look ? look[2] : 0); env.add(m);
  }
  softbox(9, 1.6, 0, 6, 0, new T.Color(2.2, 2.1, 1.95));                 /* top strip: the sheen on the lid */
  softbox(0.7, 7, -4.2, 1.5, 3.2, new T.Color(2.4, 2.3, 2.1));          /* tall strip, front left: the edge line */
  softbox(0.7, 7, 4.2, 1.5, 3.0, new T.Color(0.95, 0.9, 0.82));          /* tall strip, front right */
  softbox(14, 1.2, 0, 0.5, -6, new T.Color(1.7, 1.05, 0.5));             /* the warm horizon behind */
  softbox(0.5, 6, -5, 1.2, -3, new T.Color(1.6, 1.05, 0.55));           /* warm rims */
  softbox(0.5, 6, 5, 1.2, -3, new T.Color(1.6, 1.05, 0.55));
  softbox(16, 8, 0, -4.5, 0, new T.Color(0.16, 0.13, 0.1), [0, 0, 0]);  /* paper floor bounce */
  var pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.02).texture;

  function tex(w, h, draw, srgb) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  }
  function noise(w, h, a, b) { return tex(w, h, function (c) { var d = c.createImageData(w, h); for (var i = 0; i < d.data.length; i += 4) { var v = a + Math.random() * (b - a); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); }); }
  function rrect(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }

  /* ---- dimensions (metres): 176 x 417 x 518, like the real tower ---- */
  var W = 0.176, H = 0.417, D = 0.518, FEET = 0.01, HB = 0.026;   /* HB: handle height above the body */
  var BH = H - HB - FEET;                                           /* body height */
  var box = new T.Group(); scene.add(box);
  var CY = FEET + BH / 2, FZ = D / 2;

  /* materials */
  var grain = noise(256, 256, 120, 150); grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.repeat.set(6, 6);
  var powder = new T.MeshPhysicalMaterial({ color: 0x101012, metalness: 0.12, roughness: 0.46, roughnessMap: grain, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 0.9 });
  var graphite = new T.MeshPhysicalMaterial({ color: 0x1a1b1e, metalness: 0.55, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 1.4 });
  var brushMap = tex(512, 64, function (c, w, h) { c.fillStyle = '#b9bcbf'; c.fillRect(0, 0, w, h); for (var i = 0; i < 900; i++) { c.fillStyle = 'rgba(' + (Math.random() > .5 ? '255,255,255' : '40,40,40') + ',' + (Math.random() * .08) + ')'; c.fillRect(0, Math.random() * h, w, 1); } }, true);
  var alu = new T.MeshPhysicalMaterial({ color: 0xc9ccd0, map: brushMap, metalness: 1, roughness: 0.22, clearcoat: 0.3, envMapIntensity: 1.2 });
  var dark = new T.MeshStandardMaterial({ color: 0x050506, roughness: 0.8, metalness: 0.2 });

  /* body: a rounded profile (x-y) carried the full depth, softly bevelled front and back */
  var bev = 0.005;
  var bodyGeo = new T.ExtrudeGeometry(rrect(W, BH, 0.014), { depth: D - 2 * bev - 0.016, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.7, bevelSegments: 6, curveSegments: 10 });
  bodyGeo.center();
  var body = new T.Mesh(bodyGeo, powder); body.position.set(0, CY, -0.006); body.castShadow = true; body.receiveShadow = true; box.add(body);

  /* the carry handles: a side profile with a grip slot, carried across the width */
  function handle(zc) {
    var L = 0.088, s = rrect(L, HB + 0.02, 0.009);
    var hole = rrect(L - 0.028, 0.013, 0.0055); hole.getPoints(); s.holes.push(new T.Path(hole.getPoints(12).map(function (p) { return new T.Vector2(p.x, p.y + 0.002); })));
    var g = new T.ExtrudeGeometry(s, { depth: W - 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0015, bevelSegments: 3, curveSegments: 10 });
    g.center(); var m = new T.Mesh(g, graphite); m.rotation.y = Math.PI / 2; m.position.set(0, FEET + BH + HB / 2 - 0.01, zc); m.castShadow = true; box.add(m); return m;
  }
  handle(FZ - 0.052); handle(-FZ + 0.052);
  /* the lid between the handles, a touch lower: a shallow channel */
  var lid = new T.Mesh(new T.BoxGeometry(W - 0.03, 0.004, D - 0.2), new T.MeshPhysicalMaterial({ color: 0x0e0e10, metalness: 0.4, roughness: 0.45 }));
  lid.position.set(0, FEET + BH + 0.001, 0); box.add(lid);

  /* front bezel: proud of the body, graphite, with the control strip and the grille */
  var BZ = 0.014, bzW = W - 0.002, bzH = BH + HB - 0.004;
  var gW = bzW - 0.03, gTop = FEET + bzH - 0.085, gBot = FEET + 0.03, gH = gTop - gBot, gY = (gTop + gBot) / 2;
  var bzShape = rrect(bzW, bzH, 0.016), win = rrect(gW, gH, 0.006), yOff = gY - (FEET + bzH / 2 + 0.002);
  bzShape.holes.push(new T.Path(win.getPoints(10).map(function (p) { return new T.Vector2(p.x, p.y + yOff); })));
  var bezGeo = new T.ExtrudeGeometry(bzShape, { depth: BZ, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.0028, bevelSegments: 6, curveSegments: 10 });
  bezGeo.translate(0, 0, -BZ / 2);
  var bezel = new T.Mesh(bezGeo, graphite); bezel.position.set(0, FEET + bzH / 2 + 0.002, FZ - 0.004); bezel.castShadow = true; box.add(bezel);
  var FF = FZ - 0.004 + BZ / 2 + 0.003;   /* front face z */

  /* grille: hexagonal perforation over a recessed, lit interior with a fan */
  var zIn = FZ - 0.0132;
  var cell = 46;
  var hexA = tex(512, Math.round(512 * gH / gW), function (c, w, h) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#000';
    var r = 512 / cell, dx = r * 1.75, dy = r * 1.52;
    for (var row = -1, y = 0; y < h + dy; row++, y = row * dy) for (var x = (row % 2 ? dx / 2 : 0) - dx; x < w + dx; x += dx) {
      c.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(x + Math.cos(a) * r * .78, y + Math.sin(a) * r * .78); } c.closePath(); c.fill();
    }
    /* a quiet frame at the edge */
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6); c.fillRect(0, 0, 6, h); c.fillRect(w - 6, 0, 6, h);
  });
  var grilleMat = new T.MeshPhysicalMaterial({ color: 0x232428, metalness: 0.8, roughness: 0.32, alphaMap: hexA, transparent: true, bumpMap: hexA, bumpScale: 0.0012, clearcoat: 0.4, envMapIntensity: 1.3, side: T.DoubleSide });
  var grille = new T.Mesh(new T.PlaneGeometry(gW, gH), grilleMat); grille.position.set(0, gY, FF - 0.004); grille.renderOrder = 2; box.add(grille);
  /* recess walls and the warm interior */
  var glowMap = tex(256, 512, function (c, w, h) {
    c.fillStyle = '#060606'; c.fillRect(0, 0, w, h);
    var g = c.createRadialGradient(w / 2, h * .42, 4, w / 2, h * .42, w * .9); g.addColorStop(0, 'rgba(255,190,110,1)'); g.addColorStop(.35, 'rgba(200,110,40,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, true);
  var innerMat = new T.MeshStandardMaterial({ color: 0x070707, emissive: 0xffffff, emissiveMap: glowMap, emissiveIntensity: 0, roughness: 0.9 });
  var inner = new T.Mesh(new T.PlaneGeometry(gW, gH), innerMat); inner.position.set(0, gY, zIn); box.add(inner);
  [[-1, 0], [1, 0]].forEach(function (s) { var m = new T.Mesh(new T.PlaneGeometry(FF - zIn, gH), dark); m.rotation.y = -s[0] * Math.PI / 2; m.position.set(s[0] * gW / 2, gY, (FF + zIn) / 2); box.add(m); });
  [[1], [-1]].forEach(function (s) { var m = new T.Mesh(new T.PlaneGeometry(gW, FF - zIn), dark); m.rotation.x = s[0] * Math.PI / 2; m.position.set(0, gY + s[0] * gH / 2, (FF + zIn) / 2); box.add(m); });
  /* the fan behind the grille */
  var fan = new T.Group(); fan.position.set(0, gY + gH * .08, zIn + 0.005); box.add(fan);
  var fanMat = new T.MeshStandardMaterial({ color: 0x111113, metalness: 0.3, roughness: 0.6 });
  fan.add(new T.Mesh(new T.TorusGeometry(0.062, 0.004, 8, 48), fanMat));
  var hub = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.006, 32), fanMat); hub.rotation.x = Math.PI / 2; fan.add(hub);
  var blades = new T.Group(); fan.add(blades);
  for (var b = 0; b < 7; b++) {
    var bs = new T.Shape(); bs.moveTo(0.016, -0.006); bs.quadraticCurveTo(0.04, -0.02, 0.058, -0.004); bs.quadraticCurveTo(0.045, 0.012, 0.016, 0.008); bs.closePath();
    var bl = new T.Mesh(new T.ShapeGeometry(bs, 6), fanMat); bl.rotation.z = b / 7 * Math.PI * 2; blades.add(bl);
  }
  var fanLight = new T.PointLight(0xffb066, 0, 0.5, 2); fanLight.position.set(0, gY, FF - 0.01); box.add(fanLight);

  /* control strip above the grille: power ring, ports, a slim slot */
  var stripY = gTop + 0.033;
  var portMap = tex(512, 128, function (c, w, h) {
    c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h);
    function rr(x, y, ww, hh, r, f) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + ww, y, x + ww, y + hh, r); c.arcTo(x + ww, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + ww, y, r); c.closePath(); c.fillStyle = f; c.fill(); }
    rr(40, 50, 44, 20, 9, '#050506'); rr(100, 50, 44, 20, 9, '#050506');                  /* USB-C */
    rr(300, 46, 64, 26, 3, '#050506'); rr(380, 46, 64, 26, 3, '#050506');               /* USB-A */
    c.fillStyle = '#2b2d31'; c.fillRect(306, 56, 52, 6); c.fillRect(386, 56, 52, 6);
    c.beginPath(); c.arc(472, 60, 10, 0, Math.PI * 2); c.fillStyle = '#050506'; c.fill();  /* audio */
  }, true);
  var ports = new T.Mesh(new T.PlaneGeometry(gW, gW / 4), new T.MeshStandardMaterial({ map: portMap, transparent: true, roughness: 0.6 }));
  ports.position.set(0, stripY - 0.012, FF + 0.0004); box.add(ports);
  var slot = new T.Mesh(new T.BoxGeometry(gW * 0.82, 0.0035, 0.002), dark); slot.position.set(0, gTop + 0.008, FF + 0.0004); box.add(slot);
  var PX = 0, PY = stripY + 0.016;
  var pwr = new T.Mesh(new T.CylinderGeometry(0.0095, 0.0095, 0.003, 48), new T.MeshPhysicalMaterial({ color: 0x1b1c1f, metalness: 0.9, roughness: 0.2, clearcoat: 1 }));
  pwr.rotation.x = Math.PI / 2; pwr.position.set(PX, PY, FF + 0.0016); box.add(pwr);
  var ringMat = new T.MeshStandardMaterial({ color: 0x2a1c0c, emissive: new T.Color(0xF3B862), emissiveIntensity: 0, roughness: 0.4 });
  var ring = new T.Mesh(new T.TorusGeometry(0.0108, 0.0011, 12, 64), ringMat); ring.position.set(PX, PY, FF + 0.0012); box.add(ring);
  var ringLight = new T.PointLight(0xF3B862, 0, 0.12, 2); ringLight.position.set(PX, PY, FF + 0.02); box.add(ringLight);

  /* the wordmark: brushed aluminium letters, "Box" in the site's warm metal */
  var markMat = new T.MeshStandardMaterial({ metalness: 0.6, roughness: 0.3, transparent: true, emissive: 0xffffff, emissiveIntensity: 0.5 });
  var mark = new T.Mesh(new T.PlaneGeometry(0.084, 0.021), markMat); mark.position.set(0, gY + gH * 0.36, FF + 0.0032); mark.renderOrder = 3; box.add(mark);
  function drawMark() {
    var m = tex(1024, 256, function (c, w, h) {
      c.clearRect(0, 0, w, h); c.textBaseline = 'middle';
      var f1 = '400 190px Newsreader, Georgia, serif', f2 = 'italic 400 190px Newsreader, Georgia, serif';
      c.font = f1; var a = c.measureText('AI-').width; c.font = f2; var bw = c.measureText('Box').width; var x = (w - a - bw) / 2;
      c.font = f1; c.fillStyle = '#E6E7E8'; c.fillText('AI-', x, h / 2 + 6); c.font = f2; c.fillStyle = '#EBA75C'; c.fillText('Box', x + a, h / 2 + 6);
    }, true);
    markMat.map = m; markMat.emissiveMap = m; markMat.alphaMap = null; markMat.needsUpdate = true; draw(lastP, true);
  }
  /* a backing plate so the mark reads on the grille */
  var plate = new T.Mesh(new T.ExtrudeGeometry(rrect(0.1, 0.03, 0.006), { depth: 0.0015, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 3 }), graphite);
  plate.position.set(0, gY + gH * 0.36, FF - 0.0002); box.add(plate);

  /* side: a seam where the panel meets the front frame, and the release latch at the back */
  [-1, 1].forEach(function (s) {
    var seam = new T.Mesh(new T.BoxGeometry(0.0008, BH - 0.03, 0.0016), dark); seam.position.set(s * (W / 2 + 0.0002), CY, FZ - 0.05); box.add(seam);
  });
  var latch = new T.Mesh(new T.BoxGeometry(0.002, 0.05, 0.016), graphite); latch.position.set(W / 2 + 0.0008, FEET + BH - 0.05, -FZ + 0.06); box.add(latch);

  /* back: power supply, I/O, slots */
  var backMap = tex(256, 600, function (c, w, h) {
    c.fillStyle = '#0d0e10'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#030304'; for (var i = 0; i < 7; i++) c.fillRect(30 + i * 30, 300, 16, 170);
    c.strokeStyle = '#2b2e33'; c.lineWidth = 2; c.strokeRect(26, 60, 90, 210); c.fillStyle = '#050506'; for (var j = 0; j < 8; j++) c.fillRect(38, 74 + j * 24, 66, 12);
    c.strokeRect(26, 490, 204, 90); c.beginPath(); c.arc(80, 535, 30, 0, Math.PI * 2); c.stroke(); c.fillRect(150, 515, 50, 34);
  }, true);
  var back = new T.Mesh(new T.PlaneGeometry(W * 0.86, BH * 0.92), new T.MeshStandardMaterial({ map: backMap, metalness: 0.5, roughness: 0.5 }));
  back.rotation.y = Math.PI; back.position.set(0, CY, -FZ + 0.0017); box.add(back);

  /* feet: two long runners */
  [-1, 1].forEach(function (s) { var f = new T.Mesh(new T.BoxGeometry(0.02, FEET, D - 0.06), new T.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 })); f.position.set(s * (W / 2 - 0.022), FEET / 2, -0.01); box.add(f); });

  /* shadow catcher and contact shadow on the paper horizon */
  var catcher = new T.Mesh(new T.PlaneGeometry(4, 4), new T.ShadowMaterial({ opacity: 0.1 }));
  catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);
  var csMap = tex(256, 256, function (c, w, h) { var g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(40,26,10,.6)'); g.addColorStop(.45, 'rgba(40,26,10,.22)'); g.addColorStop(1, 'rgba(40,26,10,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  var cs = new T.Mesh(new T.PlaneGeometry(W * 2.6, D * 1.5), new T.MeshBasicMaterial({ map: csMap, transparent: true, depthWrite: false }));
  cs.rotation.x = -Math.PI / 2; cs.position.y = 0.001; box.add(cs);

  /* lights: a soft key, warm rims from the horizon behind, a cool top */
  var key = new T.DirectionalLight(0xfff3e4, 1.0); key.position.set(-1.2, 2.4, 2.0); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -0.6; key.shadow.camera.right = 0.6; key.shadow.camera.top = 0.6; key.shadow.camera.bottom = -0.6; key.shadow.radius = 14; key.shadow.bias = -0.0005; scene.add(key);
  var rimL = new T.SpotLight(0xffb25e, 0, 6, 0.6, 0.8, 1.3); rimL.position.set(-1.1, 0.7, -1.6); rimL.target.position.set(0, 0.2, 0); scene.add(rimL, rimL.target);
  var rimR = new T.SpotLight(0xffc27a, 0, 6, 0.6, 0.8, 1.3); rimR.position.set(1.2, 0.6, -1.5); rimR.target.position.set(0, 0.2, 0); scene.add(rimR, rimR.target);
  var top = new T.DirectionalLight(0xeef0f4, 0.35); top.position.set(0.2, 3, 0.4); scene.add(top);
  scene.add(new T.HemisphereLight(0xf5ecdc, 0x5a4a36, 0.3));

  var hz = 0.76, bw = 0;
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    hz = parseFloat(getComputedStyle(stage).getPropertyValue('--hzf')) || 0.76;
    draw(lastP < 0 ? 0 : lastP, true);
  }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* framing: the box must fit between the two text columns, at most ~40% of the height */
  var R = 0.29, TAN = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
  function fitDist() {
    var w = canvas.clientWidth, h = canvas.clientHeight, mobile = w <= 860;
    var specW = Math.min(270, w * 0.24), avail = mobile ? w * 0.82 : w - 2 * (specW + 48 + Math.min(40, w * 0.04));
    var dW = R * w / (TAN * (w / h) * Math.max(200, avail));
    var dH = (H + 0.02) / ((mobile ? 0.56 : 0.8) * TAN);
    return Math.max(dW, dH);
  }

  var lastP = -1, v = new T.Vector3(), now = 0;
  function draw(p, force) {
    if (!force && Math.abs(p - lastP) < 1e-5) return; lastP = p;
    var rise = smooth(0.0, 0.2, p), wake = smooth(0.13, 0.26, p), turn = smooth(0.2, 0.97, p);
    box.position.y = -(1 - rise) * (H + 0.06);
    box.rotation.y = -0.32 + 0.2 * rise - turn * 0.95;
    ringMat.emissiveIntensity = 3.2 * wake; ringLight.intensity = 0.5 * wake;
    innerMat.emissiveIntensity = 0.55 * wake; fanLight.intensity = 0.35 * wake;
    rimL.intensity = 5 * smooth(0.02, 0.3, p); rimR.intensity = 3.5 * smooth(0.1, 0.4, p);
    var d = fitDist() * (1.06 - 0.06 * turn);
    var el = 0.2 + 0.1 * turn;
    camera.position.set(Math.sin(0.04) * d, el, Math.cos(0.04) * d);
    camera.lookAt(0, 0.21, 0); camera.updateMatrixWorld();
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    camera.setViewOffset(cw, ch, 0, 0, cw, ch);
    v.set(0, 0, 0).project(camera);
    var dy = -(v.y - (1 - 2 * hz)) / 2 * ch;
    camera.setViewOffset(cw, ch, 0, dy, cw, ch);
    /* how wide the box can get on screen, for the text columns */
    v.set(R, 0.21, 0).project(camera);
    var nbw = Math.round(v.x * canvas.clientWidth);
    if (Math.abs(nbw - bw) > 2) { bw = nbw; stage.style.setProperty('--bw', bw + 'px'); }
    renderer.render(scene, camera);
  }

  function prog() { var r = root.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1); }
  function ui(p) {
    stage.style.setProperty('--glow', smooth(0.02, 0.3, p).toFixed(3));
    caps.forEach(function (c) { var f = +c.dataset.from, t = +c.dataset.to; c.classList.toggle('on', p >= f && (p < t || t === 1)); c.classList.toggle('past', p >= t && t !== 1); });
    var last = -1;
    cards.forEach(function (c, i) { var on = p >= +c.dataset.from; c.classList.toggle('on', on); if (on) last = i; });
    cards.forEach(function (c, i) { c.classList.toggle('cur', i === last); });
    var u = root.querySelector('.under'); if (u) u.classList.toggle('on', p >= +u.dataset.from);
  }
  /* while the stage is on screen and awake, the fan turns */
  var visible = false, raf = 0, lastT = performance.now();
  function loop(t) {
    raf = 0; var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    var p = reduce ? 0.6 : prog();
    blades.rotation.z -= dt * 7 * smooth(0.13, 0.3, p);
    ui(p); draw(p, true);
    if (visible && !reduce) raf = requestAnimationFrame(loop);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(root);
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  resize(); loop(performance.now());
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 40px Newsreader'), document.fonts.load('italic 400 40px Newsreader')]).then(drawMark, drawMark); else drawMark();
  window.__reveal = function (p, rot) { reduce = true; ui(p); draw(p, true); if (rot !== undefined) { box.rotation.y = rot; renderer.render(scene, camera); } };
})();
