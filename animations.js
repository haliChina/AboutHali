(function () {
    'use strict';

    const island      = document.querySelector('.island-content');
    const navBtns     = Array.from(document.querySelectorAll('.island-nav-btn'));
    const progressBar = document.querySelector('.nav-ring-value');
    const previewSection = document.querySelector('.preview-section');
    const previewPct = document.querySelector('.preview-pct');
    const previewDots = Array.from(document.querySelectorAll('.preview-dots i'));
    const idleClock = document.querySelector('.island-idle-clock');
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
    const toggles  = Array.from(document.querySelectorAll('.np-toggle,.mc-toggle,.sat-toggle'));
    const satellite = document.getElementById('musicSatellite');
    const npScrub  = document.querySelector('.np-scrub');
    const mcScrub  = document.querySelector('.mc-scrub');
    const satScrub = document.querySelector('.sat-scrub');
    const npCur = document.querySelector('.np-cur'), npDur = document.querySelector('.np-dur');
    const mcCur = document.querySelector('.mc-cur'), mcRem = document.querySelector('.mc-rem');
    const satCur = document.querySelector('.sat-cur'), satRem = document.querySelector('.sat-rem');
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
        { name: 'All The Things She Said', artist: 't.A.T.u.', cover: 'https://p3.music.126.net/1bVvQcOLx96ZNhzfLk9bwg==/109951173376551048.jpg?param=224y224', src: 'https://api.qijieya.cn/meting/?server=netease&type=url&id=27810034' },
        { name: '渡口',     artist: '蔡琴',                  cover: 'https://p4.music.126.net/4pltwvzYfOy1PSWM6X5_hQ==/109951167871247765.jpg?param=224y224', src: 'https://api.qijieya.cn/meting/?server=netease&type=url&id=211277' },
        { name: 'Miss You', artist: 'Oliver Tree & Robin Schulz', cover: 'https://y.qq.com/music/photo_new/T002R500x500M000003N37OX0ByL7H_2.jpg?max_age=2592000&err_retry=1', src: 'https://api.qijieya.cn/meting/?server=netease&type=url&id=1969788180' },
        { name: 'Life Goes On', artist: 'Oliver Tree',        cover: 'https://y.qq.com/music/photo_new/T002R500x500M000000UAKjE2m6ksi_1.jpg?max_age=2592000', src: 'https://api.qijieya.cn/meting/?server=netease&type=url&id=1848206679' }
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
        if (audio) {
            // 切歌前先暂停并清理旧 src，避免浏览器在重定向链路上持锁导致下一次 play() 静默 reject
            try { audio.pause(); } catch(_) {}
            audio.removeAttribute('src');
            try { audio.load(); } catch(_) {}
            audio.src = s.src;
            audio.load();
        }
        setText('.np-title', s.name); setText('.np-artist', s.artist);
        setText('.mc-title,.sat-title', s.name); setText('.mc-artist,.sat-artist', s.artist);
        setSrc('.np-cover', s.cover); setCoverAnimated('.mc-cover,.sat-card-cover', s.cover); setCoverAnimated('.ib-cover,.sat-cover', s.cover);
        markActive();
        updateProgress();
        if (autoplay && audio) {
            // 显式等待 canplay 再 play，跨域 302 重定向链路下 play() 会 reject
            const onReady = () => {
                audio.removeEventListener('canplay', onReady);
                audio.removeEventListener('loadedmetadata', onReady);
                audio.play().catch(err => console.warn('[Audio] play() rejected:', err && err.name, s.src));
            };
            audio.addEventListener('canplay', onReady);
            audio.addEventListener('loadedmetadata', onReady);
            // 兜底：5s 后若仍未触发，主动尝试一次（仅限从未成功播放的场景，
            // 用户手动暂停后不得自动恢复——用 !musicActive 区分）
            setTimeout(() => {
                audio.removeEventListener('canplay', onReady);
                audio.removeEventListener('loadedmetadata', onReady);
                if (audio.paused && !musicActive) audio.play().catch(() => {});
            }, 5000);
        }
    }

    let audioUnlockArmed = false;
    function isIslandControl(target) {
        return target.closest('.island-content, .music-satellite, .island-mini-btn, .island-transport, .island-nav-btn, .island-btn, .island-email-copy, .mc-scrub, .sat-scrub, .np-scrub, .np-action-btn, .np-song-item, .social-btn, .explore-btn');
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

    // ===== Dynamic Island state controller =====
    // Shell geometry and active content change in the same frame so rapid state
    // switches remain coherent without coupling page features to animation code.

    let musicActive = false;
    let pendingHref = null;
    let collapseTimer = null, toastTimer = null, hintTimer = null, scrollEndTimer = null, idleTimer = null, confirmTimer = null, indicatorRealignTimer = null, greetTimer = null;
    let suppressOutsideClickUntil = 0;
    const CONFIRM_AUTO_MS = 8000;
    const ISLAND_TRANSITION_MS = 600; // 与 .island-content 的 width/height 过渡时长一致
    let hovering = false, userScrolling = false, scrubbing = false;
    const mouse = { x: -1, y: -1 };

    // ===== Dynamic Island state layouts: graphite desktop + compact mobile =====
    const STATE_LAYOUTS_DESKTOP = {
        'default':{width:'134px',height:'36px',radius:'18px'},'preview':{width:'224px',height:'36px',radius:'18px'},'hint':{width:'228px',height:'36px',radius:'18px'},'greet':{width:'244px',height:'36px',radius:'18px'},'music-bar':{width:'192px',height:'36px',radius:'18px'},
        'nav':{width:'408px',height:'56px',radius:'28px'},'music-card':{width:'392px',height:'184px',radius:'32px'},
        'confirm':{width:'344px',height:'130px',radius:'28px'},'email':{width:'312px',height:'132px',radius:'28px'},
        'toast':{width:'228px',height:'42px',radius:'21px'},'autoplay':{width:'312px',height:'106px',radius:'26px'}
    };
    const STATE_LAYOUTS_MOBILE = {
        'default':{width:'124px',height:'34px',radius:'17px'},'preview':{width:'212px',height:'34px',radius:'17px'},'hint':{width:'214px',height:'34px',radius:'17px'},'greet':{width:'228px',height:'34px',radius:'17px'},'music-bar':{width:'176px',height:'34px',radius:'17px'},
        'nav':{width:'320px',height:'52px',radius:'26px'},'music-card':{width:'352px',height:'174px',radius:'30px'},
        'confirm':{width:'330px',height:'128px',radius:'26px'},'email':{width:'300px',height:'126px',radius:'26px'},
        'toast':{width:'212px',height:'40px',radius:'20px'},'autoplay':{width:'300px',height:'104px',radius:'24px'}
    };
    function getStateLayout(target) {
        const table = matchMedia('(max-width:768px)').matches ? STATE_LAYOUTS_MOBILE : STATE_LAYOUTS_DESKTOP;
        return table[target];
    }
    // ===== State content registry =====
    const STATE_CONTENTS = {
        'default':    island.querySelector('.island-default'),
        'preview':    island.querySelector('.island-preview'),
        'music-bar':  island.querySelector('.island-music-bar'),
        'nav':        island.querySelector('.island-nav'),
        'music-card': island.querySelector('.island-music-card'),
        'confirm':    island.querySelector('.island-confirm'),
        'email':      island.querySelector('.island-email'),
        'hint':       island.querySelector('.island-hint'),
        'greet':      island.querySelector('.island-greet'),
        'toast':      island.querySelector('.island-toast'),
        'autoplay':   island.querySelector('.island-autoplay')
    };

    function getCurrentState() {
        return island.getAttribute('data-state') || 'default';
    }

    function baseSatelliteMode(state) {
        if (!musicActive || !satellite) return 'hidden';
        if (state === 'default' || state === 'music-bar' || state === 'music-card') return 'hidden';
        return state === 'nav' || state === 'confirm' || state === 'email' || state === 'autoplay' ? 'icon' : 'pill';
    }
    function syncSatellite(state, force) {
        if (!satellite) return;
        // force=true 时强制按主岛状态重算（副岛不再有独立 open 模式）
        if (!force && satellite.dataset.mode === 'open') return;
        satellite.dataset.mode = baseSatelliteMode(state || getCurrentState());
    }
    // Apply shell geometry and active layer atomically.
    function setState(target, opts) {
        opts = opts || {};
        const current = getCurrentState();
        if (current === target && !opts.force) return;

        // 检测是否启用 View Transitions 形变(music-bar <-> music-card 时由浏览器接管 width/height 过渡)
        const useVT = !!document.startViewTransition &&
            ((current === 'music-bar' && target === 'music-card') ||
             (current === 'music-card' && target === 'music-bar'));

        const applyChanges = () => {
            // Step 1: 隐藏旧内容（fade-out 0.2s）
            if (STATE_CONTENTS[current]) STATE_CONTENTS[current].classList.remove('active-content');

            // Step 2: 改变外壳物理属性（弹性 0.6s, bg 0.4s）
            const layout = getStateLayout(target);
            if (layout) {
                island.style.width      = layout.width;
                island.style.height     = layout.height;
                island.style.borderRadius = layout.radius;
                island.style.backgroundColor = '#0c0c12';
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
            syncSatellite(target);
        };

        if (useVT) {
            // vt-morphing: 临时关掉 .island-content 的 width/height 过渡,让 VT API 接管形变
            island.classList.add('vt-morphing');
            const vt = document.startViewTransition(applyChanges);
            // finished 优先,失败时用 ready兜底,避免 vt-morphing 残留
            (vt.finished || vt.ready || Promise.resolve()).then(
                () => island.classList.remove('vt-morphing'),
                () => island.classList.remove('vt-morphing')
            );
        } else {
            applyChanges();
        }

        // 指示器在外壳过渡结束后再定位(过渡中 getBoundingClientRect 会读到裁剪过的错误尺寸)
        if (target === 'nav' || target === 'preview' || target === 'music-card' || target === 'music-bar') {
            clearTimeout(indicatorRealignTimer);
            indicatorRealignTimer = setTimeout(repositionIndicator, ISLAND_TRANSITION_MS + 20);
        }

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
        return s === 'confirm' || s === 'email' || s === 'hint' || s === 'toast' || s === 'autoplay' || s === 'greet';
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

    // 强制层重新播放入场过渡：内联样式先落到基础态（模糊+缩放+透明），
    // 强制 reflow 后再清除内联样式，让 CSS transition 从基础态过渡到激活态。
    // （classList remove→re-add 在同一帧内会被浏览器合并，无法重触发过渡）
    function playLayerEntrance(layer) {
        if (!layer) return;
        layer.style.transition = 'none';
        layer.style.opacity = '0';
        layer.style.transform = 'scale(.92) translateY(6px)';
        layer.style.filter = 'blur(8px)';
        void layer.offsetWidth;
        layer.style.transition = '';
        layer.style.opacity = '';
        layer.style.transform = '';
        layer.style.filter = '';
    }

    function showSectionHint() {
        if (!STATE_CONTENTS.hint || (isLocked() && getCurrentState() !== 'hint')) return;
        clearTimeout(collapseTimer);
        clearTimeout(hintTimer);
        const hintSection = document.querySelector('.hint-section');
        if (hintSection) hintSection.textContent = SECTION_NAMES[lastSpIdx < 0 ? 0 : lastSpIdx];
        const hintLayer = STATE_CONTENTS['hint'];
        if (getCurrentState() === 'hint') {
            // 连续跨越区块时 hint 层已 active，setState early-return：用内联样式强制重播放入
            playLayerEntrance(hintLayer);
        } else {
            setState('hint');
            playLayerEntrance(hintLayer);
        }
        hintTimer = setTimeout(() => setState(musicActive ? 'music-bar' : 'default'), 1700);
    }

    // ===== 欢迎岛（demo greet 状态）：开场后短暂显示"はじめまして · 欢迎来访" =====
    function showGreet(after) {
        if (!STATE_CONTENTS.greet || isLocked()) { if (after) after(); return; }
        clearTimeout(greetTimer);
        setState('greet');
        greetTimer = setTimeout(() => {
            setState(musicActive ? 'music-bar' : 'default');
            if (after) after();
        }, 2300);
    }

    // ===== Autoplay request =====
    // 与原始版本一致：偏好只存 cookie（1 年），值 'ask'|'enabled'|'off'
    const AUTOPLAY_COOKIE = 'autoplayPref';
    function getAutoplayPref() {
        const v = getCookie(AUTOPLAY_COOKIE);
        return v === 'enabled' || v === 'off' ? v : 'ask';
    }
    function setAutoplayPref(v) { setCookie(AUTOPLAY_COOKIE, v, 31536000); } // 1 年
    function showAutoplayPrompt() {
        const noAsk = document.getElementById('autoplay-no-ask');
        if (noAsk) noAsk.checked = false;
        suppressOutsideClickUntil = performance.now() + 700;
        setState('autoplay');
    }
    function dismissAutoplayPrompt() { setState(musicActive ? 'music-bar' : 'default'); }
    function acceptAutoplay() {
        const noAsk = !!(document.getElementById('autoplay-no-ask') && document.getElementById('autoplay-no-ask').checked);
        if (noAsk) setAutoplayPref('enabled');
        dismissAutoplayPrompt();
        beginMusic();
    }
    function declineAutoplay() {
        const noAsk = !!(document.getElementById('autoplay-no-ask') && document.getElementById('autoplay-no-ask').checked);
        if (noAsk) setAutoplayPref('off');
        dismissAutoplayPrompt();
    }
    const _btnEnable = document.getElementById('autoplay-enable');
    const _btnLater  = document.getElementById('autoplay-later');
    if (_btnEnable) _btnEnable.addEventListener('click', e => { e.stopPropagation(); acceptAutoplay(); });
    if (_btnLater)  _btnLater.addEventListener('click',  e => { e.stopPropagation(); declineAutoplay(); });

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
        // 连续点击不同联系方式时 confirm 层可能已处于 active，setState 会 early-return
        // （只更新文字无动效）：用内联样式强制重播放入场过渡
        playLayerEntrance(STATE_CONTENTS['confirm']);
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
        const cTxt = fmt(c), dTxt = fmt(d), remTxt = '−' + fmt(Math.max(0, d - c));
        if (cTxt !== lastNpCurTxt) {
            lastNpCurTxt = cTxt;
            if (npCur) npCur.textContent = cTxt;
            if (mcCur) mcCur.textContent = cTxt;
            if (satCur) satCur.textContent = cTxt;
        }
        if (dTxt !== lastNpDurTxt) {
            lastNpDurTxt = dTxt;
            if (npDur) npDur.textContent = dTxt;
            if (mcRem) mcRem.textContent = remTxt;
            if (satRem) satRem.textContent = remTxt;
        }
        if (!scrubbing) {
            const v = pct * 10;
            if (npScrub) { npScrub.value = v; fillScrub(npScrub, pct); }
            if (mcScrub) { mcScrub.value = v; fillScrub(mcScrub, pct); }
            if (satScrub) { satScrub.value = v; fillScrub(satScrub, pct); }
        }
    }
    function togglePlay() {
        if (!audio) return;
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
    }
    toggles.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); togglePlay(); }));
    document.querySelectorAll('.np-prev,.mc-prev,.sat-prev').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); loadSong(curIdx - 1, true); }));
    document.querySelectorAll('.np-next,.mc-next,.sat-next').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); loadSong(curIdx + 1, true); }));

    [npScrub, mcScrub, satScrub].forEach(sc => {
        if (!sc) return;
        sc.addEventListener('input', () => {
            scrubbing = true;
            const pct = sc.value / 10;
            fillScrub(sc, pct);
            if (npScrub && npScrub !== sc) { npScrub.value = sc.value; fillScrub(npScrub, pct); }
            if (mcScrub && mcScrub !== sc) { mcScrub.value = sc.value; fillScrub(mcScrub, pct); }
            if (satScrub && satScrub !== sc) { satScrub.value = sc.value; fillScrub(satScrub, pct); }
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
            syncSatellite();
            if (first && !hovering) showToast('success', 'QQ音乐 · 播放中', '♪');
        });
        audio.addEventListener('pause', () => {
            document.body.classList.remove('audio-playing');
            if (getCurrentState() === 'music-bar') setState('default');
            syncSatellite();
        });
        audio.addEventListener('ended', () => loadSong(curIdx + 1, true));
        audio.addEventListener('loadedmetadata', updateProgress);
        audio.addEventListener('timeupdate', updateProgress);
    }

    const sections = ['#home', '#github', '#netease', '#project'].map(id => document.querySelector(id));
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

    function scrollToHash(target) {
        const orbitEnd = document.getElementById('orbit-qq');
        const orbitPin = document.querySelector('.orbit-pin');
        let el = document.querySelector(target);
        if (target === '#netease' && orbitEnd && orbitEnd.getBoundingClientRect().height > 8) el = orbitEnd;
        else if (target === '#netease' && orbitPin) el = orbitPin;
        if (!el) return;
        const y = el.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop || 0);
        window.scrollTo({ top: y, behavior: smoothBehavior() });
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
                    scrollToHash(target);
                    setTimeout(() => { navJump = false; }, 800);
                }
            }
        });
    });
    let sectionOffsets = [];
    let scrollMax = 0, lastSpIdx = -1, lastSpPctTxt = '', lastSpBarPctTxt = '';
    function pageY(el) {
        return el ? (el.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop || 0)) : 0;
    }
    function recomputeLayoutMetrics() {
        const orbitEnd = document.getElementById('orbit-qq');
        sectionOffsets = sections.map((s, i) => {
            if (!s) return 0;
            if (i === 2 && orbitEnd && orbitEnd.offsetHeight > 8) return pageY(orbitEnd);
            return pageY(s);
        });
        scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    }
    function updateScrollSpy(y) {
        if (navJump) return;
        let idx = 0;
        for (let i = 0; i < sectionOffsets.length; i++) {
            if (sectionOffsets[i] - 120 <= y) idx = i;
        }
        if (idx !== lastSpIdx) {
            const previousIdx = lastSpIdx;
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
            if (previewSection) previewSection.textContent = SECTION_NAMES[idx];
            previewDots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
            if (previousIdx >= 0 && !navJump) {
                clearTimeout(scrollEndTimer);
                showSectionHint();
            }
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
        const dash = (53.407 * clamped / 100).toFixed(2);
        if (dash !== lastSpBarPctTxt) {
            lastSpBarPctTxt = dash;
            if (progressBar) progressBar.style.strokeDasharray = dash + ' 53.41';
        }
        const pctTxt = Math.round(clamped) + '%';
        if (pctTxt !== lastSpPctTxt) {
            lastSpPctTxt = pctTxt;
            if (spPct) spPct.textContent = pctTxt;
            if (previewPct) previewPct.textContent = pctTxt;
        }
    }
    function updateIdleClock() {
        if (!idleClock) return;
        const d = new Date();
        idleClock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }
    updateIdleClock();
    setInterval(updateIdleClock, 10000);
    setInterval(() => island.classList.toggle('show-idle-time'), 4200);

    const explore = document.querySelector('.explore-btn');
    /* MWG accessibility: reduced-motion 用户跳过平滑滚动 */
    const smoothBehavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (explore) explore.addEventListener('click', () => document.querySelector('#github').scrollIntoView({ behavior: smoothBehavior(), block: 'start' }));

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
        if (isLocked() || isTouchDevice) return;
        const cur = getCurrentState();
        if (cur === 'default') setState('preview');
        else if (cur === 'music-bar' && musicActive) setState('music-card');
        updateScrollProgress(window.scrollY || document.documentElement.scrollTop || 0);
    }
    island.addEventListener('mouseenter', () => { hovering = true; clearTimeout(collapseTimer); hoverExpand(); });
    island.addEventListener('mouseleave', () => {
        hovering = false;
        if (getCurrentState() === 'preview') setState('default');
        else if (!userScrolling && !scrubbing) scheduleCollapse();
    });
    // ===== Mouse tracking: rAF-throttled, skipped on touch devices =====
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    let mouseMovePending = false;
    function onMouseMove(e) {
        if (isTouchDevice) return; // touch 设备不需要 mouseenter 逻辑
        mouse.x = e.clientX; mouse.y = e.clientY;
        if (mouseMovePending) return;
        mouseMovePending = true;
        requestAnimationFrame(() => { mouseMovePending = false; armIdle(); });
    }
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('keydown', armIdle);
    document.addEventListener('touchstart', armIdle, { passive: true });


    if (satellite) {
        // 右侧小岛只是音乐卡片的入口：点击时由主岛区域展示播放卡（music-card），
        // 副岛自身随主岛状态机隐藏/显示，不关闭主岛也不用 display:none 让位。
        satellite.addEventListener('click', e => {
            if (e.target.closest('.island-transport,.sat-scrub')) return;
            e.stopPropagation();
            if (!musicActive) return;
            const cur = getCurrentState();
            if (cur === 'music-card') setState('music-bar');
            else setState('music-card');
        });
    }

    island.addEventListener('click', e => {
        if (e.target.closest('.island-mini-btn,.island-nav-btn,.island-btn,.island-email-copy,.mc-scrub')) return;
        const cur = getCurrentState();
        if (cur === 'default' || cur === 'preview' || cur === 'music-bar') {
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
        else if (cur === 'hint' || cur === 'autoplay' || cur === 'toast') { /* transient state owns the island */ }
        else if (cur === 'default' || cur === 'preview' || cur === 'music-bar' || cur === 'music-card') { setState('nav'); island.classList.remove('idle'); }
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
            userScrolling = false;
            armIdle();
            if (!hovering && !scrubbing && !pointInIsland() && getCurrentState() !== 'hint') scheduleCollapse(700);
        }, 220);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        recomputeLayoutMetrics();
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        updateScrollProgress(y);
    }, { passive: true });

    document.addEventListener('click', e => {
        if (performance.now() < suppressOutsideClickUntil) return;
        if (island.contains(e.target) || (satellite && satellite.contains(e.target)) || e.target.closest('.social-btn')) return;
        const cur = getCurrentState();
        if (cur === 'confirm') { clearConfirmTimer(); pendingHref = null; }
        if (cur !== 'default' && cur !== 'music-bar' && cur !== 'toast') setState('default');
    });

    let islandRevealed = false;
    function revealIsland() {
        if (islandRevealed) return;
        islandRevealed = true;
        const clearEntrance = () => island.classList.remove('island-entrance');
        island.addEventListener('animationend', clearEntrance, { once: true });
        island.classList.add('island-entrance');
        // Reduced-motion can finish before animationend is observable.
        setTimeout(clearEntrance, 850);
        armIdle();
    }
    function hasSeenIntro() {
        try { return localStorage.getItem('introShown') === '1' || getCookie('introShown') === '1'; }
        catch (_) { return getCookie('introShown') === '1'; }
    }
    function rememberIntro() {
        try { localStorage.setItem('introShown', '1'); } catch (_) {}
        setCookie('introShown', '1', 31536000);
    }
    function runIntro() {
        const intro = document.getElementById('intro');
        if (!intro) { document.body.classList.remove('intro-lock'); revealIsland(); handlePostIntro(); return; }
        if (hasSeenIntro()) {
            intro.remove();
            document.body.classList.remove('intro-lock');
            revealIsland();
            handlePostIntro();
            return;
        }
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
            intro.removeEventListener('click', skipIntro);
            window.removeEventListener('keydown', skipIntro);
            window.removeEventListener('wheel', skipIntro);
            window.removeEventListener('touchstart', skipIntro);
            rememberIntro();
            if (raf) cancelAnimationFrame(raf);
            intro.classList.add('done');
            intro.style.transition = 'opacity .45s ease';
            intro.style.opacity = '0';
        setTimeout(() => {
            if (intro.parentNode) intro.remove();
            document.body.classList.remove('intro-lock');
            document.dispatchEvent(new CustomEvent('intro-done'));
            revealIsland();
            handlePostIntro();
        }, 470);
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

        function skipIntro(e) {
            if (e && e.type === 'touchstart') e.preventDefault();
            if (e) e.stopPropagation();
            rememberIntro();
            suppressOutsideClickUntil = performance.now() + 700;
            finish();
        }
        intro.addEventListener('click', skipIntro);
        window.addEventListener('keydown', skipIntro, { once: true });
        window.addEventListener('wheel', skipIntro, { once: true, passive: false });
        window.addEventListener('touchstart', skipIntro, { once: true, passive: false });
            setTimeout(finish, 6000);
    }

    // ===== Intro completion autoplay policy（与原版一致，无回落提示） =====
    // 'enabled' → 用户勾选过"不再提示 + 开启"：尝试自动播放，被浏览器拦截时
    //             静默降级为首次手势解锁（armAudioUnlock）
    // 'off'     → 用户勾选过"不再提示 + 稍后"：静默不播
    // 'ask'     → 默认 / 未表态：展示请求岛询问
    function handlePostIntro() {
        const pref = getAutoplayPref();
        // 欢迎岛每次开场后先显示（2.3s）；未表态（ask）时欢迎结束再弹播放确认岛
        showGreet(() => {
            if (pref === 'ask' && getCurrentState() === 'default') showAutoplayPrompt();
        });
        if (pref === 'enabled') {
            beginMusic();
            armAudioUnlock();
        }
    }

    renderPlaylist();
    loadSong(0, false);
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
        grid.innerHTML = projects.map((r, i) => {
            const lang = r.language ? '<span class="proj-lang"><i style="background:'+langColor(r.language)+'"></i>'+esc(r.language)+'</span>' : '';
            const stars = r.stars ? '<span>★ '+r.stars+'</span>' : '';
            const forks = r.forks ? '<span>⑂ '+r.forks+'</span>' : '';
            const updated = r.pushed_at ? '<span class="proj-time">'+timeAgo(r.pushed_at)+'</span>' : '';
            const sourceTag = '<span class="proj-source">GitHub</span>';
            const homepage = r.homepage ? '<a class="proj-link proj-link--primary" href="'+esc(r.homepage)+'" target="_blank" rel="noopener">在线预览</a>' : '';
            const sourceLink = r.html_url
                ? '<a class="proj-link" href="'+esc(r.html_url)+'" target="_blank" rel="noopener">源码</a>'
                : '';
            const nameLink = r.html_url
                ? '<a class="proj-name" href="'+esc(r.html_url)+'" target="_blank" rel="noopener">'+esc(r.name)+'</a>'
                : '<span class="proj-name">'+esc(r.name)+'</span>';
            return '<div class="proj-card" data-i="'+i+'">'+
                '<div class="proj-head">'+nameLink+sourceTag+'</div>'+
                (r.description ? '<p class="proj-desc">'+esc(r.description)+'</p>' : '')+
                '<div class="proj-meta">'+lang+'<div class="proj-stats">'+stars+forks+'</div>'+updated+'</div>'+
                '<div class="proj-links">'+homepage+sourceLink+'</div></div>';
        }).join('');
        layoutProjectColumns(grid);
        lastProjCols = projectColumnCount(grid);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { enhanceProjectCards(grid); });
        });
    }

    function projectColumnCount(grid) {
        const wrap = grid.closest('.projects-wrap') || grid;
        const n = parseInt(getComputedStyle(wrap).getPropertyValue('--proj-cols'), 10);
        return n >= 1 ? n : 1;
    }
    function layoutProjectColumns(grid) {
        const cards = Array.from(grid.querySelectorAll('.proj-card')).sort(function (a, b) {
            return (+a.dataset.i || 0) - (+b.dataset.i || 0);
        });
        if (!cards.length) return;
        const cols = projectColumnCount(grid);
        grid.querySelectorAll('.proj-col').forEach(function (col) { col.remove(); });
        if (cols <= 1) {
            cards.forEach(function (card) { grid.appendChild(card); });
            return;
        }
        const buckets = [];
        for (let i = 0; i < cols; i++) {
            const col = document.createElement('div');
            col.className = 'proj-col';
            grid.appendChild(col);
            buckets.push(col);
        }
        cards.forEach(function (card, i) { buckets[i % cols].appendChild(card); });
    }
    let lastProjCols = 0;
    window.addEventListener('resize', function () {
        const grid = document.getElementById('projects-grid');
        if (!grid || !grid.querySelector('.proj-card')) return;
        const n = projectColumnCount(grid);
        if (n === lastProjCols) return;
        lastProjCols = n;
        layoutProjectColumns(grid);
    }, { passive: true });

    function enhanceProjectCards(grid) {
        grid.querySelectorAll('.proj-card').forEach(function (card) {
            const desc = card.querySelector('.proj-desc');
            if (!desc) return;
            if (desc.scrollHeight <= desc.clientHeight + 2) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'proj-more';
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = '展开简介';
            desc.insertAdjacentElement('afterend', btn);
            btn.addEventListener('click', function () {
                const open = card.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                btn.textContent = open ? '收起简介' : '展开简介';
            });
        });
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
    /* MWG defer-work-until-scroll-ends: 项目数据推迟到 Projects 区接近视口再拉取，
       避免与首屏（shader/字体/头像）抢带宽；无 IO 支持或已滚过则立即加载。 */
    const projectsSection = document.getElementById('project');
    if (projectsSection && 'IntersectionObserver' in window) {
        const projObs = new IntersectionObserver((entries) => {
            if (entries.some(en => en.isIntersecting)) { projObs.disconnect(); loadProjects(); }
        }, { rootMargin: '600px 0px' });
        projObs.observe(projectsSection);
    } else {
        loadProjects();
    }

    // ===== GitHub Stats / Top Languages 加载失败时的本地兜底卡片 =====
    // 用 inline SVG 替代原图，保持布局占位并提供"加载失败"提示与重试入口
    window.__ghStatsFallback = function(label) {
        const wrap = document.createElement('div');
        wrap.className = 'gh-stats-card gh-stats-fallback';
        wrap.setAttribute('role', 'img');
        wrap.setAttribute('aria-label', label + ' 加载失败');
        wrap.innerHTML =
            '<div class="gh-fb-title">' + label + '</div>' +
            '<div class="gh-fb-msg">加载失败</div>' +
            '<button class="gh-fb-retry" type="button">重试</button>';
        // 点击重试：把容器替换回 <img>，让浏览器重新发起请求
        wrap.querySelector('.gh-fb-retry').addEventListener('click', () => {
            const img = document.createElement('img');
            img.className = 'gh-stats-card';
            img.alt = label;
            img.decoding = 'async';
            img.loading = 'lazy';
            const base = 'https://github-stats-extended.vercel.app/api';
            img.src = (label === 'Stats')
                ? base + '?username=haliChina&show_icons=true&theme=tokyonight&hide_border=true&_r=' + Date.now()
                : base + '/top-langs/?username=haliChina&layout=compact&theme=tokyonight&hide_border=true&_r=' + Date.now();
            img.onerror = function() { this.replaceWith(window.__ghStatsFallback(label)); };
            wrap.replaceWith(img);
        });
        return wrap;
    };

    if (document.readyState === 'complete') runIntro();
    else window.addEventListener('load', runIntro);

    (function setupOrbit() {
        const track = document.getElementById('orbit-track');
        const ring = document.getElementById('orbit-ring');
        const fromFace = track && track.querySelector('.orbit-face--from');
        const toFace = document.getElementById('netease');
        if (!track || !ring || !toFace) return;

        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const mobile = matchMedia('(max-width: 768px)').matches;
        const cssOrbit = CSS.supports('(animation-timeline: view()) and (animation-range: 0% 100%)');

        function setFaceState(progress) {
            const onQq = progress > 0.5;
            if (fromFace) {
                fromFace.toggleAttribute('inert', onQq);
                fromFace.setAttribute('aria-hidden', 'true');
            }
            toFace.toggleAttribute('inert', !onQq);
            if (onQq) toFace.removeAttribute('aria-hidden');
            else toFace.setAttribute('aria-hidden', 'true');
        }

        if (reduced || mobile) {
            setFaceState(1);
            toFace.removeAttribute('inert');
            toFace.removeAttribute('aria-hidden');
            return;
        }

        document.documentElement.classList.add('orbit-snap');

        function progressFromScroll() {
            const rect = track.getBoundingClientRect();
            const vh = window.innerHeight || 1;
            const travel = Math.max(1, track.offsetHeight - vh);
            return Math.max(0, Math.min(1, -rect.top / travel));
        }

        let snapTimer = 0;
        function armOrbitSnap() {
            clearTimeout(snapTimer);
            snapTimer = setTimeout(function () {
                if (navJump) return;
                const p = progressFromScroll();
                if (p <= 0.12 || p >= 0.88) return;
                const endEl = document.getElementById('orbit-qq');
                const yNow = window.scrollY || document.documentElement.scrollTop || 0;
                const target = p < 0.5 ? pageY(track) : pageY(endEl);
                if (!isFinite(target) || Math.abs(yNow - target) < 10) return;
                window.scrollTo({ top: target, behavior: 'smooth' });
            }, 170);
        }
        window.addEventListener('scroll', armOrbitSnap, { passive: true });

        if (!cssOrbit) {
            let raf = 0;
            function paint() {
                raf = 0;
                const p = progressFromScroll();
                ring.style.transform = 'rotateY(' + (-180 * p).toFixed(2) + 'deg)';
                setFaceState(p);
            }
            function onScroll() {
                if (!raf) raf = requestAnimationFrame(paint);
            }
            window.addEventListener('scroll', onScroll, { passive: true });
            paint();
        } else {
            let raf = 0;
            function sync() {
                raf = 0;
                setFaceState(progressFromScroll());
            }
            window.addEventListener('scroll', function () {
                if (!raf) raf = requestAnimationFrame(sync);
            }, { passive: true });
            sync();
        }
    })();

})();
