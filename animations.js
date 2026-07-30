(function () {
    'use strict';

    // ===== Elements =====
    const island   = document.querySelector('.island-content');
    const sat      = document.querySelector('.island-satellite');
    const audio    = document.getElementById('np-audio');
    const toastIcon = island && island.querySelector('.island-toast-icon');
    const toastMsg  = island && island.querySelector('.island-toast-msg');
    const confirmSite = island && island.querySelector('.confirm-site');
    const confirmHost = island && island.querySelector('.island-confirm-host');
    const confirmIconBox = island && island.querySelector('.island-confirm-icon');
    const confirmFavicon = island && island.querySelector('.confirm-favicon');
    const confirmBar = island && island.querySelector('.island-confirm-countdown-bar');
    const btnConfirm = island && island.querySelector('.island-btn-confirm');
    const btnCancel  = island && island.querySelector('.island-btn-cancel');

    // ===== 1c 尺寸表（与 dc.html LY.c 完全一致）=====
    const LAYOUTS = {
        idle:     { w:'122px', h:'36px', r:'18px' },
        preview:  { w:'224px', h:'36px', r:'18px' },
        nav:      { w:'464px', h:'56px', r:'28px' },
        mbar:     { w:'192px', h:'36px', r:'18px' },
        mcard:    { w:'392px', h:'156px', r:'32px' },
        confirm:  { w:'344px', h:'130px', r:'28px' },
        email:    { w:'312px', h:'132px', r:'28px' },
        toast:    { w:'228px', h:'42px',  r:'21px' },
        autoplay: { w:'312px', h:'106px', r:'26px' },
        greet:    { w:'244px', h:'36px',  r:'18px' },
        hint:     { w:'228px', h:'36px',  r:'18px' }
    };

    // 各状态对应 .island-<state> 层的 class name
    const LAYERS = {
        idle:    '.island-idle',
        preview: '.island-preview',
        nav:     '.island-nav',
        mbar:    '.island-mbar',
        mcard:   '.island-mcard',
        confirm: '.island-confirm',
        email:   '.island-email',
        toast:   '.island-toast',
        autoplay:'.island-autoplay',
        greet:   '.island-greet',
        hint:    '.island-hint'
    };

    const SECTIONS = ['首页', 'GitHub', 'QQ音乐', 'Projects'];
    const PLAYLIST = [
        { name:'All The Things She Said', artist:'t.A.T.u.',             cover:'https://p3.music.126.net/1bVvQcOLx96ZNhzfLk9bwg==/109951173376551048.jpg?param=224y224', src:'https://api.qijieya.cn/meting/?server=netease&type=url&id=27810034' },
        { name:'渡口',                    artist:'蔡琴',                   cover:'https://p4.music.126.net/4pltwvzYfOy1PSWM6X5_hQ==/109951167871247765.jpg?param=224y224', src:'https://api.qijieya.cn/meting/?server=netease&type=url&id=211277' },
        { name:'Miss You',               artist:'Oliver Tree & Robin Schulz', cover:'https://y.qq.com/music/photo_new/T002R500x500M000003N37OX0ByL7H_2.jpg?max_age=2592000', src:'https://api.qijieya.cn/meting/?server=netease&type=url&id=1969788180' },
        { name:'Life Goes On',           artist:'Oliver Tree',            cover:'https://y.qq.com/music/photo_new/T002R500x500M000000UAKjE2m6ksi_1.jpg?max_age=2592000', src:'https://api.qijieya.cn/meting/?server=netease&type=url&id=1848206679' }
    ];

    // ===== 运行时状态 =====
    let curState   = 'idle';
    let navIdx     = 0;
    let idlePhase  = 0;   // 0=品牌名  1=时钟+日期
    let musicOn    = false;
    let satOpen    = false;
    let hovering   = false;
    let scrolling  = false;
    let scrubbing  = false;
    let pendingHref = null;
    let cfKey      = 0;   // confirm 换场 key（同 dc.html）
    let curSong    = 0;
    const T = {};

    function clr(k)    { if (T[k]) { clearTimeout(T[k]); clearInterval(T[k]); T[k]=null; } }
    function after(k,ms,fn){ clr(k); T[k]=setTimeout(fn,ms); }

    function fmt(t) {
        if (!t || isNaN(t) || !isFinite(t)) return '0:00';
        const m=Math.floor(t/60), s=Math.floor(t%60);
        return m+':'+String(s).padStart(2,'0');
    }
    function clock() { const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
    function dateStr() { const d=new Date(); return (d.getMonth()+1)+'月'+d.getDate()+'日'; }
    function getCookie(n){ const m=document.cookie.match('(?:^|; )'+n+'=([^;]*)'); return m?decodeURIComponent(m[1]):null; }
    function setCookie(n,v,age){ document.cookie=n+'='+encodeURIComponent(v)+'; max-age='+age+'; path=/; SameSite=Lax'; }

    // ===== 核心切换（精准对标 dc.html isl() box + layerStyle）=====
    function go(target, opts) {
        opts = opts||{};
        if (curState===target && !opts.force) return;
        const L = LAYOUTS[target];
        if (!L) return;

        // 移除旧层 active-content
        const old = island && island.querySelector('.island-layer.active-content');
        if (old) old.classList.remove('active-content');

        // 外壳弹性形变（与 dc.html transition 完全一致）
        if (island) {
            island.style.width        = L.w;
            island.style.height       = L.h;
            island.style.borderRadius = L.r;
            island.setAttribute('data-state', target);
            island.classList.remove('toast-success','toast-error');
            if (target==='toast') island.classList.add(opts.kind==='error'?'toast-error':'toast-success');
        }

        // 新层 active-content（0.15s 延迟淡入，与 dc.html layerStyle 一致）
        const sel = LAYERS[target];
        if (sel && island) {
            const el = island.querySelector(sel);
            if (el) el.classList.add('active-content');
        }

        curState = target;
        _updateSat();

        // idle 时间相位计时
        clr('idleTimer');
        if (target==='idle' && !musicOn && !hovering && !scrolling) {
            after('idleTimer',3000,()=>island&&island.classList.add('idle'));
        } else if (island) {
            island.classList.remove('idle');
        }
    }

    function base() { return musicOn ? 'mbar' : 'idle'; }
    function isLocked() { return ['confirm','email','toast','autoplay'].indexOf(curState)>=0; }

    // ===== 分岛（对标 dc.html satSt）=====
    function _updateSat() {
        if (!sat) return;
        const busy = ['nav','confirm','email','autoplay'].indexOf(curState)>=0;
        const vis  = musicOn && busy && !satOpen;
        sat.classList.toggle('sat-hidden', !vis);
        sat.classList.toggle('sat-icon', vis);
        sat.style.width   = vis ? '86px' : '0px';
        sat.style.opacity = vis ? '1' : '0';
        // 封面同步
        const sc = sat.querySelector('.sat-cover');
        if (sc && PLAYLIST[curSong]) sc.src = PLAYLIST[curSong].cover;
    }

    // ===== Toast（1.3s 自动关）=====
    function toast(kind, msg) {
        clr('toast');
        if (toastIcon) toastIcon.textContent = kind==='error' ? '×' : '✓';
        if (toastMsg)  toastMsg.textContent  = msg;
        go('toast', {kind});
        after('toast',1300,()=>go(hovering?(musicOn?'mcard':'nav'):base()));
    }

    // ===== Greet（2.3s 自动关）=====
    function greet() {
        go('greet');
        after('greet',2300,()=>{ if(curState==='greet') go(base()); });
    }

    // ===== Hint（1.7s 自动关）=====
    function hint() {
        navIdx = (navIdx+1)%4;
        const el = island && island.querySelector('.island-hint-section');
        if (el) el.textContent = SECTIONS[navIdx];
        _syncNavDots();
        go('hint');
        after('hint',1700,()=>{ if(curState==='hint') go(base()); });
    }

    // ===== Confirm =====
    function askConfirm(data) {
        clr('confirm'); cfKey++;
        pendingHref = data.href;
        if (confirmSite) confirmSite.textContent = data.title||'外部链接';
        if (confirmHost) {
            try { const u=new URL(data.href); confirmHost.textContent=u.hostname+u.pathname.replace(/\/$/,''); }
            catch(_) { confirmHost.textContent=data.href||''; }
        }
        if (confirmFavicon && confirmIconBox) {
            if (data.iconSrc) { confirmFavicon.src=data.iconSrc; confirmIconBox.classList.add('has-favicon'); }
            else { confirmIconBox.classList.remove('has-favicon'); }
        }
        go('confirm');
        // 倒计时进度条
        if (confirmBar) {
            confirmBar.style.transition='none'; confirmBar.style.width='100%';
            void confirmBar.offsetWidth;
            confirmBar.style.transition='width 8s linear'; confirmBar.style.width='0%';
        }
        after('confirm',8000,()=>{ if(curState==='confirm'){pendingHref=null;toast('error','已自动取消');} });
    }

    // ===== Idle 双相位（4.2s 交替，对标 dc.html idleCycle）=====
    function _applyIdlePhase() {
        const brand = island && island.querySelector('.island-idle-brand');
        const time  = island && island.querySelector('.island-idle-time');
        if (!brand||!time) return;
        if (idlePhase===0) {
            brand.style.opacity='1'; brand.style.transform='translateY(-50%)';
            time.style.opacity='0';  time.style.transform='translateY(calc(-50% + 8px))';
        } else {
            brand.style.opacity='0'; brand.style.transform='translateY(calc(-50% - 8px))';
            time.style.opacity='1';  time.style.transform='translateY(-50%)';
            time.textContent = clock()+' · '+dateStr();
        }
    }
    setInterval(()=>{ idlePhase=idlePhase?0:1; _applyIdlePhase(); }, 4200);
    setInterval(()=>{ if(idlePhase===1){ const t=island&&island.querySelector('.island-idle-time'); if(t) t.textContent=clock()+' · '+dateStr(); } },10000);

    // ===== preview 进度点同步 =====
    function _syncNavDots() {
        const prev = island && island.querySelector('.island-preview');
        if (!prev) return;
        const sec = prev.querySelector('.island-preview-section');
        if (sec) sec.textContent = SECTIONS[navIdx];
        prev.querySelectorAll('.dot').forEach((d,i)=>{
            d.classList.toggle('active', i===navIdx);
        });
        // nav 高亮也同步
        island.querySelectorAll('.island-nav .island-nav-btn').forEach((b,i)=>{
            b.classList.toggle('active', i===navIdx);
        });
    }

    // ===== 进度环 =====
    function _updateNavRing(pct) {
        const ring = island && island.querySelector('.nav-progress-arc');
        const pctEl = island && island.querySelector('.nav-pct');
        if (pctEl) pctEl.textContent = Math.round(pct)+'%';
        if (!ring) return;
        const R=8.5, C=2*Math.PI*R;
        const dash = (pct/100)*C;
        ring.setAttribute('stroke-dasharray', dash.toFixed(2)+' '+C.toFixed(2));
    }

    // ===== 音乐控制 =====
    function loadSong(i, autoplay) {
        curSong = ((i%PLAYLIST.length)+PLAYLIST.length)%PLAYLIST.length;
        const s = PLAYLIST[curSong];
        if (audio) {
            try{audio.pause();}catch(_){}
            audio.removeAttribute('src'); try{audio.load();}catch(_){}
            audio.src=s.src; audio.load();
        }
        document.querySelectorAll('.mc-title,.np-title').forEach(e=>e.textContent=s.name);
        document.querySelectorAll('.mc-artist,.np-artist').forEach(e=>e.textContent=s.artist);
        document.querySelectorAll('.mc-cover,.ib-cover,.sat-cover').forEach(img=>{ if(img.getAttribute('src')!==s.cover)img.src=s.cover; });
        // 大卡封面动画
        const mcCover = island && island.querySelector('.mc-cover');
        if (mcCover) { mcCover.style.animation='none'; void mcCover.offsetWidth; mcCover.style.animation='coverIn .5s cubic-bezier(.34,1.2,.4,1)'; }
        if (autoplay&&audio) {
            const onReady=()=>{ audio.removeEventListener('canplay',onReady); audio.play().catch(()=>{}); };
            audio.addEventListener('canplay',onReady);
            setTimeout(()=>{ audio.removeEventListener('canplay',onReady); if(audio.paused)audio.play().catch(()=>{}); },5000);
        }
    }
    function togglePlay() { if(!audio)return; if(audio.paused)audio.play().catch(()=>{}); else audio.pause(); }

    // ===== 进度条 =====
    let lastCurTxt='',lastDurTxt='';
    const scrubEl = island && island.querySelector('.mcard-bar-wrap');
    const fillEl  = island && island.querySelector('.mcard-fill');
    function updateProgress() {
        if (!audio) return;
        const d=audio.duration||0, c=audio.currentTime||0;
        const pct = d ? (c/d*100) : 0;
        const cT=fmt(c), dT=fmt(d);
        if (cT!==lastCurTxt){ lastCurTxt=cT; document.querySelectorAll('.mc-cur,.np-cur').forEach(e=>e.textContent=cT); }
        if (dT!==lastDurTxt){ lastDurTxt=dT; document.querySelectorAll('.mc-dur,.np-dur').forEach(e=>e.textContent=dT); }
        if (!scrubbing && fillEl) fillEl.style.width=pct.toFixed(2)+'%';
    }
    if (scrubEl) scrubEl.addEventListener('click', e=>{
        if (!audio||!audio.duration) return;
        const r=scrubEl.getBoundingClientRect();
        const p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
        audio.currentTime=p*audio.duration;
        if(fillEl) fillEl.style.width=(p*100).toFixed(2)+'%';
    });

    // ===== 事件绑定 =====
    if (island) {
        island.addEventListener('mouseenter',()=>{
            hovering=true; clr('collapse');
            if (!isLocked()) go(musicOn?'mcard':'nav');
        });
        island.addEventListener('mouseleave',()=>{
            hovering=false;
            if (!scrolling&&!scrubbing&&!isLocked())
                after('collapse',900,()=>{ if(!hovering&&!scrolling&&!scrubbing&&!isLocked()) go(base()); });
        });
        island.addEventListener('click',e=>{
            if (e.target.closest('.island-nav-btn,.island-btn,.island-email-copy,.mc-btn-ghost,.mc-btn-main,.mcard-bar-wrap')) return;
            if (curState==='idle'||curState==='greet'||curState==='hint') go('nav');
            else if (curState==='mbar') go('mcard');
        });
    }
    if (sat) sat.addEventListener('click',e=>{ e.stopPropagation(); if(musicOn)go('mcard'); });

    if (btnConfirm) btnConfirm.addEventListener('click',()=>{
        clr('confirm'); if(pendingHref)window.open(pendingHref,'_blank','noopener');
        pendingHref=null; toast('success','跳转成功');
    });
    if (btnCancel) btnCancel.addEventListener('click',()=>{
        clr('confirm'); pendingHref=null; toast('error','已取消');
    });

    document.querySelectorAll('.island-email-copy').forEach(btn=>{
        btn.addEventListener('click',e=>{
            e.stopPropagation();
            const addr=btn.getAttribute('data-mail');
            const done=()=>toast('success','已复制邮箱至剪切板');
            if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(done).catch(done);
            else done();
        });
    });

    document.querySelectorAll('.mc-toggle,.np-toggle').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();togglePlay();}));
    document.querySelectorAll('.mc-prev,.np-prev').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();loadSong(curSong-1,true);}));
    document.querySelectorAll('.mc-next,.np-next').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();loadSong(curSong+1,true);}));

    const btnEnable=document.getElementById('autoplay-enable');
    const btnLater =document.getElementById('autoplay-later');
    if(btnEnable) btnEnable.addEventListener('click',e=>{e.stopPropagation();go(base());loadSong(0,true);});
    if(btnLater)  btnLater.addEventListener('click',e=>{e.stopPropagation();go(base());});

    document.querySelectorAll('.social-btn').forEach(link=>{
        link.addEventListener('click',e=>{
            const href=link.getAttribute('href');
            if(link.id==='email-link'||!href){e.preventDefault();go('email');return;}
            if(!href.startsWith('#')){
                e.preventDefault();
                const img=link.querySelector('img');
                askConfirm({title:link.getAttribute('title')||'外部链接',href,iconSrc:img?img.src:null});
            }
        });
    });

    if(audio){
        audio.addEventListener('play',()=>{
            const first=!musicOn; musicOn=true;
            document.body.classList.add('audio-playing');
            _updateSat();
            if(curState==='idle') go('mbar');
            if(!hovering&&first) toast('success','QQ音乐 · 播放中');
        });
        audio.addEventListener('pause',()=>{
            musicOn=false;
            document.body.classList.remove('audio-playing');
            _updateSat();
            if(curState==='mbar') go('idle');
        });
        audio.addEventListener('ended',()=>loadSong(curSong+1,true));
        audio.addEventListener('timeupdate',updateProgress);
        audio.addEventListener('loadedmetadata',updateProgress);
    }

    // ===== 滚动 & scrollspy =====
    const sections = ['#home','#github','#netease','#project'].map(id=>document.querySelector(id));
    const SECTION_NAMES = ['首页','GitHub','QQ音乐','Projects'];
    const navBtns = Array.from(document.querySelectorAll('.island-nav .island-nav-btn'));
    let sectionOffsets=[], scrollMax=0, lastSpIdx=-1, navJump=false;

    function recomputeLayout(){
        sectionOffsets=sections.map(s=>s?s.offsetTop:0);
        scrollMax=document.documentElement.scrollHeight-window.innerHeight;
    }
    function updateScrollSpy(y){
        if(navJump) return;
        let idx=0;
        for(let i=0;i<sectionOffsets.length;i++){ if(sectionOffsets[i]-120<=y) idx=i; }
        if(idx!==lastSpIdx){
            lastSpIdx=idx; navIdx=idx;
            navBtns.forEach((b,i)=>b.classList.toggle('active',i===idx));
            _syncNavDots();
        }
        const pct=scrollMax>0?Math.min(100,y/scrollMax*100):0;
        _updateNavRing(pct);
        // preview 百分比
        const pctEl=island&&island.querySelector('.island-preview-pct');
        if(pctEl) pctEl.textContent=Math.round(pct)+'%';
    }
    window.addEventListener('scroll',()=>{
        scrolling=true;
        const y=window.scrollY||document.documentElement.scrollTop||0;
        updateScrollSpy(y);
        const cur=curState;
        if(cur==='confirm'){clr('confirm');pendingHref=null;toast('error','已取消');}
        else if(cur==='email') go('idle');
        else if(cur==='idle'||cur==='mbar'||cur==='mcard') go('nav');
        clr('scrollEnd');
        after('scrollEnd',220,()=>{
            scrolling=false;
            if(!hovering&&!scrubbing&&!isLocked()) after('collapse',700,()=>{ if(!hovering&&!scrolling&&!isLocked()) go(base()); });
        });
    },{passive:true});

    navBtns.forEach(btn=>{
        btn.addEventListener('click',e=>{
            const target=btn.getAttribute('href');
            if(target&&target.startsWith('#')){
                e.preventDefault(); e.stopPropagation();
                const el=document.querySelector(target);
                if(el){
                    navJump=true;
                    const i=parseInt(btn.getAttribute('data-index')||'0');
                    navIdx=i;
                    navBtns.forEach(b=>b.classList.toggle('active',b===btn));
                    _syncNavDots();
                    el.scrollIntoView({behavior:'smooth',block:'start'});
                    setTimeout(()=>navJump=false,800);
                }
            }
        });
    });

    document.addEventListener('click',e=>{
        if(island&&island.contains(e.target)) return;
        if(e.target.closest('.social-btn')) return;
        if(curState==='confirm'){clr('confirm');pendingHref=null;}
        if(curState!=='idle'&&curState!=='mbar'&&curState!=='toast') go(base());
    });

    // ===== typewriter =====
    const twEl=document.querySelector('.typewriter-text');
    const phrases=['今後也請多多指教。','願你的明天比今天滿溢更多的幸福與笑容。','世界由無數的言語構成。','所謂人生，就是自己筆下的故事。','幸福的活下去吧！',"人在孤獨中降生，在孤獨中死去。",'Welcome To Real Me!','這個世界，總有一天也會微笑。','userhali.com','Hali'];
    if(twEl){
        let pi=0,ci=0,deleting=false;
        (function type(){
            if(document.hidden){setTimeout(type,1000);return;}
            const full=phrases[pi];
            ci+=deleting?-1:1;
            twEl.textContent=full.slice(0,ci);
            let delay=deleting?45:95;
            if(!deleting&&ci===full.length){delay=1600;deleting=true;}
            else if(deleting&&ci===0){deleting=false;pi=(pi+1)%phrases.length;delay=450;}
            setTimeout(type,delay);
        })();
    }

    // ===== reveal =====
    const revealObs=new IntersectionObserver(entries=>{
        entries.forEach(en=>{ if(en.isIntersecting){en.target.classList.add('in');revealObs.unobserve(en.target);} });
    },{threshold:0.12});
    document.querySelectorAll('.reveal').forEach(el=>revealObs.observe(el));

    const explore=document.querySelector('.explore-btn');
    if(explore) explore.addEventListener('click',()=>document.querySelector('#github').scrollIntoView({behavior:'smooth',block:'start'}));

    window.addEventListener('resize',()=>{ recomputeLayout(); const y=window.scrollY||0; updateScrollSpy(y); },{passive:true});

    // ===== Github Stats fallback =====
    window.__ghStatsFallback=function(label){
        const wrap=document.createElement('div');
        wrap.className='gh-stats-card gh-stats-fallback';
        wrap.innerHTML='<div class="gh-fb-title">'+label+'</div><div class="gh-fb-msg">加载失败</div><button class="gh-fb-retry" type="button">重试</button>';
        wrap.querySelector('.gh-fb-retry').addEventListener('click',()=>{
            const img=document.createElement('img');
            img.className='gh-stats-card'; img.alt=label; img.decoding='async'; img.loading='lazy';
            const base='https://github-stats-extended.vercel.app/api';
            img.src=(label==='Stats')?base+'?username=haliChina&show_icons=true&theme=tokyonight&hide_border=true&_r='+Date.now():base+'/top-langs/?username=haliChina&layout=compact&theme=tokyonight&hide_border=true&_r='+Date.now();
            img.onerror=function(){this.replaceWith(window.__ghStatsFallback(label));};
            wrap.replaceWith(img);
        });
        return wrap;
    };

    // ===== Projects =====
    const GITHUB_USER='haliChina', CACHE_KEY='projects_cache_v3', CACHE_TTL=24*60*60*1000;
    const LANG_COLORS={JavaScript:'#f1e05a',TypeScript:'#3178c6',Python:'#3572A5',Java:'#b07219','C++':'#f34b7d',C:'#555555',Go:'#00ADD8',Rust:'#dea584',HTML:'#e34c26',CSS:'#563d7c',Vue:'#41b883',Shell:'#89e051',Dockerfile:'#384d54',Kotlin:'#A97BFF',Swift:'#F05138',Ruby:'#701516',PHP:'#4F5D95'};
    function langColor(l){return LANG_COLORS[l]||'#8b8b8b';}
    function timeAgo(dateStr){if(!dateStr)return'';const d=new Date(dateStr),diff=Date.now()-d.getTime(),day=86400000;if(diff<day)return'今天';if(diff<day*2)return'昨天';if(diff<day*30)return Math.floor(diff/day)+'天前';if(diff<day*365)return Math.floor(diff/(day*30))+'个月前';return Math.floor(diff/(day*365))+'年前';}
    function esc(s){return(s||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));}
    async function fetchGitHubRepos(){
        const ctrl=new AbortController(); const tid=setTimeout(()=>ctrl.abort(),12000);
        try{
            const res=await fetch('https://api.github.com/users/'+GITHUB_USER+'/repos?sort=pushed&per_page=100',{headers:{'Accept':'application/vnd.github.v3+json'},signal:ctrl.signal});
            clearTimeout(tid);
            if(!res.ok) throw new Error('GitHub HTTP '+res.status);
            const data=await res.json();
            return data.filter(r=>!r.fork).map(r=>({name:r.name,description:r.description||'',language:r.language,stars:r.stargazers_count||0,forks:r.forks_count||0,homepage:r.homepage||'',html_url:r.html_url,pushed_at:r.pushed_at,source:'github'}));
        }catch(e){clearTimeout(tid);throw e;}
    }
    function renderProjects(projects){
        const grid=document.getElementById('projects-grid');
        if(!grid)return;
        if(!projects.length){grid.innerHTML='<div class="projects-loading">暂无公开项目</div>';return;}
        grid.innerHTML=projects.map(r=>{
            const lang=r.language?'<span class="proj-lang"><i style="background:'+langColor(r.language)+'"></i>'+esc(r.language)+'</span>':'';
            const stars=r.stars?'<span>★ '+r.stars+'</span>':'';
            const forks=r.forks?'<span>⑂ '+r.forks+'</span>':'';
            const updated=r.pushed_at?'<span class="proj-time">'+timeAgo(r.pushed_at)+'</span>':'';
            const homepage=r.homepage?'<a class="proj-link proj-link--primary" href="'+esc(r.homepage)+'" target="_blank" rel="noopener">在线预览</a>':'';
            const sourceLink=r.html_url?'<a class="proj-link" href="'+esc(r.html_url)+'" target="_blank" rel="noopener">源码</a>':'';
            const nameLink=r.html_url?'<a class="proj-name" href="'+esc(r.html_url)+'" target="_blank" rel="noopener">'+esc(r.name)+'</a>':'<span class="proj-name">'+esc(r.name)+'</span>';
            return '<div class="proj-card"><div class="proj-head">'+nameLink+'<span class="proj-source">GitHub</span></div>'+(r.description?'<p class="proj-desc">'+esc(r.description)+'</p>':'')+'<div class="proj-meta">'+lang+'<div class="proj-stats">'+stars+forks+'</div>'+updated+'</div><div class="proj-links">'+homepage+sourceLink+'</div></div>';
        }).join('');
    }
    function showProjectsError(msg){
        const grid=document.getElementById('projects-grid');
        if(!grid)return;
        grid.innerHTML='<div class="projects-error"><div class="projects-error-text">'+esc(msg)+'</div><button class="projects-retry" id="projects-retry-btn">重新加载</button></div>';
        const btn=document.getElementById('projects-retry-btn');
        if(btn) btn.addEventListener('click',()=>{grid.innerHTML='<div class="projects-loading">加载中...</div>';loadProjects();});
    }
    async function loadProjects(){
        const grid=document.getElementById('projects-grid');
        if(!grid)return;
        const cached=(()=>{try{return JSON.parse(localStorage.getItem(CACHE_KEY));}catch(_){return null;}})();
        if(cached&&cached.ts&&Date.now()-cached.ts<CACHE_TTL&&cached.projects){renderProjects(cached.projects);return;}
        if(cached&&cached.projects) renderProjects(cached.projects);
        try{
            const projects=await fetchGitHubRepos();
            if(!projects.length&&!cached){showProjectsError('该 GitHub 账号下暂无公开仓库');return;}
            try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),projects}));}catch(_){}
            renderProjects(projects);
        }catch(e){
            if(!cached||!cached.projects){
                const isSandbox=location.hostname.includes('agent-sandbox')||location.hostname.includes('trae.cn');
                showProjectsError('项目加载失败'+(isSandbox?' （沙箱环境，部署后正常）':'（请检查网络）'));
            }
        }
    }
    loadProjects();

    // ===== 入场 + autoplay 策略 =====
    function easeOutCubic(t){return 1-Math.pow(1-Math.min(1,Math.max(0,t)),3);}
    function easeInOutCubic(t){t=Math.min(1,Math.max(0,t));return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}

    function handlePostIntro(){
        after('greet',900,greet);
        after('autoplay',3400,()=>{if(curState==='idle'||curState==='greet') go('autoplay');});
    }

    function runIntro(){
        const intro=document.getElementById('intro');
        if(!intro){document.body.classList.remove('intro-lock');handlePostIntro();return;}
        if(getCookie('introShown')){intro.remove();document.body.classList.remove('intro-lock');handlePostIntro();return;}
        setCookie('introShown','1',86400);
        const prefix=intro.querySelector('.intro-prefix');
        const first=intro.querySelector('.intro-first');
        const rest=intro.querySelector('.intro-rest');
        const fr=first.getBoundingClientRect();
        const dx=window.innerWidth/2-(fr.left+fr.width/2);
        prefix.style.opacity='0';prefix.style.transform='translateY(12px)';
        first.style.opacity='0';first.style.transform='translateX('+dx+'px) scale(2)';
        rest.style.opacity='0';rest.style.transform='translateY(12px)';
        let raf=null,done=false;
        const t0=performance.now();
        function finish(){
            if(done)return;done=true;
            if(raf)cancelAnimationFrame(raf);
            intro.style.transition='opacity .45s ease';intro.style.opacity='0';
            setTimeout(()=>{if(intro.parentNode)intro.remove();document.body.classList.remove('intro-lock');},470);
            handlePostIntro();
        }
        function frame(now){
            const e=now-t0;
            const pp=easeOutCubic((e-300)/600);
            prefix.style.opacity=pp;prefix.style.transform='translateY('+((1-pp)*12)+'px)';
            let zS=2,zA=0;
            if(e>=1100){const s=e-1100;if(s<=900){const zp=easeOutCubic(s/900);zS=2+(1-2)*zp;zA=zp;}else{zS=1;zA=1;}}
            let slide=0;if(e>2200)slide=e<=3000?easeInOutCubic((e-2200)/800):1;
            const curDx=dx+(0-dx)*slide;
            first.style.opacity=zA;first.style.transform='translateX('+curDx+'px) scale('+zS+')';
            let enA=0,enY=12;
            if(e>2850){if(e<=3250){const ep=easeOutCubic((e-2850)/400);enA=ep;enY=(1-ep)*12;}else{enA=1;enY=0;}}
            rest.style.opacity=enA;rest.style.transform='translateY('+enY+'px)';
            if(e>=4400){finish();return;}
            raf=requestAnimationFrame(frame);
        }
        raf=requestAnimationFrame(frame);
        [intro,'click'].forEach(()=>{});
        intro.addEventListener('click',finish);
        window.addEventListener('keydown',finish,{once:true});
        window.addEventListener('wheel',finish,{once:true,passive:true});
        window.addEventListener('touchstart',finish,{once:true,passive:true});
        setTimeout(finish,6000);
    }

    // ===== 初始化 =====
    go('idle',{force:true});
    _applyIdlePhase();
    _syncNavDots();
    loadSong(0,false);
    recomputeLayout();
    updateScrollSpy(window.scrollY||0);

    const yearEl=document.getElementById('year');
    if(yearEl) yearEl.textContent=new Date().getFullYear();

    island.classList.add('island-entrance');
    island.addEventListener('animationend',function h(){island.classList.remove('island-entrance');island.removeEventListener('animationend',h);});

    if(document.readyState==='complete') runIntro();
    else window.addEventListener('load',runIntro);

})();
