(function () {
    'use strict';

    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;

    // ===== Mobile detection (used for both render scale and CSS filter) =====
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* 流体只替代原桌面点击水波：细指针 + hover，不跟触屏抢手势。
       ?fluid=1 仅作本机预览强制开启（触屏也可划）。 */
    const forceFluid = /(?:\?|&)fluid=1(?:&|$)/.test(location.search);
    const enableFluid = !reducedMotion && (forceFluid || (
        !isMobile && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ));

    /* 不要 will-change/translateZ/backface：WebView 会把 canvas 抬成独立合成层，
       层内首帧 WebGL 往往不刷新，看起来像开场几秒背景冻住。 */

    // Reduce filter blur on mobile — full blur(2px) is a major GPU cost
    if (isMobile) canvas.style.filter = 'blur(1px) brightness(.85) saturate(.95)';

    const glOpts = {
        antialias: false,
        depth: false,
        alpha: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
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
    vec2 sampleUV = nominalUV;
    vec2 grad = vec2(0.0);
    if (iWarp > 0.001) {
        float hL = texture2D(iHeight, nominalUV - vec2(iHeightTexel.x, 0.0)).r;
        float hR = texture2D(iHeight, nominalUV + vec2(iHeightTexel.x, 0.0)).r;
        float hD = texture2D(iHeight, nominalUV - vec2(0.0, iHeightTexel.y)).r;
        float hU = texture2D(iHeight, nominalUV + vec2(0.0, iHeightTexel.y)).r;
        grad = vec2(hR - hL, hU - hD);
        sampleUV = clamp(nominalUV + grad * iWarp, 0.0, 1.0);
    }
    vec2 uv = sampleUV - 0.5;
    uv.x *= iResolution.x/iResolution.y;
    uv.y += iTime*0.18;
    uv.x -= iTime*0.06 + sin(iTime)*0.1;
    uv *= 4.3;
    float screenY = sampleUV.y;
    vec3 col = vec3(1.0,0.7529,0.8235);
    float blur = abs(sampleUV.y-0.5)*1.4;
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
    float crest = sat(length(grad) * 14.0);
    col += vec3(1.0, 0.90, 0.95) * crest * crest * 0.42;
    col.r += grad.x * 0.28;
    col.b -= grad.x * 0.18;
    fragColor = vec4(col,1.0);
}`;

    const FRAG = 'precision highp float;uniform vec3 iResolution;uniform float iTime;uniform sampler2D iHeight;uniform float iWarp;uniform vec2 iHeightTexel;\n'
        + SHADER
        + '\nvoid main(){vec4 c;mainImage(c, gl_FragCoord.xy);gl_FragColor=c;}';

    const SIM_FRAG = [
        'precision highp float;',
        'uniform sampler2D iSrc;',
        'uniform vec2 iTexel;',
        'uniform float iAspect;',
        'uniform vec3 iSplat;',
        'uniform vec2 iSplatDir;',
        'uniform float iDamping;',
        'void main(){',
        '  vec2 uv=gl_FragCoord.xy*iTexel;',
        '  vec4 c=texture2D(iSrc,uv);',
        '  float hp=c.g;',
        '  float l=texture2D(iSrc,uv-vec2(iTexel.x,0.0)).r;',
        '  float r=texture2D(iSrc,uv+vec2(iTexel.x,0.0)).r;',
        '  float d=texture2D(iSrc,uv-vec2(0.0,iTexel.y)).r;',
        '  float u=texture2D(iSrc,uv+vec2(0.0,iTexel.y)).r;',
        '  float hnew=(l+r+d+u)*0.5-hp;',
        '  hnew=(hnew-0.5)*iDamping+0.5;',
        '  if(iSplat.z>0.0){',
        '    vec2 p=(uv-iSplat.xy)*vec2(iAspect,1.0);',
        '    float dl=length(iSplatDir);',
        '    float r2;',
        '    if(dl>0.0008){',
        '      vec2 dir=iSplatDir/dl;',
        '      vec2 pr=vec2(-dir.y,dir.x);',
        '      vec2 local=vec2(dot(p,dir),dot(p,pr));',
        '      r2=local.x*local.x*0.42+local.y*local.y*2.6;',
        '    }else{',
        '      r2=dot(p,p);',
        '    }',
        '    hnew+=exp(-r2*52.0)*iSplat.z;',
        '  }',
        '  gl_FragColor=vec4(clamp(hnew,0.0,1.0),c.r,0.0,1.0);',
        '}'
    ].join('');

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

    function createProgram(vertSrc, fragSrc, label) {
        const vs = compile(gl.VERTEX_SHADER, vertSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
        if (!vs || !fs) return null;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('[' + label + '] link error:', gl.getProgramInfoLog(prog));
            return null;
        }
        return prog;
    }

    const prog = createProgram(VERT, FRAG, 'sakura');
    if (!prog) { canvas.style.display = 'none'; return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'iResolution');
    const uTime = gl.getUniformLocation(prog, 'iTime');
    const uHeight = gl.getUniformLocation(prog, 'iHeight');
    const uWarp = gl.getUniformLocation(prog, 'iWarp');
    const uHeightTexel = gl.getUniformLocation(prog, 'iHeightTexel');
    gl.uniform1i(uHeight, 0);
    gl.uniform1f(uWarp, 0);
    gl.uniform2f(uHeightTexel, 1, 1);

    const restTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, restTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 0, 255]));

    let fluid = null;

    function listHeightFormats() {
        const out = [];
        const half = gl.getExtension('OES_texture_half_float');
        const halfBuf = gl.getExtension('EXT_color_buffer_half_float');
        const halfLin = gl.getExtension('OES_texture_half_float_linear');
        if (half && halfBuf) {
            out.push({
                internal: gl.RGBA,
                format: gl.RGBA,
                type: half.HALF_FLOAT_OES,
                linear: !!halfLin
            });
        }
        const flt = gl.getExtension('OES_texture_float');
        const fltBuf = gl.getExtension('WEBGL_color_buffer_float');
        const fltLin = gl.getExtension('OES_texture_float_linear');
        if (flt && fltBuf) {
            out.push({
                internal: gl.RGBA,
                format: gl.RGBA,
                type: gl.FLOAT,
                linear: !!fltLin
            });
        }
        out.push({
            internal: gl.RGBA,
            format: gl.RGBA,
            type: gl.UNSIGNED_BYTE,
            linear: true
        });
        return out;
    }

    function makeSimTarget(w, h, fmt) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let seed = null;
        if (fmt.type === gl.UNSIGNED_BYTE) {
            seed = new Uint8Array(w * h * 4);
            for (let i = 0; i < seed.length; i += 4) {
                seed[i] = 128; seed[i + 1] = 128; seed[i + 2] = 0; seed[i + 3] = 255;
            }
        } else if (fmt.type === gl.FLOAT) {
            seed = new Float32Array(w * h * 4);
            for (let i = 0; i < seed.length; i += 4) {
                seed[i] = 0.5; seed[i + 1] = 0.5; seed[i + 2] = 0; seed[i + 3] = 1;
            }
        } else {
            seed = new Uint16Array(w * h * 4);
            for (let i = 0; i < seed.length; i += 4) {
                seed[i] = 0x3800; seed[i + 1] = 0x3800; seed[i + 2] = 0; seed[i + 3] = 0x3C00;
            }
        }
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, fmt.format, fmt.type, seed);
        } catch (_) {
            return null;
        }
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        if (ok) {
            gl.clearColor(0.5, 0.5, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return ok ? { tex: tex, fbo: fbo } : null;
    }

    function initFluid() {
        const simProg = createProgram(VERT, SIM_FRAG, 'fluid');
        if (!simProg) return null;
        const SIM = 256;
        let fmt = null, a = null, b = null;
        const formats = listHeightFormats();
        for (let i = 0; i < formats.length; i++) {
            const candidate = formats[i];
            const ta = makeSimTarget(SIM, SIM, candidate);
            const tb = ta ? makeSimTarget(SIM, SIM, candidate) : null;
            if (ta && tb) { fmt = candidate; a = ta; b = tb; break; }
        }
        if (!fmt) return null;
        gl.useProgram(simProg);
        const simLoc = gl.getAttribLocation(simProg, 'p');
        const uniforms = {
            src: gl.getUniformLocation(simProg, 'iSrc'),
            texel: gl.getUniformLocation(simProg, 'iTexel'),
            aspect: gl.getUniformLocation(simProg, 'iAspect'),
            splat: gl.getUniformLocation(simProg, 'iSplat'),
            dir: gl.getUniformLocation(simProg, 'iSplatDir'),
            damping: gl.getUniformLocation(simProg, 'iDamping')
        };
        gl.uniform1i(uniforms.src, 0);
        gl.uniform2f(uniforms.texel, 1 / SIM, 1 / SIM);
        gl.uniform1f(uniforms.damping, 0.988);
        gl.useProgram(prog);
        gl.uniform2f(uHeightTexel, 1 / SIM, 1 / SIM);
        return {
            prog: simProg,
            loc: simLoc,
            uniforms: uniforms,
            size: SIM,
            fmt: fmt,
            read: a,
            write: b
        };
    }

    /* 256² half-float FBO + 二次 compile 会卡主线程 1–3s。
       先只跑樱花；第一次指针移动或数秒后再建流体，避免开场冻住。 */
    let fluidAttempted = false;
    function attachFluid() {
        if (fluidAttempted || !enableFluid) return;
        fluidAttempted = true;
        try { fluid = initFluid(); } catch (_) { fluid = null; }
    }

    const pointer = { x: 0.5, y: 0.5, vx: 0, vy: 0, active: 0, inside: false };
    let lastPtr = { x: 0.5, y: 0.5, t: 0 };

    function screenToSim(clientX, clientY) {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        return { x: clientX / w, y: 1 - clientY / h };
    }

    if (enableFluid) {
        const onMove = function (e) {
            if (!forceFluid && e.pointerType && e.pointerType !== 'mouse') return;
            const now = performance.now();
            const p = screenToSim(e.clientX, e.clientY);
            if (!lastPtr.t) {
                lastPtr.x = p.x;
                lastPtr.y = p.y;
                lastPtr.t = now;
                pointer.x = p.x;
                pointer.y = p.y;
                pointer.inside = true;
                return;
            }
            const dt = Math.max(8, now - lastPtr.t);
            pointer.vx = (p.x - lastPtr.x) * (16 / dt);
            pointer.vy = (p.y - lastPtr.y) * (16 / dt);
            pointer.x = p.x;
            pointer.y = p.y;
            pointer.active = 1;
            pointer.inside = true;
            lastPtr.x = p.x;
            lastPtr.y = p.y;
            lastPtr.t = now;
        };
        const onLeave = function () {
            pointer.active = 0;
            pointer.inside = false;
            pointer.vx = 0;
            pointer.vy = 0;
            lastPtr.t = 0;
        };
        window.addEventListener('pointermove', function (e) { attachFluid(); onMove(e); }, { passive: true });
        window.addEventListener('pointerdown', function (e) { attachFluid(); onMove(e); }, { passive: true });
        document.addEventListener('pointerleave', onLeave, { passive: true });
        window.addEventListener('blur', onLeave, { passive: true });
    }

    // ===== Adaptive render scale: lower on high-DPI / mobile for performance =====
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    /* MWG efficient-background-processing / performance: 保守上限已捕获静态低帧率会话
       （页面有常驻 FPS 计数器），故 render scale 只做安全静态分配，不引入动态调参。 */
    const RENDER_SCALE = isMobile ? 0.45 : (dpr > 1.5 ? 0.55 : 0.7);

    let lastResW = 0, lastResH = 0;
    function resize() {
        const w = Math.max(2, Math.floor(canvas.clientWidth * RENDER_SCALE));
        const h = Math.max(2, Math.floor(canvas.clientHeight * RENDER_SCALE));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
        }
        if (lastResW !== w || lastResH !== h) {
            gl.useProgram(prog);
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

    const start = performance.now() - 1200;
    let raf = null, running = false;

    function stepFluid() {
        if (!fluid) return;
        const speed = Math.hypot(pointer.vx, pointer.vy);
        const strength = pointer.active && pointer.inside
            ? Math.min(0.42, speed * 2.4)
            : 0;
        const aspect = (window.innerWidth || 1) / (window.innerHeight || 1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fluid.write.fbo);
        gl.viewport(0, 0, fluid.size, fluid.size);
        gl.useProgram(fluid.prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(fluid.loc);
        gl.vertexAttribPointer(fluid.loc, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fluid.read.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.uniform1f(fluid.uniforms.aspect, aspect);
        gl.uniform3f(fluid.uniforms.splat, pointer.x, pointer.y, strength);
        gl.uniform2f(fluid.uniforms.dir, pointer.vx, pointer.vy);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const tmp = fluid.read;
        fluid.read = fluid.write;
        fluid.write = tmp;
        pointer.vx *= 0.82;
        pointer.vy *= 0.82;
        if (speed < 0.0004) pointer.active = 0;
    }

    function drawSakura(now) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        if (fluid) {
            gl.bindTexture(gl.TEXTURE_2D, fluid.read.tex);
            const filter = fluid.fmt.linear ? gl.LINEAR : gl.NEAREST;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.uniform1f(uWarp, 0.92);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, restTex);
            gl.uniform1f(uWarp, 0);
        }
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let framesDrawn = 0;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        const elapsed = now - lastFrameTime;
        if (elapsed < FRAME_INTERVAL) return;
        lastFrameTime = now - (elapsed % FRAME_INTERVAL);
        resize();
        stepFluid();
        drawSakura(now);
        framesDrawn++;
        canvas.dataset.frames = String(framesDrawn);
        canvas.dataset.time = ((now - start) / 1000).toFixed(2);
    }
    function play() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

    function kick() {
        lastFrameTime = 0;
        play();
    }

    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else kick(); });
    window.addEventListener('pageshow', kick);
    document.addEventListener('intro-done', kick);

    // Respect reduced motion preference
    if (reducedMotion) {
        // Render a single static frame
        resize();
        drawSakura(start);
        return;
    }

    resize();
    drawSakura(start);
    kick();
    setTimeout(attachFluid, 2800);
})();
