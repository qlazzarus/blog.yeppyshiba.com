// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { legacyTagRedirects } from './src/config/legacyTagRedirects.ts';

const site = 'https://blog.yeppyshiba.com';
const legacyTagRedirectUrls = new Set(
    legacyTagRedirects.map((redirect) => new URL(redirect.from, site).toString()),
);

// https://astro.build/config
export default defineConfig({
    site,
    trailingSlash: 'always',
    integrations: [
        mdx(),
        sitemap({
            filter: (page) => !legacyTagRedirectUrls.has(page),
        }),
    ],
    vite: {
        plugins: [tailwindcss()],
    },
});
