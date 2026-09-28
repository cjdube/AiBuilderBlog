# Medium bundle: phased-plan

Source: https://blog.craigdube.dev/blog/phased-plan/

## The three fields Medium asks for

- **Title** — Opus Plans, Haiku Writes the Docs
- **Subtitle** — A Planning Skill That Picks the Model for Every Step
- **Story preview description**, under Settings next to the preview image —
  I'm on Claude's $20 Pro plan, so I'm always looking for ways to get more work out of it without paying more. The phased plan skill makes every plan say which model does each step, and it runs by itself whenever I'm in plan mode.

## The route that keeps your SEO

1. Go to https://medium.com/p/import and paste https://blog.craigdube.dev/blog/phased-plan/
2. Medium pulls the text, backdates it, and sets the canonical link back to
   your blog for you. Do not skip this step and paste instead, or your blog
   loses the search credit for its own post.
3. Medium will drop or flatten every block listed under **Fix these** below.
   Delete whatever it left there and drag the PNG in its place.
4. Read it once in Medium's preview before you publish.

## Fix these after the import

1. **table-1.png** — Model / Gets
2. **code-1.png** — code block
3. **code-2.png** — code block

## If the import tool fails

Open `PASTE.html` in a browser, select all, copy, and paste into a new Medium
draft. Rich text survives; markdown does not. Then set the canonical link by
hand: More settings → Advanced settings → "This story was originally published
elsewhere" → https://blog.craigdube.dev/blog/phased-plan/

## Files

- `POST.md` — the post as plain markdown, for reference. Tables and stat
  strips are also kept in it as HTML comments, in case you want them as text.
- `PASTE.html` — the fallback described above.
- `table-1.png`, `code-1.png`, `code-2.png`

Rebuild this bundle with `npm run build && node medium/export.mjs phased-plan`.
