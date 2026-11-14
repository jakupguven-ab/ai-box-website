/* The hero: dawn over the edge of the AI-Box, seen so close it reads as a horizon.
   One WebGL fragment shader. Scrolling lets the horizon sink and the light settle into the paper
   of the story below. The curve's radius follows the screen's width, so it never turns into a globe. */
(function () {
  var cv = document.getElementById('hero-gl');
  if (!cv) return;
  var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { document.documentElement.classList.add('no-gl'); return; }
  document.documentElement.classList.add('gl');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uR; uniform float uT, uS, uK; uniform vec2 uM;',
    'const vec3 PAPER=vec3(.969,.957,.925); const vec3 WARM=vec3(.95,.66,.36);',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+17.;a*=.5;}return s;}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float W=uR.x/uR.y; vec2 p=fc/uR.y;',
    ' float s=smoothstep(0.,1.,uS);',
    ' float h0=mix(.27,-.06,s);',
    ' float R=2.8*max(W,1.2);',
    ' vec2 c=vec2(W*.5+(uM.x-.5)*.03,h0-R);',
    ' vec2 q=p-c; float r=length(q); float d=r-R; float ang=atan(q.x,q.y)*R;',
    ' float up=max(d,0.); float th=clamp(up/.8,0.,1.);',
    ' vec3 sky=mix(vec3(.94,.80,.64),PAPER,pow(th,.5));',
    ' float sunx=exp(-ang*ang*.9);',
    ' float atm=exp(-up*5.5)*.6;',
    ' vec3 col=sky+WARM*atm*(.25+.75*sunx)*mix(.55,.38,uK)*(1.-s*.6);',
    ' col+=WARM*exp(-up*55.)*.32*sunx;',
    ' col=mix(col,PAPER,s*s*.85*smoothstep(.0,.6,up+.1));',
    ' col+=(h(fc+fract(uT)*91.)-.5)*.016;',
    ' if(d<0.){',
    '  float depth=-d;',
    '  float brushed=fbm(vec2(ang*4.8,depth*210.));',
    '  float grain=fbm(p*230.);',
    '  vec3 base=mix(vec3(.07,.062,.055),vec3(.13,.115,.10),brushed*.6+grain*.2);',
    '  float rim=exp(-depth*60.); float sheen=exp(-depth*8.)*(.35+.65*brushed);',
    '  vec3 sf=base+WARM*(rim*1.5+sheen*.32)*(.3+.7*sunx);',
    /* paper variant: the edge of a page, backlit by the dawn, its printed lines following the curve */
    '  if(uK>.5){',
    '   float fib=fbm(vec2(ang*30.,depth*90.))*.5+fbm(p*400.)*.5;',
    '   vec3 pap=mix(vec3(.93,.90,.84),vec3(.985,.97,.94),fib*.5+.35)*(1.-depth*.35);',
    '   float pd=depth*(1.+depth*6.);',
    '   float row=pd*150.; float ln=fract(row); float ri=floor(row);',
    '   float wsz=7.+ri*.9;',
    '   float wx=ang*wsz*6.+ri*3.7; float word=step(.34,n(vec2(floor(wx),ri*1.7)))*step(.12,fract(wx));',
    '   float ink=smoothstep(.22,.08,abs(ln-.5))*word*smoothstep(.36,.06,pd)*step(.012,depth);',
    '   pap=mix(pap,vec3(.22,.20,.17),ink*.42*(1.-exp(-depth*60.)));',
    '   float back=exp(-depth*34.)*(.35+.65*sunx);',
    '   pap+=WARM*back*.28; pap+=WARM*exp(-depth*260.)*.35*sunx;',
    '   sf=pap;',
    '  }',
    '  col=mix(col,sf,clamp(-d*uR.y*.8,0.,1.));',
    ' }',
    ' vec2 led=c+vec2(0.,R-.006); float ld=length(p-led); float pulse=.65+.35*sin(uT*1.7);',
    ' col+=WARM*(exp(-ld*ld*9000.)*1.1+exp(-ld*90.)*.16)*pulse*(1.-s);',
    ' gl_FragColor=vec4(max(col,0.),1.);',
    '}'].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  var pr = gl.createProgram();
  try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); }
  catch (e) { console.warn(e); document.documentElement.classList.add('no-gl'); return; }
  gl.linkProgram(pr); gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uR', 'uT', 'uS', 'uM', 'uK'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
  var hero = cv.closest('.hero');
  var KIND = hero.getAttribute('data-kind') === 'paper' ? 1 : 0;
  /* words on the arc: an SVG text path laid on the same circle the shader draws */
  var svg = hero.querySelector('.arc-words'), path = svg && svg.querySelector('path'), words = svg ? [].slice.call(svg.querySelectorAll('textPath')) : [];
  function arc(s, m) {
    if (!svg) return;
    var Wd = cv.clientWidth, Hd = cv.clientHeight, W = Wd / Hd;
    var ss = s * s * (3 - 2 * s), h0 = .27 + (-.06 - .27) * ss, R = 2.8 * Math.max(W, 1.2);
    var cx = (W * .5 + (m - .5) * .03) * Hd, cy = Hd - (h0 - R) * Hd, rr = (R + .018) * Hd;
    var a = Math.min(.9, (W * .6) / R);
    var x1 = cx - Math.sin(a) * rr, y1 = cy - Math.cos(a) * rr, x2 = cx + Math.sin(a) * rr, y2 = y1;
    svg.setAttribute('viewBox', '0 0 ' + Wd + ' ' + Hd);
    path.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1));
    svg.style.opacity = (1 - ss * 1.6).toFixed(3);
  }
  if (words.length) {
    var wi = 0, last = words.length - 1;
    var step = function () {
      words.forEach(function (w, i) { w.parentNode.classList.toggle('on', i === wi); });
      if (wi < last) { wi++; setTimeout(step, 1900); }
    };
    setTimeout(step, reduce ? 0 : 500);
    if (reduce) { wi = last; step(); }
  }
  var w = 0, hh = 0, S = 0, sS = 0, mx = .5, tx = .5;
  window.addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth; }, { passive: true });
  function size() {
    var W = cv.clientWidth, H = cv.clientHeight, k = Math.min(window.devicePixelRatio || 1, W * H > 2e6 ? 1 : 1.5);
    var nw = Math.round(W * k), nh = Math.round(H * k);
    if (nw !== w || nh !== hh) { w = cv.width = nw; hh = cv.height = nh; gl.viewport(0, 0, w, hh); }
  }
  var t0 = performance.now(), raf = 0;
  function frame(now) {
    raf = 0;
    var r = hero.getBoundingClientRect();
    if (r.bottom < 0) return;
    S = Math.max(0, Math.min(1, -r.top / (r.height * .85)));
    sS += (S - sS) * (reduce ? 1 : .1); mx += (tx - mx) * .04;
    size();
    gl.uniform2f(U.uR, w, hh); gl.uniform1f(U.uT, reduce ? 2 : (now - t0) / 1000); gl.uniform1f(U.uS, sS);
    gl.uniform2f(U.uM, reduce ? .5 : mx, .5);
    gl.uniform1f(U.uK, KIND);
    arc(sS, mx);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  kick();
})();
