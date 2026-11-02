import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kaiwern.com',
  trailingSlash: 'always',
  server: {
    allowedHosts: ['kais-mac-mini.tailc2f2.ts.net'],
  },
  devToolbar: {
    enabled: false,
  },
  vite: {
    optimizeDeps: {
      exclude: ['dialkit/vanilla'],
    },
  },
});
