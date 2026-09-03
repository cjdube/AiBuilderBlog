// Exports one post into a Medium-ready bundle. Run: node medium/export.mjs <slug>
//
// Medium cannot render tables, the stat strip or the callouts, so those blocks
// come out as PNGs drawn from the built page's own CSS. Everything else comes
// out as text. Build first (`npm run build`) so dist/ is current.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Medium lays an image out about 700px wide. A block drawn wider than that gets
// scaled down, and its type with it, which is why the tables were coming out
// small. Tables and stat strips are therefore drawn narrow, near Medium's own
// width, so almost no scaling happens. They get a third device pixel back to
// stay sharp on a retina screen. The charts keep the 900px they were designed
// at, because they are meant to read as a wide figure.
const SHOT = {
  figure: { width: 900, pad: 29, scale: 2 },
  table: { width: 660, pad: 18, scale: 3 },
};

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node medium/export.mjs <slug>');
  process.exit(1);
}

const built = resolve(root, 'dist/blog', slug, 'index.html');
let html;
try {
  html = readFileSync(built, 'utf8');
} catch {
  console.error(`no ${built}\nrun: npm run build`);
  process.exit(1);
}

const site = (readFileSync(resolve(root, 'astro.config.mjs'), 'utf8')
  .match(/site:\s*'([^']+)'/) || [, ''])[1];
const canonical = `${site}/blog/${slug}/`;

const cssHref = (html.match(/href="(\/_astro\/[^"]+\.css)"/) || [])[1];
const cssFile = cssHref ? resolve(root, 'dist' + cssHref) : null;

// --- html to markdown, inline only -----------------------------------------

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&nbsp;': ' ', '&rarr;': '→', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
};

function decode(s) {
  return s.replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, (e) => ENTITIES[e] ?? e)
    .replace(/\s+/g, ' ').trim();
}

function inline(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<(strong|b)>(.*?)<\/\1>/gs, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/gs, '*$2*')
    .replace(/<code>(.*?)<\/code>/gs, '`$1`')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, (e) => ENTITIES[e] ?? e)
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const cells = (row, tag) =>
  [...row.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs'))]
    .map((m) => inline(m[1]));

const h1 = (html.match(/<h1[^>]*>(.*?)<\/h1>/s) || [, slug])[1];
const subtitle = decode((h1.match(/<span class="sub">(.*?)<\/span>/s) || [, ''])[1]);
const title = decode(h1.replace(/<span class="sub">.*?<\/span>/s, ''))
  .replace(/[:\s]+$/, '');
const standfirst = decode(
  (html.match(/<p class="standfirst">(.*?)<\/p>/s) || [, ''])[1]);

const outDir = resolve(here, slug);
mkdirSync(outDir, { recursive: true });

// --- pull the article body out of the built page ---------------------------

const start = html.indexOf('<article');
const article = html
  .slice(html.indexOf('>', start) + 1, html.indexOf('</article>'))
  .trim();

// Astro emits one block element per line, so a line-based scan is enough. Only
// <div> needs depth counting, because the stat strip nests divs inside itself.
const BLOCK = /^<(p|h2|h3|h4|ul|ol|table|blockquote|figure|pre|div|svg)\b/;
const blocks = [];
let open = null;

for (const line of article.split('\n')) {
  if (open) {
    open.lines.push(line);
    if (open.tag === 'div') {
      open.depth += (line.match(/<div\b/g) || []).length;
      open.depth -= (line.match(/<\/div>/g) || []).length;
      if (open.depth <= 0) { blocks.push(open); open = null; }
    } else if (line.includes(`</${open.tag}>`)) {
      blocks.push(open); open = null;
    }
    continue;
  }
  if (!line.trim()) continue;
  const m = line.match(BLOCK);
  if (!m) { blocks.push({ tag: 'raw', lines: [line] }); continue; }
  const tag = m[1];
  const block = { tag, lines: [line], depth: 0 };
  if (line.includes(`</${tag}>`) && tag !== 'div') { blocks.push(block); continue; }
  if (tag === 'div') {
    block.depth = (line.match(/<div\b/g) || []).length
      - (line.match(/<\/div>/g) || []).length;
    if (block.depth <= 0) { blocks.push(block); continue; }
  }
  open = block;
}
if (open) blocks.push(open);

// --- render a block to png -------------------------------------------------

function shoot(body, name, kind) {
  const { width, pad, scale } = SHOT[kind];
  const canvas = width + pad * 2;
  const page = `<!doctype html>
<html data-theme="light"><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
${cssFile ? `<link rel="stylesheet" href="file://${cssFile}" />` : ''}
<style>html, body { background: var(--paper, #fff); }
body { margin: 0; padding: ${pad}px; width: ${canvas}px; }
/* On the site .post is a three-column grid and prose sits in a 66ch middle
   track. Here there is only ever one block on the page, so that track would
   just add gutters the block has to be scaled down to fit past. */
article.post { display: block; max-width: none; }
article.post > :first-child { margin-top: 0; }
article.post > :last-child { margin-bottom: 0; }
table { width: 100%; min-width: 0; }
svg { display: block; width: ${width}px; height: auto; color: var(--ink); }
</style></head>
<body><article class="post">${body}</article></body></html>`;

  const tmp = resolve(outDir, `.${name}.html`);
  const raw = resolve(outDir, `.${name}.raw.png`);
  writeFileSync(tmp, page);
  execFileSync(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    `--force-device-scale-factor=${scale}`,
    '--virtual-time-budget=4000',
    `--window-size=${canvas},2400`,
    `--screenshot=${raw}`,
    `file://${tmp}`,
  ], { stdio: 'ignore' });
  rmSync(tmp);
  return { raw, name, kind };
}

// The screenshot is a fixed 2400px tall canvas, so it has to be cut back to the
// content. Only the height is cut. The width is left alone so the block keeps
// the margin it was drawn with, rather than sitting hard against the edge.
async function trim({ raw, name, kind }) {
  const { width, pad, scale } = SHOT[kind];
  const out = resolve(outDir, name + '.png');
  const bg = await sharp(raw).extract({ left: 2, top: 2, width: 1, height: 1 })
    .raw().toBuffer();
  const background = { r: bg[0], g: bg[1], b: bg[2] };
  const { info } = await sharp(raw)
    .trim({ background, threshold: 6 })
    .toBuffer({ resolveWithObject: true });
  await sharp(raw)
    .extract({
      left: 0, top: 0,
      width: (width + pad * 2) * scale,
      height: Math.min(info.height + pad * 2 * scale, 2400 * scale),
    })
    .toFile(out);
  rmSync(raw);
  const size = await sharp(out).metadata();
  console.log(`${name}.png  ${size.width}x${size.height}`);
  return `${name}.png`;
}

// --- walk the blocks -------------------------------------------------------

const md = [];
const paste = [];
const shots = [];
const images = [];
let nTable = 0, nStats = 0, nFig = 0;

function imageStub(file, note) {
  images.push({ file, note });
  md.push(`![${note}](${file})\n\n*[IMAGE: ${file} — ${note}]*`);
  paste.push(`<p style="color:#b23">[ IMAGE HERE: ${file} — ${note} ]</p>`);
}

for (const block of blocks) {
  const src = block.lines.join('\n');
  const text = inline(src);

  if (block.tag === 'table') {
    const name = `table-${++nTable}`;
    shots.push(shoot(src, name, 'table'));
    const head = cells((src.match(/<thead>(.*?)<\/thead>/s) || [, ''])[1], 'th');
    imageStub(`${name}.png`, head.filter(Boolean).join(' / ') || 'table');
    // A plain-text copy, so nothing is lost if the image is skipped.
    md.push('<!-- table as text\n' + [head.join(' | '),
      ...[...src.matchAll(/<tr>(?:(?!<\/tr>).)*?<td.*?<\/tr>/gs)]
        .map((r) => cells(r[0], 'td').join(' | '))].join('\n') + '\n-->');
    continue;
  }

  if (block.tag === 'div' && /class="stats"/.test(src)) {
    const name = `stats-${++nStats}`;
    shots.push(shoot(src, name, 'table'));
    imageStub(`${name}.png`, 'stat strip');
    const vals = [...src.matchAll(/<span class="v">(.*?)<\/span><span class="k">(.*?)<\/span>/gs)]
      .map((m) => `- ${inline(m[2])}: ${inline(m[1])}`);
    md.push('<!-- stats as a list, if you skip the image\n' + vals.join('\n') + '\n-->');
    continue;
  }

  if (block.tag === 'svg' || block.tag === 'figure') {
    const name = `figure-${++nFig}`;
    shots.push(shoot(src, name, 'figure'));
    imageStub(`${name}.png`, 'figure');
    continue;
  }

  if (block.tag === 'div' && /class="cost"/.test(src)) {
    // A Callout. Medium's nearest match is a blockquote with a bold first line.
    const heading = inline((src.match(/<h3[^>]*>(.*?)<\/h3>/s) || [, ''])[1]);
    const body = [...src.matchAll(/<p>(.*?)<\/p>/gs)].map((m) => inline(m[1]));
    md.push(['> **' + heading + '**', ...body.map((b) => '>\n> ' + b)].join('\n'));
    paste.push(`<blockquote><p><strong>${heading}</strong></p>`
      + body.map((b) => `<p>${b}</p>`).join('') + '</blockquote>');
    continue;
  }

  if (block.tag === 'blockquote') {
    md.push(text.split('\n').map((l) => '> ' + l).join('\n'));
    paste.push(src);
    continue;
  }

  if (block.tag === 'ul' || block.tag === 'ol') {
    const items = [...src.matchAll(/<li>(.*?)<\/li>/gs)].map((m) => inline(m[1]));
    const mark = block.tag === 'ol' ? (i) => `${i + 1}.` : () => '-';
    md.push(items.map((t, i) => `${mark(i)} ${t}`).join('\n'));
    paste.push(src);
    continue;
  }

  if (/^h[234]$/.test(block.tag)) {
    md.push('#'.repeat(Number(block.tag[1])) + ' ' + text);
    paste.push(`<h${block.tag[1]}>${text}</h${block.tag[1]}>`);
    continue;
  }

  md.push(text);
  paste.push(src);
}

const files = [];
for (const s of shots) files.push(await trim(s));

// --- write the bundle ------------------------------------------------------

writeFileSync(resolve(outDir, 'POST.md'),
  `# ${title}\n\n## ${subtitle}\n\n*Originally published at ${canonical}*\n\n`
  + `${md.join('\n\n')}\n`);

writeFileSync(resolve(outDir, 'PASTE.html'),
  `<!doctype html><meta charset="utf-8"><title>${title}</title>
<style>body{font:18px/1.6 Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px}
blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:20px;color:#444}</style>
<h1>${title}</h1>
<h2>${subtitle}</h2>
${paste.join('\n')}\n`);

writeFileSync(resolve(outDir, 'README.md'), `# Medium bundle: ${slug}

Source: ${canonical}

## The three fields Medium asks for

- **Title** — ${title}
- **Subtitle** — ${subtitle}
- **Story preview description**, under Settings next to the preview image —
  ${standfirst}

## The route that keeps your SEO

1. Go to https://medium.com/p/import and paste ${canonical}
2. Medium pulls the text, backdates it, and sets the canonical link back to
   your blog for you. Do not skip this step and paste instead, or your blog
   loses the search credit for its own post.
3. Medium will drop or flatten every block listed under **Fix these** below.
   Delete whatever it left there and drag the PNG in its place.
4. Read it once in Medium's preview before you publish.

## Fix these after the import

${images.length ? images.map((i, n) => `${n + 1}. **${i.file}** — ${i.note}`).join('\n')
  : 'Nothing. This post is all text, so the import is the whole job.'}

## If the import tool fails

Open \`PASTE.html\` in a browser, select all, copy, and paste into a new Medium
draft. Rich text survives; markdown does not. Then set the canonical link by
hand: More settings → Advanced settings → "This story was originally published
elsewhere" → ${canonical}

## Files

- \`POST.md\` — the post as plain markdown, for reference. Tables and stat
  strips are also kept in it as HTML comments, in case you want them as text.
- \`PASTE.html\` — the fallback described above.
- ${files.length ? files.map((f) => `\`${f}\``).join(', ') : '(no images)'}

Rebuild this bundle with \`npm run build && node medium/export.mjs ${slug}\`.
`);

console.log(`\nmedium/${slug}/  —  ${files.length} image(s), ${blocks.length} blocks`);
