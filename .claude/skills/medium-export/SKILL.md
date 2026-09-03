---
name: medium-export
description: Export a published blog post from this repo into a Medium-ready bundle — the text, plus PNGs of every table, stat strip and chart, plus the import checklist. Use when asked to cross-post, republish, or put a post on Medium.
---

# Export a post to Medium

Medium renders no tables, no callouts and no stat strips. This skill turns
those blocks into PNGs drawn from the site's own CSS, so the Medium version
looks like the blog instead of like a fallback.

## Run it

Ask which post if the user did not name one. The slug is the `.mdx` filename in
`src/content/blog/`, without the extension.

```
npm run build && node medium/export.mjs <slug>
```

The bundle lands in `medium/<slug>/`:

| File | What it is |
|---|---|
| `README.md` | The steps to follow in Medium, and the title/subtitle fields |
| `POST.md` | The post as markdown, for reference |
| `PASTE.html` | Fallback: open, select all, copy, paste into Medium |
| `*.png` | One per table, stat strip and chart |

Image sizes are set by `SHOT` at the top of the script. Tables and stat strips
are drawn narrow, near the 700px Medium lays an image out at, so Medium barely
scales them and the type stays readable. Charts stay at the 900px they were
drawn at. Do not widen the tables back out; that is what made them look small.

## Then tell the user

Read `medium/<slug>/README.md` and relay two things:

1. Import the post at <https://medium.com/p/import>, pasting the live blog URL.
   **Say plainly why:** the import tool sets the canonical link back to the blog
   automatically. Pasting instead loses the search credit for their own post.
2. The list under **Fix these after the import** — those blocks will arrive
   broken and need the PNG dragged in.

Do not publish, post, or sign in to Medium. The user does that part.

## Checks before handing it over

- Open each PNG and look at it. A chart that failed to load its fonts, or a
  table cut off at the bottom, is the failure mode.
- `POST.md` should have no stray `<` tags left in the prose.
- If the post is not live yet, the import step will not work. Say so, and
  point at `PASTE.html` instead.

## When the post has a block the script does not know

`medium/export.mjs` handles `<table>`, `<div class="stats">`, `<svg>`,
`<figure>`, callouts, blockquotes, lists and headings. A new component in
`src/components/` needs a new branch in the block loop, next to the existing
ones. Render it to a PNG if Medium cannot show it, otherwise map it to
markdown.
