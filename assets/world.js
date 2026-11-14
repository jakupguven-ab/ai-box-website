/* The homepage's one continuous sky. A single fixed WebGL canvas runs from the hero to the montage, and the
   scroll position (in viewport heights, Y) drives a camera timeline of keyframes. The horizon is the edge of the
   AI-Box seen so close it reads as a world; when the camera pulls back, it is the world. No libraries. */
(function () {
  var cv = document.getElementById('world-gl'), sec = document.querySelector('[data-world]');
  if (!cv || !sec) return;
  var hero = document.querySelector('.hero');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var sm = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  var D2R = Math.PI / 180;

  /* ---------------- the camera timeline ---------------- */
  /* h0: horizon top (screen heights from the bottom); rk: macro radius in widths; z: pull-back to the planet;
     dark, motes, leak (documents swept away), stream (the cold river), red (redaction), page, tow (towers),
     ceil (the dome), sun, plan (planet texture), draw (route drawn 0..1), lat/lon (planet view), hop, hl (highlight). */
  var K = [
    [0.0, { h0: .27, rk: 2.8, dark: 0, motes: 0 }],
    [0.95, { h0: .38, rk: 2.0, dark: .82, motes: .2 }],
    [1.45, { h0: .36, rk: 1.75, dark: 1, motes: 1 }],
    [2.35, { h0: .36, rk: 1.75, dark: 1, motes: 1 }],
    [2.85, { leak: 1, stream: 1, motes: .9 }],
    [3.7, { leak: 1, stream: 1, motes: .9 }],
    [4.15, { leak: 0, stream: .25, red: 1, page: 1, motes: .35 }],
    [4.95, { leak: 0, stream: .25, red: 1, page: 1, motes: .35 }],
    [5.45, { page: 0, tow: 1, red: 1, stream: .45, motes: .25, h0: .33 }],
    [6.25, { page: 0, tow: 1, red: 1, stream: .45, motes: .25, h0: .33 }],
    [7.05, { z: 1, plan: 1, tow: 0, stream: 0, motes: 0, lat: 36, lon: -8, draw: 0, red: 0 }],
    [8.2, { z: 1, plan: 1, lat: 40, lon: -62, draw: 1 }],
    [8.65, { z: 1, plan: 1, lat: 40, lon: -64, draw: 1 }],
    [9.45, { z: 0, plan: 0, lat: -34.4, lon: 13, draw: 1, h0: .3, rk: 1.75, dark: .82, hop: 1, motes: .2 }],
    [9.95, { ceil: 1, motes: 1, dark: .74, sun: .15, hop: 1 }],
    [10.6, { ceil: 1, motes: 1, dark: .7, sun: .2, hop: .5 }],
    [11.1, { dark: .36, sun: .55, page: 1, hl: 1, red: 0, hop: 0 }],
    [11.85, { dark: .32, sun: .65, page: 1, hl: 1, red: 0 }],
    [12.35, { dark: .1, sun: .85, page: 0, hl: 1 }],
    [13.0, { dark: .08, sun: .85, h0: .3 }],
    [13.35, { h0: -.06, rk: 2.8, dark: 0, sun: .35, motes: 0, ceil: 0 }],
    [13.6, {}]
  ];
  var DEF = { h0: .27, rk: 2.8, z: 0, dark: 0, motes: 0, leak: 0, stream: 0, red: 0, page: 0, tow: 0, ceil: 0, sun: 0, plan: 0, draw: 0, lat: 30, lon: -12, hop: 0, hl: 0 };
  (function fill() { var cur = {}; for (var k in DEF) cur[k] = DEF[k]; K.forEach(function (kf) { for (var k in cur) if (!(k in kf[1])) kf[1][k] = cur[k]; cur = kf[1]; }); })();
  function at(Y) {
    if (Y <= K[0][0]) return K[0][1];
    for (var i = 0; i < K.length - 1; i++) {
      var a = K[i], b = K[i + 1];
      if (Y <= b[0]) { var u = sm(a[0], b[0], Y), o = {}; for (var k in a[1]) o[k] = a[1][k] + (b[1][k] - a[1][k]) * u; return o; }
    }
    return K[K.length - 1][1];
  }

  /* ---------------- the planet route ---------------- */
  function vec(lat, lon) { lat *= D2R; lon *= D2R; return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]; }
  function slerp(a, b, u) {
    var d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)), s = Math.sin(d) || 1;
    var ka = Math.sin((1 - u) * d) / s, kb = Math.sin(u * d) / s; return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  }
  var STOPS = [[55.6, 13.0], [53.35, -6.26], [39.0, -77.5], [45.6, -121.2]].map(function (s) { return vec(s[0], s[1]); });
  var ROUTE = [], CUM = [0], NP = 40;
  (function () {
    var ang = [], tot = 0;
    for (var i = 0; i < 3; i++) { var a = STOPS[i], b = STOPS[i + 1], d = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]); ang.push(d); tot += d; }
    var counts = ang.map(function (d) { return Math.max(4, Math.round((NP - 1) * d / tot)); });
    counts[2] = NP - 1 - counts[0] - counts[1];
    ROUTE.push({ p: STOPS[0], alt: 0, hop: 0 });
    for (var h = 0; h < 3; h++) for (var j = 1; j <= counts[h]; j++) { var u = j / counts[h]; ROUTE.push({ p: slerp(STOPS[h], STOPS[h + 1], u), alt: Math.sin(Math.PI * u) * (.03 + ang[h] * .09), hop: h + 1, end: j === counts[h] }); }
    for (var k = 1; k < ROUTE.length; k++) { var A = ROUTE[k - 1].p, B = ROUTE[k].p; CUM.push(CUM[k - 1] + Math.acos(clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1)) * 6371); }
  })();
  function proj(P, alt, lat, lon, cx, cy, R) {
    var b = lon * D2R, a = lat * D2R;
    var x = P[0] * Math.cos(b) - P[2] * Math.sin(b), z1 = P[0] * Math.sin(b) + P[2] * Math.cos(b);
    var y = P[1] * Math.cos(a) - z1 * Math.sin(a), z = P[1] * Math.sin(a) + z1 * Math.cos(a);
    var s = R * (1 + alt); return { x: cx + x * s, y: cy + y * s, v: sm(-.12, .06, z + alt * 1.5) };
  }

  /* ---------------- WebGL ---------------- */
  var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { document.documentElement.classList.add('no-gl'); }
  var U = {};
  var FS = [
    'precision highp float;',
    'uniform vec2 uR; uniform float uT, uR0, uCy, uDark, uMot, uLeak, uStr, uTow, uCeil, uSun, uPlan, uSpr, uPN, uLed;',
    'uniform vec2 uRot; uniform vec3 uD0, uD1, uD2, uPk, uN0, uN1, uN2, uN3, uL0, uL1; uniform vec3 uP[40];',
    'const vec3 PAPER=vec3(.969,.957,.925); const vec3 INK=vec3(.035,.045,.07); const vec3 WARM=vec3(.95,.65,.35); const vec3 COLD=vec3(.62,.80,1.);',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),',
    '            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+17.;a*=.5;}return s;}',
    'float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.07+11.;a*=.5;}return s;}',
    'float mote(vec2 p,vec3 d){float md=length(p-d.xy);return (exp(-md*md*9000.)*1.4+exp(-md*55.)*.14)*d.z;}',
    'vec3 rotW(vec3 v){float a=-uRot.x;v=vec3(v.x,v.y*cos(a)-v.z*sin(a),v.y*sin(a)+v.z*cos(a));float b=uRot.y;return vec3(v.x*cos(b)+v.z*sin(b),v.y,-v.x*sin(b)+v.z*cos(b));}',
    'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float t=clamp(dot(pa,ba)/max(dot(ba,ba),1e-7),0.,1.);return length(pa-ba*t);}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float W=uR.x/uR.y; vec2 p=fc/uR.y; float px=1./uR.y;',
    ' float R=uR0; vec2 c=vec2(W*.5,uCy);',
    ' vec2 q=p-c; float r=length(q); float d=r-R; float ang=atan(q.x,q.y);',
    ' float up=max(d,0.); float th=clamp(up/.85,0.,1.);',
    ' float dk=pow(uDark,1.7);',
    /* sky: paper and apricot by day, ember then slate then ink by night, deep space around the planet */
    ' vec3 lightSky=mix(vec3(.94,.80,.64),PAPER,sqrt(max(th,0.)));',
    ' vec3 nightSky=mix(vec3(.52,.30,.18),mix(vec3(.22,.30,.38),INK,smoothstep(.03,.7,th)),smoothstep(0.,.1,th));',
    ' vec2 sc=fc/uR-.5; vec3 space=mix(vec3(.018,.025,.05),vec3(.004,.006,.014),clamp(length(sc)*1.6,0.,1.));',
    ' nightSky=mix(nightSky,space,uPlan);',
    ' vec3 col=mix(lightSky,nightSky,dk);',
    ' col+=vec3(.26,.11,.02)*sin(uDark*3.14159)*(1.-th*.65)*(1.-uPlan);',
    ' float sa=ang*R*.9; float sunx=exp(-sa*sa);',
    ' float atm=exp(-up*mix(5.5,7.,uDark))*(.5+.5*uDark);',
    ' col+=WARM*atm*(.18+.82*sunx)*mix(.4,1.,uDark)*(1.-uPlan)*(1.-uSun*.3);',
    ' col+=WARM*exp(-up*60.)*.35*sunx*(1.-uPlan);',
    /* stars and a faint galactic band at night and in space */
    ' vec2 sg=floor(fc/2.6); float st=step(.9972,h(sg))*smoothstep(.1,.45,th)*max(dk,uPlan);',
    ' col+=vec3(.9,.9,1.)*st*(.45+.55*sin(uT*1.7+h(sg)*40.));',
    ' float gal=fbm(vec2(p.x*1.4+p.y*.8,p.y*3.-p.x*.6))*exp(-(p.y-.62-p.x*.18)*(p.y-.62-p.x*.18)*14.);',
    ' col+=vec3(.35,.4,.55)*gal*.05*uPlan;',
    /* the planet's atmosphere hugging the limb */
    ' float sideL=.35+.65*smoothstep(-.6,.9,dot(normalize(q),normalize(vec2(.85,.42))));',
    ' col+=(vec3(.22,.46,1.)*exp(-up/R*22.)*.32+vec3(.55,.76,1.)*exp(-up/R*95.)*.4)*uPlan*sideL;',
    /* the sun at dawn: a disc rising behind the edge, bloom and slow rays */
    ' if(uSun>0.){vec2 sp=c+vec2(0.,R+mix(-.06,.035,uSun)); vec2 sv=p-sp; float sd=length(sv);',
    '  float ra=atan(sv.x,sv.y); float rays=pow(n(vec2(ra*9.,uT*.07)),3.)*exp(-sd*2.4)*smoothstep(0.,.02,d);',
    '  col+=vec3(1.,.86,.62)*(smoothstep(.03,.026,sd)*1.1+exp(-sd*sd*600.)*.5+exp(-sd*6.)*.24+rays*.35)*uSun*step(0.,d);',
    '  col=mix(col,col*vec3(1.04,1.,.95),uSun*.5);}',
    /* problem one: a cold river of light across the sky that carries documents away */
    ' if(uStr>0.){float top=c.y+R; float ys=top+.115+.045*sin(p.x*1.6+uT*.22)+.025*sin(p.x*4.3-uT*.37); float dy=p.y-ys;',
    '  float band=exp(-dy*dy*300.); float wide=exp(-dy*dy*24.);',
    '  float flow=fbm(vec2(p.x*2.2-uT*.55,p.y*10.+sin(p.x*2.6+uT*.2)*.6));',
    '  float fil=pow(fbm(vec2(p.x*7.-uT*1.6,dy*70.+p.x*.5)),2.2);',
    '  col+=mix(COLD,vec3(.55,.62,1.),.3)*(band*(.12+.55*flow)+fil*band*.9+wide*.05)*uStr;}',
    /* problem three: datacentre towers rising on the far horizon, cold windows, blinking lights */
    ' if(uTow>0.){for(int i=0;i<11;i++){float fi=float(i);',
    '  float ai=uSpr*(.42+.055*fi)+(h(vec2(fi,2.))-.5)*.02; float w=.009+.018*h(vec2(fi,4.)); float hh=(.025+.10*pow(h(vec2(fi,6.)),1.5))*uTow;',
    '  float s=(ang-ai)*R;',
    '  if(abs(s)<w*.5&&d>-.003&&d<hh){float haze=smoothstep(.03,0.,d)*.6+.3; vec3 tc=mix(vec3(.025,.03,.045),col,haze); vec2 gw=vec2((s+w*.5)*420.,d*330.);',
    '   float lit=step(.6,h(floor(gw)+fi*9.))*step(.45,fract(gw.x))*step(.5,fract(gw.y))*(.75+.25*sin(uT*.6+h(floor(gw))*20.));',
    '   float edgeL=smoothstep(.0,.0015,w*.5-abs(s));',
    '   tc+=COLD*lit*.45*(1.-haze*.5); col=mix(col,tc,edgeL);}',
    '  vec2 tl=c+vec2(sin(ai),cos(ai))*(R+hh+.0035); float tld=length(p-tl);',
    '  col+=vec3(1.,.25,.18)*(exp(-tld*tld*60000.)*1.6+exp(-tld*90.)*.12)*step(.0,sin(uT*2.4+fi*1.3))*uTow;}}',
    /* the surface: brushed metal up close, the night side of the planet from afar */
    ' if(d<0.){',
    '  float depth=-d;',
    '  float brushed=fbm(vec2(ang*R*4.8,depth*210.)); float grain=fbm(p*230.);',
    '  vec3 base=mix(vec3(.07,.062,.055),vec3(.13,.115,.10),brushed*.6+grain*.2);',
    '  float rim=exp(-depth*60.); float sheen=exp(-depth*8.)*(.35+.65*brushed);',
    '  vec3 sf=base*mix(1.,.7,uDark)+WARM*(rim*1.55+sheen*.32)*(.3+.7*sunx)*(1.+uSun*.5);',
    '  if(uPlan>.002){',
    '   vec2 qq=q/R; float z=sqrt(max(0.,1.-dot(qq,qq))); vec3 nn=vec3(qq,z); vec3 w=rotW(nn);',
    '   float land=fbm3(w*2.3)+.13*(fbm3(w*8.)-.5)+.3*exp(-dot(w-uL0,w-uL0)*60.)+.3*exp(-dot(w-uL1,w-uL1)*60.);',
    '   float coast=smoothstep(.535,.545,land); land=smoothstep(.53,.56,land);',
    '   float relief=fbm3(w*11.); vec3 pc=mix(vec3(.004,.011,.03),vec3(.03,.032,.034)*(.55+.9*relief),land);',
    '   float dens=smoothstep(.42,.72,fbm3(w*6.+4.));',
    '   vec3 cg=w*95.; vec3 cf=fract(cg)-.5; float hc=h3(floor(cg));',
    '   float cl=step(1.-.5*dens-.04,hc)*land; pc+=vec3(1.,.72,.4)*cl*exp(-dot(cf,cf)*26.)*1.4;',
    '   vec3 cg2=w*260.; float cl2=step(1.-.5*dens,h3(floor(cg2)))*land; vec3 cf2=fract(cg2)-.5; pc+=vec3(1.,.78,.5)*cl2*exp(-dot(cf2,cf2)*20.)*.7;',
    '   pc+=vec3(1.,.66,.32)*dens*dens*land*.16+vec3(.1,.16,.28)*(coast-land)*.5;',
    /* a thin sunlit crescent on the far side: dawn is coming */
    '   vec3 Ls=normalize(vec3(.72,.38,-.58)); float lam=dot(nn,Ls); float day=smoothstep(.0,.32,lam);',
    '   vec3 dayc=mix(vec3(.03,.09,.22)+vec3(.25,.4,.6)*pow(max(dot(reflect(-Ls,nn),vec3(0,0,1)),0.),40.)*.5,mix(vec3(.2,.19,.14),vec3(.32,.28,.2),relief),land)*(.25+1.1*max(lam,0.));',
    '   pc=mix(pc,dayc,day*.9);',
    '   pc*=smoothstep(0.,.14,z); pc+=mix(vec3(.18,.38,1.),vec3(.5,.75,1.),day)*pow(1.-z,6.)*(.4+.5*day);',
    '   sf=mix(sf,pc,uPlan);',
    '  }',
    '  col=mix(col,sf,clamp(-d*uR.y*.8,0.,1.));',
    ' }',
    /* the status light on the edge: the office, the box */
    ' vec2 led=c+vec2(0.,R-.006); float ld=length(p-led); float pulse=.6+.4*sin(uT*1.9);',
    ' col+=WARM*(exp(-ld*ld*9000.)*1.2+exp(-ld*90.)*.18)*pulse*uLed;',
    /* documents as light: rise from the edge, peak under the dome, fall back in; or get swept away */
    ' if(uMot>0.){',
    '  float m=0.;',
    '  for(int i=0;i<46;i++){',
    '   float fi=float(i); float sd=h(vec2(fi,3.1));',
    '   float t=fract(uT*(.05+.05*h(vec2(fi,7.)))+sd);',
    '   float a=((h(vec2(fi,1.))-.5)*2.*uSpr)+(h(vec2(fi,5.))-.5)*.2*t;',
    '   float hgt=sin(3.14159*min(1.,t*mix(1.,1.7,uLeak)))*(.02+.17*h(vec2(fi,9.)))*(1.+uLeak*1.1)+uLeak*smoothstep(.45,.75,t)*.12;',
    '   vec2 mp=c+vec2(sin(a),cos(a))*(R+max(0.,hgt)-.004); mp.x+=uLeak*pow(smoothstep(.5,1.,t),1.6)*1.4;',
    '   float esc=1.-uLeak*smoothstep(.8,1.,t);',
    '   float md=length(p-mp);',
    '   m+=(exp(-md*md*26000.)*(.55+.45*sin(fi+uT*3.))+exp(-md*150.)*.045)*esc;',
    '  }',
    '  m+=mote(p,uD0)+mote(p,uD1)+mote(p,uD2);',
    '  col+=mix(WARM,mix(WARM,COLD,.55),uLeak*.6)*m*uMot*1.25;',
    ' }',
    /* the dome: a glass hemisphere of light the documents never cross */
    ' if(uCeil>0.){float dr=R+.215; float dd=r-dr; float a2=ang*R;',
    '  float edge=exp(-dd*dd*90000.); float film=smoothstep(.0,-.05,dd)*smoothstep(-.215,-.12,dd);',
    '  float sq=(a2+.18)*5.; float spec=exp(-sq*sq)*exp(-dd*dd*12000.);',
    '  col+=WARM*edge*.55*uCeil+vec3(1.,.9,.75)*spec*.5*uCeil+WARM*film*.035*uCeil*(.7+.3*n(vec2(a2*6.,uT*.3)));}',
    /* the route: a cold line of light across the planet, hop by hop, with the question at its head */
    ' if(uPN>0.){float pm=0.;',
    '  for(int i=0;i<39;i++){float fi=float(i); if(fi<uPN){',
    '   vec3 A=uP[i]; vec3 B=uP[i+1]; float k=clamp(uPN-fi,0.,1.); vec2 bb=mix(A.xy,B.xy,k);',
    '   float sd2=seg(p,A.xy,bb); float pul=.65+.35*sin(fi*.9-uT*5.);',
    '   pm+=(exp(-sd2*sd2/(px*px*2.6))*.85*pul+exp(-sd2*sd2*9000.)*.18+exp(-sd2*80.)*.04)*min(A.z,B.z);}}',
    '  col+=vec3(.78,.9,1.)*pm*smoothstep(.5,1.,uPlan);',
    '  float nd; nd=length(p-uN0.xy); col+=WARM*(exp(-nd*nd*20000.)*1.6+exp(-nd*60.)*.12)*uN0.z;',
    '  nd=length(p-uN1.xy); col+=COLD*(exp(-nd*nd*30000.)*1.3+exp(-nd*80.)*.08)*uN1.z;',
    '  nd=length(p-uN2.xy); col+=COLD*(exp(-nd*nd*30000.)*1.3+exp(-nd*80.)*.08)*uN2.z;',
    '  nd=length(p-uN3.xy); col+=COLD*(exp(-nd*nd*20000.)*1.8+exp(-nd*50.)*.15)*uN3.z;',
    '  nd=length(p-uPk.xy); col+=vec3(.9,.97,1.)*(exp(-nd*nd*40000.)*2.2+exp(-nd*40.)*.25)*uPk.z;}',
    ' col+=(h(fc+fract(uT)*91.)-.5)*.016;',
    ' vec2 v=fc/uR-.5; col*=1.-dot(v,v)*.4*max(dk,uPlan);',
    ' gl_FragColor=vec4(max(col,0.),1.);',
    '}'].join('\n');
  if (gl) {
    var sh = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    var pr = gl.createProgram();
    try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}')); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr); }
    catch (e) { console.warn(e); gl = null; document.documentElement.classList.add('no-gl'); }
  }
  if (gl) {
    var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var al = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
    'uR uT uR0 uCy uDark uMot uLeak uStr uTow uCeil uSun uPlan uSpr uPN uLed uRot uD0 uD1 uD2 uPk uN0 uN1 uN2 uN3 uL0 uL1'.split(' ').forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    U.uP = gl.getUniformLocation(pr, 'uP[0]');
    gl.uniform3fv(U.uL0, STOPS[0]); gl.uniform3fv(U.uL1, STOPS[3]);
  }
  var PBUF = new Float32Array(NP * 3);

  /* ---------------- DOM pieces ---------------- */
  var lines = [].slice.call(sec.querySelectorAll('.line')).map(function (el) { return { el: el, y0: +el.dataset.y0, y1: +el.dataset.y1 }; });
  var docs = [].slice.call(sec.querySelectorAll('.doc'));
  var sheet = sec.querySelector('.sheet-wrap'), nodes = [].slice.call(sec.querySelectorAll('.node')), kmc = sec.querySelector('.kmc'), kmb = kmc && kmc.querySelector('b');
  var hop = sec.querySelector('.hop'), hopP = hop.querySelector('path'), hopK = hop.querySelector('.pk'), hopO = hop.querySelector('.o'), hopB = hop.querySelector('.b'), hopC = hop.querySelector('.cap');
  var arcSvg = hero && hero.querySelector('.arc-words'), arcPath = arcSvg && arcSvg.querySelector('path');
  var words = arcSvg ? [].slice.call(arcSvg.querySelectorAll('textPath')) : [];
  if (words.length) {
    var wi = 0, last = words.length - 1;
    var step = function () { words.forEach(function (w, i) { w.parentNode.classList.toggle('on', i === wi); }); if (wi < last) { wi++; setTimeout(step, 1900); } };
    if (reduce) { wi = last; step(); } else setTimeout(step, 500);
  }
  var fmt = function (v) { return Math.round(v).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB' : 'sv-SE'); };
  var DOCS = [{ a: -.62, per: 7.4, off: 0, hg: .16 }, { a: .05, per: 8.2, off: 2.6, hg: .19 }, { a: .58, per: 7.8, off: 5.1, hg: .13 }];

  var w = 0, hh = 0, t0 = performance.now(), raf = 0, lastNow = 0, sY = -1, mx = .5, tx = .5;
  addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth; }, { passive: true });
  function size() {
    var Wd = innerWidth, Hd = innerHeight, k = Math.min(window.devicePixelRatio || 1, Wd * Hd > 1.8e6 ? 1 : (Wd < 700 ? 1.25 : 1.5));
    var nw = Math.round(Wd * k), nh = Math.round(Hd * k);
    if (nw !== w || nh !== hh) { w = cv.width = nw; hh = cv.height = nh; if (gl) gl.viewport(0, 0, w, hh); }
  }
  function frame(now) {
    raf = 0;
    var Hd = innerHeight, Wd = innerWidth, W = Wd / Hd;
    var Yt = scrollY / Hd, endY = +sec.dataset.end;
    var secR = sec.getBoundingClientRect();
    var visible = secR.bottom > 0;
    /* past the end the sky scrolls away with the section as a painted copy of its last frame, so the hand-off
       to the next section never depends on a fixed canvas being half covered */
    var tail = secR.bottom < Hd - 1;
    if (sec.classList.contains('tail') !== tail) sec.classList.toggle('tail', tail);
    cv.style.visibility = visible && !tail ? 'visible' : 'hidden';
    if (!visible) { sY = Yt; return; }
    var dt = Math.min(.1, (now - (lastNow || now)) / 1000); lastNow = now;
    if (sY < 0 || reduce) sY = Yt; else sY += (Yt - sY) * (1 - Math.exp(-dt * 7));
    var Y = reduce ? (Yt < .6 ? 0 : 13.6) : sY, P = at(Y);
    var s = reduce ? 3 : (now - t0) / 1000;
    mx += (tx - mx) * .04;

    /* geometry: macro horizon <-> whole planet */
    var Rm = P.rk * Math.max(W, 1.2), Rp = Math.min(.42, W * .47), zz = P.z;
    var R = Math.exp(Math.log(Rm) + (Math.log(Rp) - Math.log(Rm)) * zz);
    var top = P.h0 + ((W < .8 ? .52 : .58) - P.h0) * sm(0, 1, zz);
    var cy = top - R, cx = W * .5 + (mx - .5) * .02 * (1 - zz);
    var spread = Math.asin(Math.min(1, W * (W < .8 ? .3 : .42) / R));

    /* documents with names */
    var dv = DOCS.map(function (d) {
      var tt = ((s + d.off) / d.per) % 1, a = d.a * spread, k = Math.sin(Math.PI * Math.min(1, tt * (1 + P.leak * .7)));
      var hgt = k * d.hg * (1 + P.leak * 1.1) + P.leak * sm(.45, .75, tt) * .12, r = R + Math.max(0, hgt) - .004;
      var x = cx + Math.sin(a) * r + P.leak * Math.pow(sm(.5, 1, tt), 1.6) * 1.4, y = cy + Math.cos(a) * r;
      return { x: x, y: y, k: Math.max(0, k) * (1 - P.leak * sm(.8, 1, tt)) };
    });
    docs.forEach(function (el, j) {
      var v = dv[j];
      el.style.transform = 'translate(' + (v.x * Hd).toFixed(1) + 'px,' + ((1 - v.y) * Hd - 22).toFixed(1) + 'px) translate(-50%,-100%)';
      el.style.opacity = (Math.min(1, v.k * 2.2) * sm(.45, .9, P.motes) * (1 - P.plan) * (1 - P.page) * (1 - P.leak * .85)).toFixed(3);
    });
    sec.style.setProperty('--red', P.red.toFixed(3));

    /* the route over the planet */
    var pn = 0, pk = [0, 0, 0], nodeV = [];
    if (P.plan > .01) {
      for (var i = 0; i < NP; i++) { var pt = proj(ROUTE[i].p, ROUTE[i].alt, P.lat, P.lon, cx, cy, R); PBUF[i * 3] = pt.x; PBUF[i * 3 + 1] = pt.y; PBUF[i * 3 + 2] = pt.v; }
      pn = P.draw * (NP - 1);
      var hi = Math.min(NP - 2, Math.floor(pn)), hf = pn - hi;
      pk = [PBUF[hi * 3] + (PBUF[hi * 3 + 3] - PBUF[hi * 3]) * hf, PBUF[hi * 3 + 1] + (PBUF[hi * 3 + 4] - PBUF[hi * 3 + 1]) * hf, (P.draw > 0 && P.draw < 1 ? 1 : 0) * P.plan];
      var stopIdx = [0]; ROUTE.forEach(function (r, k) { if (r.end) stopIdx.push(k); });
      nodeV = stopIdx.map(function (k, j) { var on = j === 0 ? 1 : sm(k - 1.5, k, pn); return [PBUF[k * 3], PBUF[k * 3 + 1], on * PBUF[k * 3 + 2] * P.plan]; });
      var km = CUM[Math.min(NP - 1, Math.floor(pn))] + (CUM[Math.min(NP - 1, Math.floor(pn) + 1)] - CUM[Math.min(NP - 1, Math.floor(pn))]) * (pn - Math.floor(pn));
      if (kmb) kmb.textContent = fmt(km);
      kmc.style.transform = 'translate(' + (pk[0] * Hd).toFixed(1) + 'px,' + ((1 - pk[1]) * Hd + 18).toFixed(1) + 'px) translate(-50%,0)';
      kmc.style.opacity = (sm(.02, .1, P.draw) * P.plan * (P.draw >= 1 ? .85 : 1)).toFixed(3);
      if (P.draw >= 1) kmc.style.transform = 'translate(' + (nodeV[3][0] * Hd).toFixed(1) + 'px,' + ((1 - nodeV[3][1]) * Hd + 18).toFixed(1) + 'px) translate(-50%,0)';
    } else { kmc.style.opacity = 0; }
    nodes.forEach(function (el, j) {
      var v = nodeV[j]; if (!v) { el.style.opacity = 0; return; }
      var nw = Wd < 700, off = [['-15%', '-100%', 0, -14], nw ? ['-100%', '0', -10, 10] : ['0', '-50%', 14, 0], ['-50%', '0', 0, 16], nw ? ['-10%', '-100%', 0, -14] : ['-90%', '-100%', 0, -14]][j];
      el.style.transform = 'translate(' + (v[0] * Hd + off[2]).toFixed(1) + 'px,' + ((1 - v[1]) * Hd + off[3]).toFixed(1) + 'px) translate(' + off[0] + ',' + off[1] + ')';
      el.style.opacity = (v[2] * sm(.85, 1, P.plan)).toFixed(3); 
    });

    /* the page that gets washed, then highlighted */
    var horizonPx = (1 - top) * Hd;
    if (sheet) {
      var act = lines.filter(function (l) { return Y > l.y0 - .3 && Y < l.y1 + .3; })[0], tb = act ? act.el.getBoundingClientRect().bottom : Hd * .4;
      var sw = Math.max(120, Math.min(280, Wd * .62, (horizonPx - tb - 24) / 1.36 * 1.25)), rise = sm(0, 1, P.page);
      sheet.style.width = sw + 'px';
      sheet.style.transform = 'translate(-50%,' + (horizonPx - sw * 1.36 * (.1 + .7 * rise) - 6).toFixed(1) + 'px)';
      sheet.style.opacity = rise.toFixed(3);
      sheet.style.setProperty('--hl', P.hl.toFixed(3));
    }

    /* the box, a few metres from the desk */
    var hopOn = P.hop * (1 - P.plan);
    hop.style.opacity = hopOn.toFixed(3);
    if (hopOn > .01) {
      hop.setAttribute('viewBox', '0 0 ' + Wd + ' ' + Hd);
      var ledX = cx * Hd, ledY = (1 - (cy + R)) * Hd, ox = ledX - Math.min(230, Wd * .3), oy = (1 - (cy + Math.cos(Math.asin((ox / Hd - cx) / R)) * R)) * Hd;
      hopO.setAttribute('transform', 'translate(' + ox.toFixed(1) + ' ' + (oy - 2).toFixed(1) + ')');
      hopB.setAttribute('transform', 'translate(' + ledX.toFixed(1) + ' ' + (ledY - 12).toFixed(1) + ')');
      var mxp = (ox + ledX) / 2, myp = Math.min(oy, ledY) - 70;
      hopP.setAttribute('d', 'M' + ox.toFixed(1) + ' ' + (oy - 6).toFixed(1) + ' Q' + mxp.toFixed(1) + ' ' + myp.toFixed(1) + ' ' + ledX.toFixed(1) + ' ' + (ledY - 22).toFixed(1));
      var L = hopP.getTotalLength(), u = (now / 1500) % 1, b = u < .5 ? u * 2 : 2 - u * 2, hq = hopP.getPointAtLength(L * (b * b * (3 - 2 * b)));
      hopK.setAttribute('cx', hq.x.toFixed(1)); hopK.setAttribute('cy', hq.y.toFixed(1));
      hopC.setAttribute('x', mxp.toFixed(1)); hopC.setAttribute('y', (myp - 14).toFixed(1));
    }

    /* the lines, and the light/dark of the text */
    var tk = sm(.46, .62, P.dark) * (1 - P.plan) + P.plan;
    sec.style.setProperty('--dk', tk.toFixed(3));
    sec.style.setProperty('--tl', sm(12.9, 13.5, Y).toFixed(3));
    lines.forEach(function (l, j) {
      var on = reduce ? 1 : sm(l.y0 - .25, l.y0 + .15, Y) * (1 - sm(l.y1 - .1, l.y1 + .25, Y));
      l.el.style.opacity = on.toFixed(3);
      l.el.style.transform = reduce ? 'none' : 'translateY(' + ((1 - on) * (Y < l.y0 ? 16 : -16)).toFixed(1) + 'px)';
      l.el.style.filter = on > .98 || reduce ? 'none' : 'blur(' + ((1 - on) * 6).toFixed(1) + 'px)';
      l.el.style.visibility = on < .01 && !reduce ? 'hidden' : 'visible';
    });

    /* the hero's words on the arc follow the same edge */
    if (arcSvg) {
      var hy = clamp(Y / .9, 0, 1), rr = (R + .018) * Hd, aa = Math.min(.9, (W * .6) / R);
      var X = cx * Hd, CY = (1 - cy) * Hd, x1 = X - Math.sin(aa) * rr, y1 = CY - Math.cos(aa) * rr, x2 = X + Math.sin(aa) * rr;
      arcSvg.setAttribute('viewBox', '0 0 ' + Wd + ' ' + Hd);
      arcPath.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 0 1 ' + x2.toFixed(1) + ' ' + y1.toFixed(1));
      arcSvg.style.opacity = (1 - hy * 1.6).toFixed(3);
    }

    if (gl) {
      size();
      gl.uniform2f(U.uR, w, hh); gl.uniform1f(U.uT, s); gl.uniform1f(U.uR0, R); gl.uniform1f(U.uCy, cy);
      gl.uniform1f(U.uDark, P.dark); gl.uniform1f(U.uMot, P.motes * (1 - P.plan)); gl.uniform1f(U.uLeak, P.leak); gl.uniform1f(U.uStr, P.stream);
      gl.uniform1f(U.uTow, P.tow); gl.uniform1f(U.uCeil, P.ceil); gl.uniform1f(U.uSun, P.sun); gl.uniform1f(U.uPlan, P.plan); gl.uniform1f(U.uSpr, spread);
      gl.uniform1f(U.uLed, (1 - P.plan) * (1 - P.sun * .6));
      gl.uniform2f(U.uRot, P.lat * D2R, P.lon * D2R);
      [U.uD0, U.uD1, U.uD2].forEach(function (u, j) { gl.uniform3f(u, dv[j].x, dv[j].y, Math.min(1, dv[j].k * 3)); });
      gl.uniform1f(U.uPN, P.plan > .5 ? pn : 0);
      if (P.plan > .01) {
        gl.uniform3fv(U.uP, PBUF); gl.uniform3f(U.uPk, pk[0], pk[1], pk[2]);
        [U.uN0, U.uN1, U.uN2, U.uN3].forEach(function (u, j) { var v = nodeV[j]; gl.uniform3f(u, v[0], v[1], v[2]); });
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  kick();
  window.__world = function (Y) { scrollTo({ top: Y * innerHeight, behavior: 'instant' }); sY = Y; };
})();
