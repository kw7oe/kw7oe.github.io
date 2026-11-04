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

export function mountHugoDialKit() {
  const compact = window.matchMedia("(max-width: 1249px)").matches;
  createDialRoot({ position: compact ? "top-left" : "bottom-right", theme: "light", defaultOpen: !compact });

  const pageStyle = createDialKit("Hugo page style", {
    title: {
      family: family("System UI"),
      pageSize: [24, 16, 48, 1],
      postSize: [30, 20, 56, 1],
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

  pageStyle.subscribe(({ title, body, headings, spacing, callout, quote, code, inlineCode, table, footnotes }) => {
    const root = document.documentElement;
    const style = root.style;
    const setFont = (property, name) => style.setProperty(property, fontFamilies[name].stack);
    const setPx = (property, value) => style.setProperty(property, `${value}px`);

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
