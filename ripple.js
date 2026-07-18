/* ===== 鼠标点击水波纹 =====
   - 单个有体积感的波纹环带(径向渐变模拟波峰高光 + 波谷渐隐)
   - scale 放大让环带自然变宽,符合水波色散物理
   - 一个延迟次波增加自然感,不是多个独立圆环
   - 元素 pointer-events:none,不拦截任何点击 / 滚动 / 关键逻辑
   - 监听器 passive:true,绝不 preventDefault
   - prefers-reduced-motion 用户主动跳过 */
(function () {
    'use strict';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const TTL = 1100; // 略大于单波动画时长
    let z = 100000;

    function spawn(x, y) {
        // 主波(有体积感的环带)
        const wave = document.createElement('div');
        wave.className = 'click-ripple';
        wave.style.left = x + 'px';
        wave.style.top = y + 'px';
        wave.style.zIndex = ++z;
        document.body.appendChild(wave);
        setTimeout(() => wave.remove(), TTL);

        // 一个延迟次波(更淡,模拟水面余波)
        const wave2 = document.createElement('div');
        wave2.className = 'click-ripple click-ripple--echo';
        wave2.style.left = x + 'px';
        wave2.style.top = y + 'px';
        wave2.style.zIndex = z - 1;
        document.body.appendChild(wave2);
        setTimeout(() => wave2.remove(), TTL + 150);
    }

    document.addEventListener('pointerdown', e => {
        // 仅桌面端鼠标左键触发;跳过触屏(pen/移动端)和右键 / 中键
        if (e.pointerType !== 'mouse') return;
        if (e.button !== 0) return;
        spawn(e.clientX, e.clientY);
    }, { passive: true, capture: false });
})();
