import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { codeToHast } from 'shiki';
import { hugoCodeTheme, hugoShellTheme, hugoShellThemes, shikiThemes } from './code-theme-presets.js';
import { repoRoot } from './hugo-site.mjs';
import { unified } from 'unified';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';

const assetRoot = path.join(repoRoot, 'assets');
const blockMarkdownNodes = new Set([
  'blockquote',
  'containerDirective',
  'heading',
  'list',
  'listItem',
  'paragraph',
  'table',
  'tableCell',
  'tableRow',
]);

const languageAliases = new Map([
  ['docker', 'dockerfile'],
  ['eex', 'elixir'],
  ['js', 'javascript'],
  ['md', 'markdown'],
  ['postgres', 'sql'],
  ['psql', 'sql'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['ssh', 'bash'],
  ['text', 'text'],
  ['vimrc', 'vim'],
  ['yml', 'yaml'],
]);

function parseAttributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g)]
    .map(([, name, doubleQuoted, singleQuoted, unquoted]) => [name, doubleQuoted ?? singleQuoted ?? unquoted]));
}

function directiveAttributes(attributes) {
  const pairs = Object.entries(attributes);
  if (!pairs.length) return '';
  return `{${pairs.map(([name, value]) => `${name}="${value.replaceAll('"', '\\"')}"`).join(' ')}}`;
}

function convertShortcodes(markdown, resolveRef) {
  const withRefs = markdown.replace(/\{\{<\s*ref\s+["']([\s\S]*?)["']\s*>\}\}/g, (_, target) => resolveRef(target.trim()));

  return withRefs.replace(
    /^([ \t]*)\{\{([%<])\s*(\/)?\s*(callout|terminal-session|terminal-command|terminal-output)\b([^}\r\n]*)(?:%|>)\}\}[ \t]*$/gm,
    (_, indent, delimiter, closing, name, rawAttributes) => {
      if (closing) {
        return name === 'terminal-command' || name === 'terminal-output'
          ? `${indent}\n\`\`\`\n${indent}:::`
          : `${indent}${name === 'terminal-session' ? '::::' : ':::'}`;
      }

      const attributes = parseAttributes(rawAttributes);
      const opening = `${indent}${name === 'terminal-session' ? '::::' : ':::'}${name}${directiveAttributes(attributes)}`;
      if (name === 'terminal-command' || name === 'terminal-output') {
        const language = attributes.lang ?? (name === 'terminal-command' ? 'bash' : 'text');
        return `${opening}\n${indent}\`\`\`${language}\n`;
      }
      return opening;
    },
  );
}

function element(tagName, properties = {}, children = []) {
  return { type: 'element', tagName, properties, children };
}

function text(value) {
  return { type: 'text', value };
}

function readDimensions(filePath) {
  const data = readFileSync(filePath);
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (data.length >= 10 && data.subarray(0, 3).toString() === 'GIF') {
    return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
  }
  return null;
}

function localImage(page, source) {
  if (/^https?:\/\//i.test(source)) return null;
  const cleanSource = source.replace(/^\/+/, '');
  const candidates = [
    path.resolve(path.dirname(page.filePath), cleanSource),
    path.resolve(assetRoot, cleanSource),
  ];
  const pageRoot = path.dirname(page.filePath);
  const imagePath = candidates.find((candidate) =>
    existsSync(candidate)
      && (candidate.startsWith(`${assetRoot}${path.sep}`) || candidate.startsWith(`${pageRoot}${path.sep}`)),
  );
  if (!imagePath) return null;
  const relativePath = path.relative(assetRoot, imagePath).split(path.sep).join('/');
  return {
    url: `/${relativePath}`,
    dimensions: readDimensions(imagePath),
  };
}

function countWords(tree) {
  const plainText = (node, inTerminalSession = false) => {
    if (!node || typeof node !== 'object') return '';
    if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
    if (node.type === 'code') return `${node.value ?? ''} `;
    if (node.type === 'html') return `${String(node.value ?? '').replace(/<[^>]*>/gu, ' ')} `;
    if (node.type === 'definition' || node.type === 'image' || node.type === 'imageReference') return '';
    if (node.type === 'footnoteReference') return node.label ?? node.identifier ?? '';

    const isTerminalSession = node.type === 'containerDirective' && node.name === 'terminal-session';
    let content = '';
    if (node.type === 'containerDirective') {
      if (node.name === 'callout' && node.attributes?.title) content += `${node.attributes.title} `;
      if (isTerminalSession) {
        content += `${node.attributes?.title ?? 'Terminal Session'} `;
        if (node.attributes?.subtitle) content += `${node.attributes.subtitle} `;
      }
      if (inTerminalSession && node.name === 'terminal-command') content += 'Command ';
      if (inTerminalSession && node.name === 'terminal-output') content += 'Output ';
    }

    for (const child of node.children ?? []) {
      content += plainText(child, inTerminalSession || isTerminalSession);
    }
    return content + (blockMarkdownNodes.has(node.type) ? ' ' : '');
  };
  return plainText(tree).match(/\S+/gu)?.length ?? 0;
}

function inlineNodes(state, markdown) {
  const processor = unified().use(remarkParse).use(remarkSmartypants);
  const tree = processor.runSync(processor.parse(markdown));
  return tree.children[0] ? state.all(tree.children[0]) : [text(markdown)];
}

function svg(name, children) {
  return element('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    'data-icon': name,
  }, children);
}

function copyIcon() {
  return svg('copy', [
    element('rect', { x: 9, y: 9, width: 13, height: 13, rx: 2, ry: 2 }),
    element('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }),
  ]);
}

function wrapIcon() {
  return svg('wrap', [
    element('path', { d: 'M4 7h16' }),
    element('path', { d: 'M4 12h10a4 4 0 0 1 0 8H8' }),
    element('path', { d: 'M10 18l-2 2 2 2' }),
  ]);
}

function terminalPanel(state, node) {
  const attributes = node.attributes ?? {};
  const panel = node.name === 'terminal-command' ? 'command' : 'output';
  const defaultLabel = panel === 'command' ? 'Command' : 'Output';
  const defaultCopyLabel = panel === 'command' ? 'Copy command' : 'Copy output';
  const content = state.all(node);
  for (const child of content) {
    if (child.type !== 'element' || child.tagName !== 'pre') continue;
    const code = child.children?.find((item) => item.type === 'element' && item.tagName === 'code');
    if (typeof code?.properties?.dataHugoCode !== 'string') continue;
    const source = code.properties.dataHugoCode.replace(/^(?:\r?\n)+|(?:\r?\n)+$/gu, '');
    code.properties.dataHugoCode = source;
    code.children = [text(source)];
  }
  return element('section', {
    className: ['terminal-session__panel'],
    'data-terminal-panel': panel,
    'data-terminal-copy-label': attributes.copyLabel ?? defaultCopyLabel,
    role: 'tabpanel',
    ariaLabel: attributes.label ?? defaultLabel,
    hidden: panel === 'output',
  }, [element('div', {
    className: ['terminal-session__code'],
    'data-terminal-copy-source': '',
  }, content)]);
}

function terminalSession(state, node, sessionOrdinal) {
  const attributes = node.attributes ?? {};
  const title = attributes.title ?? 'Terminal Session';
  const subtitle = attributes.subtitle;
  const panels = state.all(node);
  const hasCommand = panels.some((panel) => panel.properties?.['data-terminal-panel'] === 'command');
  const hasOutput = panels.some((panel) => panel.properties?.['data-terminal-panel'] === 'output');
  const defaultTab = hasCommand ? 'command' : 'output';
  const id = `terminal-session-${sessionOrdinal}`;
  const tabs = [
    ...(hasCommand ? ['command'] : []),
    ...(hasOutput ? ['output'] : []),
  ].map((panel) => element('button', {
    type: 'button',
    id: `${id}-tab-${panel}`,
    className: ['terminal-session__tab', ...(defaultTab === panel ? ['is-active'] : [])],
    'data-terminal-tab': panel,
    role: 'tab',
    ariaControls: `${id}-panel-${panel}`,
    ariaSelected: defaultTab === panel ? 'true' : 'false',
    ...(defaultTab === panel ? {} : { tabIndex: -1 }),
  }, [text(panel === 'command' ? 'Command' : 'Output')]));

  const controlRow = element('div', { className: ['terminal-session__control-row'] }, [
    element('div', {
      className: ['terminal-session__tabs'],
      role: 'tablist',
      ariaLabel: title,
    }, tabs),
    element('div', { className: ['terminal-session__utilities'] }, [
      element('button', {
        type: 'button',
        className: ['terminal-session__action', 'terminal-session__action--copy'],
        'data-terminal-copy-button': '',
        ariaLabel: 'Copy active panel to clipboard',
      }, [element('span', {
        className: ['terminal-session__action-icon'],
        'data-terminal-copy-icon': '',
        'aria-hidden': 'true',
      }, [copyIcon()])]),
      element('button', {
        type: 'button',
        className: ['terminal-session__action', 'terminal-session__action--wrap'],
        'data-terminal-wrap-toggle': '',
        ariaLabel: 'Wrap: On',
        ariaPressed: 'true',
      }, [element('span', {
        className: ['terminal-session__action-icon'],
        'data-terminal-wrap-icon': '',
        'aria-hidden': 'true',
      }, [wrapIcon()])]),
    ]),
  ]);

  return element('section', {
    className: ['terminal-session', 'is-wrap-enabled'],
    'data-terminal-session': '',
    id,
    'data-default-tab': defaultTab,
  }, [
    element('header', { className: ['terminal-session__header'] }, [
      element('div', { className: ['terminal-session__heading'] }, [
        element('p', { className: ['terminal-session__title'] }, [text(title)]),
        ...(subtitle ? [element('p', { className: ['terminal-session__subtitle'] }, [text(subtitle)])] : []),
      ]),
      element('div', { className: ['terminal-session__actions'] }, [
        controlRow,
        element('span', {
          className: ['terminal-session__status'],
          'data-terminal-status': '',
          role: 'status',
          ariaLive: 'polite',
          ariaAtomic: 'true',
        }),
      ]),
    ]),
    element('div', { className: ['terminal-session__content'] }, panels),
  ]);
}

function shikiPlugin(page) {
  const highlight = async (parent) => {
    for (let index = 0; index < (parent.children ?? []).length; index += 1) {
      const node = parent.children[index];
      if (node.type === 'element' && node.tagName === 'img' && parent.tagName !== 'a') {
        const image = localImage(page, String(node.properties.src ?? ''));
        if (image) {
          const caption = node.properties.title || node.properties.alt || page.title;
          parent.children[index] = element('a', {
            href: image.url,
            dataPswpGallery: 'default',
            dataPswpCaption: caption,
            ...(image.dimensions ? {
              dataPswpWidth: image.dimensions.width,
              dataPswpHeight: image.dimensions.height,
            } : {}),
            ...(node.properties.title ? { title: node.properties.title } : {}),
          }, [node]);
          continue;
        }
      }
      if (node.type === 'element' && node.tagName === 'pre') {
        const code = node.children?.find((child) => child.type === 'element' && child.tagName === 'code');
        const source = code?.properties?.dataHugoCode;
        if (typeof source === 'string') {
          const originalLanguage = String(code.properties.dataHugoLanguage ?? 'text').toLowerCase();
          const language = languageAliases.get(originalLanguage) ?? originalLanguage;
          const shell = language === 'bash';
          const output = import.meta.env.DEV
            ? await codeToHast(source, {
              lang: language,
              themes: shell ? hugoShellThemes : shikiThemes,
              defaultColor: 'light',
            })
            : await codeToHast(source, { lang: language, theme: shell ? hugoShellTheme : hugoCodeTheme });
          const highlighted = output.children.find((child) => child.type === 'element' && child.tagName === 'pre');
          if (highlighted) {
            highlighted.properties = {
              ...highlighted.properties,
              class: `${highlighted.properties.class ?? ''} hugo-code`.trim(),
              dataHugoLanguage: originalLanguage,
            };
            parent.children[index] = highlighted;
            continue;
          }
        }
      }
      await highlight(node);
    }
  };
  return async (tree) => highlight(tree);
}

function hugoFootnotesPlugin() {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && Object.hasOwn(node.properties ?? {}, 'dataFootnotes')) {
        node.tagName = 'div';
        node.properties = { ...node.properties, role: 'doc-endnotes' };
        delete node.properties.dataFootnotes;
        node.children = node.children.filter((child) => (
          !(child.type === 'element' && child.tagName === 'h2' && child.properties?.id === 'footnote-label')
        ));
        node.children.unshift(element('hr'));
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}

export async function renderHugoMarkdown(page, site) {
  const markdown = convertShortcodes(page.content, site.resolveRef);
  let sessionOrdinal = 0;
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSmartypants)
    .use(remarkDirective)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      handlers: {
        code: (_state, node) => {
          const language = node.lang || 'text';
          return element('pre', {}, [element('code', {
            className: [`language-${language}`],
            dataHugoCode: node.value,
            dataHugoLanguage: language,
          }, [text(node.value)])]);
        },
        containerDirective: (state, node) => {
          const children = state.all(node);
          if (node.name === 'callout') {
            const type = node.attributes?.class ?? 'info';
            const title = node.attributes?.title;
            return element('div', {
              className: ['callout', 'prose', 'prose-p:mx-0', `callout-${type}`],
            }, [
              ...(title ? [element('h5', {
                className: ['text-lg', 'font-semibold', 'mb-2'],
              }, inlineNodes(state, title))] : []),
              ...children,
            ]);
          }
          if (node.name === 'terminal-command' || node.name === 'terminal-output') {
            return terminalPanel(state, node);
          }
          if (node.name === 'terminal-session') {
            sessionOrdinal += 1;
            return terminalSession(state, node, sessionOrdinal);
          }
          throw new Error(`Unsupported Hugo container shortcode: ${node.name}`);
        },
      },
    })
    .use(rehypeRaw)
    .use(hugoFootnotesPlugin)
    .use(rehypeSlug)
    .use(() => shikiPlugin(page))
    .use(rehypeStringify, { allowDangerousHtml: true });

  const parsed = processor.parse(markdown);
  const wordCount = countWords(parsed);
  const html = String(await processor.process(markdown));
  return { html, wordCount, readingTime: Math.max(1, Math.ceil(wordCount / 212)) };
}
