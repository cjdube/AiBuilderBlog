import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /** Second line of the headline, shown in ochre under the title. */
    subtitle: z.string().optional(),
    /** The standfirst — one or two sentences under the headline. */
    standfirst: z.string(),
    pubDate: z.coerce.date(),
    author: z.string().default('Craig Dubé'),
    tags: z.array(z.string()).default([]),
    /** Medium URL for the four ported posts, so Medium keeps the canonical. */
    canonicalUrl: z.string().url().optional(),
    dropCap: z.boolean().default(true),
    /** Lines of the article footer. Raw HTML is allowed. */
    colophon: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
