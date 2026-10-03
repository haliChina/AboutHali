#!/usr/bin/env node
/* =====================================================================
   构建期抓取 GitHub 贡献日历 → assets/gh-contributions.json
   ---------------------------------------------------------------------
   背景：热力图原先在浏览器里直连 github-contributions-api.jogruber.de
   （第三方、德国托管、境外）。实测该服务会间歇性抽风，且中国大陆访问
   不稳定 —— 热力图是本站唯一还会因境外服务挂掉的运行时依赖。

   改为构建期抓取一次并把 JSON 提交进仓库，页面运行时只读本站静态资源：
     - 彻底去掉运行时的境外依赖
     - 热力图本质是历史记录而非实时数据，最长滞后 24h 完全可接受

   失败策略与 gen-stats.mjs 一致：抓不到就沿用已提交产物，绝不阻断构建。
   脚本任何异常 exit 0。

   用法：
     node scripts/gen-contributions.mjs           # 生成/更新
     node scripts/gen-contributions.mjs --check   # 只校验现有产物
   ===================================================================== */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');
const OUT_FILE = resolve(ROOT, 'assets/gh-contributions.json');

const USER = 'haliChina';
const CAL_API = 'https://github-contributions-api.jogruber.de/v4';
const TIMEOUT_MS = 20000;

/* 落盘精简结构：前端只需要 date/count/level 与 total。 */
function normalize(json) {
    const days = (json && json.contributions) || [];
    if (!Array.isArray(days) || !days.length) throw new Error('返回的 contributions 为空');
    const out = days.map(d => ({
        date: d.date,
        count: Number(d.count) || 0,
        level: Math.min(4, Math.max(0, Number(d.level) || 0)),
    }));
    for (const d of out) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw new Error(`日期格式异常: ${d.date}`);
    }
    const total =
        (json.total && (json.total.lastYear ?? Object.values(json.total)[0])) ||
        out.reduce((s, d) => s + d.count, 0);
    return {
        user: USER,
        total: Number(total) || 0,
        fetchedAt: new Date().toISOString(),
        days: out,
    };
}

function isValid(text) {
    if (!text) return false;
    try {
        const p = JSON.parse(text);
        return Array.isArray(p.days) && p.days.length > 0 &&
            typeof p.total === 'number' &&
            /^\d{4}-\d{2}-\d{2}$/.test(p.days[0].date);
    } catch (_) {
        return false;
    }
}

async function main() {
    if (CHECK_ONLY) {
        const cur = existsSync(OUT_FILE) ? await readFile(OUT_FILE, 'utf8') : null;
        const ok = isValid(cur);
        const meta = ok ? JSON.parse(cur) : null;
        console.log(
            `${ok ? 'OK  ' : 'BAD '} gh-contributions.json` +
            (meta ? ` (${meta.days.length} days, total=${meta.total}, fetched=${meta.fetchedAt})` : '')
        );
        process.exit(ok ? 0 : 1);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${CAL_API}/${USER}?y=last`, {
            signal: ctrl.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; abouthali-build/1.0)',
                Accept: 'application/json',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = normalize(await res.json());
        await mkdir(dirname(OUT_FILE), { recursive: true });
        // 压成一行，避免仓库里出现几百行无意义 diff
        const json = JSON.stringify(data);
        await writeFile(OUT_FILE, json, 'utf8');
        console.log(`✓ gh-contributions.json  ${data.days.length} days  total=${data.total}  ${json.length}B`);
    } catch (err) {
        const prev = existsSync(OUT_FILE) ? await readFile(OUT_FILE, 'utf8') : null;
        if (isValid(prev)) {
            const p = JSON.parse(prev);
            console.warn(
                `⚠ 贡献日历抓取失败（${err.message}）——沿用已提交版本` +
                `（${p.days.length} days, total=${p.total}, fetched=${p.fetchedAt}），构建继续。`
            );
        } else {
            console.error(`✗ 贡献日历抓取失败（${err.message}）` +
                (prev ? '，且已提交产物已损坏' : '，且没有历史产物可回退'));
            console.error('  页面热力图会走兜底提示，不影响构建。');
        }
    } finally {
        clearTimeout(timer);
    }
}

main().catch((e) => {
    console.error('gen-contributions 异常:', e && e.message);
    process.exit(0); // 绝不因热力图数据失败而中断构建
});