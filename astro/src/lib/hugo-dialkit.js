import { createDialKit, createDialRoot } from "dialkit/vanilla";
import "dialkit/vanilla/styles.css";
import "../styles/fonts.css";
import { hugoCodeThemePresets } from "./code-theme-presets.js";
import { enableDialKitFontGroups, fontFamilies, fontFamilyOptions } from "./font-families.js";

const family = (defaultValue) => ({
  type: "select",
  options: fontFamilyOptions,
  default: defaultValue,
});

const select = (options, defaultValue) => ({ type: "select", options, default: defaultValue });

const codeThemeOptions = hugoCodeThemePresets.map(({ value, label }) => ({ value, label }));
const calloutStyles = [
  { value: "rail", label: "Classic rail" },
  { value: "panel", label: "Signal panel" },
  { value: "outlined", label: "Open frame" },
];
const quoteStyles = [
  { value: "rail", label: "Classic rail" },
  { value: "panel", label: "Soft panel" },
  { value: "centered", label: "Centered display" },
  { value: "framed", label: "Framed quote" },
];
const tableStyles = [
  { value: "classic", label: "Classic" },
  { value: "ruled", label: "Open rules" },
  { value: "zebra", label: "Soft bands" },
];
const footnoteStyles = [
  { value: "classic", label: "Classic list" },
  { value: "gutter", label: "Gutter numbers" },
  { value: "ruled", label: "Ruled index" },
];
const navigationStyles = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italic" },
  { value: "oblique", label: "Oblique" },
];
const navigationWeights = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
];
const pageThemes = {
  current: {
    label: "Current",
    controls: {
      layout: { contentWidth: 65 },
      navigation: { family: "Source Sans Pro" },
    },
  },
  "field-notes": {
    label: "Field Notes",
    controls: {
      layout: { contentWidth: 60 },
      navigation: { family: "Instrument Sans" },
      title: { family: "Newsreader", pageSize: 28, postSize: 46 },
      body: { family: "Literata", size: 17, lineHeight: 1.75, paragraphGap: 24, listIntroSize: 15 },
      headings: { family: "Newsreader", h1Size: 42, h2Size: 30, h3Size: 23, h4Size: 19, h2GapTop: 42, h3GapTop: 30, h4GapTop: 36, bodyGap: 18 },
      spacing: { componentGap: 30 },
      callout: { style: "outlined", family: "Instrument Sans", size: 15, lineHeight: 1.65, paddingX: 18, paddingY: 16, labelSize: 13, labelGap: 8 },
      quote: { style: "centered", family: "Newsreader", size: 24, inset: 8 },
      code: { theme: "github-light", family: "IBM Plex Mono", size: 13, lineHeight: 1.55, paddingX: 16, paddingY: 12 },
      inlineCode: { family: "IBM Plex Mono", scale: 84, paddingX: 3, paddingY: 1, radius: 2, background: "#eee8dd", color: "#513a2f", border: "#ded4c5" },
      table: { style: "ruled", family: "Instrument Sans", size: 14, cellPadding: 10 },
      footnotes: { style: "gutter", family: "Instrument Sans", size: 13, lineHeight: 1.55, sectionGap: 36, dividerGap: 24, itemGap: 12, numberGap: 14 },
    },
  },
  "terminal-ledger": {
    label: "Terminal Ledger",
    controls: {
      layout: { contentWidth: 65 },
      navigation: { family: "IBM Plex Sans" },
      title: { family: "IBM Plex Sans", pageSize: 24, postSize: 36 },
      body: { family: "IBM Plex Sans", size: 16, lineHeight: 1.65, paragraphGap: 15, listIntroSize: 14 },
      headings: { family: "IBM Plex Sans", h1Size: 32, h2Size: 23, h3Size: 19, h4Size: 16, h2GapTop: 28, h3GapTop: 22, h4GapTop: 30, bodyGap: 12 },
      spacing: { componentGap: 18 },
      callout: { style: "panel", family: "IBM Plex Sans", size: 14, lineHeight: 1.6, paddingX: 16, paddingY: 14, labelSize: 12, labelGap: 6 },
      quote: { style: "framed", family: "IBM Plex Sans", size: 15, inset: 14 },
      code: { theme: "nord", family: "IBM Plex Mono", size: 13, lineHeight: 1.5, paddingX: 14, paddingY: 10 },
      inlineCode: { family: "IBM Plex Mono", scale: 82, paddingX: 4, paddingY: 2, radius: 3, background: "#dbe4eb", color: "#263546", border: "#c4d2df" },
      table: { style: "ruled", family: "IBM Plex Sans", size: 14, cellPadding: 8 },
      footnotes: { style: "ruled", family: "IBM Plex Sans", size: 13, lineHeight: 1.5, sectionGap: 24, dividerGap: 20, itemGap: 8, numberGap: 12 },
    },
  },
  "studio-journal": {
    label: "Studio Journal",
    controls: {
      layout: { contentWidth: 65 },
      navigation: { family: "Instrument Sans" },
      title: { family: "Bricolage Grotesque", pageSize: 28, postSize: 50 },
      body: { family: "Instrument Sans", size: 17, lineHeight: 1.65, paragraphGap: 24, listIntroSize: 15 },
      headings: { family: "Bricolage Grotesque", h1Size: 42, h2Size: 29, h3Size: 22, h4Size: 18, h2GapTop: 40, h3GapTop: 28, h4GapTop: 36, bodyGap: 20 },
      spacing: { componentGap: 28 },
      callout: { style: "panel", family: "Instrument Sans", size: 16, lineHeight: 1.65, paddingX: 20, paddingY: 18, labelSize: 14, labelGap: 8 },
      quote: { style: "panel", family: "Newsreader", size: 24, inset: 18 },
      code: { theme: "catppuccin-mocha", family: "IBM Plex Mono", size: 13, lineHeight: 1.6, paddingX: 16, paddingY: 14 },
      inlineCode: { family: "IBM Plex Mono", scale: 84, paddingX: 4, paddingY: 2, radius: 4, background: "#eee9ff", color: "#3e3764", border: "#d9d2f0" },
      table: { style: "zebra", family: "Instrument Sans", size: 14, cellPadding: 12 },
      footnotes: { style: "gutter", family: "Instrument Sans", size: 13, lineHeight: 1.55, sectionGap: 36, dividerGap: 24, itemGap: 10, numberGap: 14 },
    },
  },
  "quiet-sans": {
    label: "Quiet Sans",
    controls: {
      layout: { contentWidth: 65 },
      navigation: { family: "Instrument Sans" },
      title: { family: "Instrument Sans", pageSize: 26, postSize: 40 },
      body: { family: "Instrument Sans", size: 16, lineHeight: 1.65, paragraphGap: 24, listIntroSize: 14 },
      headings: { family: "Instrument Sans", h1Size: 32, h2Size: 25, h3Size: 20, h4Size: 18, h2GapTop: 36, h3GapTop: 26, h4GapTop: 32, bodyGap: 16 },
      spacing: { componentGap: 22 },
      callout: { style: "outlined", family: "Instrument Sans", size: 16, lineHeight: 1.6, paddingX: 16, paddingY: 14, labelSize: 14, labelGap: 8 },
      quote: { style: "rail", family: "Instrument Sans", size: 19, inset: 16 },
      code: { theme: "catppuccin-mocha", family: "IBM Plex Mono", size: 13, lineHeight: 1.55, paddingX: 16, paddingY: 12 },
      inlineCode: { family: "IBM Plex Mono", scale: 84, paddingX: 4, paddingY: 2, radius: 3, background: "#e9edf2", color: "#334155", border: "#d4dbe4" },
      table: { style: "classic", family: "Instrument Sans", size: 14, cellPadding: 10 },
      footnotes: { style: "classic", family: "Instrument Sans", size: 13, lineHeight: 1.55, sectionGap: 32, dividerGap: 24, itemGap: 8, numberGap: 12 },
    },
  },
};
const pageThemeOptions = Object.entries(pageThemes).map(([value, { label }]) => ({ value, label }));
const resolveThemeControls = (defaults, overrides) => Object.fromEntries(
  Object.entries(defaults).map(([group, values]) => [group, { ...values, ...(overrides[group] ?? {}) }]),
);

export function mountHugoDialKit() {
  const compact = window.matchMedia("(max-width: 1249px)").matches;
  createDialRoot({ position: compact ? "top-left" : "bottom-right", theme: "light", defaultOpen: !compact });

  const pageStyle = createDialKit("Hugo page style", {
    pageTheme: select(pageThemeOptions, "current"),
    title: {
      family: family("System UI"),
      pageSize: [24, 16, 48, 1],
      postSize: [30, 20, 56, 1],
    },
    layout: {
      _collapsed: true,
      contentWidth: [65, 45, 90, 1],
    },
    navigation: {
      _collapsed: true,
      family: family("Source Sans Pro"),
      style: select(navigationStyles, "normal"),
      weight: select(navigationWeights, "600"),
      size: [14, 10, 24, 1],
    },
    body: {
      _collapsed: true,
      family: family("Lora"),
      size: [16, 12, 24, 1],
      lineHeight: [1.75, 1.2, 2.2, 0.05],
      paragraphGap: [20, 0, 64, 1],
      listIntroSize: [14, 12, 24, 1],
    },
    headings: {
      _collapsed: true,
      family: family("System UI"),
      h1Size: [36, 24, 64, 1],
      h2Size: [24, 18, 48, 1],
      h3Size: [20, 14, 36, 1],
      h4Size: [18, 14, 32, 1],
      h2GapTop: [32, 0, 72, 1],
      h3GapTop: [26, 0, 72, 1],
      h4GapTop: [40, 0, 72, 1],
      bodyGap: [20, 0, 48, 1],
    },
    spacing: {
      _collapsed: true,
      componentGap: [24, 8, 64, 1],
    },
    callout: {
      _collapsed: true,
      style: select(calloutStyles, "rail"),
      family: family("Lora"),
      size: [16, 12, 24, 1],
      lineHeight: [1.75, 1.2, 2.2, 0.05],
      paddingX: [16, 8, 40, 1],
      paddingY: [16, 8, 40, 1],
      labelSize: [18, 12, 28, 1],
      labelGap: [8, 0, 24, 1],
    },
    quote: {
      _collapsed: true,
      style: select(quoteStyles, "rail"),
      family: family("Lora"),
      size: [16, 12, 32, 1],
      inset: [16, 0, 48, 1],
    },
    code: {
      _collapsed: true,
      theme: select(codeThemeOptions, "hugo-light"),
      family: family("System Mono"),
      size: [14, 11, 22, 1],
      lineHeight: [1.5, 1.2, 2, 0.05],
      paddingX: [16, 4, 32, 1],
      paddingY: [12, 4, 32, 1],
    },
    inlineCode: {
      _collapsed: true,
      family: family("System Mono"),
      scale: [87.5, 60, 110, 1],
      paddingX: [4, 0, 12, 1],
      paddingY: [4, 0, 10, 1],
      radius: [8, 0, 16, 1],
      background: { type: "color", default: "#f2eee9" },
      color: { type: "color", default: "#111827" },
      border: { type: "color", default: "#d8d0ca" },
    },
    table: {
      _collapsed: true,
      style: select(tableStyles, "classic"),
      family: family("System UI"),
      size: [14, 11, 22, 1],
      cellPadding: [8, 2, 24, 1],
    },
    footnotes: {
      _collapsed: true,
      style: select(footnoteStyles, "classic"),
      family: family("Source Sans Pro"),
      size: [14, 11, 20, 1],
      lineHeight: [1.43, 1.2, 2, 0.05],
      sectionGap: [32, 0, 72, 1],
      dividerGap: [24, 0, 48, 1],
      itemGap: [8, 0, 32, 1],
      numberGap: [12, 4, 32, 1],
    },
  });

  const defaultControls = Object.fromEntries(
    Object.entries(pageStyle.getValues())
      .filter(([group]) => group !== "pageTheme")
      .map(([group, values]) => [group, { ...values }]),
  );
  let activeTheme = "current";
  let applyingTheme = false;

  pageStyle.subscribe((values) => {
    const { pageTheme } = values;
    document.documentElement.dataset.hugoTheme = pageTheme;

    if (applyingTheme) return;
    if (pageTheme !== activeTheme) {
      activeTheme = pageTheme;
      applyingTheme = true;
      try {
        pageStyle.setValues(resolveThemeControls(defaultControls, pageThemes[pageTheme].controls));
      } finally {
        applyingTheme = false;
      }
      values = pageStyle.getValues();
    }

    const { title, layout, navigation, body, headings, spacing, callout, quote, code, inlineCode, table, footnotes } = values;
    const root = document.documentElement;
    const style = root.style;
    const setFont = (property, name) => style.setProperty(property, fontFamilies[name].stack);
    const setPx = (property, value) => style.setProperty(property, `${value}px`);

    style.setProperty("--hugo-theme-content-width", `${layout.contentWidth}ch`);
    setFont("--hugo-theme-nav-font", navigation.family);
    style.setProperty("--hugo-nav-font-style", navigation.style);
    style.setProperty("--hugo-nav-font-weight", navigation.weight);
    setPx("--hugo-nav-font-size", navigation.size);
    setFont("--hugo-title-font", title.family);
    setPx("--hugo-page-title-size", title.pageSize);
    setPx("--hugo-post-title-size", title.postSize);
    setFont("--hugo-body-font", body.family);
    setPx("--hugo-body-size", body.size);
    style.setProperty("--hugo-body-line-height", body.lineHeight);
    setPx("--hugo-paragraph-gap", body.paragraphGap);
    setPx("--hugo-list-intro-size", body.listIntroSize);
    setFont("--hugo-heading-font", headings.family);
    setPx("--hugo-h1-size", headings.h1Size);
    setPx("--hugo-h2-size", headings.h2Size);
    setPx("--hugo-h3-size", headings.h3Size);
    setPx("--hugo-h4-size", headings.h4Size);
    setPx("--hugo-h2-gap-top", headings.h2GapTop);
    setPx("--hugo-h3-gap-top", headings.h3GapTop);
    setPx("--hugo-h4-gap-top", headings.h4GapTop);
    setPx("--hugo-heading-body-gap", headings.bodyGap);
    setPx("--hugo-component-gap", spacing.componentGap);
    setFont("--hugo-callout-font", callout.family);
    setPx("--hugo-callout-size", callout.size);
    style.setProperty("--hugo-callout-line-height", callout.lineHeight);
    setPx("--hugo-callout-padding-x", callout.paddingX);
    setPx("--hugo-callout-padding-y", callout.paddingY);
    setPx("--hugo-callout-label-size", callout.labelSize);
    setPx("--hugo-callout-label-gap", callout.labelGap);
    root.dataset.hugoCalloutStyle = callout.style;
    setFont("--hugo-quote-font", quote.family);
    setPx("--hugo-quote-size", quote.size);
    setPx("--hugo-quote-inset", quote.inset);
    root.dataset.hugoQuoteStyle = quote.style;
    setFont("--hugo-code-font", code.family);
    setPx("--hugo-code-size", code.size);
    style.setProperty("--hugo-code-line-height", code.lineHeight);
    setPx("--hugo-code-padding-x", code.paddingX);
    setPx("--hugo-code-padding-y", code.paddingY);
    const selectedCodeTheme = hugoCodeThemePresets.find(({ value }) => value === code.theme);
    style.setProperty("--hugo-code-background", selectedCodeTheme.background);
    style.setProperty("--hugo-code-foreground", selectedCodeTheme.foreground);
    style.setProperty("--hugo-code-border", selectedCodeTheme.border);
    root.dataset.hugoCodeTheme = code.theme;
    setFont("--hugo-inline-code-font", inlineCode.family);
    style.setProperty("--hugo-inline-code-scale", `${inlineCode.scale}%`);
    setPx("--hugo-inline-code-padding-x", inlineCode.paddingX);
    setPx("--hugo-inline-code-padding-y", inlineCode.paddingY);
    setPx("--hugo-inline-code-radius", inlineCode.radius);
    style.setProperty("--hugo-inline-code-background", inlineCode.background);
    style.setProperty("--hugo-inline-code-color", inlineCode.color);
    style.setProperty("--hugo-inline-code-border", inlineCode.border);
    root.dataset.hugoTableStyle = table.style;
    setFont("--hugo-table-font", table.family);
    setPx("--hugo-table-size", table.size);
    setPx("--hugo-table-cell-padding", table.cellPadding);
    root.dataset.hugoFootnoteStyle = footnotes.style;
    setFont("--hugo-footnote-font", footnotes.family);
    setPx("--hugo-footnote-size", footnotes.size);
    style.setProperty("--hugo-footnote-line-height", footnotes.lineHeight);
    setPx("--hugo-footnote-section-gap", footnotes.sectionGap);
    setPx("--hugo-footnote-divider-gap", footnotes.dividerGap);
    setPx("--hugo-footnote-item-gap", footnotes.itemGap);
    setPx("--hugo-footnote-number-gap", footnotes.numberGap);
  });

  enableDialKitFontGroups();
}
