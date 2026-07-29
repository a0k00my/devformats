// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

const SITE = 'https://devformats.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [
    react(),
    sitemap({
      // Every canonical tag on the site omits the trailing slash (see Layout.astro
      // and every page's `canonical` prop) — the sitemap must match exactly, or
      // Google crawls a URL that immediately redirects to the canonical form and
      // flags it as "Page with redirect" instead of indexing it.
      serialize(item) {
        if (item.url !== `${SITE}/`) item.url = item.url.replace(/\/$/, '');
        return item;
      },
    }),
    mdx(),
  ],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()]
  }
});