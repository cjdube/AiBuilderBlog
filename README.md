# craigdube.dev — A Builder's Odyssey

Static blog built with [Astro](https://astro.build). Deployed on Cloudflare
Pages; Cloudflare rebuilds and publishes on every push to `main`.

## Publish a new post

1. Add `src/content/blog/<slug>.mdx`.
2. Fill in the frontmatter (see any existing post, or `src/content.config.ts`
   for the full schema). `title`, `standfirst` and `pubDate` are required.
3. `npm run dev` and read it at http://localhost:4321.
4. Commit and push. The post is live in about a minute.

The URL is `/blog/<slug>/`, taken from the filename.

## Commands

| Command           | Does                                       |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Dev server at `localhost:4321`             |
| `npm run build`   | Build the site into `dist/`                |
| `npm run preview` | Serve `dist/` exactly as it will be served |

## Layout

```
src/
├── content/blog/*.mdx        the posts
├── content.config.ts         frontmatter schema
├── styles/global.css         the whole design: palette, type, components
├── layouts/
│   ├── BaseLayout.astro      <head>, fonts, meta, nav
│   └── Post.astro            masthead, article grid, colophon
├── components/
│   ├── Figure.astro          framed figure for inline SVG charts
│   ├── Photo.astro           optimised image, optional caption
│   ├── Stats.astro           the four-box stat strip
│   ├── Callout.astro         bordered aside
│   ├── Pull.astro            pull quote (a `>` blockquote does the same)
│   ├── Nav.astro             site nav
│   └── figures/              the SVG charts, one component each
└── assets/                   images; Astro resizes and converts these
```

## Writing notes

- A markdown blockquote (`>`) renders as a pull quote.
- `## Heading` is the section heading. `###` is a small uppercase label — do
  not use it as a normal subheading.
- The first paragraph gets a drop cap. Set `dropCap: false` to turn that off.
- Set `canonicalUrl` when a post was published somewhere else first. The
  colophon then links back to the original.
- Set `draft: true` to keep a post out of the production build. Drafts still
  show up in `npm run dev`.
- Wide figures break out past the text column: pass `wide` to `<Photo>`, or use
  `<Figure>`, which is always wide.

## Design

Palette, type scale and components all live in `src/styles/global.css`. It
carries a full light and dark theme; the SVG charts paint from the same CSS
variables, so they follow the reader's theme with no extra work. Changing a
colour there changes it everywhere, charts included.
