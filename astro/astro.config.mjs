import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  site: 'https://kaiwern.com',
  trailingSlash: 'always',
  server: {
    allowedHosts: ['kais-mac-mini.tailc2f2.ts.net'],
  },
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['dialkit/vanilla'],
    },
  },
});
