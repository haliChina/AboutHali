(function () {
    'use strict';

    const island      = document.querySelector('.island-content');
    const navBtns     = Array.from(document.querySelectorAll('.island-nav-btn'));
    const progressBar = document.querySelector('.scroll-progress-bar');
    const confirmSite        = document.querySelector('.confirm-site');
    const confirmHost        = document.querySelector('.island-confirm-host');
    const confirmIconBox     = document.querySelector('.island-confirm-icon');
    const confirmFavicon     = document.querySelector('.confirm-favicon');
    const confirmCountdownBar= document.querySelector('.island-confirm-countdown-bar');
    const btnConfirm  = document.querySelector('.island-btn-confirm');
    const btnCancel   = document.querySelector('.island-btn-cancel');
    const toastIcon   = document.querySelector('.island-toast-icon');
    const toastMsg    = document.querySelector('.island-toast-msg');
    const spPct       = document.querySelector('.sp-pct');
    const spSection   = document.querySelector('.sp-section');

    const audio    = document.getElementById('np-audio');
    const toggles  = Array.from(document.querySelectorAll('.np-toggle,.mc-toggle'));
    const npScrub  = document.querySelector('.np-scrub');
    const mcScrub  = document.querySelector('.mc-scrub');
    const npCur = document.querySelector('.np-cur'), npDur = document.querySelector('.np-dur');
    const mcCur = document.querySelector('.mc-cur'), mcDur = document.querySelector('.mc-dur');
    const plEl  = document.getElementById('np-playlist');

    function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    function easeOutCubic(t) { return 1 - Math.pow(1 - clamp01(t), 3); }
    function easeInOutCubic(t) { t = clamp01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function getCookie(name) {
        const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
        return m ? decodeURIComponent(m[1]) : null;
    }
    function setCookie(name, value, maxAgeSeconds) {
        document.cookie = name + '=' + encodeURIComponent(value) + '; max-age=' + maxAgeSeconds + '; path=/; SameSite=Lax';
    }
    function setText(sel, txt) { document.querySelectorAll(sel).forEach(e => { e.textContent = txt; }); }
    function setSrc(sel, src) { document.querySelectorAll(sel).forEach(e => { e.src = src; }); }
    function setCoverAnimated(sel, src) {
        document.querySelectorAll(sel).forEach(img => {
            if (img.getAttribute('src') === src) return;
            let done = false;
            const swap = () => {
                if (done) return;
                done = true;
                img.removeEventListener('transitionend', swap);
                img.src = src;
                img.classList.remove('cover-swap');
            };
            img.addEventListener('transitionend', swap);
            setTimeout(swap, 360);
            img.classList.add('cover-swap');
        });
    }
    function fmt(t) {
        if (!t || isNaN(t) || !isFinite(t)) return '0:00';
        const m = Math.floor(t / 60), s = Math.floor(t % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    const PLAYLIST = [
        { name: '渡口',     artist: '蔡琴',                  cover: 'https://y.qq.com/music/photo_new/T002R500x500M000004P3Tg53u1o9m_1.jpg?max_age=2592000', src: 'audio/渡口.mp3' },
        { name: '去寻找',   artist: '牛奶咖啡',              cover: 'https://y.qq.com/music/photo_new/T002R500x500M000003K4mFV3B9UfM_1.jpg?max_age=2592000', src: 'audio/去寻找.mp3' },
        { name: 'Miss You', artist: 'Oliver Tree & Robin Schulz', cover: 'https://y.qq.com/music/photo_new/T002R500x500M000003N37OX0ByL7H_2.jpg?max_age=2592000&err_retry=1', src: 'audio/Miss_You.mp3' },
        { name: 'Life Goes On', artist: 'Oliver Tree',        cover: 'https://y.qq.com/music/photo_new/T002R500x500M000000UAKjE2m6ksi_1.jpg?max_age=2592000', src: 'audio/Life_Goes_On.mp3' }
    ];
    let curIdx = 0;

    function renderPlaylist() {
        if (!plEl) return;
        plEl.innerHTML = '';
        PLAYLIST.forEach((s, i) => {
            const d = document.createElement('div');
            d.className = 'np-song-item';
            d.innerHTML = '<span class="idx"></span><span class="nm"></span><span class="ar"></span>';
            d.querySelector('.idx').textContent = i + 1;
            d.querySelector('.nm').textContent = s.name;
            d.querySelector('.ar').textContent = s.artist;
            d.addEventListener('click', () => loadSong(i, true));
            plEl.appendChild(d);
        });
    }
    function markActive() {
        if (!plEl) return;
        Array.from(plEl.children).forEach((el, i) => el.classList.toggle('active', i === curIdx));
    }
    function loadSong(i, autoplay) {
        curIdx = ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
        const s = PLAYLIST[curIdx];
        if (audio) audio.src = s.src;
        setText('.np-title', s.name); setText('.np-artist', s.artist);
        setText('.mc-title', s.name); setText('.mc-artist', s.artist);
        setSrc('.np-cover', s.cover); setCoverAnimated('.mc-cover', s.cover); setCoverAnimated('.ib-cover', s.cover);
        markActive();
        updateProgress();
        if (autoplay && audio) audio.play().catch(() => {});
    }

    let audioUnlockArmed = false;
    function isIslandControl(target) {
        return target.closest('.island-content, .island-mini-btn, .island-nav-btn, .island-btn, .island-email-copy, .mc-scrub, .np-scrub, .np-action-btn, .np-song-item, .social-btn, .explore-btn');
    }
    function armAudioUnlock() {
        if (audioUnlockArmed || !audio) return;
        audioUnlockArmed = true;
        const evs = ['pointerdown', 'click', 'keydown', 'touchstart', 'wheel'];
        const unlock = (e) => {
            if (audio.paused && !musicActive && !isIslandControl(e.target)) loadSong(0, true);
        };
        const opts = { capture: true, passive: true };
        evs.forEach(ev => window.addEventListener(ev, unlock, opts));
        audio.addEventListener('play',
            () => evs.forEach(ev => window.removeEventListener(ev, unlock, opts)),
            { once: true });
    }
    function beginMusic() {
        if (!audio || !audio.paused) return;
        loadSong(0, true);
        armAudioUnlock();
    }

    // ===== Dynamic Island: 1:1 抄袭 Gemini3.5 的 switchIsland 实现 =====
    // 核心三步同步（同帧内完成）：
    //   Step 1. 移除旧内容 .active-content（立即开始 fade-out 0.2s）
    //   Step 2. 改外壳 inline style（width/height/radius/bgColor，0.6s 弹性回弹）
    //   Step 3. 写入新 data-state + 添加新内容 .active-content（0.4s + 0.15s 延迟 fade-in）
    // 关键点：状态由 data-state 单值持有，inner layer 的 active-content 切换 100% 决定显示。
    // 这样即使 100ms 内连点 5 次切换也不会卡，每步都会被浏览器合并到同一渲染帧。

    let musicActive = false;
    let pendingHref = null;
    let collapseTimer = null, toastTimer = null, scrollEndTimer = null, idleTimer = null, confirmTimer = null;
    const CONFIRM_AUTO_MS = 8000;
    let hovering = false, userScrolling = false, scrubbing = false;
    const mouse = { x: -1, y: -1 };

    // ===== 状态布局映射表（与 Gemini switchIsland 一致） =====
    const STATE_LAYOUTS = {
        'default':     { width: '236px', height: '40px',  radius: '22px', bg: 'rgba(12,12,16,.86)' },
        'music-bar':   { width: '212px', height: '40px',  radius: '22px', bg: 'rgba(12,12,16,.86)' },
        'nav':         { width: '520px', height: '88px',  radius: '28px', bg: 'rgba(12,12,16,.86)' },
        'music-card':  { width: '560px', height: '146px', radius: '32px', bg: 'rgba(12,12,16,.86)' },
        'confirm':     { width: '440px', height: '156px', radius: '32px', bg: 'rgba(12,12,16,.86)' },
        'email':       { width: '384px', height: '124px', radius: '30px', bg: 'rgba(12,12,16,.86)' },
        'toast':       { width: '236px', height: '50px',  radius: '25px', bg: 'rgba(12,12,16,.86)' }
    };
    // ===== 状态内容映射表（与 Gemini stateContents 一致） =====
    const STATE_CONTENTS = {
        'default':    island.querySelector('.island-default'),
        'music-bar':  island.querySelector('.island-music-bar'),
        'nav':        island.querySelector('.island-nav'),
        'music-card': island.querySelector('.island-music-card'),
        'confirm':    island.querySelector('.island-confirm'),
        'email':      island.querySelector('.island-email'),
        'toast':      island.querySelector('.island-toast')
    };

    function getCurrentState() {
        return island.getAttribute('data-state') || 'default';
    }
    // ===== 与 Gemini switchIsland 1:1 一致的切换 =====
    function setState(target, opts) {
        opts = opts || {};
        const current = getCurrentState();
        if (current === target && !opts.force) return;

        // Step 1: 隐藏旧内容（fade-out 0.2s）
        if (STATE_CONTENTS[current]) STATE_CONTENTS[current].classList.remove('active-content');

        // Step 2: 改变外壳物理属性（弹性 0.6s, bg 0.4s）
        const layout = STATE_LAYOUTS[target];
        if (layout) {
            island.style.width      = layout.width;
            island.style.height     = layout.height;
            island.style.borderRadius = layout.radius;
            island.style.backgroundColor = layout.bg;
        }
        // 同步清理残留的 vs-* class（兼容老 CSS）
        island.classList.remove('vs-default', 'vs-music-bar', 'vs-nav', 'vs-music-card', 'vs-confirm', 'vs-email', 'vs-toast');
        // 新机制：data-state 驱动子级动画延迟
        island.setAttribute('data-state', target);
        island.classList.add('island-state-' + target);

        // toast 主题色
        if (target === 'toast') {
            island.classList.remove('toast-success', 'toast-error');
            island.classList.add(opts.kind === 'error' ? 'toast-error' : 'toast-success');
        } else {
            island.classList.remove('toast-success', 'toast-error');
        }

        // Step 3: 显示新内容（fade-in 0.4s + 0.15s 延迟）
        if (STATE_CONTENTS[target]) STATE_CONTENTS[target].classList.add('active-content');

        // 空闲 idle 计时器（仅在 default 且无活动时触发）
        clearTimeout(idleTimer);
        if (target === 'default' && !musicActive && !hovering && !userScrolling) {
            idleTimer = setTimeout(() => island.classList.add('idle'), 3000);
        } else {
            island.classList.remove('idle');
        }
    }

    function isLocked() {
        const s = getCurrentState();
        return s === 'confirm' || s === 'email' || s === 'toast';
    }
    function pointInIsland() {
        const r = island.getBoundingClientRect();
        return mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom;
    }
    function scheduleCollapse(delay) {
        clearTimeout(collapseTimer);
        collapseTimer = setTimeout(() => {
            if (!hovering && !userScrolling && !scrubbing && !isLocked()) {
                setState(musicActive ? 'music-bar' : 'default');
            }
        }, delay || 900);
    }

    function armIdle() {
        island.classList.remove('idle');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (getCurrentState() === 'default' && !musicActive && !hovering && !userScrolling) island.classList.add('idle');
        }, 3000);
    }

    function showToast(kind, msg, icon) {
        clearTimeout(toastTimer);
        toastIcon.textContent = icon || (kind === 'error' ? '×' : '✓');
        toastMsg.textContent = msg;
        setState('toast', { kind: kind });
        toastTimer = setTimeout(() => {
            const next = hovering ? (musicActive ? 'music-card' : 'nav') : (musicActive ? 'music-bar' : 'default');
            setState(next);
        }, 1300);
    }

    function clearConfirmTimer() { clearTimeout(confirmTimer); confirmTimer = null; }

    function prettyHost(href) {
        try {
            const u = new URL(href);
            const path = u.pathname.replace(/\/$/, '');
            return u.hostname + path;
        } catch (_) { return href || ''; }
    }

    function askConfirm(title, href, iconSrc, iconInvert) {
        clearConfirmTimer();
        pendingHref = href;
        clearTimeout(collapseTimer);
        if (confirmSite) confirmSite.textContent = title;
        if (confirmHost) confirmHost.textContent = prettyHost(href);
        if (confirmIconBox && confirmFavicon) {
            confirmFavicon.onerror = () => confirmIconBox.classList.remove('has-favicon');
            if (iconSrc) {
                confirmFavicon.src = iconSrc;
                confirmFavicon.style.filter = iconInvert === false
                    ? 'drop-shadow(0 1px 2px rgba(0,0,0,.35))'
                    : '';
                confirmIconBox.classList.add('has-favicon');
            } else {
                confirmIconBox.classList.remove('has-favicon');
            }
        }
        setState('confirm');
        if (confirmCountdownBar) {
            confirmCountdownBar.style.transition = 'none';
            confirmCountdownBar.style.width = '100%';
            void confirmCountdownBar.offsetWidth;
            confirmCountdownBar.style.transition = 'width ' + (CONFIRM_AUTO_MS / 1000) + 's linear';
            confirmCountdownBar.style.width = '0%';
        }
        confirmTimer = setTimeout(() => {
            confirmTimer = null;
            pendingHref = null;
            showToast('error', '已自动取消');
        }, CONFIRM_AUTO_MS);
    }
    if (btnConfirm) btnConfirm.addEventListener('click', () => {
        clearConfirmTimer();
        if (pendingHref) window.open(pendingHref, '_blank', 'noopener');
        pendingHref = null;
        showToast('success', '跳转成功');
    });
    if (btnCancel) btnCancel.addEventListener('click', () => {
        clearConfirmTimer();
        pendingHref = null;
        showToast('error', '已取消');
    });

    document.querySelectorAll('.social-btn').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (link.id === 'email-link' || !href) { e.preventDefault(); setState('email'); return; }
            if (!href.startsWith('#')) {
                e.preventDefault();
                const img = link.querySelector('img');
                const iconSrc = img ? img.getAttribute('src') : null;
                const iconInvert = !link.classList.contains('social-btn-svg') && !link.classList.contains('social-btn-img');
                askConfirm(link.getAttribute('title') || '外部链接', href, iconSrc, iconInvert);
            }
        });
    });
    document.querySelectorAll('.island-email-copy').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const addr = btn.getAttribute('data-mail');
            const done = () => showToast('success', '已复制邮箱至剪切板');
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(done).catch(done);
            else done();
        });
    });

    const lastScrubPct = new WeakMap();
    function fillScrub(el, pct) {
        if (!el) return;
        const rounded = Math.round(pct * 10) / 10;
        if (lastScrubPct.get(el) === rounded) return;
        lastScrubPct.set(el, rounded);
        el.style.background = 'linear-gradient(90deg,var(--accent-3) ' + rounded + '%,rgba(255,255,255,.16) ' + rounded + '%)';
    }
    let lastNpCurTxt = '', lastNpDurTxt = '';
    function updateProgress() {
        if (!audio) return;
        const d = audio.duration || 0, c = audio.currentTime || 0;
        const pct = d ? (c / d * 100) : 0;
        const cTxt = fmt(c), dTxt = fmt(d);
        if (cTxt !== lastNpCurTxt) {
            lastNpCurTxt = cTxt;
            if (npCur) npCur.textContent = cTxt;
            if (mcCur) mcCur.textContent = cTxt;
        }
        if (dTxt !== lastNpDurTxt) {
            lastNpDurTxt = dTxt;
            if (npDur) npDur.textContent = dTxt;
            if (mcDur) mcDur.textContent = dTxt;
        }
        if (!scrubbing) {
            const v = pct * 10;
            if (npScrub) { npScrub.value = v; fillScrub(npScrub, pct); }
            if (mcScrub) { mcScrub.value = v; fillScrub(mcScrub, pct); }
        }
    }
    function togglePlay() {
        if (!audio) return;
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
    }
    toggles.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); togglePlay(); }));
    document.querySelectorAll('.np-prev,.mc-prev').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); loadSong(curIdx - 1, true); }));
    document.querySelectorAll('.np-next,.mc-next').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); loadSong(curIdx + 1, true); }));

    [npScrub, mcScrub].forEach(sc => {
        if (!sc) return;
        sc.addEventListener('input', () => {
            scrubbing = true;
            const pct = sc.value / 10;
            fillScrub(sc, pct);
            if (npScrub && npScrub !== sc) { npScrub.value = sc.value; fillScrub(npScrub, pct); }
            if (mcScrub && mcScrub !== sc) { mcScrub.value = sc.value; fillScrub(mcScrub, pct); }
        });
        const commit = () => { if (audio && audio.duration) audio.currentTime = (sc.value / 1000) * audio.duration; scrubbing = false; };
        sc.addEventListener('change', commit);
        sc.addEventListener('pointerup', commit);
    });

    const btnSongs = document.getElementById('np-btn-songs');
    const btnFx    = document.getElementById('np-btn-fx');
    const bgLayer  = document.querySelector('.bg');
    if (btnSongs) btnSongs.addEventListener('click', e => {
        e.stopPropagation();
        btnSongs.classList.toggle('active');
        if (plEl) plEl.classList.toggle('open');
    });
    if (btnFx) {
        btnFx.classList.add('active');
        btnFx.addEventListener('click', e => {
            e.stopPropagation();
            btnFx.classList.toggle('active');
            if (bgLayer) bgLayer.style.display = btnFx.classList.contains('active') ? '' : 'none';
        });
    }

    if (audio) {
        audio.addEventListener('play', () => {
            const first = !musicActive;
            musicActive = true;
            document.body.classList.add('audio-playing');
            // 如果当前是 default 状态，切换到 music-bar 显示正在播放
            if (getCurrentState() === 'default') setState('music-bar');
            else island.classList.remove('idle');
            if (first && !hovering) showToast('success', 'QQ音乐 · 播放中', '♪');
        });
        audio.addEventListener('pause', () => {
            document.body.classList.remove('audio-playing');
            if (getCurrentState() === 'music-bar') setState('default');
        });
        audio.addEventListener('ended', () => loadSong(curIdx + 1, true));
        audio.addEventListener('loadedmetadata', updateProgress);
        audio.addEventListener('timeupdate', updateProgress);
    }

    const sections = ['#home', '#github', '#netease', '#galgame'].map(id => document.querySelector(id));
    const SECTION_NAMES = ['首页', 'GitHub', 'QQ音乐', 'Projects'];
    const pillNav = document.getElementById('pillNav');
    const indicator = document.getElementById('indicator');
    let navJump = false;

    function moveIndicatorTo(btn) {
        if (!pillNav || !indicator || !btn) return;
        const navRect = pillNav.getBoundingClientRect();
        const itemRect = btn.getBoundingClientRect();
        indicator.style.left = (itemRect.left - navRect.left) + 'px';
        indicator.style.width = itemRect.width + 'px';
        indicator.classList.add('ready');
    }
    function repositionIndicator() {
        const act = pillNav && pillNav.querySelector('.island-nav-btn.active');
        if (!act || !indicator) return;
        indicator.style.transition = 'none';
        moveIndicatorTo(act);
        void indicator.offsetHeight;
        indicator.style.transition = '';
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const target = btn.getAttribute('href');
            if (target && target.startsWith('#')) {
                e.preventDefault();
                e.stopPropagation();
                const el = document.querySelector(target);
                if (el) {
                    navJump = true;
                    navBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    moveIndicatorTo(btn);
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setTimeout(() => { navJump = false; }, 800);
                }
            }
        });
    });
    let sectionOffsets = [];
    let scrollMax = 0, lastSpIdx = -1, lastSpPctTxt = '', lastSpBarPctTxt = '';
    function recomputeLayoutMetrics() {
        sectionOffsets = sections.map(s => s ? s.offsetTop : 0);
        scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    }
    function updateScrollSpy(y) {
        if (navJump) return;
        let idx = 0;
        for (let i = 0; i < sectionOffsets.length; i++) {
            if (sectionOffsets[i] - 120 <= y) idx = i;
        }
        if (idx !== lastSpIdx) {
            lastSpIdx = idx;
            for (let i = 0; i < navBtns.length; i++) {
                const b = navBtns[i];
                const should = i === idx;
                const wasActive = b.classList.contains('active');
                if (wasActive !== should) {
                    b.classList.toggle('active', should);
                    if (should) moveIndicatorTo(b);
                }
            }
            if (spSection) spSection.textContent = SECTION_NAMES[idx];
        }
    }

    requestAnimationFrame(() => requestAnimationFrame(() => { recomputeLayoutMetrics(); repositionIndicator(); }));
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => requestAnimationFrame(() => { recomputeLayoutMetrics(); repositionIndicator(); }));
    }
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { recomputeLayoutMetrics(); repositionIndicator(); }, 120);
    }, { passive: true });
    function updateScrollProgress(y) {
        const pct = scrollMax > 0 ? (y / scrollMax) * 100 : 0;
        const clamped = pct > 100 ? 100 : (pct < 0 ? 0 : pct);
        const barTxt = clamped.toFixed(2) + '%';
        if (barTxt !== lastSpBarPctTxt) {
            lastSpBarPctTxt = barTxt;
            if (progressBar) progressBar.style.width = barTxt;
        }
        const pctTxt = Math.round(clamped) + '%';
        if (pctTxt !== lastSpPctTxt) {
            lastSpPctTxt = pctTxt;
            if (spPct) spPct.textContent = pctTxt;
        }
    }
    const explore = document.querySelector('.explore-btn');
    if (explore) explore.addEventListener('click', () => document.querySelector('#github').scrollIntoView({ behavior: 'smooth', block: 'start' }));

    const twEl = document.querySelector('.typewriter-text');
    const phrases = ['今後也請多多指教。', '願你的明天比今天滿溢更多的幸福與笑容。', '世界由無數的言語構成。','所謂人生，就是自己筆下的故事。', '幸福的活下去吧！', "人在孤獨中降生，在孤獨中死去。", 'Welcome To Real Me!', '這個世界，總有一天也會微笑。', 'userhali.com', 'Hali'];
    if (twEl) {
        let pi = 0, ci = 0, deleting = false;
        (function type() {
            if (document.hidden) { setTimeout(type, 1000); return; }
            const full = phrases[pi];
            ci += deleting ? -1 : 1;
            twEl.textContent = full.slice(0, ci);
            let delay = deleting ? 45 : 95;
            if (!deleting && ci === full.length) { delay = 1600; deleting = true; }
            else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 450; }
            setTimeout(type, delay);
        })();
    }

    const revealObs = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    function hoverExpand() {
        if (isLocked()) return;
        if (musicActive) setState('music-card');
        else setState('nav');
        updateScrollProgress(window.scrollY || document.documentElement.scrollTop || 0);
    }
    island.addEventListener('mouseenter', () => { hovering = true; clearTimeout(collapseTimer); hoverExpand(); });
    island.addEventListener('mouseleave', () => { hovering = false; if (!userScrolling && !scrubbing) scheduleCollapse(); });
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; armIdle(); });
    document.addEventListener('keydown', armIdle);
    document.addEventListener('touchstart', armIdle, { passive: true });

    island.addEventListener('click', e => {
        if (e.target.closest('.island-mini-btn,.island-nav-btn,.island-btn,.island-email-copy,.mc-scrub')) return;
        const cur = getCurrentState();
        if (cur === 'default' || cur === 'music-bar') {
            if (musicActive && e.target.closest('.island-music-bar')) setState('music-card');
            else setState('nav');
        }
    });

    let scrollRaf = 0;
    function flushScroll() {
        scrollRaf = 0;
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        updateScrollProgress(y);
        updateScrollSpy(y);
    }
    function onScroll() {
        if (!scrollRaf) scrollRaf = requestAnimationFrame(flushScroll);
        userScrolling = true;
        const cur = getCurrentState();
        if (cur === 'confirm') { clearConfirmTimer(); pendingHref = null; showToast('error', '已取消'); island.classList.remove('idle'); }
        else if (cur === 'email') { setState('default'); island.classList.remove('idle'); }
        else if (cur === 'default' || cur === 'music-bar' || cur === 'music-card') { setState('nav'); island.classList.remove('idle'); }
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
            userScrolling = false;
            armIdle();
            if (!hovering && !scrubbing && !pointInIsland()) scheduleCollapse(700);
        }, 220);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        recomputeLayoutMetrics();
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        updateScrollProgress(y);
    }, { passive: true });

    document.addEventListener('click', e => {
        if (island.contains(e.target) || e.target.closest('.social-btn')) return;
        const cur = getCurrentState();
        if (cur === 'confirm') { clearConfirmTimer(); pendingHref = null; }
        if (cur !== 'default' && cur !== 'music-bar' && cur !== 'toast') setState('default');
    });

    let islandRevealed = false;
    function revealIsland() {
        if (islandRevealed) return;
        islandRevealed = true;
        // island 默认已可见（CSS 移除 opacity:0），只需启动 idle 计时器
        armIdle();
    }
    function runIntro() {
        const intro = document.getElementById('intro');
        if (!intro) { document.body.classList.remove('intro-lock'); revealIsland(); beginMusic(); return; }
        if (getCookie('introShown')) {
            intro.remove();
            document.body.classList.remove('intro-lock');
            revealIsland();
            beginMusic();
            return;
        }
        setCookie('introShown', '1', 86400);
        const prefix = intro.querySelector('.intro-prefix');
        const first  = intro.querySelector('.intro-first');
        const rest   = intro.querySelector('.intro-rest');
        const fr = first.getBoundingClientRect();
        const dx = window.innerWidth / 2 - (fr.left + fr.width / 2);

        prefix.style.opacity = '0'; prefix.style.transform = 'translateY(12px)';
        first.style.opacity = '0';  first.style.transform = 'translateX(' + dx + 'px) scale(2)';
        rest.style.opacity = '0';   rest.style.transform = 'translateY(12px)';

        let raf = null, done = false;
        const t0 = performance.now();
        function finish() {
            if (done) return;
            done = true;
            if (raf) cancelAnimationFrame(raf);
            intro.classList.add('done');
            intro.style.transition = 'opacity .45s ease';
            intro.style.opacity = '0';
            setTimeout(() => { if (intro.parentNode) intro.remove(); document.body.classList.remove('intro-lock'); }, 470);
            revealIsland();
            beginMusic();
        }
        function frame(now) {
            const e = now - t0;
            const pp = easeOutCubic((e - 300) / 600);
            prefix.style.opacity = pp;
            prefix.style.transform = 'translateY(' + (1 - pp) * 12 + 'px)';

            let zScale = 2, zAlpha = 0;
            if (e >= 1100) {
                const s = e - 1100;
                if (s <= 900) { const zp = easeOutCubic(s / 900); zScale = 2 + (1 - 2) * zp; zAlpha = zp; }
                else { zScale = 1; zAlpha = 1; }
            }
            let slide = 0;
            if (e > 2200) slide = e <= 3000 ? easeInOutCubic((e - 2200) / 800) : 1;
            const curDx = dx + (0 - dx) * slide;
            first.style.opacity = zAlpha;
            first.style.transform = 'translateX(' + curDx + 'px) scale(' + zScale + ')';

            let enA = 0, enY = 12;
            if (e > 2850) {
                if (e <= 3250) { const ep = easeOutCubic((e - 2850) / 400); enA = ep; enY = (1 - ep) * 12; }
                else { enA = 1; enY = 0; }
            }
            rest.style.opacity = enA;
            rest.style.transform = 'translateY(' + enY + 'px)';

            if (e >= 4400) { finish(); return; }
            raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);

        function skipAndPlay() { beginMusic(); finish(); }
        intro.addEventListener('click', skipAndPlay);
        window.addEventListener('keydown', skipAndPlay, { once: true });
        window.addEventListener('wheel', skipAndPlay, { once: true, passive: true });
        window.addEventListener('touchstart', skipAndPlay, { once: true, passive: true });
            setTimeout(finish, 6000);
    }

    renderPlaylist();
    loadSong(0, false);
    armAudioUnlock();
    // HTML 已自带 data-state="default" + active-content，无需 setState
    // setState('default', { force: true }) 会触发强制重渲染，破坏首屏
    recomputeLayoutMetrics();
    const _y0 = window.scrollY || document.documentElement.scrollTop || 0;
    updateScrollProgress(_y0);
    updateScrollSpy(_y0);
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ===== Projects: GitHub API ===== */
    const GITHUB_USER = 'haliChina';
    const CACHE_KEY = 'projects_cache_v3';
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    const LANG_COLORS = {
        JavaScript:'#f1e05a',TypeScript:'#3178c6',Python:'#3572A5',Java:'#b07219',
        'C++':'#f34b7d',C:'#555555',Go:'#00ADD8',Rust:'#dea584',HTML:'#e34c26',
        CSS:'#563d7c',Vue:'#41b883',Shell:'#89e051',Dockerfile:'#384d54',
        Kotlin:'#A97BFF',Swift:'#F05138',Ruby:'#701516',PHP:'#4F5D95'
    };
    function langColor(l){ return LANG_COLORS[l] || '#8b8b8b'; }
    function timeAgo(dateStr){
        if (!dateStr) return '';
        const d = new Date(dateStr); const diff = Date.now() - d.getTime();
        const day = 86400000;
        if (diff < day) return '今天';
        if (diff < day*2) return '昨天';
        if (diff < day*30) return Math.floor(diff/day)+'天前';
        if (diff < day*365) return Math.floor(diff/(day*30))+'个月前';
        return Math.floor(diff/(day*365))+'年前';
    }
    function esc(s){ return (s||'').replace(/[<>&"]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

    /* --- 数据源: GitHub API (浏览器直连) --- */
    async function fetchGitHubRepos(){
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
            const res = await fetch('https://api.github.com/users/'+GITHUB_USER+'/repos?sort=pushed&per_page=100', {
                headers: {'Accept': 'application/vnd.github.v3+json'},
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                if (res.status === 403) {
                    console.warn('[Projects] GitHub API rate limited (403)');
                    throw new Error('GitHub API rate limited');
                }
                if (res.status === 404) {
                    console.warn('[Projects] GitHub user not found (404)');
                    throw new Error('GitHub user not found');
                }
                throw new Error('GitHub HTTP '+res.status);
            }
            const data = await res.json();
            console.log('[Projects] GitHub repos fetched:', data.length);
            return data.filter(r => !r.fork).map(r => ({
                name: r.name,
                description: r.description || '',
                language: r.language,
                stars: r.stargazers_count || 0,
                forks: r.forks_count || 0,
                homepage: r.homepage || '',
                html_url: r.html_url,
                pushed_at: r.pushed_at,
                source: 'github'
            }));
        } catch(e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                console.warn('[Projects] GitHub fetch timeout (12s)');
                throw new Error('GitHub fetch timeout');
            }
            throw e;
        }
    }

    function renderProjects(projects){
        const grid = document.getElementById('projects-grid');
        if (!grid) return;
        if (!projects.length){ grid.innerHTML = '<div class="projects-loading">暂无公开项目</div>'; return; }
        console.log('[Projects] Rendering', projects.length, 'projects');
        grid.innerHTML = projects.map(r => {
            const lang = r.language ? '<span class="proj-lang"><i style="background:'+langColor(r.language)+'"></i>'+esc(r.language)+'</span>' : '';
            const stars = r.stars ? '<span>★ '+r.stars+'</span>' : '';
            const forks = r.forks ? '<span>⑂ '+r.forks+'</span>' : '';
            const updated = r.pushed_at ? '<span>'+timeAgo(r.pushed_at)+'</span>' : '';
            const sourceTag = '<span class="proj-source">GitHub</span>';
            const homepage = r.homepage ? '<a class="proj-link proj-link--primary" href="'+esc(r.homepage)+'" target="_blank" rel="noopener">在线预览</a>' : '';
            const sourceLink = r.html_url
                ? '<a class="proj-link" href="'+esc(r.html_url)+'" target="_blank" rel="noopener">源码</a>'
                : '';
            const nameLink = r.html_url
                ? '<a class="proj-name" href="'+esc(r.html_url)+'" target="_blank" rel="noopener">'+esc(r.name)+'</a>'
                : '<span class="proj-name">'+esc(r.name)+'</span>';
            return '<div class="proj-card">'+
                '<div class="proj-head">'+nameLink+sourceTag+'</div>'+
                (r.description ? '<p class="proj-desc">'+esc(r.description)+'</p>' : '')+
                '<div class="proj-meta">'+lang+'<div class="proj-stats">'+stars+forks+'</div>'+updated+'</div>'+
                '<div class="proj-links">'+homepage+sourceLink+'</div></div>';
        }).join('');
    }

    function showProjectsError(msg){
        const grid = document.getElementById('projects-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="projects-error"><div class="projects-error-text">'+esc(msg)+'</div><button class="projects-retry" id="projects-retry-btn">重新加载</button></div>';
        const btn = document.getElementById('projects-retry-btn');
        if (btn) btn.addEventListener('click', () => { grid.innerHTML = '<div class="projects-loading">加载中...</div>'; loadProjects(); });
    }

    async function loadProjects(){
        const grid = document.getElementById('projects-grid');
        if (!grid) return;
        // 24小时缓存
        const cached = (() => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch(_) { return null; } })();
        if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL && cached.projects) {
            console.log('[Projects] Using cache,', cached.projects.length, 'projects');
            renderProjects(cached.projects); return;
        }
        // 有旧缓存先展示
        if (cached && cached.projects) renderProjects(cached.projects);
        // 浏览器直连 GitHub API
        try {
            const projects = await fetchGitHubRepos();
            console.log('[Projects] Fetched total:', projects.length);
            if (!projects.length && !cached) {
                showProjectsError('该 GitHub 账号下暂无公开仓库');
                return;
            }
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ts:Date.now(), projects})); } catch(_){}
            renderProjects(projects);
        } catch(e) {
            console.warn('[Projects] Fetch failed:', e.message, '(浏览器可能无法访问 api.github.com，部署到 Vercel 后会正常)');
            if (!cached || !cached.projects) {
                const isSandbox = location.hostname.includes('agent-sandbox') || location.hostname.includes('trae.cn');
                const hint = isSandbox ? '（沙箱环境无法访问 GitHub API，部署到 Vercel 后可正常加载）' : '（请检查网络）';
                showProjectsError('项目加载失败 ' + hint);
            }
        }
    }
    loadProjects();

    if (document.readyState === 'complete') runIntro();
    else window.addEventListener('load', runIntro);

})();
