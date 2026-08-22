// Re-renders the Medium PNGs from the site's own figure components and CSS,
// so the exports can't drift from the blog. Run: node medium/render.mjs
//
// Each figure is the bare <svg> lifted out of its .astro component, drawn at
// its natural 900px width on a 29px paper margin. That is where 958px comes
// from, and 958 at a 2x device scale is the 1916px the existing files use.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const css = resolve(root, 'src/styles/global.css');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAD = 29;
const WIDTH = 900;

const figures = [
  ['1-why-it-grows', 'WhyItGrows.astro'],
  ['2-the-climb', 'TheClimb.astro'],
  ['3-the-anatomy', 'TheAnatomy.astro'],
  ['4-the-split', 'TheSplit.astro'],
  ['5-same-scale', 'SameScale.astro'],
];

// The stat row is plain markup rather than an svg, so it is spelled out here to
// match <Stats> in src/content/blog/managing-the-context-window.mdx.
const stats = [
  ['84% &rarr; 27%', 'peak window used'],
  ['33 &rarr; 0', 'context warnings'],
  ['9 &rarr; 8', 'lint findings, vs baseline'],
  ['286', 'tests passing'],
];

function page(body, extraCss = '') {
  return `<!doctype html>
<html data-theme="light">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
<link rel="stylesheet" href="file://${css}" />
<style>body { margin: 0; padding: ${PAD}px; width: ${WIDTH + PAD * 2}px; }
svg { display: block; width: ${WIDTH}px; height: auto; color: var(--ink); }
${extraCss}</style>
</head>
<body>${body}</body>
</html>`;
}

function shoot(html, height, out) {
  const tmp = resolve(here, '.render.html');
  writeFileSync(tmp, html);
  execFileSync(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=2',
    `--window-size=${WIDTH + PAD * 2},${height}`,
    `--screenshot=${resolve(here, out + '.png')}`,
    `file://${tmp}`,
  ], { stdio: 'ignore' });
  rmSync(tmp);
  console.log(`${out}.png  ${(WIDTH + PAD * 2) * 2}x${height * 2}`);
}

for (const [out, file] of figures) {
  const src = readFileSync(resolve(root, 'src/components/figures', file), 'utf8');
  const svg = src.slice(src.indexOf('<svg'), src.lastIndexOf('</svg>') + 6);
  const [, , vbHeight] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  shoot(page(svg), Number(vbHeight) + PAD * 2, out);
}

const row = stats.map(([v, k]) =>
  `<div class="stat"><span class="v">${v}</span><span class="k">${k}</span></div>`).join('');
shoot(page(`<div class="stats">${row}</div>`), 85 + PAD * 2, '6-stat-row');
