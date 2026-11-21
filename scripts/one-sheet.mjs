// Prints both one-sheet PDFs from public/one-sheet/index.html, the only copy to edit.
// The local copy adds the phone number from one-sheeter/phone.txt (gitignored: the repo is public).
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const src = resolve('public/one-sheet/index.html');
const localHtml = resolve('one-sheeter/craig-dube-one-sheet-C.html');
const email = '<a href="mailto:craig@vibefoundrytech.com">craig@vibefoundrytech.com</a> ·';

const phone = readFileSync('one-sheeter/phone.txt', 'utf8').trim();
const html = readFileSync(src, 'utf8');
if (!html.includes(email)) throw new Error('Email line not found in public one-sheet; update the script.');
writeFileSync(localHtml, html.replace(email, `${email} ${phone} ·`));

const print = (from, to) =>
  execFileSync(chrome, ['--headless', '--no-pdf-header-footer', '--virtual-time-budget=5000', `--print-to-pdf=${resolve(to)}`, `file://${from}`], { stdio: 'ignore' });
print(src, 'public/craig-dube-one-sheet.pdf');
print(localHtml, 'one-sheeter/craig-dube-one-sheet-C.pdf');

// Each PDF prints from its own HTML, so checking the HTML is enough for the phone number.
if (html.includes(phone)) throw new Error('Phone number is in the public one-sheet. Remove it.');
for (const f of ['public/craig-dube-one-sheet.pdf', 'one-sheeter/craig-dube-one-sheet-C.pdf']) {
  const pages = readFileSync(f, 'latin1').match(/\/Type\s*\/Page(?!s)/g)?.length;
  if (pages !== 1) throw new Error(`${f}: ${pages} pages, want 1`);
  console.log(`${f}: 1 page`);
}
