# Medium bundle: managing-the-context-window

Source: https://blog.craigdube.dev/blog/managing-the-context-window/

## The three fields Medium asks for

- **Title** — Challenges of a Small Model
- **Subtitle** — Managing the Context Window
- **Story preview description**, under Settings next to the preview image —
  My nightly wiki job kept warning me it was almost out of context. Doubling the window made the warnings stop, which turned out to be the least interesting thing I could have done about it.

## The route that keeps your SEO

1. Go to https://medium.com/p/import and paste https://blog.craigdube.dev/blog/managing-the-context-window/
2. Medium pulls the text, backdates it, and sets the canonical link back to
   your blog for you. Do not skip this step and paste instead, or your blog
   loses the search credit for its own post.
3. Medium will drop or flatten every block listed under **Fix these** below.
   Delete whatever it left there and drag the PNG in its place.
4. Read it once in Medium's preview before you publish.

## Fix these after the import

1. **figure-1.png** — figure
2. **figure-2.png** — figure
3. **figure-3.png** — figure
4. **figure-4.png** — figure
5. **figure-5.png** — figure
6. **stats-1.png** — stat strip

## If the import tool fails

Open `PASTE.html` in a browser, select all, copy, and paste into a new Medium
draft. Rich text survives; markdown does not. Then set the canonical link by
hand: More settings → Advanced settings → "This story was originally published
elsewhere" → https://blog.craigdube.dev/blog/managing-the-context-window/

## Files

- `POST.md` — the post as plain markdown, for reference. Tables and stat
  strips are also kept in it as HTML comments, in case you want them as text.
- `PASTE.html` — the fallback described above.
- `figure-1.png`, `figure-2.png`, `figure-3.png`, `figure-4.png`, `figure-5.png`, `stats-1.png`

Rebuild this bundle with `npm run build && node medium/export.mjs managing-the-context-window`.
