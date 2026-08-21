import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "A Builder's Odyssey",
    description:
      'Notes from building local AI agents on one Mac mini: what works, what it costs, and what it measured.',
    site: context.site,
    items: posts.map((post) => ({
      title: [post.data.title, post.data.subtitle].filter(Boolean).join(' '),
      description: post.data.standfirst,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
