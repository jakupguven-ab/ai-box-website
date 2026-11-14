/* The homepage's one continuous sky. A single fixed WebGL canvas runs from the hero to the montage; the scroll
   position (in viewport heights, Y) drives a camera timeline. Up close the horizon is the edge of the AI-Box at
   dawn; at dusk the camera pulls straight back to the Earth at night (real coastlines from Natural Earth, baked
   into assets/earth.webp), follows one question from Malmö to a datacentre in Virginia and back, then dives into
   the office, where at dawn the same question walks a few metres to the box. No libraries. */
(function () {
  var cv = document.getElementById('world-gl'), sec = document.querySelector('[data-world]');
  if (!cv || !sec) return;
  var hero = document.querySelector('.hero');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var sm = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  var mix = function (a, b, u) { return a + (b - a) * u; };
  var D2R = Math.PI / 180;

  /* ---------------- the camera timeline ---------------- */
  /* h0: horizon top (screen heights from the bottom) in macro view; rk: macro radius; z: 0 macro, 1 planet;
     dark; plan: planet surface; zm: planet zoom; fy: where the focus sits (screen heights from the bottom);
     lat/lon: free camera; fol: camera follows the question; hp: the question's progress in hops (0..5);
     back: the answer's way home (0..1); doc/red/hl/mini/dof: the document (shown, censored, highlighted,
     shrunk into the question, in the office); off: office drawn; trip: desk to box (0..1) and back (..2); sun. */
  var K = [
    [0.0, { h0: .27, rk: 2.8, dark: 0 }],
    [0.3, { h0: .33, rk: 2.2, dark: .55 }],
    [1.05, { z: 1, plan: 1, dark: 1, zm: 2.7, fy: .34, lat: 55.6, lon: 13, h0: .4 }],
    [1.4, { doc: 0 }],
    [1.65, { doc: 1, red: 0 }],
    [2.2, { red: 1 }],
    [2.45, { mini: 0 }],
    [2.8, { mini: 1, doc: 1, fol: 0 }],
    [2.95, { doc: 0, fol: 1, hp: 0, zm: 2.7 }],
    [3.4, { hp: 1, zm: 2.5 }],
    [3.85, { hp: 2, zm: 2.3 }],
    [4.3, { hp: 3, zm: 2.05 }],
    [5.05, { hp: 4, zm: 1.0, tp: .64 }],
    [5.55, { hp: 5, zm: 1.25 }],
    [6.05, { hp: 5, zm: 1.25, back: 0 }],
    [6.75, { back: 1, zm: 2.4, tp: .8 }],
    [7.05, { zm: 5, dark: .95 }],
    [7.45, { z: 0, plan: 0, zm: 5, h0: .5, rk: 4, dark: .62, sun: .2, off: 0, dof: 1, mini: 1 }],
    [7.85, { off: 1, mini: 0, doc: 1, red: 1, hl: 0 }],
    [8.1, { red: 1 }],
    [8.6, { red: 0, hl: 1, dark: .45, sun: .4 }],
    [8.95, { mini: 0 }],
    [9.25, { mini: 1, trip: 0 }],
    [9.75, { trip: 1 }],
    [10.15, { trip: 2, dark: .25, sun: .6 }],
    [10.45, { off: 1, dark: .08, sun: .85, h0: .5 }],
    [11.2, { off: .0, mini: 1, doc: 0 }],
    [11.45, { h0: -.06, rk: 2.8, dark: 0, sun: .35 }],
    [11.6, {}]
  ];
  var DEF = { tp: .8, h0: .27, rk: 2.8, z: 0, dark: 0, plan: 0, zm: 2.7, fy: .34, lat: 55.6, lon: 13, fol: 0, hp: 0, back: 0, doc: 0, red: 0, hl: 0, mini: 0, dof: 0, off: 0, trip: 0, sun: 0 };
  (function fill() { var cur = {}; for (var k in DEF) cur[k] = DEF[k]; K.forEach(function (kf) { for (var k in cur) if (!(k in kf[1])) kf[1][k] = cur[k]; cur = kf[1]; }); })();
  function at(Y) {
    if (Y <= K[0][0]) return K[0][1];
    for (var i = 0; i < K.length - 1; i++) {
      var a = K[i], b = K[i + 1];
      if (Y <= b[0]) { var u = sm(a[0], b[0], Y), o = {}; for (var k in a[1]) o[k] = a[1][k] + (b[1][k] - a[1][k]) * u; return o; }
    }
    return K[K.length - 1][1];
  }

  /* ---------------- the route: Malmö, Stockholm, Amsterdam, London, New Jersey, Ashburn ---------------- */
  function vec(lat, lon) { lat *= D2R; lon *= D2R; return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function slerp(a, b, u) {
    var d = Math.acos(clamp(dot(a, b), -1, 1)), s = Math.sin(d) || 1;
    var ka = Math.sin((1 - u) * d) / s, kb = Math.sin(u * d) / s; return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  }
  function latlon(v) { return [Math.asin(clamp(v[1], -1, 1)) / D2R, Math.atan2(v[0], v[2]) / D2R]; }
  var STOPS = [[55.605, 13.0], [59.33, 18.07], [52.37, 4.9], [51.51, -0.13], [40.2, -74.03], [39.04, -77.49]].map(function (s) { return vec(s[0], s[1]); });
  var NS = STOPS.length, NP = 48, ROUTE = [], CUM = [0], SIDX = [0];
  (function () {
    var ang = [], tot = 0;
    for (var i = 0; i < NS - 1; i++) { var d = Math.acos(dot(STOPS[i], STOPS[i + 1])); ang.push(d); tot += d; }
    var counts = ang.map(function (d) { return Math.max(4, Math.round((NP - 1) * d / tot)); }), sum = counts.reduce(function (a, b) { return a + b; }, 0);
    var big = ang.indexOf(Math.max.apply(null, ang)); counts[big] += (NP - 1) - sum;
    ROUTE.push({ p: STOPS[0], alt: 0 });
    for (var h = 0; h < NS - 1; h++) {
      for (var j = 1; j <= counts[h]; j++) { var u = j / counts[h]; ROUTE.push({ p: slerp(STOPS[h], STOPS[h + 1], u), alt: Math.sin(Math.PI * u) * (.006 + ang[h] * .07) }); }
      SIDX.push(ROUTE.length - 1);
    }
    for (var k = 1; k < ROUTE.length; k++) CUM.push(CUM[k - 1] + Math.acos(clamp(dot(ROUTE[k - 1].p, ROUTE[k].p), -1, 1)) * 6371);
  })();
  /* the question's position along the route, as a fractional point index, for hp in hops */
  function hpIdx(hp) { var i = Math.min(NS - 2, Math.floor(hp)), f = hp - i; return SIDX[i] + (SIDX[i + 1] - SIDX[i]) * f; }
  function routeAt(fi) { var i = Math.min(NP - 2, Math.floor(fi)), f = fi - i; return { p: slerp(ROUTE[i].p, ROUTE[i + 1].p, f), alt: mix(ROUTE[i].alt, ROUTE[i + 1].alt, f), km: mix(CUM[i], CUM[i + 1], f) }; }
  function proj(P, alt, lat, lon, cx, cy, R) {
    var b = lon * D2R, a = lat * D2R;
    var x = P[0] * Math.cos(b) - P[2] * Math.sin(b), z1 = P[0] * Math.sin(b) + P[2] * Math.cos(b);
    var y = P[1] * Math.cos(a) - z1 * Math.sin(a), z = P[1] * Math.sin(a) + z1 * Math.cos(a);
    var s = R * (1 + alt); return { x: cx + x * s, y: cy + y * s, v: sm(-.05, .12, z + alt) };
  }

  /* ---------------- WebGL ---------------- */
  var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { document.documentElement.classList.add('no-gl'); }
  var U = {};
  var FS = [
    'precision highp float;',
    'uniform vec2 uR; uniform float uT, uR0, uCx, uCy, uDark, uSun, uPlan, uPN, uLed, uTx, uBk;',
    'uniform vec2 uRot; uniform vec3 uPk; uniform vec3 uP[48]; uniform vec3 uN[6]; uniform sampler2D uE;',
    'const vec3 PAPER=vec3(.969,.957,.925); const vec3 INK=vec3(.035,.045,.07); const vec3 WARM=vec3(.95,.65,.35); const vec3 COLD=vec3(.62,.80,1.);',
    'float h(vec2 p){p=fract(p*vec2(.1031,.1030)); p+=dot(p,p.yx+33.33); return fract((p.x+p.y)*p.x);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+17.;a*=.5;}return s;}',
    'vec3 rotW(vec3 v){float a=-uRot.x;v=vec3(v.x,v.y*cos(a)-v.z*sin(a),v.y*sin(a)+v.z*cos(a));float b=uRot.y;return vec3(v.x*cos(b)+v.z*sin(b),v.y,-v.x*sin(b)+v.z*cos(b));}',
    'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float t=clamp(dot(pa,ba)/max(dot(ba,ba),1e-7),0.,1.);return length(pa-ba*t);}',
    /* one star per cell: a crisp core, a faint halo, a colour from blue-white to warm, a slow twinkle */
    'vec3 stars(vec2 p,float cell,float dens,float seed,float gain){',
    ' vec2 g=p/cell; vec2 id=floor(g); vec2 f=fract(g); float r=h(id+seed); if(r>dens) return vec3(0.);',
    ' vec2 c=vec2(h(id+seed+1.3),h(id+seed+7.1))*.7+.15; float d=length((f-c)*cell);',
    ' float m=h(id+seed+3.7); float b=.25+3.2*m*m*m*m;',
    ' float core=exp(-d*d*(1.6-m*.9)); float halo=exp(-d*1.1)*m*m*.35;',
    ' float tw=.82+.18*sin(uT*(.7+r*2.3)+r*61.);',
    ' vec3 col=mix(vec3(.72,.82,1.),vec3(1.,.86,.68),h(id+seed+9.));',
    ' return col*(core*b+halo)*tw*gain;}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float W=uR.x/uR.y; vec2 p=fc/uR.y; float px=1./uR.y;',
    ' float R=uR0; vec2 c=vec2(uCx,uCy);',
    ' vec2 q=p-c; float r=length(q); float d=r-R; float ang=atan(q.x,q.y);',
    ' float up=max(d,0.); float th=clamp(up/.85,0.,1.);',
    ' float dk=uDark*uDark*(3.-2.*uDark);',
    /* sky: paper and apricot by day, ember then slate then ink by night, deep space around the planet */
    ' vec3 lightSky=mix(vec3(.94,.80,.64),PAPER,sqrt(th));',
    ' vec3 nightSky=mix(vec3(.52,.30,.18),mix(vec3(.16,.21,.28),INK,smoothstep(.03,.6,th)),smoothstep(0.,.1,th));',
    ' vec2 sc=fc/uR-.5; vec3 space=mix(vec3(.012,.016,.032),vec3(.002,.003,.008),clamp(length(sc)*1.5,0.,1.));',
    ' nightSky=mix(nightSky,space,uPlan);',
    ' vec3 col=mix(lightSky,nightSky,dk);',
    ' col+=vec3(.26,.11,.02)*sin(clamp(uDark,0.,1.)*3.14159)*(1.-th*.65)*(1.-uPlan);',
    ' float sa=ang*R*.9; float sunx=exp(-sa*sa);',
    ' float atm=exp(-up*mix(5.5,7.,uDark))*(.5+.5*uDark);',
    ' col+=WARM*atm*(.18+.82*sunx)*mix(.4,1.,uDark)*(1.-uPlan)*(1.-uSun*.3);',
    ' col+=WARM*exp(-up*60.)*.35*sunx*(1.-uPlan);',
    /* the night sky: three layers of stars and a soft band of the Milky Way, drifting as the camera turns */
    ' float sk=max(dk,uPlan)*(1.-uSun*.9)*smoothstep(.0,.02,up+uPlan*.02);',
    ' if(sk>.01){ vec2 sp=fc+vec2(-uRot.y,uRot.x)*uR.y*.22;',
    '  vec3 st=stars(sp,9.,.10,1.,.55)+stars(sp,23.,.30,7.,.9)+stars(sp,61.,.55,13.,1.2);',
    '  vec2 bp=sp/uR.y; float bd=bp.y-.15-bp.x*.42; float band=exp(-bd*bd*9.);',
    '  float dust=fbm(bp*vec2(3.,5.)+3.)*fbm(bp*9.+7.); float rift=smoothstep(.35,.62,fbm(bp*vec2(6.,11.)+1.7));',
    '  vec3 mw=(vec3(.30,.32,.42)*dust*1.1+vec3(.42,.36,.30)*dust*dust)*band*(1.-rift*.7);',
    '  st+=stars(sp,5.,.35,21.,.35)*band*(.4+dust);',
    '  col+=(st+mw*.16)*sk*(1.-smoothstep(-.002,.0,-d)*uPlan); }',
    /* the planet's atmosphere hugging the limb */
    ' float sideL=.30+.70*smoothstep(-.6,.9,dot(normalize(q),normalize(vec2(.85,.42))));',
    ' col+=(vec3(.20,.44,1.)*exp(-up/R*22.)*.30+vec3(.55,.76,1.)*exp(-up/R*110.)*.45)*uPlan*sideL;',
    /* the sun at dawn: a disc rising behind the edge, bloom and slow rays */
    ' if(uSun>0.){vec2 sp2=c+vec2(0.,R+mix(-.06,.035,uSun)); vec2 sv=p-sp2; float sd=length(sv);',
    '  float ra=atan(sv.x,sv.y); float nr=n(vec2(ra*9.,uT*.07)); float rays=nr*nr*nr*exp(-sd*2.4)*smoothstep(0.,.02,d);',
    '  col+=vec3(1.,.86,.62)*(smoothstep(.03,.026,sd)*1.1+exp(-sd*sd*600.)*.5+exp(-sd*6.)*.24+rays*.35)*uSun*step(0.,d)*(1.-uPlan);',
    '  col=mix(col,col*vec3(1.04,1.,.95),uSun*.5);}',
    /* the surface: brushed metal up close, the Earth at night from afar */
    ' if(d<0.){',
    '  float depth=-d;',
    '  float brushed=fbm(vec2(ang*R*4.8,depth*210.)); float grain=fbm(p*230.);',
    '  vec3 base=mix(vec3(.07,.062,.055),vec3(.13,.115,.10),brushed*.6+grain*.2);',
    '  float rim=exp(-depth*60.); float sheen=exp(-depth*8.)*(.35+.65*brushed);',
    '  vec3 sf=base*mix(1.,.7,uDark)+WARM*(rim*1.55+sheen*.32)*(.3+.7*sunx)*(1.+uSun*.5);',
    '  if(uPlan>.002){',
    '   vec2 qq=q/R; float z=sqrt(max(0.,1.-dot(qq,qq))); vec3 nn=vec3(qq,z); vec3 w=rotW(nn);',
    '   float la=asin(clamp(w.y,-1.,1.)); float lo=atan(w.x,w.z); vec2 uv=vec2(lo/6.28318+.5,.5-la/3.14159);',
    '   vec3 E=texture2D(uE,uv).rgb*uTx; float land=E.r, shelf=E.g, lit=E.b;',
    '   float rel=fbm(uv*vec2(260.,130.));',
    '   vec3 ocean=vec3(.004,.010,.026)+vec3(.006,.022,.05)*shelf;',
    '   vec3 ground=vec3(.03,.033,.04)*(.6+.8*rel);',
    '   vec3 pc=mix(ocean,ground,land);',
    '   float edge=1.-abs(land*2.-1.); pc+=vec3(.10,.16,.26)*edge*edge*.75+vec3(.02,.04,.07)*shelf*(1.-land);',
    /* city lights: the population field broken into specks, brighter at the core of each metro */
    '   vec2 cg=uv*vec2(6400.,3200.); float s1=h(floor(cg)); float s2=h(floor(cg*.37)+3.); vec2 cf=fract(cg)-.5; float dotm=exp(-dot(cf,cf)*7.);',
    '   float speck=step(1.-lit*.9,s1)*(.4+.6*s2)*dotm;',
    '   vec3 city=vec3(1.,.72,.40)*(speck*(.5+lit)*1.3+lit*lit*.18+lit*.03);',
    '   pc+=city*land;',
    /* a thin sunlit crescent on the far side: dawn is coming */
    '   vec3 Ls=normalize(vec3(.62,.30,-.86)); float lam=dot(nn,Ls); float day=smoothstep(.0,.32,lam);',
    '   vec3 dayc=mix(vec3(.03,.09,.22)+vec3(.25,.4,.6)*pow(max(dot(reflect(-Ls,nn),vec3(0,0,1)),0.),40.)*.5,mix(vec3(.2,.19,.14),vec3(.32,.28,.2),rel),land)*(.25+1.1*max(lam,0.));',
    '   pc=mix(pc,dayc,day*.9);',
    '   pc*=smoothstep(0.,.10,z); float rimz=1.-z; pc+=mix(vec3(.16,.36,1.),vec3(.5,.75,1.),day)*rimz*rimz*rimz*rimz*rimz*rimz*(.45+.5*day);',
    '   sf=mix(sf,pc,uPlan);',
    '  }',
    '  col=mix(col,sf,clamp(-d*uR.y*.8,0.,1.));',
    ' }',
    /* the status light on the edge: the office, the box */
    ' vec2 led=c+vec2(0.,R-.006); float ld=length(p-led); float pulse=.6+.4*sin(uT*1.9);',
    ' col+=WARM*(exp(-ld*ld*9000.)*1.2+exp(-ld*90.)*.18)*pulse*uLed;',
    /* the route: a line of light hop by hop, the question (or the answer) at its head */
    ' if(uPN>0.){float pm=0.;',
    '  for(int i=0;i<47;i++){float fi=float(i); if(fi<uPN){',
    '   vec3 A=uP[i]; vec3 B=uP[i+1]; float k=clamp(uPN-fi,0.,1.); vec2 bb=mix(A.xy,B.xy,k);',
    '   float sd2=seg(p,A.xy,bb); float pul=.7+.3*sin(fi*.8-uT*4.);',
    '   pm+=(exp(-sd2*sd2/(px*px*2.2))*.9*pul+exp(-sd2*sd2*16000.)*.16+exp(-sd2*120.)*.03)*min(A.z,B.z);}}',
    '  col+=vec3(.78,.9,1.)*pm*smoothstep(.5,1.,uPlan);',
    '  for(int j=0;j<6;j++){ float nd=length(p-uN[j].xy); vec3 nc=j==0?WARM:COLD; col+=nc*(exp(-nd*nd*24000.)*1.5+exp(-nd*70.)*.10)*uN[j].z; }',
    '  float kd=length(p-uPk.xy); col+=mix(vec3(.9,.97,1.),vec3(1.,.86,.6),uBk)*(exp(-kd*kd*40000.)*2.4+exp(-kd*38.)*.28)*uPk.z;}',
    ' col+=(h(fc+fract(uT)*91.)-.5)*.014;',
    ' vec2 v=fc/uR-.5; col*=1.-dot(v,v)*.45*max(dk,uPlan);',
    ' gl_FragColor=vec4(max(col,0.),1.);',
    '}'].join('\n');
  var tex = null, texOn = 0;
  if (gl) {
    var sh = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    var pr = gl.createProgram();
    try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}')); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr); }
    catch (e) { console.warn(e); gl = null; document.documentElement.classList.add('no-gl'); }
  }
  if (gl) {
    var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var al = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
    'uR uT uR0 uCx uCy uDark uSun uPlan uPN uLed uTx uBk uRot uPk uE'.split(' ').forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    U.uP = gl.getUniformLocation(pr, 'uP[0]'); U.uN = gl.getUniformLocation(pr, 'uN[0]');
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U.uE, 0);
    var img = new Image(); img.decoding = 'async';
    img.onload = function () { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); texOn = performance.now(); kick(); };
    img.src = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/world\.js.*$/, '') : '/assets/') + 'earth.webp';
  }
  var PBUF = new Float32Array(NP * 3), NBUF = new Float32Array(NS * 3);

  /* ---------------- DOM pieces ---------------- */
  var lines = [].slice.call(sec.querySelectorAll('.line')).map(function (el) { return { el: el, y0: +el.dataset.y0, y1: +el.dataset.y1 }; });
  var sheet = sec.querySelector('.sheet-wrap');
  var cards = [].slice.call(sec.querySelectorAll('.hopc')), kmc = sec.querySelector('.kmc'), kmb = kmc.querySelector('b'), bk = sec.querySelector('.bk');
  var offW = sec.querySelector('.office-wrap'), off = offW.querySelector('.office'), trip = off.querySelector('.trip'), trail = off.querySelector('.trail');
  var opk = off.querySelector('.pk'), desk = off.querySelector('.desk'), obox = off.querySelector('.box'), mc = off.querySelector('.mc'), mcb = mc.querySelector('tspan');
  var tripL = 0;
  var arcSvg = hero && hero.querySelector('.arc-words'), arcPath = arcSvg && arcSvg.querySelector('path');
  var words = arcSvg ? [].slice.call(arcSvg.querySelectorAll('textPath')) : [];
  if (words.length) {
    var wi = 0, last = words.length - 1;
    var step = function () { words.forEach(function (w, i) { w.parentNode.classList.toggle('on', i === wi); }); if (wi < last) { wi++; setTimeout(step, 1900); } };
    if (reduce) { wi = last; step(); } else setTimeout(step, 500);
  }
  function cardSide(j, narrow) { return narrow ? (j % 2 ? 1 : -1) : [-1, 1, -1, -1, 1, 1][j]; }
  var fmt = function (v) { return Math.round(v).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'sv-SE'); };

  var w = 0, hh = 0, t0 = performance.now(), raf = 0, lastNow = 0, sY = -1, mx = .5, tx = .5, cam = null;
  addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth; }, { passive: true });
  function size() {
    var Wd = innerWidth, Hd = innerHeight, k = Math.min(window.devicePixelRatio || 1, Wd * Hd > 1.8e6 ? 1 : (Wd < 700 ? 1.25 : 1.5));
    var nw = Math.round(Wd * k), nh = Math.round(Hd * k);
    if (nw !== w || nh !== hh) { w = cv.width = nw; hh = cv.height = nh; if (gl) gl.viewport(0, 0, w, hh); }
  }
  function frame(now) {
    raf = 0;
    var Hd = innerHeight, Wd = innerWidth, W = Wd / Hd, narrow = Wd < 700;
    var Yt = scrollY / Hd;
    var secR = sec.getBoundingClientRect();
    var visible = secR.bottom > 0;
    /* past the end the sky scrolls away with the section as a painted copy of its last frame */
    var tail = secR.bottom < Hd - 1;
    if (sec.classList.contains('tail') !== tail) sec.classList.toggle('tail', tail);
    cv.style.visibility = visible && !tail ? 'visible' : 'hidden';
    if (!visible) { sY = Yt; return; }
    var dt = Math.min(.1, (now - (lastNow || now)) / 1000); lastNow = now;
    if (sY < 0 || reduce) sY = Yt; else sY += (Yt - sY) * (1 - Math.exp(-dt * 7));
    var Y = reduce ? (Yt < .6 ? 0 : 11.6) : sY, P = at(Y);
    var s = reduce ? 3 : (now - t0) / 1000;
    mx += (tx - mx) * .04;

    /* geometry: macro horizon <-> the planet, zoomed. The planet's top edge sits at topP; the camera tilts so the
       point it watches lands at fy (screen heights from the bottom), like looking down from a low orbit. */
    var zz = P.z, Rm = P.rk * Math.max(W, 1.2), Rp = Math.min(.44, W * .46) * P.zm;
    var R = Math.exp(Math.log(Rm) + (Math.log(Rp) - Math.log(Rm)) * zz);
    var topP = narrow ? P.tp - .1 : P.tp, fy = narrow ? P.fy + .04 : P.fy;
    var top = mix(P.h0, topP, sm(0, 1, zz)), cy = top - R;
    var cx = W * .5 + (mx - .5) * .02 * (1 - zz);
    var tilt = Math.asin(clamp((fy - cy) / R, -.97, .97)) / D2R;

    /* where the question is, and the camera: free, or following the question */
    var qIdx = P.back > 0 ? hpIdx(NS - 1) * (1 - P.back) : hpIdx(P.hp), Q = routeAt(qIdx), QL = latlon(Q.p);
    var tLat = mix(P.lat, QL[0], P.fol) - tilt, tLon = mix(P.lon, QL[1], P.fol);
    if (!cam || reduce) cam = [tLat, tLon]; else { var kk = 1 - Math.exp(-dt * 6); cam[0] += (tLat - cam[0]) * kk; cam[1] += (tLon - cam[1]) * kk; }
    var lat = cam[0], lon = cam[1];

    /* the route over the planet, the question, the stops */
    var pn = 0, pk = [0, 0, 0];
    if (P.plan > .01) {
      for (var i = 0; i < NP; i++) { var pt = proj(ROUTE[i].p, ROUTE[i].alt, lat, lon, cx, cy, R); PBUF[i * 3] = pt.x; PBUF[i * 3 + 1] = pt.y; PBUF[i * 3 + 2] = pt.v; }
      var reached = P.back > 0 ? NP - 1 : qIdx;
      pn = P.fol > .01 || P.back > 0 ? reached : 0;
      var qp = proj(Q.p, Q.alt, lat, lon, cx, cy, R);
      var moving = (P.fol > .5 && P.hp > .02 && P.hp < 4.98) || (P.back > .01 && P.back < .99);
      pk = [qp.x, qp.y, (moving ? 1 : .55) * qp.v * P.plan * (P.fol > .3 || P.back > 0 ? 1 : 0)];
      for (var j = 0; j < NS; j++) { var k = SIDX[j]; var on = j === 0 ? sm(.5, 1, P.plan) : sm(k - 1.2, k, reached); NBUF[j * 3] = PBUF[k * 3]; NBUF[j * 3 + 1] = PBUF[k * 3 + 1]; NBUF[j * 3 + 2] = on * PBUF[k * 3 + 2] * P.plan; }
      /* km: out, then home again */
      var km = P.back > 0 ? CUM[NP - 1] + (CUM[NP - 1] - Q.km) : Q.km;
      kmb.textContent = fmt(km);
      var kx = qp.x * Hd, ky = (1 - qp.y) * Hd;
      var cj = Math.min(NS - 1, Math.round(P.back > 0 ? NS - 1 : P.hp)), ks = cardSide(cj, narrow);
      kmc.style.transform = 'translate(' + (kx - ks * 14).toFixed(1) + 'px,' + (ky + 30).toFixed(1) + 'px) translate(' + (ks > 0 ? '-100%' : '0') + ',0)';
      kmc.style.opacity = (sm(.05, .3, P.hp + P.back) * P.plan * sm(.6, .9, P.fol + P.back)).toFixed(3);
      bk.style.transform = 'translate(' + kx.toFixed(1) + 'px,' + (ky - 20).toFixed(1) + 'px) translate(-50%,-100%)';
      bk.style.opacity = (sm(0, .1, P.back) * (1 - sm(.85, 1, P.back)) * P.plan).toFixed(3);
    } else { kmc.style.opacity = 0; bk.style.opacity = 0; for (var jj = 0; jj < NS; jj++) NBUF[jj * 3 + 2] = 0; }
    /* the hop cards: the current stop in full, earlier ones as their town only */
    cards.forEach(function (el, j) {
      var x = NBUF[j * 3] * Hd, y = (1 - NBUF[j * 3 + 1]) * Hd, vis = NBUF[j * 3 + 2];
      var cur = P.back > 0 ? 0 : sm(j - .45, j - .05, P.hp + (j === 0 ? .5 : 0)) * (1 - sm(j + .55, j + .95, P.hp));
      if (j === NS - 1) cur = P.back > 0 ? 1 - sm(0, .25, P.back) : sm(j - .45, j - .05, P.hp);
      if (j === 0 && P.fol < .5) cur = 0;
      var side = cardSide(j, narrow);
      el.classList.toggle('r', side > 0);
      el.style.transform = 'translate(' + (x + side * 16).toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(' + (side > 0 ? '0' : '-100%') + ',-50%)';
      el.style.setProperty('--cur', cur.toFixed(3));
      el.style.opacity = (vis * sm(.92, 1, P.plan) * cur).toFixed(3);
    });

    /* the lines, and the light/dark of the text */
    var tk = sm(.46, .62, P.dark) * (1 - P.plan) + P.plan;
    sec.style.setProperty('--dk', tk.toFixed(3));
    sec.style.setProperty('--tl', sm(11.0, 11.5, Y).toFixed(3));
    var act = null;
    lines.forEach(function (l) {
      var on = reduce ? 1 : sm(l.y0 - .25, l.y0 + .15, Y) * (1 - sm(l.y1 - .1, l.y1 + .25, Y));
      if (on > .5) act = l;
      l.el.style.opacity = on.toFixed(3);
      l.el.style.transform = reduce ? 'none' : 'translateY(' + ((1 - on) * (Y < l.y0 ? 16 : -16)).toFixed(1) + 'px)';
      l.el.style.filter = on > .98 || reduce ? 'none' : 'blur(' + ((1 - on) * 6).toFixed(1) + 'px)';
      l.el.style.visibility = on < .01 && !reduce ? 'hidden' : 'visible';
    });
    var textBottom = act ? act.el.getBoundingClientRect().bottom : Hd * .3;

    /* the office, drawn in light */
    offW.style.opacity = sm(0, .25, P.off).toFixed(3);
    offW.style.setProperty('--draw', P.off.toFixed(3));
    offW.style.visibility = P.off > .002 ? 'visible' : 'hidden';
    var deskR = null;
    if (P.off > .002) {
      if (!tripL) tripL = trip.getTotalLength();
      var tt = P.trip <= 1 ? P.trip : 2 - P.trip, te = tt * tt * (3 - 2 * tt), tp = trip.getPointAtLength(tripL * te);
      opk.setAttribute('cx', tp.x.toFixed(1)); opk.setAttribute('cy', tp.y.toFixed(1));
      opk.style.opacity = (sm(.0, .05, P.trip) * (1 - sm(1.95, 2, P.trip)) + (P.mini > .9 && P.trip < .01 && P.dof > .5 ? 1 : 0)) > 0 ? 1 : 0;
      trail.style.setProperty('--tr', te.toFixed(3));
      mcb.textContent = Math.round(9 * te);
      mc.setAttribute('x', (tp.x + 18).toFixed(1)); mc.setAttribute('y', (tp.y - 14).toFixed(1));
      mc.style.opacity = (sm(.02, .1, P.trip) * (1 - sm(1.9, 2, P.trip))).toFixed(3);
      obox.style.setProperty('--lit', (sm(.85, 1, P.trip) * (1 - sm(1.15, 1.5, P.trip)) + sm(10.3, 10.6, Y) * .6).toFixed(3));
      deskR = desk.getBoundingClientRect();
    }

    /* the document: over Malmö at dusk, at the desk at dawn; censored, then shrunk into the question */
    var dOn = P.doc * (1 - sm(.88, 1, P.mini));
    if (sheet) {
      sheet.style.opacity = dOn.toFixed(3);
      sheet.style.visibility = dOn > .002 ? 'visible' : 'hidden';
      if (dOn > .002) {
        var sw, bx, by, tx0, ty0;
        if (P.dof > .5 && deskR) {
          sw = Math.min(150, Wd * .28);
          tx0 = deskR.left + deskR.width / 2; ty0 = deskR.top + deskR.height / 2;
          bx = tx0; by = Math.min(ty0 - 12, Hd * .96);
        } else {
          var m0 = proj(STOPS[0], 0, lat, lon, cx, cy, R);
          tx0 = m0.x * Hd; ty0 = (1 - m0.y) * Hd;
          var room = Math.max(120, ty0 - textBottom - 40);
          sw = narrow ? Math.min(150, Wd * .4) : Math.max(120, Math.min(270, Wd * .52, room / 1.36));
          bx = Wd / 2 + (narrow ? 0 : Math.min(260, Wd * .2)); by = narrow ? textBottom + 22 + sw * 1.36 : Math.min(ty0 - 18, textBottom + 26 + sw * 1.36);
        }
        var mi = sm(0, 1, P.mini), sc = mix(1, .03, mi), x = mix(bx, tx0, mi), y = mix(by, ty0, mi);
        sheet.style.width = sw + 'px';
        sheet.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%) scale(' + sc.toFixed(4) + ')';
        sec.style.setProperty('--red', P.red.toFixed(3));
        sheet.style.setProperty('--hl', P.hl.toFixed(3));
      }
    }

    /* the hero's words on the arc follow the same edge */
    if (arcSvg && arcPath) {
      var hy = clamp(Y / .9, 0, 1), rr = (R + .018) * Hd, aa = Math.min(.9, (W * .6) / R);
      var X = cx * Hd, CY = (1 - cy) * Hd, x1 = X - Math.sin(aa) * rr, y1 = CY - Math.cos(aa) * rr, x2 = X + Math.sin(aa) * rr;
      arcSvg.setAttribute('viewBox', '0 0 ' + Wd + ' ' + Hd);
      arcPath.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 0 1 ' + x2.toFixed(1) + ' ' + y1.toFixed(1));
      arcSvg.style.opacity = (1 - hy * 2.2).toFixed(3);
    }

    if (gl) {
      size();
      gl.uniform2f(U.uR, w, hh); gl.uniform1f(U.uT, s); gl.uniform1f(U.uR0, R); gl.uniform1f(U.uCx, cx); gl.uniform1f(U.uCy, cy);
      gl.uniform1f(U.uDark, P.dark); gl.uniform1f(U.uSun, P.sun); gl.uniform1f(U.uPlan, P.plan);
      gl.uniform1f(U.uLed, (1 - P.plan) * (1 - P.sun * .6) * (1 - P.off));
      gl.uniform1f(U.uTx, texOn ? sm(0, 600, now - texOn) : 0); gl.uniform1f(U.uBk, sm(0, .05, P.back));
      gl.uniform2f(U.uRot, lat * D2R, lon * D2R);
      gl.uniform1f(U.uPN, P.plan > .5 ? pn : 0);
      if (P.plan > .01) { gl.uniform3fv(U.uP, PBUF); gl.uniform3fv(U.uN, NBUF); gl.uniform3f(U.uPk, pk[0], pk[1], pk[2]); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', function () { tripL = 0; kick(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  kick();
  window.__world = function (Y) { scrollTo({ top: Y * innerHeight, behavior: 'instant' }); sY = Y; cam = null; };
})();
