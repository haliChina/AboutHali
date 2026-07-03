/* ===== FPS 实时显示(左上角) =====
   - 60 FPS 绿色,30-49 黄色,<30 红色,直观反映性能
   - 半透明毛玻璃背景,不影响布局,点击穿透
   - 使用 rAF 累加 1s 窗口,统计精确 */
(function () {
    'use strict';
    const el = document.getElementById('fpsCounter');
    if (!el) return;

    let frames = 0;
    let last = performance.now();
    let fps = 0;

    function tick(now) {
        frames++;
        if (now - last >= 1000) {
            fps = Math.round((frames * 1000) / (now - last));
            frames = 0;
            last = now;
            el.textContent = fps + ' FPS';
            el.dataset.level = fps >= 50 ? 'good' : fps >= 30 ? 'ok' : 'bad';
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();
