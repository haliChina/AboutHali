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

    const COVER_SAKURA = 'https://p2.music.126.net/jnqRJD_lbRpJCvHFQQc8UQ==/109951166783005206.jpg?param=300y300';
    const PLAYLIST = [
        { id: 399367379, name: '夢の歩みを見上げて', artist: '松本文紀', cover: COVER_SAKURA },
        { id: 28556044,  name: '君に逢えたから (Inst Arrange ver.)', artist: '忍', cover: 'https://p2.music.126.net/hBgqDy0uOWEMiN6dZnQduQ==/5908775487900380.jpg?param=300y300' },
        { id: 399366422, name: '舞い上がる因果交流', artist: '松本文紀', cover: COVER_SAKURA },
        { id: 399366419, name: 'この櫻ノ詩の下', artist: '松本文紀', cover: COVER_SAKURA }
    ];
    const songUrl = id => 'https://music.163.com/song/media/outer/url?id=' + id + '.mp3';
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
        if (audio) audio.src = songUrl(s.id);
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

    const VS = ['vs-default', 'vs-music-bar', 'vs-nav', 'vs-music-card', 'vs-confirm', 'vs-email', 'vs-toast'];
    let mode = 'collapsed';
    let musicActive = false;
    let pendingHref = null;
    let collapseTimer = null, toastTimer = null, scrollEndTimer = null, idleTimer = null, confirmTimer = null;
    const CONFIRM_AUTO_MS = 8000;
    let hovering = false, userScrolling = false, scrubbing = false;
    const mouse = { x: -1, y: -1 };

    function resolveVs() {
        if (mode === 'confirm') return 'vs-confirm';
        if (mode === 'email') return 'vs-email';
        if (mode === 'toast') return 'vs-toast';
        if (mode === 'music-card') return 'vs-music-card';
        if (mode === 'expanded') return 'vs-nav';
        return musicActive ? 'vs-music-bar' : 'vs-default';
    }
    function render() {
        const vs = resolveVs();
        island.classList.remove.apply(island.classList, VS);
        island.classList.add(vs);
        if (mode !== 'toast') island.classList.remove('toast-success', 'toast-error');
        if (mode !== 'confirm') island.classList.remove('confirm-swap');
    }
    function getCurrentVs() {
        for (let i = 0; i < VS.length; i++) if (island.classList.contains(VS[i])) return VS[i];
        return 'vs-default';
    }
    function isLocked() { return mode === 'confirm' || mode === 'email' || mode === 'toast'; }
    function setMode(m) {
        mode = m;
        island.classList.remove('idle');
        const prevVs = getCurrentVs();
        const nextVs = resolveVs();

        const morph = document.startViewTransition &&
            ((prevVs === 'vs-music-bar' && nextVs === 'vs-music-card') ||
             (prevVs === 'vs-music-card' && nextVs === 'vs-music-bar'));
        if (morph) {
            island.classList.add('vt-morphing');
            const vt = document.startViewTransition(() => render());
            vt.finished.then(() => island.classList.remove('vt-morphing'));
            vt.ready.catch(() => island.classList.remove('vt-morphing'));
        } else {
            render();
        }
        armIdle();
    }
    function pointInIsland() {
        const r = island.getBoundingClientRect();
        return mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom;
    }
    function scheduleCollapse(delay) {
        clearTimeout(collapseTimer);
        collapseTimer = setTimeout(() => {
            if (!hovering && !userScrolling && !scrubbing && !isLocked()) setMode('collapsed');
        }, delay || 900);
    }

    function armIdle() {
        island.classList.remove('idle');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (mode === 'collapsed' && !musicActive && !hovering && !userScrolling) island.classList.add('idle');
        }, 3000);
    }

    function showToast(kind, msg, icon) {
        clearTimeout(toastTimer);
        mode = 'toast';
        island.classList.remove('toast-success', 'toast-error', 'idle');
        island.classList.add(kind === 'error' ? 'toast-error' : 'toast-success');
        toastIcon.textContent = icon || (kind === 'error' ? '×' : '✓');
        toastMsg.textContent = msg;
        render();
        toastTimer = setTimeout(() => { setMode(hovering ? 'expanded' : 'collapsed'); }, 1300);
    }

    function clearConfirmTimer() { clearTimeout(confirmTimer); confirmTimer = null; }

    function prettyHost(href) {
        try {
            return new URL(href).hostname.replace(/^www\./, '');
        } catch (_) { return href || ''; }
    }

    function askConfirm(title, href, iconSrc, iconInvert) {
        const switching = mode === 'confirm';
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
        setMode('confirm');
        if (switching) {
            island.classList.remove('confirm-swap');
            void island.offsetWidth;
            island.classList.add('confirm-swap');
        } else {
            island.classList.remove('confirm-swap');
        }
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
            if (link.id === 'email-link' || !href) { e.preventDefault(); setMode('email'); return; }
            if (!href.startsWith('#')) {
                e.preventDefault();
                const img = link.querySelector('img');
                const iconSrc = img ? img.getAttribute('src') : null;
                const iconInvert = !link.classList.contains('social-btn-img');
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
            island.classList.remove('idle');
            render();
            if (first && !hovering) showToast('success', '网易云 · 播放中', '♪');
        });
        audio.addEventListener('pause', () => { document.body.classList.remove('audio-playing'); render(); });
        audio.addEventListener('ended', () => loadSong(curIdx + 1, true));
        audio.addEventListener('loadedmetadata', updateProgress);
        audio.addEventListener('timeupdate', updateProgress);
    }

    const sections = ['#home', '#github', '#netease'].map(id => document.querySelector(id));
    const SECTION_NAMES = ['首页', 'GitHub', '网易云'];
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
    const phrases = ['今后也请多多指教。', '愿你的明天比今天满溢更多的幸福与笑容。', '世界由无数的言语构成。','所谓人生，就是自己笔下的故事。', '幸福的活下去吧！', "人在孤独中降生，在孤独中死去。", 'このセカイもきっといつか微笑む。', '结束亦是新的开始。', '生存便是寂寞。', '那么，下周再见。','倘若有人听见了我的声音，这说明我并不是孤身一人。'];
    if (twEl) {
        let pi = 0, ci = 0, deleting = false;
        (function type() {
            if (document.hidden) { setTimeout(type, 1000); return; }
            const full = phrases[pi];
            ci += deleting ? -1 : 1;
            twEl.textContent = full.slice(0, ci);
            let delay = deleting ? 45 : 95;
            if (!deleting && ci === full.length) { delay = 3550; deleting = true; }
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
        if (musicActive && !userScrolling) setMode('music-card');
        else setMode('expanded');
        updateScrollProgress(window.scrollY || document.documentElement.scrollTop || 0);
    }
    island.addEventListener('mouseenter', () => { hovering = true; clearTimeout(collapseTimer); hoverExpand(); });
    island.addEventListener('mouseleave', () => { hovering = false; if (!userScrolling && !scrubbing) scheduleCollapse(); });
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; armIdle(); });
    document.addEventListener('keydown', armIdle);
    document.addEventListener('touchstart', armIdle, { passive: true });

    island.addEventListener('click', e => {
        if (e.target.closest('.island-mini-btn,.island-nav-btn,.island-btn,.island-email-copy,.mc-scrub')) return;
        if (mode === 'collapsed') {
            if (musicActive && e.target.closest('.island-music-bar')) setMode('music-card');
            else setMode('expanded');
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
        if (mode === 'confirm') { clearConfirmTimer(); pendingHref = null; showToast('error', '已取消'); island.classList.remove('idle'); }
        else if (mode === 'email') { setMode('collapsed'); island.classList.remove('idle'); }
        else if (mode === 'collapsed' || mode === 'music-card') { setMode('expanded'); island.classList.remove('idle'); }
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
        if (mode === 'confirm') { clearConfirmTimer(); pendingHref = null; }
        if (mode !== 'collapsed' && mode !== 'toast') setMode('collapsed');
    });

    let islandRevealed = false;
    function revealIsland() {
        if (islandRevealed) return;
        islandRevealed = true;
        island.classList.add('ready', 'island-entrance');
        island.addEventListener('animationend', function h() {
            island.classList.remove('island-entrance');
            island.removeEventListener('animationend', h);
        });
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

    const bangumiBtn = document.getElementById('bangumi-btn');
    if (bangumiBtn && new Date(Date.now() + 8 * 3600 * 1000) >= new Date('2026-08-16T00:00:00Z')) {
        bangumiBtn.style.display = '';
    }

    renderPlaylist();
    loadSong(0, false);
    armAudioUnlock();
    render();
    recomputeLayoutMetrics();
    const _y0 = window.scrollY || document.documentElement.scrollTop || 0;
    updateScrollProgress(_y0);
    updateScrollSpy(_y0);
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (document.readyState === 'complete') runIntro();
    else window.addEventListener('load', runIntro);

})();
