import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHugoAliases } from '../src/lib/hugo-site.mjs';

const distRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const siteUrl = 'https://kaiwern.com';
const aliases = new Map();

for (const { alias, route } of listHugoAliases()) {
  const previous = aliases.get(alias);
  if (previous && previous !== route) {
    throw new Error(`Hugo alias ${alias} points to both ${previous} and ${route}`);
  }
  aliases.set(alias, route);
}

for (const [alias, route] of aliases) {
  const target = new URL(route, `${siteUrl}/`).href;
  const destination = path.join(distRoot, alias.replace(/^\/+/, ''));
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, `<!DOCTYPE html>\n<html lang="en-us">\n  <head>\n    <title>${target}</title>\n    <link rel="canonical" href="${target}">\n    <meta name="robots" content="noindex">\n    <meta charset="utf-8">\n    <meta http-equiv="refresh" content="0; url=${target}">\n  </head>\n</html>\n`);
}

console.log(`Wrote ${aliases.size} Hugo alias redirects.`);
