import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';
import { tools } from '../../data/tools';

type PageMeta = { name: string; description: string };

const pages: Record<string, PageMeta> = Object.fromEntries(tools.map(t => [t.slug, t]));
pages['home'] = {
  name: 'DevFormats',
  description: 'Fast, private developer tools for formatting, validating, converting and generating structured data.',
};

const posts = await getCollection('blog', ({ data }) => !data.draft);
for (const post of posts) {
  pages[`blog/${post.id}`] = { name: post.data.title, description: post.data.description };
}

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page: PageMeta) => ({
    title: page.name,
    description: page.description,
    bgGradient: [[13, 13, 13]],
    border: { color: [80, 227, 194], width: 4 },
    font: {
      title: { color: [229, 229, 229], size: 64, weight: 'Bold' },
      description: { color: [136, 136, 136], size: 32 },
    },
    padding: 80,
  }),
});
