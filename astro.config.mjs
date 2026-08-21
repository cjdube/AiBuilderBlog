// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://craigdube.dev',
  integrations: [mdx(), sitemap()],
  markdown: {
    // The design paints <pre> from the palette in global.css. Shiki would
    // inline its own background and colours and override that.
    syntaxHighlight: false,
  },
});
