/* "Inget lämnar huset": night falls over the box's horizon. Motes of light (your documents) rise from the
   surface, arc under a dashed ceiling they never cross, and fall back inside the curve. Three of them carry
   the hero's words. Dawn returns at the end so the montage opens on paper. One fragment shader, no libraries. */
(function () {
  var sec = document.querySelector('[data-night]');
  if (!sec) return;
  var cv = document.getElementById('night-gl'), lines = [].slice.call(sec.querySelectorAll('.line')), docs = [].slice.call(sec.querySelectorAll('.doc'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var sm = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) sec.classList.add('no-gl');
  var H0 = .25, CEIL = .2;
  function geo(Wd, Hd) { var W = Wd / Hd, R = 1.7 * Math.max(W, 1); return { W: W, R: R, cx: W * .5, cy: H0 - R, spread: Math.asin(Math.min(1, W * (W < .8 ? .3 : .42) / R)) }; }
  /* the three named documents: a slow rise, a peak below the ceiling, a fall back in */
  var D = [{ a: -.62, per: 7.4, off: 0, hg: .16 }, { a: .05, per: 8.2, off: 2.6, hg: CEIL - .025 }, { a: .58, per: 7.8, off: 5.1, hg: .13 }];
  function docAt(d, s, g, leak) {
    var t = ((s + d.off) / d.per) % 1, a = d.a * g.spread + Math.sin(t * Math.PI) * .04 * Math.sign(d.a || 1);
    var hgt = Math.sin(Math.PI * Math.min(1, t * 1.15)) * d.hg * (1 + (leak || 0) * 1.5), r = g.R + Math.max(0, hgt) - .004;
    var k = Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - (leak || 0) * Math.min(1, Math.max(0, (hgt - CEIL * .8) / .12)));
    return { x: g.cx + Math.sin(a) * r, y: g.cy + Math.cos(a) * r, k: Math.max(0, k), t: t };
  }
  var U = {}, prog;
  if (gl) {
    var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var FS = [
      'precision highp float;',
      'uniform vec2 uR; uniform float uT, uDark, uStory, uSpread, uLeak, uCeil; uniform vec3 uD0, uD1, uD2;',
      'const vec3 PAPER=vec3(.969,.957,.925); const vec3 INK=vec3(.047,.055,.075); const vec3 WARM=vec3(.95,.65,.35);',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
      ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
      'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+17.;a*=.5;}return s;}',
      'float mote(vec2 p,vec3 d){float md=length(p-d.xy);return (exp(-md*md*9000.)*1.4+exp(-md*55.)*.14)*d.z;}',
      'void main(){',
      ' vec2 fc=gl_FragCoord.xy; float W=uR.x/uR.y; vec2 p=fc/uR.y;',
      ' float R=1.7*max(W,1.); vec2 c=vec2(W*.5,' + H0 + '-R);',
      ' vec2 q=p-c; float r=length(q); float d=r-R; float ang=atan(q.x,q.y);',
      ' float up=max(d,0.); float th=clamp(up/.85,0.,1.);',
      ' vec3 lightSky=mix(vec3(.94,.80,.64),PAPER,pow(th,.5));',
      ' vec3 dk=mix(vec3(.22,.30,.38),INK,smoothstep(.03,.7,th));',
      ' vec3 darkSky=mix(vec3(.52,.30,.18),dk,smoothstep(0.,.1,th));',
      ' vec3 sky=mix(lightSky,darkSky,pow(uDark,1.7));',
      ' sky+=vec3(.26,.11,.02)*sin(uDark*3.14159)*(1.-th*.65);',
      ' float sunx=exp(-pow(ang*R*.9,2.));',
      ' float atm=exp(-up*mix(5.5,7.,uDark))*(.5+.5*uDark);',
      ' vec3 col=sky+WARM*atm*(.18+.82*sunx)*mix(.4,1.,uDark);',
      ' col+=WARM*exp(-up*60.)*.35*sunx;',
      /* stars, very few, only in the dark */
      ' vec2 sg=floor(fc/3.); float st=step(.9975,h(sg))*smoothstep(.12,.5,th)*uDark; col+=vec3(.9,.88,.8)*st*(.4+.6*sin(uT*2.+h(sg)*30.));',
      ' col+=(h(fc+fract(uT)*91.)-.5)*.018;',
      ' if(d<0.){',
      '  float depth=-d; float brushed=fbm(vec2(ang*R*4.8,depth*210.)); float grain=fbm(p*230.);',
      '  vec3 base=mix(vec3(.055,.05,.047),vec3(.115,.10,.09),brushed*.6+grain*.2);',
      '  float rim=exp(-depth*60.); float sheen=exp(-depth*8.)*(.35+.65*brushed);',
      '  vec3 s=base+WARM*(rim*1.6+sheen*.32)*(.3+.7*sunx);',
      /* where a document landed, the surface glows a moment, as if it took it back in */
      '  col=mix(col,s,clamp(-d*uR.y*.8,0.,1.));',
      ' }',
      ' vec2 led=c+vec2(0.,R-.006); float ld=length(p-led); float pulse=.6+.4*sin(uT*1.9);',
      ' col+=WARM*(exp(-ld*ld*9000.)*1.2+exp(-ld*90.)*.18)*pulse;',
      ' if(uStory>0.){',
      '  float m=0.;',
      '  for(int i=0;i<44;i++){',
      '   float fi=float(i); float sd=h(vec2(fi,3.1));',
      '   float t=fract(uT*(.05+.05*h(vec2(fi,7.)))+sd);',
      '   float a=((h(vec2(fi,1.))-.5)*2.*uSpread)+(h(vec2(fi,5.))-.5)*.2*t;',
      '   float hgt=sin(3.14159*t)*(.02+(' + CEIL + '-.04)*h(vec2(fi,9.)))*(1.+uLeak*1.5);\n   float esc=1.-uLeak*smoothstep(' + CEIL + '*.8,' + CEIL + '+.12,hgt);',
      '   vec2 mp=c+vec2(sin(a),cos(a))*(R+hgt-.004);',
      '   float md=length(p-mp);',
      '   m+=(exp(-md*md*26000.)*(.55+.45*sin(fi+uT*3.))+exp(-md*150.)*.045)*esc;',
      '  }',
      '  m+=mote(p,uD0)+mote(p,uD1)+mote(p,uD2);',
      '  col+=WARM*m*uStory*1.25;',
      '  float ce=abs(d-' + CEIL + '); float dash=step(.5,fract(ang*R*30.));',
      '  col+=WARM*exp(-ce*ce*400000.)*.32*dash*uCeil;',
      ' }',
      ' vec2 v=fc/uR-.5; col*=1.-dot(v,v)*.35*uDark;',
      ' gl_FragColor=vec4(max(col,0.),1.);',
      '}'].join('\n');
    var sh = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    prog = gl.createProgram();
    try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog); }
    catch (e) { console.warn(e); gl = null; sec.classList.add('no-gl'); }
    if (gl) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uR', 'uT', 'uDark', 'uStory', 'uSpread', 'uLeak', 'uCeil', 'uD0', 'uD1', 'uD2'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    }
  }
  var w = 0, hh = 0;
  function size() {
    var W = cv.clientWidth, H = cv.clientHeight, k = Math.min(window.devicePixelRatio || 1, W * H > 2e6 ? 1 : 1.5);
    var nw = Math.round(W * k), nh = Math.round(H * k);
    if (nw !== w || nh !== hh) { w = cv.width = nw; hh = cv.height = nh; gl.viewport(0, 0, w, hh); }
  }
  /* [story, leak, redact, ceiling, dark, cloud route, box hop] */
  var PH = { power: [1, 0, 0, 0, 1, 0, 0], secret: [.7, 1, 0, 0, 1, 0, 0], wash: [.35, 0, 1, 0, 1, 0, 0], big: [.2, 0, .55, 0, 1, 0, 0],
    route: [.12, 0, .55, 0, .88, 1, 1], home: [1, 0, .55, 1, .72, 0, 1], nowash: [1, 0, 0, 1, .32, 0, .5], small: [1, 0, 0, 1, .12, 0, 0] };
  var route = sec.querySelector('.route'), RT = route ? {
    cp: route.querySelector('.cloud-p'), hp: route.querySelector('.hop-p'), pc: route.querySelector('.pk.c'), ph: route.querySelector('.pk.h'),
    st: [].slice.call(route.querySelectorAll('.stop')), o: route.querySelector('.place.o'), b: route.querySelector('.place.b'),
    cc: route.querySelector('.rcap.cc'), hc: route.querySelector('.rcap.hc') } : null;
  var routeT = 0;
  /* the cloud route: up from the office, along the curve at altitude, over the far edge of the world */
  function drawRoute(g, Wd, Hd, cl, hop, dt) {
    if (!RT) return;
    route.setAttribute('viewBox', '0 0 ' + Wd + ' ' + Hd);
    var P = function (a, alt) { var r = g.R + alt; return [(g.cx + Math.sin(a) * r) * Hd, (1 - (g.cy + Math.cos(a) * r)) * Hd]; };
    var a0 = -g.spread * .3, a1 = a0 + Math.max(.035, g.spread * .14), aEnd = g.spread * 1.7, alt = .15;
    var pts = [], N = 48;
    for (var i = 0; i <= N; i++) { var u = i / N, a = a0 + (aEnd - a0) * u, h = alt * Math.sin(Math.min(1, u * 3.2) * Math.PI / 2) * (1 - Math.pow(Math.max(0, u - .82) / .18, 2) * .9); pts.push(P(a, h + .006)); }
    var d = 'M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L');
    RT.cp.setAttribute('d', d);
    var o = P(a0, .006), bb = P(a1, .006), top = P((a0 + a1) / 2, .035);
    RT.hp.setAttribute('d', 'M' + o[0].toFixed(1) + ' ' + o[1].toFixed(1) + ' Q' + top[0].toFixed(1) + ' ' + (2 * top[1] - (o[1] + bb[1]) / 2).toFixed(1) + ' ' + bb[0].toFixed(1) + ' ' + bb[1].toFixed(1));
    RT.o.setAttribute('transform', 'translate(' + o[0].toFixed(1) + ' ' + o[1].toFixed(1) + ')');
    RT.b.setAttribute('transform', 'translate(' + bb[0].toFixed(1) + ' ' + (bb[1] - 6).toFixed(1) + ')');
    [.22, .5, .8].forEach(function (f, k) { var q = pts[Math.round(f * N)]; RT.st[k].setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')'); var tx = RT.st[k].lastChild, nw = Wd < 700; tx.setAttribute('text-anchor', nw ? (k === 1 ? 'middle' : 'end') : q[0] > Wd - 90 ? 'end' : q[0] < 90 ? 'start' : 'middle'); tx.setAttribute('x', nw && k === 0 ? -8 : 0); tx.setAttribute('y', nw && k === 1 ? 32 : 0); });
    routeT += dt;
    var L = RT.cp.getTotalLength(), u = (routeT / 5.5) % 1, drawn = Math.min(1, cl * 1.2);
    RT.cp.style.strokeDasharray = L.toFixed(0); RT.cp.style.strokeDashoffset = (L * (1 - Math.min(1, routeT / 2.4))).toFixed(0);
    var pq = RT.cp.getPointAtLength(L * u); RT.pc.setAttribute('cx', pq.x.toFixed(1)); RT.pc.setAttribute('cy', pq.y.toFixed(1));
    RT.pc.style.opacity = (u > .92 ? (1 - u) / .08 : 1) * cl;
    var hl = RT.hp.getTotalLength(), hu = (performance.now() / 1400) % 1, hb = hu < .5 ? hu * 2 : 2 - hu * 2, hq = RT.hp.getPointAtLength(hl * hb);
    RT.ph.setAttribute('cx', hq.x.toFixed(1)); RT.ph.setAttribute('cy', hq.y.toFixed(1));
    RT.st.forEach(function (e, k) { e.style.opacity = (cl * Math.min(1, Math.max(0, (routeT / 2.4 - [.22, .5, .8][k]) * 6))).toFixed(3); });
    var cq = pts[Math.round(.5 * N)], narrow = Wd < 700; RT.cc.setAttribute('x', (narrow ? Wd / 2 : cq[0]).toFixed(1)); RT.cc.setAttribute('y', (cq[1] - (narrow ? 58 : 34)).toFixed(1));
    RT.hc.setAttribute('x', ((o[0] + bb[0]) / 2).toFixed(1)); RT.hc.setAttribute('y', (o[1] + 30).toFixed(1));
    RT.cp.style.opacity = RT.cc.style.opacity = cl.toFixed(3);
    [RT.hp, RT.ph, RT.o, RT.b, RT.hc].forEach(function (e) { e.style.opacity = hop.toFixed(3); });
    if (cl < .02) routeT = 0;
  }
  var phases = lines.map(function (l) { return PH[l.getAttribute('data-ph')] || PH.home; });
  /* [story, leak, redact, ceiling] eased toward the current line's values */
  var cur = phases[0].slice(), tgt = phases[0];
  var t0 = performance.now(), raf = 0, li = -1, sDK = 0, sST = 0, P = { p: 0, dk: 0, st: 0 };
  function read() {
    var r = sec.getBoundingClientRect(), vh = innerHeight;
    var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1), enter = clamp(1 - r.top / vh, 0, 1);
    P.p = p; P.dk = sm(.2, .9, enter) * (1 - sm(.93, 1, p)); P.st = sm(.04, .2, p) * (1 - sm(.84, .95, p));
    return r.bottom > 0 && r.top < vh;
  }
  function frame(now) {
    raf = 0;
    if (!read()) return;
    var k = reduce ? 1 : .09; sDK += (P.dk * (cur[4] === undefined ? 1 : cur[4]) - sDK) * k; sST += (P.st - sST) * k;
    if (reduce) { sDK = .2; sST = 1; }
    var i = reduce ? lines.length - 1 : clamp(Math.floor(P.p * 1.08 * lines.length), 0, lines.length - 1);
    if (i !== li && !reduce) { lines.forEach(function (l, j) { l.classList.toggle('on', j === i); }); li = i; }
    tgt = phases[reduce ? phases.length - 1 : i];
    var dt = Math.min(.1, ((now || 0) - (frame.last || now || 0)) / 1000); frame.last = now;
    for (var c = 0; c < 7; c++) cur[c] += (tgt[c] - cur[c]) * (reduce ? 1 : 1 - Math.exp(-dt * 2.6));
    var STO = sST * cur[0], LEAK = cur[1], RED = cur[2], CEILV = sST * cur[3];
    var s = reduce ? 2.2 : (now - t0) / 1000, Wd = cv.clientWidth, Hd = cv.clientHeight, g = geo(Wd, Hd);
    var dv = D.map(function (d) { return docAt(d, s, g, LEAK); });
    docs.forEach(function (el, j) {
      var v = dv[j], show = v.k > .05 ? Math.min(1, v.k * 2.2) : 0;
      el.style.transform = 'translate(' + (v.x * Hd).toFixed(1) + 'px,' + ((1 - v.y) * Hd - 22).toFixed(1) + 'px) translate(-50%,-100%)';
      el.style.opacity = (show * sST * (.35 + .65 * Math.max(cur[0], RED)) * (1 - cur[5])).toFixed(3);
    });
    if (gl) {
      size();
      gl.uniform2f(U.uR, w, hh); gl.uniform1f(U.uT, s); gl.uniform1f(U.uDark, sDK); gl.uniform1f(U.uStory, STO); gl.uniform1f(U.uLeak, LEAK); gl.uniform1f(U.uCeil, CEILV); gl.uniform1f(U.uSpread, g.spread);
      [U.uD0, U.uD1, U.uD2].forEach(function (u, j) { gl.uniform3f(u, dv[j].x, dv[j].y, Math.min(1, dv[j].k * 3) * Math.max(cur[0], .5)); });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    drawRoute(g, Wd, Hd, cur[5], cur[6], dt); sec.style.setProperty('--dk', sm(.46, .62, sDK).toFixed(3)); sec.style.setProperty('--red', RED.toFixed(3));
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  kick();
  window.__night = function (p) { var r = sec.getBoundingClientRect(); scrollTo(0, scrollY + r.top + p * (r.height - innerHeight)); };
})();
