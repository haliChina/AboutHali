/* ===== GitHub Activity — 贡献热力图 + 可展开「活跃仓库」面板 =====
   纯原生重写自 Rare UI <GitHubActivity>（MIT + Commons Clause，见页脚致谢）。
   无 React / 无 framer-motion 依赖，贴合本站粉色玻璃主题。

   与原版的差异（单 owner 场景下的改进）：
   原版底部堆叠 owner 头像，但排名的仓库若全属同一人，头像零信息量、
   只是把同一张脸重复 N 次；退化成首字母又会撞字。故此处改为
   「主语言图标 + 相对权重条」——图标复用本站技能区同款 devicons CDN，
   语言取不到时自然退化为纯文字行。

   数据源：
     - 贡献日历: github-contributions-api.jogruber.de/v4  (CORS *, 稳定)
     - 活跃仓库: api.github.com/users/<u>/events/public  (PushEvent 提交数聚合)
     - 仓库元信息: api.github.com/users/<u>/repos (主语言，失败可缺省)
   Credit: Rare UI — https://rareui.com */
(function () {
    'use strict';

    const mount = document.getElementById('gh-activity');
    if (!mount) return;

    const USER = mount.dataset.user || 'haliChina';
    const CAL_API = 'https://github-contributions-api.jogruber.de/v4';
    const GH_API = 'https://api.github.com/users';
    const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons';
    const CACHE_KEY = 'gh_activity_cache_v6';
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const CELL = 12, GAP = 3, STACK = 3, MIN_RUN = 3;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const liteNow = () => document.documentElement.classList.contains('perf-lite') || reduceMotion;

    /* 语言名 → devicon slug。注意几个例外：HTML 是 html5、CSS 是 css3、
       Vue 是 vuejs、Shell 实际是 bash、Dockerfile 是 docker（jsdelivr 对
       不存在的路径返 403，映射错就是空图标）。站点技能区用的是同一套 CDN。 */
    const SLUG = {
        'JavaScript': 'javascript', 'TypeScript': 'typescript', 'Python': 'python',
        'Java': 'java', 'HTML': 'html5', 'CSS': 'css3', 'C++': 'cplusplus', 'C#': 'csharp',
        'C': 'c', 'Go': 'go', 'Rust': 'rust', 'PHP': 'php', 'Ruby': 'ruby',
        'Swift': 'swift', 'Kotlin': 'kotlin', 'Shell': 'bash', 'Vue': 'vuejs',
        'Vue.js': 'vuejs', 'Dart': 'dart', 'Lua': 'lua', 'Scala': 'scala',
        'Objective-C': 'objectivec', 'Dockerfile': 'docker', 'Markdown': 'markdown',
        'Jupyter Notebook': 'jupyter'
    };
    function langIcon(lang) {
        if (!lang) return '';
        const slug = SLUG[lang] || String(lang).toLowerCase().replace(/[^a-z0-9+#]/g, '');
        if (!slug) return '';
        return DEVICON + '/' + slug + '/' + slug + '-original.svg';
    }

    function esc(s) {
        return (s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
    }
    function fmtDate(iso) {
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    /* --- 数据获取 --- */
    async function fetchCalendar() {
        const res = await fetch(CAL_API + '/' + USER + '?y=last');
        if (!res.ok) throw new Error('calendar HTTP ' + res.status);
        const json = await res.json();
        const days = (json && json.contributions) || [];
        if (!days.length) throw new Error('calendar empty');
        return {
            total: (json.total && (json.total.lastYear ?? Object.values(json.total)[0])) ||
                   days.reduce((s, d) => s + (d.count || 0), 0),
            days: days.map(d => ({ date: d.date, count: d.count || 0, level: Math.min(4, Math.max(0, d.level || 0)) }))
        };
    }

    /* 仓库主语言/星标：一次拉全量，按 full_name 建索引 */
    async function fetchRepoMeta() {
        const map = new Map();
        try {
            const res = await fetch(GH_API + '/' + USER + '/repos?sort=pushed&per_page=100', {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (!res.ok) return map;
            for (const r of await res.json()) {
                map.set(r.full_name, { language: r.language || '', stars: r.stargazers_count || 0, fork: !!r.fork });
            }
        } catch (_) { /* 语言信息可有可无 */ }
        return map;
    }

    async function fetchTopRepos() {
        // 首选：公开事件里的 PushEvent 提交数聚合（= rareui 口径）
        try {
            const res = await fetch(GH_API + '/' + USER + '/events/public?per_page=100', {
                headers: { 'Accept': 'application/vnd.github+json' }
            });
            if (res.ok) {
                const events = await res.json();
                const counts = new Map();
                for (const ev of events) {
                    if (ev.type !== 'PushEvent' || !ev.repo) continue;
                    const n = (ev.payload && ev.payload.commits && ev.payload.commits.length) || 1;
                    counts.set(ev.repo.name, (counts.get(ev.repo.name) || 0) + n);
                }
                if (counts.size) {
                    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, STACK)
                        .map(([full, count]) => ({
                            full, name: full.split('/')[1], count, unit: count === 1 ? 'commit' : 'commits',
                            href: 'https://github.com/' + full
                        }));
                }
            }
        } catch (_) { /* fall through */ }
        // 回落：仓库列表按 star / 最近推送
        const meta = await fetchRepoMeta();
        const list = [...meta.values()].sort((a, b) => b.stars - a.stars).slice(0, STACK);
        const names = [...meta.keys()];
        return names.slice(0, STACK).map((full, i) => ({
            full, name: full.split('/')[1], count: list[i].stars, unit: list[i].stars === 1 ? 'star' : 'stars',
            href: 'https://github.com/' + full, language: list[i].language
        }));
    }

    async function loadData() {
        const cached = (() => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (_) { return null; } })();
        if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL && cached.cal) {
            return cached;
        }
        if (cached && cached.cal) render(cached); // 先展示旧缓存
        const [cal, repos] = await Promise.all([fetchCalendar(), fetchTopRepos().catch(() => [])]);
        // 主语言是锦上添花，失败不影响面板
        const meta = await fetchRepoMeta();
        repos.forEach(r => { if (!r.language && meta.has(r.full)) r.language = meta.get(r.full).language; });
        const data = { ts: Date.now(), cal, repos };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
        return data;
    }

    /* --- 周切分：首个周日对齐，避免列错位 --- */
    function toWeeks(days) {
        let start = days.findIndex(d => new Date(d.date + 'T00:00:00Z').getUTCDay() === 0);
        if (start < 0) start = 0;
        const sliced = days.slice(start);
        const weeks = [];
        for (let i = 0; i < sliced.length; i += 7) weeks.push(sliced.slice(i, i + 7));
        return weeks;
    }
    function monthLabels(weeks) {
        const labels = weeks.map(() => null);
        const mo = i => weeks[i] && weeks[i][0] && weeks[i][0].date.slice(5, 7);
        let start = 0;
        for (let i = 1; i <= weeks.length; i++) {
            if (i < weeks.length && mo(i) === mo(start)) continue;
            if (i - start >= MIN_RUN) labels[start] = MONTHS[Number(mo(start)) - 1] || null;
            start = i;
        }
        return labels;
    }

    /* --- 悬浮提示（单例） --- */
    let tip;
    function showTip(cell, day) {
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'gha-tip';
            document.body.appendChild(tip);
        }
        const noun = day.count === 1 ? 'contribution' : 'contributions';
        tip.textContent = day.count + ' ' + noun + ' on ' + fmtDate(day.date);
        const r = cell.getBoundingClientRect();
        tip.style.opacity = '1';
        const half = tip.offsetWidth / 2;
        let left = r.left + r.width / 2;
        left = Math.min(Math.max(left, 8 + half), window.innerWidth - 8 - half);
        tip.style.left = left + 'px';
        tip.style.top = r.top + 'px';
    }
    function hideTip() { if (tip) tip.style.opacity = '0'; }

    /* --- 渲染 --- */
    let fitWeeks = 0;
    function computeFit(gridWidth) {
        return Math.max(8, Math.floor((gridWidth + GAP) / (CELL + GAP)));
    }

    function render(data) {
        const { cal, repos } = data;
        const allWeeks = toWeeks(cal.days);
        const year = (() => {
            const d = cal.days[cal.days.length - 1];
            const y = d && Number(d.date.slice(0, 4));
            return Number.isFinite(y) ? y : new Date().getFullYear();
        })();
        const heading = cal.total.toLocaleString('en-US') + ' contributions in ' + year;

        mount.innerHTML =
            '<div class="gha-card' + (repos.length ? ' has-panel' : '') + '" data-slot="github-activity">' +
                '<p class="gha-heading"></p>' +
                '<div class="gha-scroll"><div class="gha-grid" role="img"></div></div>' +
                (repos.length ? (
                    '<div class="gha-panel" data-open="false">' +
                        '<div class="gha-panel-head">' +
                            '<span class="gha-panel-label">活跃仓库 · Top Repos</span>' +
                            '<div class="gha-panel-right">' +
                                '<div class="gha-minibar" aria-hidden="true"></div>' +
                                '<button class="gha-chevron" type="button" aria-expanded="false" aria-label="展开活跃仓库">' +
                                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m16 10-4 4-4-4"></path></svg>' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<ul class="gha-repo-list"></ul>' +
                    '</div>'
                ) : '') +
            '</div>';

        const grid = mount.querySelector('.gha-grid');
        mount.querySelector('.gha-heading').textContent = heading;
        grid.setAttribute('aria-label', heading);

        function paintGrid() {
            const scroller = mount.querySelector('.gha-scroll');
            const avail = scroller ? scroller.clientWidth : grid.clientWidth;
            const fit = computeFit(avail || 320);
            if (fit === fitWeeks && grid.childElementCount) return;
            fitWeeks = fit;
            const weeks = allWeeks.slice(-Math.min(allWeeks.length, fit));
            const labels = monthLabels(weeks);
            const lite = liteNow();

            let html = '<div class="gha-months" style="gap:' + GAP + 'px;margin-bottom:' + GAP + 'px">';
            labels.forEach(m => {
                html += '<span class="gha-mo" style="width:' + CELL + 'px">' + (m ? esc(m) : '') + '</span>';
            });
            html += '</div><div class="gha-cols" style="gap:' + GAP + 'px">';
            weeks.forEach((week, wi) => {
                html += '<div class="gha-col" style="gap:' + GAP + 'px">';
                week.forEach(day => {
                    const delay = lite ? 0 : (wi * 0.012);
                    html += '<i class="gha-cell" data-lvl="' + day.level +
                        '" data-c="' + day.count + '" data-d="' + day.date +
                        '" style="width:' + CELL + 'px;height:' + CELL + 'px;animation-delay:' + delay.toFixed(3) + 's"></i>';
                });
                html += '</div>';
            });
            html += '</div>';
            grid.innerHTML = html;
            if (lite) grid.classList.add('gha-no-anim');
        }
        paintGrid();

        grid.addEventListener('pointerover', e => {
            const cell = e.target.closest('.gha-cell');
            if (!cell) return;
            showTip(cell, { count: +cell.dataset.c, date: cell.dataset.d });
        });
        grid.addEventListener('pointerleave', hideTip);

        if ('ResizeObserver' in window) {
            const ro = new ResizeObserver(() => paintGrid());
            ro.observe(mount.querySelector('.gha-scroll'));
        } else {
            window.addEventListener('resize', paintGrid, { passive: true });
        }

        /* --- 活跃仓库面板 --- */
        if (repos.length) {
            const panel = mount.querySelector('.gha-panel');
            const minibar = mount.querySelector('.gha-minibar');
            const list = mount.querySelector('.gha-repo-list');
            const chevron = mount.querySelector('.gha-chevron');

            // 收起态的权重分布条：宽度 ∝ 提交数，一眼看出 Top 的差距
            minibar.innerHTML = repos.map(r =>
                '<i style="flex:' + Math.max(1, r.count) + '"></i>'
            ).join('');

            list.innerHTML = repos.map(r => {
                const icon = langIcon(r.language);
                return '<li><a class="gha-repo" href="' + esc(r.href) + '" target="_blank" rel="noopener">' +
                    '<span class="gha-lang">' + (icon
                        ? '<img src="' + icon + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">'
                        : '') + '</span>' +
                    '<span class="gha-repo-name">' +
                        '<span class="gha-repo-nametext">' + esc(r.name) + '</span>' +
                        (r.language ? '<em class="gha-repo-lang">' + esc(r.language) + '</em>' : '') +
                    '</span>' +
                    '<span class="gha-repo-count">' + r.count + '<em>' + esc(r.unit) + '</em></span>' +
                '</a></li>';
            }).join('');

            const toggle = () => {
                const open = panel.getAttribute('data-open') === 'true';
                panel.setAttribute('data-open', open ? 'false' : 'true');
                chevron.setAttribute('aria-expanded', open ? 'false' : 'true');
                chevron.setAttribute('aria-label', open ? '展开活跃仓库' : '收起活跃仓库');
            };
            chevron.addEventListener('click', toggle);
        }
    }

    function fail(msg) {
        mount.innerHTML = '<div class="gha-card gha-fail">' +
            '<div class="gha-fail-msg">' + esc(msg) + '</div>' +
            '<button class="gha-fail-retry" type="button">重试</button></div>';
        const btn = mount.querySelector('.gha-fail-retry');
        if (btn) btn.addEventListener('click', () => { mount.innerHTML = '<div class="gha-loading">加载贡献图…</div>'; start(); });
    }

    function start() {
        loadData().then(render).catch(e => {
            console.warn('[GHActivity] load failed:', e.message);
            const sandbox = location.hostname.includes('agent-sandbox') || location.hostname.includes('trae.cn');
            fail(sandbox ? '沙箱环境无法访问 GitHub API（部署到 Vercel 后正常）' : '贡献数据加载失败（请检查网络）');
        });
    }

    // 懒加载：接近视口再拉数据，避免与首屏抢带宽
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            if (entries.some(en => en.isIntersecting)) { io.disconnect(); start(); }
        }, { rootMargin: '600px 0px' });
        io.observe(mount);
    } else {
        start();
    }
})();