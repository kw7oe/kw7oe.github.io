import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHugoSite } from '../src/lib/hugo-site.mjs';

const distRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const siteUrl = 'https://kaiwern.com';
const site = createHugoSite();
const aliases = new Map();

for (const page of site.pages) {
  for (const alias of page.aliases) {
    const previous = aliases.get(alias);
    if (previous && previous !== page.route) {
      throw new Error(`Hugo alias ${alias} points to both ${previous} and ${page.route}`);
    }
    aliases.set(alias, page.route);
  }
}

for (const [alias, route] of aliases) {
  const target = new URL(route, `${siteUrl}/`).href;
  const destination = path.join(distRoot, alias.replace(/^\/+/, ''));
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, `<!DOCTYPE html>\n<html lang="en-us">\n  <head>\n    <title>${target}</title>\n    <link rel="canonical" href="${target}">\n    <meta name="robots" content="noindex">\n    <meta charset="utf-8">\n    <meta http-equiv="refresh" content="0; url=${target}">\n  </head>\n</html>\n`);
}

console.log(`Wrote ${aliases.size} Hugo alias redirects.`);
