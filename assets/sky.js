/* The story's sky: one WebGL shader that runs a day behind the document.
   Day while AI shows what it can do, dusk while the file is censored and withheld, sunrise with AI-Box.
   Reads --night and --dawn from the stage, which story.js sets from the scroll position. */
(function () {
  var cvs = [].slice.call(document.querySelectorAll('canvas.sky-gl'));
  cvs.forEach(function (cv) {
    var stage = cv.parentNode;
    var gl = cv.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    stage.classList.add('sky-on');
    var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var FS = [
      'precision highp float;',
      'uniform vec2 uR; uniform float uT, uN, uD, uH, uB;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
      'void main(){',
      ' vec2 fc=gl_FragCoord.xy; vec2 uv=fc/uR; float asp=uR.x/uR.y;',
      ' float y=uv.y; float hz=uH;',            /* horizon height from the bottom, 0..1 */
      ' float up=clamp((y-hz)/(1.-hz),0.,1.);',
      ' vec3 dayTop=vec3(.969,.957,.925), dayHz=vec3(.955,.86,.72);',
      ' vec3 day=mix(dayHz,dayTop,pow(up,.45));',
      ' vec3 nTop=vec3(.105,.118,.145), nMid=vec3(.20,.21,.25), nHz=vec3(.36,.29,.27);',
      ' vec3 night=mix(nHz,mix(nMid,nTop,smoothstep(.15,1.,up)),smoothstep(0.,.35,up));',
      ' vec3 col=mix(day,night,uN);',
      /* the sun: rises from behind the horizon, centred behind the file */
      ' vec2 sp=vec2(.5*asp, hz-.16+uD*.2);',
      ' vec2 q=vec2(uv.x*asp,y)-sp; float r=length(q*vec2(1.,1.12));',
      ' float a=atan(q.y,q.x);',
      ' float rays=.55+.45*n(vec2(a*9.,uT*.08))*n(vec2(a*23.+3.,uT*.05));',
      ' vec3 warm=vec3(1.,.70,.36);',
      ' float glow=exp(-r*2.6)*.75+exp(-r*7.)*.6+exp(-r*22.)*.9;',
      ' float above=smoothstep(hz-.004,hz+.02,y);',
      ' col+=warm*glow*uD*(.75+.25*rays)*mix(.35,1.,above);',
      ' col+=warm*exp(-abs(y-hz)*60.)*.25*uD;',
      /* the day's own warmth at the horizon and the dusk ember */
      ' col+=vec3(.95,.6,.3)*exp(-abs(y-hz)*14.)*(.10*(1.-uN)*(1.-uD)+.12*uN);',
      /* reading light: a soft band of warm light during act 1 */
      ' col+=vec3(1.,.85,.6)*uB*.06*exp(-pow((uv.x-.5)*asp*1.6,2.));',
      ' vec2 v=uv-.5; col*=1.-dot(v,v)*(.12+.45*uN);',
      ' col+=(h(fc+fract(uT)*91.)-.5)*(.014+.02*uN);',
      ' gl_FragColor=vec4(max(col,0.),1.);',
      '}'].join('\n');
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    var pr = gl.createProgram();
    try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); } catch (e) { console.warn(e); stage.classList.remove('sky-on'); return; }
    gl.linkProgram(pr); gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uR', 'uT', 'uN', 'uD', 'uH', 'uB'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    var w = 0, hh = 0, t0 = performance.now(), vis = false;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) requestAnimationFrame(frame); }).observe(stage.parentNode);
    else vis = true;
    function num(k, d) { var v = parseFloat(stage.style.getPropertyValue(k)); return isNaN(v) ? d : v; }
    function frame(now) {
      if (!vis) return;
      var W = cv.clientWidth, H = cv.clientHeight, k = Math.min(window.devicePixelRatio || 1, 1) * .75;
      var nw = Math.round(W * k), nh = Math.round(H * k);
      if (nw !== w || nh !== hh) { w = cv.width = nw; hh = cv.height = nh; gl.viewport(0, 0, w, hh); }
      var hzv = 1 - (parseFloat(getComputedStyle(stage).getPropertyValue('--hzf')) || .8);
      gl.uniform2f(U.uR, w, hh); gl.uniform1f(U.uT, (now - t0) / 1000);
      gl.uniform1f(U.uN, num('--night', 0)); gl.uniform1f(U.uD, num('--dawn', 0)); gl.uniform1f(U.uB, num('--beam', 0)); gl.uniform1f(U.uH, hzv);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    window.addEventListener('scroll', function () { if (reduce) requestAnimationFrame(frame); }, { passive: true });
  });
})();
