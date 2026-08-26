/* ===== FPS + GPU 档（左上角） =====
   - 60 FPS 绿色,30-49 黄色,<30 红色
   - 第二行来自 shader.js 写在 canvas.dataset 上的 renderer 短名 */
(function () {
    'use strict';
    const el = document.getElementById('fpsCounter');
    if (!el) return;

    let frames = 0;
    let last = performance.now();
    let fps = 0;
    let gpuLabel = '';

    function gpuLine() {
        const canvas = document.getElementById('sakura-canvas');
        if (!canvas) return '';
        const short = canvas.dataset.gpu || '';
        const tier = canvas.dataset.tier || '';
        if (!short) return '';
        return short + (tier ? ' · ' + tier : '');
    }

    function tick(now) {
        frames++;
        if (now - last >= 1000) {
            fps = Math.round((frames * 1000) / (now - last));
            frames = 0;
            last = now;
            if (!gpuLabel) gpuLabel = gpuLine();
            el.textContent = gpuLabel ? (fps + ' FPS\n' + gpuLabel) : (fps + ' FPS');
            el.dataset.level = fps >= 50 ? 'good' : fps >= 30 ? 'ok' : 'bad';
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();
