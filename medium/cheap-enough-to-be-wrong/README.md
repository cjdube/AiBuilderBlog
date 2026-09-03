# Medium bundle: cheap-enough-to-be-wrong

Source: https://blog.craigdube.dev/blog/cheap-enough-to-be-wrong/

## The three fields Medium asks for

- **Title** — Cheap Enough to Be Wrong
- **Subtitle** — Testing a Hypothesis Before Building On It
- **Story preview description**, under Settings next to the preview image —
  I was sure a hosted reading service would make my daily learnings deeper. Instead of building it, I spent a morning building the thing that would tell me whether I was right.

## The route that keeps your SEO

1. Go to https://medium.com/p/import and paste https://blog.craigdube.dev/blog/cheap-enough-to-be-wrong/
2. Medium pulls the text, backdates it, and sets the canonical link back to
   your blog for you. Do not skip this step and paste instead, or your blog
   loses the search credit for its own post.
3. Medium will drop or flatten every block listed under **Fix these** below.
   Delete whatever it left there and drag the PNG in its place.
4. Read it once in Medium's preview before you publish.

## Fix these after the import

1. **table-1.png** — Setup / Who reads the page / What reaches the draft prompt
2. **table-2.png** — Setup / bullets / grounded / note chars
3. **table-3.png** — local / hosted
4. **stats-1.png** — stat strip

## If the import tool fails

Open `PASTE.html` in a browser, select all, copy, and paste into a new Medium
draft. Rich text survives; markdown does not. Then set the canonical link by
hand: More settings → Advanced settings → "This story was originally published
elsewhere" → https://blog.craigdube.dev/blog/cheap-enough-to-be-wrong/

## Files

- `POST.md` — the post as plain markdown, for reference. Tables and stat
  strips are also kept in it as HTML comments, in case you want them as text.
- `PASTE.html` — the fallback described above.
- `table-1.png`, `table-2.png`, `table-3.png`, `stats-1.png`

Rebuild this bundle with `npm run build && node medium/export.mjs cheap-enough-to-be-wrong`.
