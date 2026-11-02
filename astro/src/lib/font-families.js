const familyTypeOrder = ["Serif", "Mono", "Sans-Serif"];

export const fontFamilies = {
  "Departure Mono": {
    type: "Mono",
    label: "Departure Mono",
    stack: '"Departure Mono", ui-monospace, monospace',
  },
  "IBM Plex Mono": {
    type: "Mono",
    label: "IBM Plex Mono",
    stack: '"IBM Plex Mono", ui-monospace, monospace',
  },
  "Paper Mono": {
    type: "Mono",
    label: "Paper Mono",
    stack: '"Paper Mono", ui-monospace, monospace',
  },
  "Instrument Serif": {
    type: "Serif",
    label: "Instrument Serif",
    stack: '"Instrument Serif", Georgia, "Times New Roman", serif',
  },
  "IBM Plex Serif": {
    type: "Serif",
    label: "IBM Plex Serif",
    stack: '"IBM Plex Serif", Georgia, "Times New Roman", serif',
  },
  Newsreader: {
    type: "Serif",
    label: "Newsreader",
    stack: 'Newsreader, Georgia, "Times New Roman", serif',
  },
  "DM Serif Display": {
    type: "Serif",
    label: "DM Serif Display",
    stack: '"DM Serif Display", Georgia, "Times New Roman", serif',
  },
  Literata: {
    type: "Serif",
    label: "Literata",
    stack: 'Literata, Georgia, "Times New Roman", serif',
  },
  "Instrument Sans": {
    type: "Sans-Serif",
    label: "Instrument Sans",
    stack: '"Instrument Sans", ui-sans-serif, system-ui, sans-serif',
  },
  "DM Sans": {
    type: "Sans-Serif",
    label: "DM Sans",
    stack: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  Manrope: {
    type: "Sans-Serif",
    label: "Manrope",
    stack: 'Manrope, ui-sans-serif, system-ui, sans-serif',
  },
  "Bricolage Grotesque": {
    type: "Sans-Serif",
    label: "Bricolage Grotesque",
    stack: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
  },
  "IBM Plex Sans": {
    type: "Sans-Serif",
    label: "IBM Plex Sans",
    stack: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  },
  "Source Sans 3": {
    type: "Sans-Serif",
    label: "Source Sans 3",
    stack: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
  },
  Sora: {
    type: "Sans-Serif",
    label: "Sora",
    stack: 'Sora, ui-sans-serif, system-ui, sans-serif',
  },
};

export const fontFamilyOptions = Object.entries(fontFamilies)
  .sort(([, left], [, right]) => familyTypeOrder.indexOf(left.type) - familyTypeOrder.indexOf(right.type))
  .map(([value, { label }]) => ({ value, label }));

const familyTypeByLabel = Object.fromEntries(
  Object.values(fontFamilies).map(({ type, label }) => [label, type]),
);

export function enableDialKitFontGroups() {
  const groupOptions = () => {
    const dropdown = document.querySelector(".dialkit-select-dropdown");
    if (!dropdown || dropdown.querySelector(".font-family-option-group")) return;

    const options = Array.from(dropdown.querySelectorAll(".dialkit-select-option"));
    if (options.length !== fontFamilyOptions.length) return;

    const groups = familyTypeOrder
      .map((type) => ({
        type,
        options: options.filter((option) => familyTypeByLabel[option.textContent.trim()] === type),
      }))
      .filter((group) => group.options.length > 0);
    if (groups.reduce((count, group) => count + group.options.length, 0) !== options.length) return;

    dropdown.replaceChildren(
      ...groups.map(({ type, options: groupOptions }) => {
        const group = document.createElement("div");
        group.className = "font-family-option-group";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", type);

        const heading = document.createElement("div");
        heading.className = "font-family-option-heading";
        heading.setAttribute("aria-hidden", "true");
        heading.textContent = type;
        group.append(heading, ...groupOptions);
        return group;
      }),
    );
  };

  document.querySelectorAll(".dialkit-select-trigger").forEach((trigger) => {
    trigger.addEventListener("click", groupOptions);
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") groupOptions();
    });
  });
}
