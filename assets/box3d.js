/* The hero's 3D AI Box (three.js r128): one slowly turning box in the hero column. */
(function () {
  var canvas = document.getElementById('box3d');
  if (!canvas || !window.THREE) return;
  var stage = canvas.parentNode;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var T = THREE, renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  stage.classList.add('gl-on');

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x080808, 1);

  var scene = new T.Scene();
  scene.fog = new T.Fog(0x080808, 5, 16);
  var camera = new T.PerspectiveCamera(26, 1, 0.05, 60);

  /* studio environment for reflections */
  var env = new T.Scene();
  env.add(new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x030303, side: T.BackSide })));
  function softbox(w, h, x, y, z, k) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0.2, 0); env.add(m); }
  softbox(5, 1.4, -3.5, 4.5, 1.5, 1.4);
  softbox(1.0, 6, 5, 1.5, 0.5, 1.2);
  softbox(7, 0.5, 0, 2.5, -5, 2.8);
  softbox(3, 3, 0, -5, 3, 0.25);
  var pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.03).texture;

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
    c.fillStyle = '#16181b'; c.font = '600 64px "Instrument Sans", Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AI Box', w / 2, h / 2 + 2);
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

  /* background: grainy eclipse glow behind the box, warm-tinted */
  var bgMat = new T.ShaderMaterial({
    uniforms: { uRes: { value: new T.Vector2(1, 1) }, uC: { value: new T.Vector2(0.5, 0.5) }, uBase: { value: 0.3 }, uR: { value: 0.3 }, uI: { value: 0 } },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.999, 1.0); }',
    fragmentShader: [
      'uniform vec2 uRes; uniform vec2 uC; uniform float uBase; uniform float uR; uniform float uI;',
      'float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / uRes.y;',
      '  vec2 v = uv - uC; float r = length(v);',
      '  vec2 L = normalize(vec2(-0.35, 1.0));',
      '  float w = mix(0.55, 1.0, pow(dot(v / max(r, 1e-4), L) * 0.5 + 0.5, 1.4));',
      '  vec2 e = vec2(v.x / 1.25, v.y);',
      '  float q = length(e) / uR;',
      '  float g = (exp(-q * q * 0.55) * 0.20 + exp(-q * q * 1.6) * 0.14 + exp(-q * 0.9) * 0.05) * w;',
      '  vec2 f = vec2((uv.x - uC.x) / (uR * 1.9), (uv.y - uBase) / (uR * 0.16));',
      '  g += exp(-dot(f, f)) * 0.07;',
      '  g *= uI;',
      '  float n = hash(gl_FragCoord.xy), n2 = hash(gl_FragCoord.yx + 19.7);',
      '  float col = g * (0.9 + 0.2 * n) + (n2 - 0.5) / 255.0 * 1.5;',
      '  gl_FragColor = vec4(vec3(col) * vec3(1.0, 0.95, 0.86) + vec3(0.031), 1.0);',
      '}'].join('\n'),
    depthWrite: false, depthTest: false
  });
  var bg = new T.Mesh(new T.PlaneGeometry(2, 2), bgMat); bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

  /* contact shadow */
  var csMap = tex(256, 256, function (c, w, h) { var g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(0.5, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  var cs = new T.Mesh(new T.PlaneGeometry(W * 3.2, D * 1.9), new T.MeshBasicMaterial({ map: csMap, transparent: true, depthWrite: false }));
  cs.rotation.x = -Math.PI / 2; cs.position.y = 0.0015; scene.add(cs);

  /* the floor ring that draws itself */
  var ring = new T.Mesh(new T.PlaneGeometry(0.78, 0.78), new T.ShaderMaterial({
    uniforms: { uI: { value: 0 }, uP: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform float uI; uniform float uP; varying vec2 vUv;',
      'void main(){',
      '  vec2 p = (vUv - 0.5) * 2.0; float r = length(p);',
      '  float ang = fract(atan(p.y, p.x) / 6.28318 + 0.25);',
      '  float m = 1.0 - smoothstep(uP - 0.03, uP, ang);',
      '  float d = abs(r - 0.82);',
      '  float a = exp(-d * d * 12000.0) * 1.0 + exp(-d * d * 500.0) * 0.22 + exp(-d * 14.0) * 0.05;',
      '  gl_FragColor = vec4(vec3(1.0, 0.92, 0.78) * a * m * uI, 1.0);',
      '}'].join('\n'),
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false
  }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);

  /* dust */
  var sparkMap = tex(128, 128, function (c, w, h) { var g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, true);
  var n = 300, pos = new Float32Array(n * 3);
  for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 3; pos[i * 3 + 1] = Math.random() * 1.6; pos[i * 3 + 2] = -Math.random() * 3 + 0.6; }
  var dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  var dust = new T.Points(dustGeo, new T.PointsMaterial({ color: 0xffffff, size: 0.005, transparent: true, opacity: 0.4, blending: T.AdditiveBlending, depthWrite: false, map: sparkMap }));
  scene.add(dust);

  /* lights */
  var key = new T.DirectionalLight(0xfff6ec, 0.8); key.position.set(-1.4, 2.6, 1.2); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -0.6; key.shadow.camera.right = 0.6; key.shadow.camera.top = 0.6; key.shadow.camera.bottom = -0.6; key.shadow.camera.near = 0.5; key.shadow.camera.far = 6; key.shadow.radius = 6; key.shadow.bias = -0.0005;
  scene.add(key);
  var rim = new T.SpotLight(0xfff3e6, 0, 6, 0.6, 0.8, 1.2); rim.position.set(0.3, 1.2, -1.8); rim.target.position.set(0, 0.2, 0); scene.add(rim); scene.add(rim.target);
  var rim2 = new T.SpotLight(0xffffff, 0, 6, 0.5, 0.9, 1.2); rim2.position.set(-1.6, 0.6, -1.2); rim2.target.position.set(0, 0.2, 0); scene.add(rim2); scene.add(rim2.target);
  var fill = new T.DirectionalLight(0xe8e2d8, 0.22); fill.position.set(1.5, 0.6, 2.5); scene.add(fill);
  scene.add(new T.HemisphereLight(0x9aa0b0, 0x000000, 0.05));

  /* sizing: the box fills about half the canvas height */
  var dist = 1.7;
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    var pr = renderer.getPixelRatio(); bgMat.uniforms.uRes.value.set(w * pr, h * pr);
    dist = 1.8 * Math.max(1, 1 / camera.aspect);
  }
  window.addEventListener('resize', resize); resize();

  /* pointer: a small turn toward the cursor */
  var px = 0, pxT = 0;
  window.addEventListener('pointermove', function (e) { pxT = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1); }, { passive: true });

  var t0 = performance.now(), INTRO = reduce ? 0 : 3600, visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(loop); }).observe(canvas);
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  var baseV = new T.Vector3(), topV = new T.Vector3(), midV = new T.Vector3();

  function loop(now) {
    var t = (now - t0) / 1000, k = INTRO ? clamp((now - t0) / INTRO, 0, 1) : 1;
    var on = smooth(0.06, 0.24, k);
    ledMat.emissiveIntensity = 2.6 * on * (reduce ? 1 : 0.85 + 0.15 * Math.sin(t * 2.2)); ledLight.intensity = 0.5 * on;
    var g = smooth(0.3, 0.95, k);
    bgMat.uniforms.uI.value = g; rim.intensity = 3.5 * g; rim2.intensity = 0.6 * g;
    ring.material.uniforms.uP.value = smooth(0.62, 1.0, k); ring.material.uniforms.uI.value = 0.5 * smooth(0.6, 0.8, k);
    px += (pxT - px) * 0.04;
    box.rotation.y = -0.55 + (reduce ? 0 : Math.sin(t * 0.18) * 0.35 + px * 0.25);
    var ki = easeOut(smooth(0.15, 1.0, k));
    var Dd = dist * (0.3 + 0.7 * ki), ledY = H * 0.345 + H / 2 + FEET;
    var camY = ledY + (0.3 - ledY) * ki, lookY = ledY + (0.21 - ledY) * ki, ang = 0.05 - (1 - ki) * 0.55;
    camera.position.set(Math.sin(ang) * Dd, camY, Math.cos(ang) * Dd);
    camera.lookAt(0, lookY, 0);
    if (!reduce) { dust.rotation.y = t * 0.01; dust.position.y = Math.sin(t * 0.2) * 0.02; }
    baseV.set(0, 0, 0).project(camera); topV.set(0, H + FEET, 0).project(camera); midV.set(0, (H + FEET) * 0.55, 0).project(camera);
    var asp = camera.aspect, by = (baseV.y + 1) / 2, ty = (topV.y + 1) / 2;
    bgMat.uniforms.uBase.value = by; bgMat.uniforms.uC.value.set(asp * (midV.x + 1) / 2, (midV.y + 1) / 2);
    bgMat.uniforms.uR.value = (ty - by) * 0.78;
    renderer.render(scene, camera);
    if (visible && (!reduce || k < 1)) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
