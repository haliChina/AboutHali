#!/usr/bin/env node
/* =====================================================================
   构建期抓取精选项目 + 活跃仓库 → assets/projects.json / assets/gh-active.json
   ---------------------------------------------------------------------
   背景：项目列表与「活跃仓库」面板原先在浏览器里直连 api.github.com，
   境内访客慢、限流就空。改为构建期抓取一次并提交进仓库，运行时只读
   本站静态资源（与 gh-stats / gh-contributions 同一策略）。

   项目列表不再是 API 全量（会把练手仓和主力仓平级铺开），而是精选：
   精选名单与手写简介维护在本文件的 CURATED 里，星标/语言/推送时间
   每次运行取实时值合并进去。

   失败策略与 gen-stats.mjs / gen-contributions.mjs 一致：
   抓不到就沿用已提交产物，绝不阻断构建。脚本任何异常 exit 0。

   用法：
     node scripts/gen-projects.mjs           # 生成/更新
     node scripts/gen-projects.mjs --check   # 只校验现有产物
   ===================================================================== */

import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');
const OUT_PROJECTS = resolve(ROOT, 'assets/projects.json');
const OUT_ACTIVE = resolve(ROOT, 'assets/gh-active.json');

const USER = 'haliChina';
const TIMEOUT_MS = 20000;

/* 精选项目：order 即卡片顺序；blurb 手写实际用途，不照抄仓库 description。
   title 为展示名（与仓库名不一致时用，如 dogsc-editor → DogSC）。 */
const CURATED = [
    {
        repo: 'SecAgent',
        blurb: '桌面 AI 代理：自然语言下指令，它自己拆解成工具调用去执行。多模型可切换，支持语音输入与本地工具，插件化架构。',
    },
    {
        repo: 'SecAgent-ComputerUse',
        title: 'ComputerUse',
        blurb: 'SecAgent 插件：把截图、鼠标点击、键盘输入、滚动拖拽开放给视觉模型，让 AI 真正接管 Windows 桌面操作。',
    },
    {
        repo: 'SecAgent-DesktopPet',
        title: 'DesktopPet',
        blurb: 'SecAgent 插件：桌面宠物，兼容社区 Codex pet 皮肤（pet.json + 精灵图），给代理一个看得见的身体。',
    },
    {
        repo: 'cap-lab',
        blurb: '对 Cap（PoW 验证码）的逆向笔记：协议细节拆解、基准测试数据与反自动化分析，附可复现的实验代码。',
    },
    {
        repo: 'gh-tools',
        blurb: 'GitHub 实用油猴脚本集：批量删仓库、批量隐藏 Codex review 评论、网络抓包等自用边缘操作。',
    },
    {
        repo: 'dogsc-editor',
        title: 'DogSC',
        blurb: 'DogSC 社区移植版：Android 与 Windows 双端的时间线视频编辑器，声明式特效与 op-log 编辑模型（Kotlin）。',
    },
];

async function fetchJSON(url, accept) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: {
                'User-Agent': 'abouthali-build/1.0 (github.com/haliChina/abouthali)',
                Accept: accept || 'application/vnd.github+json',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function fetchCuratedProjects() {
    const projects = [];
    for (const c of CURATED) {
        let meta;
        try {
            meta = await fetchJSON(`https://api.github.com/repos/${USER}/${c.repo}`);
        } catch (err) {
            throw new Error(`${c.repo}: ${err.message}`);
        }
        if (!meta || !meta.html_url) throw new Error(`${c.repo}: 响应缺少 html_url`);
        projects.push({
            name: c.repo,
            title: c.title || c.repo,
            description: c.blurb,
            language: meta.language || '',
            stars: meta.stargazers_count || 0,
            forks: meta.forks_count || 0,
            homepage: meta.homepage || '',
            html_url: meta.html_url,
            pushed_at: meta.pushed_at || '',
        });
    }
    return projects;
}

/* 活跃仓库：与前端原口径一致 —— 公开事件 PushEvent 提交数聚合 Top3 */
async function fetchActiveRepos() {
    const events = await fetchJSON(`https://api.github.com/users/${USER}/events/public?per_page=100`);
    if (!Array.isArray(events)) throw new Error('events 响应不是数组');
    const counts = new Map();
    for (const ev of events) {
        if (ev.type !== 'PushEvent' || !ev.repo) continue;
        const n = (ev.payload && ev.payload.commits && ev.payload.commits.length) || 1;
        counts.set(ev.repo.name, (counts.get(ev.repo.name) || 0) + n);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([full, count]) => ({
            full,
            name: full.split('/')[1],
            count,
            unit: count === 1 ? 'commit' : 'commits',
            href: 'https://github.com/' + full,
        }));
}

/* 顺手补主语言（前端拿它配 devicon 图标；取不到为空字符串，前端自然退化） */
async function enrichLanguage(active) {
    for (const r of active) {
        try {
            const meta = await fetchJSON(`https://api.github.com/repos/${r.full}`);
            r.language = meta.language || '';
        } catch (_) {
            r.language = '';
        }
    }
    return active;
}

function isValidProjects(text) {
    if (!text) return false;
    try {
        const p = JSON.parse(text);
        return Array.isArray(p.projects) && p.projects.length >= CURATED.length &&
            p.projects.every(x => x.name && x.html_url && typeof x.description === 'string');
    } catch (_) {
        return false;
    }
}

function isValidActive(text) {
    if (!text) return false;
    try {
        const p = JSON.parse(text);
        return Array.isArray(p.repos) &&
            p.repos.every(x => x.full && typeof x.count === 'number' && x.href);
    } catch (_) {
        return false;
    }
}

async function main() {
    if (CHECK_ONLY) {
        const pj = existsSync(OUT_PROJECTS) ? await readFile(OUT_PROJECTS, 'utf8') : null;
        const aj = existsSync(OUT_ACTIVE) ? await readFile(OUT_ACTIVE, 'utf8') : null;
        const okP = isValidProjects(pj);
        const okA = isValidActive(aj);
        const p = okP ? JSON.parse(pj) : null;
        const a = okA ? JSON.parse(aj) : null;
        console.log(
            `${okP ? 'OK  ' : 'BAD '} projects.json` +
            (p ? ` (${p.projects.length} projects, fetched=${p.fetchedAt})` : '') + '\n' +
            `${okA ? 'OK  ' : 'BAD '} gh-active.json` +
            (a ? ` (${a.repos.length} repos, fetched=${a.fetchedAt})` : '')
        );
        process.exit(okP && okA ? 0 : 1);
    }

    try {
        const [projects, activeRaw] = await Promise.all([
            fetchCuratedProjects(),
            fetchActiveRepos().catch(err => {
                console.warn(`⚠ 活跃仓库抓取失败（${err.message}）`);
                return null;
            }),
        ]);

        const now = new Date().toISOString();
        let wrote = 0;
        if (projects.length === CURATED.length) {
            await writeFile(OUT_PROJECTS, JSON.stringify({ user: USER, fetchedAt: now, projects }), 'utf8');
            console.log(`✓ projects.json  ${projects.length} projects`);
            wrote++;
        } else {
            console.warn('⚠ 精选项目抓取不完整，跳过写入，沿用已提交产物');
        }

        if (activeRaw && activeRaw.length) {
            const active = await enrichLanguage(activeRaw);
            await writeFile(OUT_ACTIVE, JSON.stringify({ user: USER, fetchedAt: now, repos: active }), 'utf8');
            console.log(`✓ gh-active.json  ${active.map(r => `${r.name}:${r.count}`).join('  ')}`);
            wrote++;
        } else {
            console.warn('⚠ 无活跃仓库数据，跳过写入，沿用已提交产物');
        }

        if (!wrote) console.warn('⚠ 本次没有产物更新（全部沿用旧版）');
    } catch (err) {
        const prev = existsSync(OUT_PROJECTS) ? await readFile(OUT_PROJECTS, 'utf8') : null;
        if (isValidProjects(prev)) {
            const p = JSON.parse(prev);
            console.warn(`⚠ 抓取失败（${err.message}）——沿用已提交 projects.json（${p.projects.length} projects, fetched=${p.fetchedAt}），构建继续。`);
        } else {
            console.error(`✗ 抓取失败（${err.message}）且没有可回退的历史产物；页面会走兜底提示，不影响构建。`);
        }
    }
}

main().catch((e) => {
    console.error('gen-projects 异常:', e && e.message);
    process.exit(0); // 绝不因数据抓取失败而中断构建
});
