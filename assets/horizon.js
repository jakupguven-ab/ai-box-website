/* The horizon: one WebGL fragment shader behind the hero and the "stays here" story.
   A vast curved surface (the box, seen at macro scale) with a rim of warm light on its edge.
   Scrolling lifts the horizon and darkens the sky; in the story, motes of light (your documents)
   rise from the surface and always fall back inside the curve. No libraries. */
(function () {
  var cv = document.getElementById('horizon');
  if (!cv) return;
  var gl = cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) { document.documentElement.classList.add('no-gl'); return; }
  document.documentElement.classList.add('gl');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uR; uniform float uT, uS, uStory, uDark, uMesh; uniform vec2 uM;',
    'uniform vec3 uPaper, uInk, uWarm;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+17.;a*=.5;}return s;}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float asp=uR.x/uR.y; vec2 p=fc/uR.y;',
    ' float W=asp;',
    // horizon geometry: rises and curves more as you scroll
    ' float rise=smoothstep(0.,1.,uS);',
    ' float h0=mix(.26,.5,rise);',
    ' float R=mix(2.6,1.15,rise)*max(W,1.);',
    ' vec2 c=vec2(W*.5+(uM.x-.5)*.04, h0-R+(uM.y-.5)*.015);',
    ' vec2 q=p-c; float r=length(q); float d=r-R;',              // d<0 inside surface
    ' float ang=atan(q.x,q.y);',
    // sky: paper fading to ink as the story begins, warm atmosphere hugging the rim
    ' float up=max(d,0.);',
    ' float th=clamp(up/.85,0.,1.);',
    ' vec3 lightSky=mix(vec3(.93,.78,.62),uPaper,pow(th,.55));',              // apricot at the horizon, paper above
    ' vec3 dk=mix(vec3(.24,.33,.41),uInk,smoothstep(.04,.75,th));',
    ' vec3 darkSky=mix(vec3(.55,.32,.2),dk,smoothstep(0.,.10,th));',            // ember, slate, then night
    ' vec3 sky=mix(lightSky,darkSky,uDark);',
    ' float atm=exp(-up*mix(5.5,7.,uDark))*(.55+.45*uDark);',
    ' float sunx=exp(-pow(ang*mix(2.2,3.4,rise),2.));',             // light concentrated at the top of the arc
    ' vec3 col=sky+uWarm*atm*(.15+.85*sunx)*mix(.35,1.,uDark);',
    ' col+=uWarm*exp(-up*60.)*.35*sunx;',
    // film grain on the sky so the gradient never bands
    ' col+=(h(fc+fract(uT)*91.)-.5)*.018;',
    // the surface
    ' if(d<0.){',
    '  float depth=-d;',
    '  vec2 pol=vec2(ang*R*6.,depth*3.);',
    '  float brushed=fbm(vec2(pol.x*.8,pol.y*70.));',               // anisotropic machining marks along the curve
    '  float grain=fbm(p*220.);',
    '  vec3 base=mix(vec3(.055,.05,.047),vec3(.11,.10,.09),brushed*.6+grain*.2);',
    '  float rim=exp(-depth*mix(70.,45.,rise));',
    '  float sheen=exp(-depth*9.)*(.35+.65*brushed);',
    '  vec3 s=base+uWarm*(rim*1.6+sheen*.35)*(.35+.65*sunx);',
    // perforated vent mesh fades in at macro scale during the story
    '  vec2 g=p*vec2(48.,48.)*mix(1.,.6,uMesh); g.x+=mod(floor(g.y),2.)*.5;',
    '  float hole=smoothstep(.30,.24,length(fract(g)-.5));',
    '  float meshA=uMesh*smoothstep(.0,.25,depth);',
    '  s=mix(s,s*.25,hole*meshA);',
    '  s+=uWarm*hole*meshA*exp(-depth*3.)*.05;',
    '  float aa=clamp(-d*uR.y*.8,0.,1.);',
    '  col=mix(col,s,aa);',
    ' }',
    // the status light: a small warm point on the rim
    ' vec2 led=c+vec2(0.,R)+vec2(0.,-.006);',
    ' float ld=length(p-led);',
    ' float pulse=.6+.4*sin(uT*1.9);',
    ' col+=uWarm*(exp(-ld*ld*9000.)*1.2+exp(-ld*90.)*.18)*pulse*(1.-uStory*.6);',
    // the story: motes rise from the surface, arc, and fall back inside the curve
    ' if(uStory>0.){',
    '  float m=0.;',
    '  for(int i=0;i<48;i++){',
    '   float fi=float(i); float sd=h(vec2(fi,3.1));',
    '   float t=fract(uT*(.05+.05*h(vec2(fi,7.)))+sd);',
    '   float a0=(h(vec2(fi,1.))-.5)*1.5;',
    '   float a=a0+(h(vec2(fi,5.))-.5)*.25*t;',
    '   float hgt=sin(3.14159*t)*(.03+.17*h(vec2(fi,9.)));',          // peaks below the ceiling, never escapes
    '   vec2 mp=c+vec2(sin(a),cos(a))*(R+hgt-.004);',
    '   float md=length(p-mp);',
    '   m+=exp(-md*md*24000.)*(.6+.4*sin(fi+uT*3.))+exp(-md*140.)*.05;',
    '  }',
    '  col+=uWarm*m*uStory*1.3;',
    // the ceiling: a faint dashed arc the motes never cross
    '  float ceil=abs(d-.215);',
    '  float dash=step(.5,fract(ang*R*28.));',
    '  col+=uWarm*exp(-ceil*ceil*400000.)*.25*dash*uStory;',
    ' }',
    // vignette
    ' vec2 v=fc/uR-.5; col*=1.-dot(v,v)*.35*uDark;',
    ' gl_FragColor=vec4(pow(max(col,0.),vec3(1.)),1.);',
    '}'].join('\n');

  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  var pr = gl.createProgram();
  try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); }
  catch (e) { console.warn(e); document.documentElement.classList.remove('gl'); document.documentElement.classList.add('no-gl'); return; }
  gl.linkProgram(pr); gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uR', 'uT', 'uS', 'uStory', 'uDark', 'uMesh', 'uM', 'uPaper', 'uInk', 'uWarm'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });

  function hex(c) { c = c.trim().replace('#', ''); return [0, 2, 4].map(function (i) { return Math.pow(parseInt(c.substr(i, 2), 16) / 255, 1); }); }
  var css = getComputedStyle(document.documentElement);
  gl.uniform3fv(U.uPaper, hex(css.getPropertyValue('--hz-paper') || '#F7F4EE'));
  gl.uniform3fv(U.uInk, hex(css.getPropertyValue('--hz-ink') || '#0E0C0A'));
  gl.uniform3fv(U.uWarm, hex(css.getPropertyValue('--hz-warm') || '#F2A65A'));

  var hero = document.getElementById('top'), story = document.getElementById('story');
  var scale = Math.min(window.devicePixelRatio || 1, 1.5), w = 0, hgt = 0;
  function size() {
    var W = cv.clientWidth, H = cv.clientHeight;
    var s = (W * H > 2.2e6 ? 1 : scale);
    w = Math.round(W * s); hgt = Math.round(H * s);
    if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; gl.viewport(0, 0, w, hgt); }
  }
  var mx = .5, my = .5, tx = .5, ty = .5;
  window.addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; }, { passive: true });
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var sm = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

  // Scroll state: 0..1 through the hero, then the story's own progress.
  var S = 0, ST = 0, DK = 0, MS = 0, sS = 0, sST = 0, sDK = 0, sMS = 0;
  function read() {
    var vh = innerHeight;
    var hr = hero.getBoundingClientRect();
    S = clamp(-hr.top / (hr.height * .9), 0, 1);
    if (story) {
      var r = story.getBoundingClientRect();
      var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      var enter = clamp(1 - r.top / vh, 0, 1);
      DK = sm(.15, .85, enter);
      ST = sm(.18, .4, p) * (1 - sm(.92, 1, p));
      MS = sm(.55, .8, p) * (1 - sm(.95, 1, p));
      story.style.setProperty('--p', p.toFixed(4));
      document.documentElement.style.setProperty('--dark', DK.toFixed(3));
    }
    var past = story ? story.getBoundingClientRect().bottom < 0 : hr.bottom < 0;
    cv.style.visibility = past ? 'hidden' : 'visible';
    return !past;
  }
  var t0 = performance.now(), visible = true, raf = 0;
  function frame(now) {
    raf = 0;
    visible = read();
    var k = reduce ? 1 : .08;
    sS += (S - sS) * k; sST += (ST - sST) * k; sDK += (DK - sDK) * k; sMS += (MS - sMS) * k;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    if (!visible) return;
    size();
    gl.uniform2f(U.uR, w, hgt);
    gl.uniform1f(U.uT, reduce ? 2.0 : (now - t0) / 1000);
    gl.uniform1f(U.uS, sS); gl.uniform1f(U.uStory, sST); gl.uniform1f(U.uDark, sDK); gl.uniform1f(U.uMesh, sMS);
    gl.uniform2f(U.uM, reduce ? .5 : mx, reduce ? .5 : my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  kick();
})();
