/* ===== FPS 实时显示 + 低帧率守卫 =====
   左上角显示实时 FPS（60 绿 / 30-49 黄 / <30 红）。
   守卫逻辑：当 rAF 实测帧率「持续低于 40 FPS 累计 5 秒」时，
   自动进入 perf-lite（关背景 shader + 停重动效 + 去 backdrop-filter），
   并弹一个可一键恢复的提示。

   阈值研判（为什么是 40 / 5s）：
   - 常见显示器底线是 60Hz，健康状态稳定 58-60；高刷屏(90/120Hz)即便被
     vsync 压到 60 也仍 ≥60。取 40 作为触发线，低于任何「健康或被压帧」
     状态，既能捕获真卡顿（单帧 >25ms 频繁掉帧），又不会误伤被压到 60 的
     高刷设备或移动端（shader 自身只在移动端把*绘制*压到 30fps，但 rAF
     回调仍按屏幕刷新率跑，故此处测的是整页流畅度而非 shader 绘制率）。
   - 要求「累计 5 秒」避免首屏加载/字体回流/切后台造成的瞬时抖动误触发。
   - 快速通道：若连续 2 秒 <24fps（已不可用），不等满 5 秒立即降级。
   - 迟滞：用户点「恢复动效」后，本次会话不再自动降级（sessionStorage）。*/
(function () {
    'use strict';

    const el = document.getElementById('fpsCounter');
    const root = document.documentElement;

    // ---- 实时帧率采样（1s 窗口）----
    let frames = 0;
    let last = performance.now();
    let fps = 0;

    // ---- 守卫状态 ----
    const LOW_FPS = 40;        // 触发线
    const RECOVER_FPS = 48;    // 迟滞：高于此视为“恢复良好”
    const SUSTAIN_SEC = 5;     // 需持续多少秒
    const CRIT_FPS = 24;       // 极差快速通道
    const GRACE_MS = 3500;     // 开场宽限（intro 动画/首屏加载不计入）

    let lowSeconds = 0;
    let critSeconds = 0;
    let engaged = false;
    let armed = false;         // 过了宽限期才开始评估
    const startTs = performance.now();

    // 用户本次会话已明确要满帧动效 → 不再自动降级
    const userWantsFull = (() => {
        try { return sessionStorage.getItem('perf-pref') === 'full'; } catch (_) { return false; }
    })();

    function dispatchPerf(lite) {
        try { document.dispatchEvent(new CustomEvent('perf-mode', { detail: { lite } })); } catch (_) {}
    }

    function engage() {
        if (engaged) return;
        engaged = true;
        root.classList.add('perf-lite');
        dispatchPerf(true);          // 通知 shader 停止
        showToast();
    }
    function restore() {
        engaged = false;
        lowSeconds = 0; critSeconds = 0;
        root.classList.remove('perf-lite');
        dispatchPerf(false);         // 通知 shader 恢复
        try { sessionStorage.setItem('perf-pref', 'full'); } catch (_) {}
    }

    // ---- 恢复提示条 ----
    let toastEl = null;
    function showToast() {
        if (toastEl) return;
        toastEl = document.createElement('div');
        toastEl.className = 'perf-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.innerHTML =
            '<span>检测到性能不足，已关闭部分动效以保持流畅</span>' +
            '<button type="button">恢复动效</button>';
        document.body.appendChild(toastEl);
        requestAnimationFrame(() => toastEl.classList.add('show'));
        toastEl.querySelector('button').addEventListener('click', () => {
            restore();
            hideToast();
        });
        // 8s 后自动收起（降级保持生效，仅收起提示）
        setTimeout(hideToast, 8000);
    }
    function hideToast() {
        if (!toastEl) return;
        toastEl.classList.remove('show');
        const t = toastEl;
        toastEl = null;
        setTimeout(() => t.remove(), 320);
    }

    function evaluate() {
        if (engaged || userWantsFull) return;
        if (!armed) {
            if (performance.now() - startTs < GRACE_MS) return;
            armed = true;
        }
        // 快速通道
        if (fps > 0 && fps < CRIT_FPS) {
            critSeconds += 1;
            if (critSeconds >= 2) { engage(); return; }
        } else {
            critSeconds = 0;
        }
        // 持续低帧累计
        if (fps > 0 && fps < LOW_FPS) {
            lowSeconds += 1;
            if (lowSeconds >= SUSTAIN_SEC) engage();
        } else if (fps >= RECOVER_FPS) {
            lowSeconds = 0;
        }
    }

    function tick(now) {
        frames++;
        const dt = now - last;
        if (dt >= 1000) {
            fps = Math.round((frames * 1000) / dt);
            frames = 0;
            last = now;
            if (el) {
                el.textContent = fps + ' FPS';
                el.dataset.level = fps >= 50 ? 'good' : fps >= 30 ? 'ok' : 'bad';
            }
            // 后台标签页不计入（rAF 本就被节流）
            if (!document.hidden) evaluate();
        }
        requestAnimationFrame(tick);
    }

    // 切后台回来重置窗口，避免跨切换的 dt 造成的假低帧
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { last = performance.now(); frames = 0; lowSeconds = 0; critSeconds = 0; }
    });

    requestAnimationFrame(tick);

    // 对外暴露手动开关（调试/无障碍用）
    window.__perfMode = { engage, restore, status: () => ({ engaged, fps, lowSeconds }) };
})();
