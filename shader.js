(function () {
    'use strict';

    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;

    // ===== Mobile detection (used for both render scale and CSS filter) =====
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    // ===== Hardware acceleration hints =====
    canvas.style.willChange = 'contents';
    canvas.style.transform = 'translateZ(0)';
    canvas.style.backfaceVisibility = 'hidden';

    // Reduce filter blur on mobile — full blur(2px) is a major GPU cost
    if (isMobile) canvas.style.filter = 'blur(1px) brightness(.85) saturate(.95)';

    const glOpts = {
        antialias: false,
        depth: false,
        alpha: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        desynchronized: true,        // 解耦渲染线程
        powerPreference: 'high-performance',  // 优先高性能 GPU
        failIfMajorPerformanceCaveat: false
    };
    const gl = canvas.getContext('webgl', glOpts) || canvas.getContext('experimental-webgl', glOpts);
    if (!gl) { canvas.style.display = 'none'; return; }

    const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

    const SHADER = `
#define S(a,b,c) smoothstep(a,b,c)
#define sat(a) clamp(a,0.0,1.0)

vec4 N14(float t){return fract(sin(t*vec4(123.,104.,145.,24.))*vec4(657.,345.,879.,154.));}

vec4 sakura(vec2 uv, vec2 id, float blur){
    float time = iTime + 45.0;
    vec4 rnd = N14(mod(id.x,500.0)*5.4 + mod(id.y,500.0)*13.67);
    uv *= mix(0.75,1.3,rnd.y);
    uv.x += sin(time*rnd.z*0.3)*0.6;
    uv.y += sin(time*rnd.w*0.45)*0.4;
    float angle = atan(uv.y,uv.x) + rnd.x*421.47 + iTime*mix(-0.6,0.6,rnd.x);
    float dist = length(uv);
    float petal = 1.0 - abs(sin(angle*2.5));
    float sqPetal = petal*petal;
    petal = mix(petal,sqPetal,0.7);
    float petal2 = 1.0 - abs(sin(angle*2.5+1.5));
    petal += petal2*0.2;
    float sakuraDist = dist + petal*0.25;
    float shadowblur = 0.3;
    float shadow = S(0.5+shadowblur,0.5-shadowblur,sakuraDist)*0.4;
    float sakuraMask = S(0.5+blur,0.5-blur,sakuraDist);
    vec3 sakuraCol = vec3(1.0,0.6,0.7);
    sakuraCol += (0.5-dist)*0.2;
    vec3 outlineCol = vec3(1.0,0.3,0.3);
    float outlineMask = S(0.5-blur,0.5,sakuraDist+0.045);
    float polarSpace = angle*1.9098+0.5;
    float polarPistil = fract(polarSpace)-0.5;
    outlineMask += S(0.035+blur,0.035-blur,dist);
    float petalBlur = blur*2.0;
    float pistilMask = S(0.12+blur,0.12,dist)*S(0.05,0.05+blur,dist);
    float barW = 0.2 - dist*0.7;
    float pistilBar = S(-barW,-barW+petalBlur,polarPistil)*S(barW+petalBlur,barW,polarPistil);
    float pistilDotLen = length(vec2(polarPistil*0.10,dist)-vec2(0,0.16))*9.0;
    float pistilDot = S(0.1+petalBlur,0.1-petalBlur,pistilDotLen);
    outlineMask += pistilMask*pistilBar + pistilDot;
    sakuraCol = mix(sakuraCol,outlineCol,sat(outlineMask)*0.5);
    sakuraCol = mix(vec3(0.4,0.4,0.8)*shadow,sakuraCol,sakuraMask);
    sakuraMask = sat(sakuraMask+shadow);
    return vec4(sakuraCol,sakuraMask);
}

vec3 premulMix(vec4 src, vec3 dst){return dst.rgb*(1.0-src.a)+src.rgb;}
vec4 premulMix(vec4 src, vec4 dst){vec4 res;res.rgb=premulMix(src,dst.rgb);res.a=1.0-(1.0-src.a)*(1.0-dst.a);return res;}

vec4 layer(vec2 uv, float blur){
    vec2 cellUV = fract(uv)-0.5;
    vec2 cellId = floor(uv);
    vec4 accum = vec4(0.0);
    for(float y=-1.0;y<=1.0;y++){
        for(float x=-1.0;x<=1.0;x++){
            vec2 offset = vec2(x,y);
            vec4 s = sakura(cellUV-offset, cellId+offset, blur);
            accum = premulMix(s, accum);
        }
    }
    return accum;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 nominalUV = fragCoord/iResolution.xy;
    vec2 uv = nominalUV - 0.5;
    uv.x *= iResolution.x/iResolution.y;
    uv.y += iTime*0.1;
    uv.x -= iTime*0.03 + sin(iTime)*0.1;
    uv *= 4.3;
    float screenY = nominalUV.y;
    vec3 col = vec3(1.0,0.7529,0.8235);
    float blur = abs(nominalUV.y-0.5)*1.4;
    blur *= blur*0.15;
    vec4 layer1 = layer(uv, 0.015+blur);
    vec4 layer2 = layer(uv*1.4+vec2(124.5,89.30), 0.05+blur);
    layer2.rgb *= mix(0.7,0.95,screenY);
    vec4 layer3 = layer(uv*2.3+vec2(463.5,-987.30), 0.08+blur);
    layer3.rgb *= mix(0.55,0.85,screenY);
    col = premulMix(layer3, col);
    col = premulMix(layer2, col);
    col = premulMix(layer1, col);
    col += -0.15;
    fragColor = vec4(col,1.0);
}`;

    const FRAG = 'precision highp float;uniform vec3 iResolution;uniform float iTime;\n' + SHADER +
        '\nvoid main(){vec4 c;mainImage(c, gl_FragCoord.xy);gl_FragColor=c;}';

    function compile(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error('[sakura] shader error:', gl.getShaderInfoLog(sh));
            return null;
        }
        return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.style.display = 'none'; return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('[sakura] link error:', gl.getProgramInfoLog(prog));
        canvas.style.display = 'none';
        return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'iResolution');
    const uTime = gl.getUniformLocation(prog, 'iTime');

    // ===== Adaptive render scale: lower on high-DPI / mobile for performance =====
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const RENDER_SCALE = isMobile ? 0.45 : (dpr > 1.5 ? 0.55 : 0.7);

    let lastResW = 0, lastResH = 0;
    function resize() {
        const w = Math.max(2, Math.floor(canvas.clientWidth * RENDER_SCALE));
        const h = Math.max(2, Math.floor(canvas.clientHeight * RENDER_SCALE));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
        if (lastResW !== w || lastResH !== h) {
            gl.uniform3f(uRes, w, h, 1.0);
            lastResW = w; lastResH = h;
        }
    }
    let resizePending = false;
    window.addEventListener('resize', () => {
        if (resizePending) return;
        resizePending = true;
        requestAnimationFrame(() => { resizePending = false; resize(); });
    }, { passive: true });

    // ===== Frame rate control: cap at ~45fps on mobile for battery =====
    const TARGET_FPS = isMobile ? 30 : 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    const start = performance.now();
    let raf = null, running = false;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        const elapsed = now - lastFrameTime;
        if (elapsed < FRAME_INTERVAL) return;
        lastFrameTime = now - (elapsed % FRAME_INTERVAL);
        resize();
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function play() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

    // Pause when tab hidden or when backgrounded
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else play(); });

    // Pause when battery low (if Battery API available)
    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            if (battery.level < 0.15 && !battery.charging) stop();
            battery.addEventListener('levelchange', () => {
                if (battery.level < 0.15 && !battery.charging) stop();
                else if (!document.hidden) play();
            });
        }).catch(() => {});
    }

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Render a single static frame
        resize();
        gl.uniform1f(uTime, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return;
    }

    play();
})();
