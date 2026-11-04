export const articleCodeTheme = {
  name: "article",
  type: "dark",
  colors: {
    "editor.background": "#292735",
    "editor.foreground": "#f2eee9",
  },
  tokenColors: [
    { scope: ["comment"], settings: { foreground: "#b5a9c0", fontStyle: "italic" } },
    { scope: ["keyword", "storage"], settings: { foreground: "#dca18d" } },
    { scope: ["string"], settings: { foreground: "#d8c28f" } },
    { scope: ["entity.name.function", "support.function"], settings: { foreground: "#a7c7b7" } },
    { scope: ["entity.name.type", "support.type", "entity.name.class"], settings: { foreground: "#c5a4d8" } },
    { scope: ["constant.numeric", "constant.language"], settings: { foreground: "#edb67f" } },
  ],
};

export const hugoCodeTheme = {
  name: "hugo-light",
  type: "light",
  colors: {
    "editor.background": "#f2eee9",
    "editor.foreground": "#333333",
  },
  tokenColors: [
    { scope: ["comment"], settings: { foreground: "#999988", fontStyle: "italic" } },
    { scope: ["keyword", "keyword.control", "storage.type.class", "storage.type.function"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["keyword.type", "entity.name.class", "entity.name.type"], settings: { foreground: "#445588", fontStyle: "bold" } },
    { scope: ["entity.name.function", "support.function"], settings: { foreground: "#990000", fontStyle: "bold" } },
    { scope: ["string"], settings: { foreground: "#dd1144" } },
    { scope: ["constant.numeric"], settings: { foreground: "#009999" } },
    { scope: ["entity.name.tag"], settings: { foreground: "#000080" } },
    { scope: ["entity.other.attribute-name"], settings: { foreground: "#008080" } },
  ],
};

export const hugoShellTheme = {
  ...hugoCodeTheme,
  name: "hugo-light-shell",
  tokenColors: hugoCodeTheme.tokenColors.filter(({ scope }) => (
    !scope.includes("entity.name.function")
      && !scope.includes("support.function")
      && !scope.includes("string")
  )),
};

export const codeThemePresets = [
  {
    value: "article",
    label: "Article",
    shikiKey: "dark",
    shikiTheme: articleCodeTheme,
    background: "#292735",
    foreground: "#f2eee9",
    border: "rgb(255 255 255 / 8%)",
  },
  {
    value: "github-dark",
    label: "GitHub Dark",
    shikiKey: "github-dark",
    shikiTheme: "github-dark",
    background: "#0d1117",
    foreground: "#e6edf3",
    border: "rgb(255 255 255 / 10%)",
  },
  {
    value: "github-light",
    label: "GitHub Light",
    shikiKey: "github-light",
    shikiTheme: "github-light",
    background: "#ffffff",
    foreground: "#1f2328",
    border: "rgb(31 35 40 / 14%)",
  },
  {
    value: "nord",
    label: "Nord",
    shikiKey: "nord",
    shikiTheme: "nord",
    background: "#2e3440",
    foreground: "#d8dee9",
    border: "rgb(216 222 233 / 12%)",
  },
  {
    value: "dracula",
    label: "Dracula",
    shikiKey: "dracula",
    shikiTheme: "dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    border: "rgb(255 255 255 / 8%)",
  },
  {
    value: "catppuccin-mocha",
    label: "Catppuccin Mocha",
    shikiKey: "catppuccin-mocha",
    shikiTheme: "catppuccin-mocha",
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    border: "rgb(205 214 244 / 12%)",
  },
];

export const codeThemeData = codeThemePresets.map(({ value, label, background, foreground, border }) => ({
  value,
  label,
  background,
  foreground,
  border,
}));

export const hugoCodeThemePresets = [
  {
    value: "hugo-light",
    label: "Hugo Light",
    shikiKey: "light",
    background: "#f2eee9",
    foreground: "#333333",
    border: "#d8d0ca",
  },
  ...codeThemePresets,
];

export const shikiThemes = Object.fromEntries([
  ...codeThemePresets.map(({ shikiKey, shikiTheme }) => [shikiKey, shikiTheme]),
  ["light", hugoCodeTheme],
]);

export const hugoShellThemes = {
  ...shikiThemes,
  light: hugoShellTheme,
};
