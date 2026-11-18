import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHugoSite } from '../src/lib/hugo-site.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselineRoot = path.join(repoRoot, '.amp/in/hugo-astro-port/hugo-baseline');
const astroRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
const site = createHugoSite();

function listHtml(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name).split(path.sep).join('/');
    return entry.isDirectory()
      ? listHtml(path.join(directory, entry.name), relative)
      : entry.isFile() && entry.name.endsWith('.html')
        ? [relative]
        : [];
  });
}

function routeFile(route) {
  return route === '/' ? 'index.html' : `${route.replace(/^\/+|\/+$/g, '')}/index.html`;
}

function routeFromFile(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

const baselineFiles = listHtml(baselineRoot);
const baselineRoutes = baselineFiles
  .filter((file) => file.endsWith('/index.html') || file === 'index.html')
  .map(routeFromFile)
  .sort();
const routeMoves = new Map([['/', '/blogs/'], ['/about/', '/']]);
const migratedBaselineRoutes = baselineRoutes.map((route) => routeMoves.get(route) ?? route);
const expectedRoutes = site.routes.map(({ route }) => route).sort();
const baselineAliases = baselineFiles.filter((file) => file !== 'index.html' && file !== '404.html' && !file.endsWith('/index.html')).sort();
const sourceAliases = site.pages.flatMap((page) => page.aliases.map((alias) => alias.slice(1))).sort();
const expectedHtml = new Set([...site.routes.map(({ route }) => routeFile(route)), '404.html', ...sourceAliases]);
const baselineHtml = new Set(baselineFiles);
const astroFiles = astroRoot
  ? existsSync(astroRoot)
    ? listHtml(astroRoot)
    : (() => { throw new Error(`Astro output directory not found: ${astroRoot}`); })()
  : [];
const missingAstroFiles = astroRoot
  ? [...expectedHtml].filter((file) => !astroFiles.includes(file))
  : [];
const missingRoutes = expectedRoutes.filter((route) => !migratedBaselineRoutes.includes(route));
const unexpectedRoutes = migratedBaselineRoutes.filter((route) => !expectedRoutes.includes(route));
const missingAliases = sourceAliases.filter((alias) => !baselineAliases.includes(alias));
const unexpectedAliases = baselineAliases.filter((alias) => !sourceAliases.includes(alias));
const unresolvedRefs = [];

for (const page of site.pages) {
  for (const [, reference] of page.content.matchAll(/\{\{<\s*ref\s+["']([\s\S]*?)["']\s*>\}\}/g)) {
    try {
      site.resolveRef(reference.trim());
    } catch (error) {
      unresolvedRefs.push(`${page.sourcePath}: ${error.message}`);
    }
  }
}

const errors = [
  ...missingRoutes.map((route) => `missing Hugo route in site model: ${route}`),
  ...unexpectedRoutes.map((route) => `extra route in site model: ${route}`),
  ...missingAliases.map((alias) => `missing Hugo alias in site model: ${alias}`),
  ...unexpectedAliases.map((alias) => `extra alias in site model: ${alias}`),
  ...missingAstroFiles.map((file) => `missing Hugo output in Astro build: ${file}`),
  ...unresolvedRefs,
];

console.log(JSON.stringify({
  siteRoutes: site.routes.length,
  baselineRoutes: baselineRoutes.length,
  siteAliases: sourceAliases.length,
  baselineAliases: baselineAliases.length,
  publishedContentPages: site.pages.length,
  draftPagesExcluded: site.drafts.length,
  expectedHtmlFiles: expectedHtml.size,
  baselineHtmlFiles: baselineHtml.size,
  astroHtmlFiles: astroRoot ? astroFiles.length : undefined,
  missingAstroFiles: astroRoot ? missingAstroFiles : undefined,
  errors,
}, null, 2));

if (errors.length) process.exitCode = 1;
