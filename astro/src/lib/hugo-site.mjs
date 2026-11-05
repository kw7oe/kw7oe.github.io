import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

function findRepoRoot(startDirectory) {
  let directory = startDirectory;
  while (directory !== path.dirname(directory)) {
    if (existsSync(path.join(directory, 'content')) && existsSync(path.join(directory, 'config.toml'))) return directory;
    directory = path.dirname(directory);
  }
  throw new Error(`Could not locate the Hugo repository root from ${startDirectory}`);
}

export const repoRoot = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
const contentRoot = path.join(repoRoot, 'content');
const taxonomyNames = ['categories', 'tags', 'series'];
let productionSite;

/** @typedef {{ sourcePath: string, filePath: string, title: string, type: string, section: string, route: string, slug: string, dateKey: string | null, date: Date | null, lastmod: string | null, content: string, metadata: Record<string, unknown>, aliases: string[], tags: string[], categories: string[], series: string[], isSectionIndex: boolean }} ContentPage */
/** @typedef {{ kind: 'home' | 'single' | 'section' | 'taxonomy-index' | 'taxonomy-term', route: string, title: string, page?: ContentPage, entries?: ContentPage[], taxonomy?: string, term?: { label: string, slug: string, pages: ContentPage[] }, terms?: { label: string, slug: string, pages: ContentPage[] }[] }} SiteRoute */

function walkMarkdown(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walkMarkdown(fullPath)
      : entry.isFile() && entry.name.endsWith('.md')
        ? [fullPath]
        : [];
  });
}

function frontmatterFor(source, sourcePath) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error(`Missing YAML frontmatter in ${sourcePath}`);

  let raw = match[1];
  if (sourcePath === 'posts/2018-12-01-advent-of-code-2018-day-1-part-2.md') {
    raw = raw.replace('34x\nfaster\'', '34x faster\'');
  }

  const parsed = YAML.parse(raw) ?? {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected a YAML mapping in ${sourcePath}`);
  }

  return {
    metadata: parsed,
    body: source.slice(match[0].length),
    raw,
  };
}

function stringValue(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringList(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return values.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function dateParts(raw, metadata, fileName) {
  const rawDate = /^date:\s*["']?(\d{4}-\d{1,2}-\d{1,2})/m.exec(raw)?.[1];
  const fileDate = /^(\d{4})-(\d{1,2})-(\d{1,2})-/.exec(fileName);
  const dateKey = rawDate
    ? rawDate.split('-').map((part, index) => index === 0 ? part : part.padStart(2, '0')).join('-')
    : fileDate
      ? `${fileDate[1]}-${fileDate[2].padStart(2, '0')}-${fileDate[3].padStart(2, '0')}`
      : null;
  const rawValue = metadata.date;
  const date = rawValue instanceof Date
    ? rawValue
    : typeof rawValue === 'string'
      ? new Date(rawValue)
      : dateKey
        ? new Date(`${dateKey}T00:00:00Z`)
        : null;

  return { dateKey, date: date && Number.isFinite(date.getTime()) ? date : null };
}

function gitLastmod(sourcePath) {
  if (!existsSync(path.join(repoRoot, '.git'))) return null;
  const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', path.posix.join('content', sourcePath)], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function hugoUrlize(value) {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\\/g, '/')
    .replace(/[^\p{L}\p{N}\s._~/-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugFor(fileName, section, metadata) {
  const frontmatterSlug = stringValue(metadata.slug, '');
  if (frontmatterSlug) return frontmatterSlug;
  return section === 'posts' ? hugoUrlize(stringValue(metadata.title, fileName)) : fileName;
}

function routeFor({ section, slug, dateKey, metadata, isSectionIndex, sourcePath }) {
  if (typeof metadata.url === 'string' && metadata.url.trim()) {
    const explicit = metadata.url.trim().startsWith('/') ? metadata.url.trim() : `/${metadata.url.trim()}`;
    return explicit.endsWith('/') || explicit.endsWith('.html') ? explicit : `${explicit}/`;
  }
  if (isSectionIndex) return sourcePath === '_index.md' ? '/' : `/${section}/`;
  if (!section) return `/${slug}/`;
  if (section === 'posts') {
    if (!dateKey) throw new Error(`Missing date for post ${sourcePath}`);
    const [year, month, day] = dateKey.split('-');
    return `/posts/${year}/${month}/${day}/${slug}/`;
  }
  return `/${section}/${slug}/`;
}

function dateLabel(dateKey, options = {}) {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-US', {
    month: options.fullMonth ? 'long' : 'short',
    day: options.padDay ? '2-digit' : 'numeric',
    ...(options.year ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date);
}

function taxonomySlug(label) {
  return hugoUrlize(label);
}

function compareNewestFirst(left, right) {
  const leftTime = left.date?.getTime() ?? 0;
  const rightTime = right.date?.getTime() ?? 0;
  return rightTime - leftTime || left.title.localeCompare(right.title);
}

function addReferenceKey(index, key, page) {
  const normalized = key.toLocaleLowerCase('en-US').replace(/^\/+|\/$/g, '').replace(/\.md$/i, '');
  if (!normalized) return;
  const matches = index.get(normalized) ?? [];
  matches.push(page);
  index.set(normalized, matches);
}

export function createHugoSite() {
  if (import.meta.env?.PROD) {
    productionSite ??= buildHugoSite();
    return productionSite;
  }
  return buildHugoSite();
}

function buildHugoSite() {
  const pages = walkMarkdown(contentRoot).map((filePath) => {
    const source = readFileSync(filePath, 'utf8');
    const sourcePath = path.relative(contentRoot, filePath).split(path.sep).join('/');
    const { metadata, body, raw } = frontmatterFor(source, sourcePath);
    const segments = sourcePath.split('/');
    const fileName = segments.at(-1).replace(/\.md$/, '');
    const isSectionIndex = fileName === '_index';
    const section = isSectionIndex ? segments.slice(0, -1).join('/') : segments.length > 1 ? segments[0] : '';
    const slug = isSectionIndex ? '' : slugFor(fileName, section, metadata);
    const { dateKey, date } = dateParts(raw, metadata, fileName);
    const route = routeFor({ section, slug, dateKey, metadata, isSectionIndex, sourcePath });
    const lastmodRaw = /^lastmod:\s*["']?(\d{4}-\d{1,2}-\d{1,2})/m.exec(raw)?.[1] ?? null;
    const lastmod = lastmodRaw
      ? lastmodRaw.split('-').map((part, index) => index === 0 ? part : part.padStart(2, '0')).join('-')
      : isSectionIndex || section === 'posts' ? null : gitLastmod(sourcePath);

    return {
      sourcePath,
      filePath,
      title: stringValue(metadata.title, isSectionIndex ? section : slug),
      type: stringValue(metadata.type, section || 'page'),
      section,
      route,
      slug,
      dateKey,
      date,
      lastmod,
      content: body,
      metadata,
      aliases: stringList(metadata.aliases).map((alias) => alias.startsWith('/') ? alias : `/${alias}`),
      tags: stringList(metadata.tags),
      categories: stringList(metadata.categories),
      series: stringList(metadata.series),
      isSectionIndex,
    };
  });

  const publishedPages = pages.filter((page) => page.metadata.draft !== true);
  const drafts = pages.filter((page) => page.metadata.draft === true);
  const regularPages = publishedPages.filter((page) => !page.isSectionIndex);
  const home = publishedPages.find((page) => page.route === '/');
  if (!home) throw new Error('Missing content/_index.md home page');

  const pagesBySource = new Map(regularPages.map((page) => [page.sourcePath, page]));
  const referenceIndex = new Map();
  for (const page of regularPages) {
    const baseName = path.basename(page.sourcePath, '.md');
    [page.sourcePath, baseName, page.slug, page.route].forEach((key) => addReferenceKey(referenceIndex, key, page));
  }

  const resolveRef = (reference) => {
    const [target, fragment] = reference.split('#', 2);
    const normalized = target.toLocaleLowerCase('en-US').replace(/^\/+|\/$/g, '').replace(/\.md$/i, '');
    const exactSource = pagesBySource.get(`${normalized}.md`);
    const matches = exactSource ? [exactSource] : referenceIndex.get(normalized) ?? [];
    const uniqueMatches = [...new Set(matches)];
    if (uniqueMatches.length !== 1) {
      throw new Error(`Hugo ref ${JSON.stringify(reference)} resolved to ${uniqueMatches.length} pages`);
    }
    return `${uniqueMatches[0].route}${fragment ? `#${fragment}` : ''}`;
  };

  const sectionIndexes = new Map(publishedPages.filter((page) => page.isSectionIndex).map((page) => [page.section, page]));
  const routes = [];
  routes.push({ kind: 'home', route: '/', title: home.title, page: home, entries: regularPages.filter((page) => page.type === 'posts').sort(compareNewestFirst) });

  for (const section of ['posts', 'fragments']) {
    const entries = regularPages.filter((page) => page.section === section).sort(compareNewestFirst);
    if (entries.length) {
      const page = sectionIndexes.get(section);
      routes.push({ kind: 'section', route: `/${section}/`, title: page?.title ?? `${section[0].toLocaleUpperCase('en-US')}${section.slice(1)}`, page, entries });
    }
  }

  for (const page of regularPages) {
    routes.push({ kind: 'single', route: page.route, title: page.title, page });
  }

  for (const taxonomy of taxonomyNames) {
    const groups = new Map();
    for (const page of [...regularPages].sort(compareNewestFirst)) {
      for (const label of page[taxonomy]) {
        const slug = taxonomySlug(label);
        const term = groups.get(slug) ?? { label, slug, pages: [] };
        term.pages.push(page);
        groups.set(slug, term);
      }
    }

    const terms = [...groups.values()];
    if (!terms.length) continue;
    for (const term of terms) term.pages.sort(compareNewestFirst);
    terms.sort((left, right) => {
      const leftDate = left.pages[0]?.date?.getTime() ?? 0;
      const rightDate = right.pages[0]?.date?.getTime() ?? 0;
      return rightDate - leftDate || left.label.localeCompare(right.label, 'en-US');
    });

    const indexPage = sectionIndexes.get(taxonomy);
    routes.push({
      kind: 'taxonomy-index',
      route: `/${taxonomy}/`,
      title: indexPage?.title ?? taxonomy[0].toUpperCase() + taxonomy.slice(1),
      page: indexPage,
      taxonomy,
      terms,
    });
    for (const term of terms) {
      routes.push({
        kind: 'taxonomy-term',
        route: `/${taxonomy}/${term.slug}/`,
        title: term.label[0].toLocaleUpperCase('en-US') + term.label.slice(1),
        taxonomy,
        term,
        entries: term.pages,
      });
    }
  }

  const routeSet = new Set();
  for (const route of routes) {
    if (routeSet.has(route.route)) throw new Error(`Duplicate Hugo route ${route.route}`);
    routeSet.add(route.route);
  }

  return {
    pages: regularPages,
    drafts,
    routes,
    home,
    sectionIndexes,
    resolveRef,
    formatDate: dateLabel,
    repoRoot,
  };
}
