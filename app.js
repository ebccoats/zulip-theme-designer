const STORAGE_KEY = "zulip-themer-theme";

const PREVIEW_LABELS = {
  "--color-background": "App background",
  "--color-background-active-narrow-filter": "Selected row",
  "--color-background-hover-narrow-filter": "Hovered row",
  "--color-text-sidebar-heading": "Section header",
  "--color-text-sidebar-action-heading": "Sidebar action heading",
  "--color-text-sidebar-row": "Views and topic text",
  "--color-text-sidebar-base": "Channel and DM names",
  "--color-text-active-narrow-filter": "Selected row text",
  "--color-text-default": "Timestamp",
  "--color-outline-focus": "Focus ring",
  "--color-left-sidebar-navigation-icon": "Sidebar icon",
  "--color-sidebar-action": "Sidebar action icon",
  "--color-vdots-visible": "Row menu",
  "--color-background-unread-counter-prominent": "Mention badge",
  "--color-background-unread-counter-normal": "Unread badge fill",
  "--color-border-unread-counter": "Unread badge border",
  "--color-unread-counter-prominent": "Mention badge text",
  "--color-unread-counter-normal": "Unread badge text",
  "--color-background-navbar": "Top bar",
  "--color-navbar-icon": "Top bar icon",
  "--color-background-search": "Search field",
  "--color-text-search": "Search text",
  "--color-text-search-placeholder": "Search placeholder",
  "--color-search-icons": "Search icon",
  "--color-unread-marker": "Unread marker",
  "--color-background-stream-message-content": "Channel message",
  "--color-text-message-header": "Message header",
  "--color-text-message-default": "Message text",
  "--color-background-private-message-content": "Direct message",
  "--color-background-private-message-header": "Direct message header",
  "--color-compose-box-background": "Compose tray",
  "--color-compose-message-content-background": "Compose input",
  "--color-text-message-view-header": "Navbar channel title",
  "--color-message-header-contents-border": "Topic bar border",
  "--color-message-header-icon-non-interactive": "Topic chevron",
  "--color-message-header-icon-interactive": "Topic bar icons",
  "--color-date": "Date label",
  "--color-background-direct-mention": "Mentioned message",
  "--color-background-text-direct-mention": "Mention pill",
  "--color-text-self-direct-mention": "Mention pill text",
  "--color-text-sender-name": "Sender name",
  "--color-markdown-pre-background": "Code block",
  "--color-markdown-pre-text": "Code block text",
  "--color-markdown-code-background": "Inline code",
  "--color-markdown-code-text": "Inline code text",
  "--color-markdown-link": "Message link",
  "--color-message-reaction-background": "Reaction",
  "--color-message-reaction-text": "Reaction text",
  "--color-message-reaction-border": "Reaction border",
  "--color-message-formatting-controls-container": "Formatting toolbar",
  "--color-composebox-button": "Formatting icon",
  "--color-compose-send-button-background": "Send button",
  "--color-compose-send-button-icon-color": "Send icon",
  "--color-compose-send-control-button": "Drafts link",
  "--color-unread-counter-quiet": "Quiet unread count",
  "--color-topic-indent-border": "Topic bracket",
  "desktop-org-rail": "Org rail",
};

const senderSeed = COLOR_CATALOG.find((item) => item.id === "--color-text-sender-name");
if (senderSeed && senderSeed.lightSet === false) senderSeed.light = "#0088cc";

const TOKEN_DEFS = COLOR_CATALOG.map((item) => ({
  id: item.id,
  label: PREVIEW_LABELS[item.id] || item.mention,
  cssVar: item.cssVar || null,
  kind: item.kind,
  selector: item.selector || "",
  property: item.property || "",
  colorIndex: item.colorIndex || 0,
  value: item.value || "",
  source: item.source,
  mention: item.mention,
}));

const TEXT_VARS = TOKEN_DEFS.filter((def) => /text/i.test(def.id));
const BORDER_VARS = TOKEN_DEFS.filter((def) => /border/i.test(def.id) || /border/i.test(def.property));
const BORDER_STYLES = ["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset", "none"];

function emptyFonts() {
  return { family: "", size: "", text: {} };
}

function cloneFonts(fonts) {
  const source = fonts || emptyFonts();
  const text = {};
  for (const [id, row] of Object.entries(source.text || {})) {
    text[id] = { family: row.family || "", size: row.size || "" };
  }
  return { family: source.family || "", size: source.size || "", text };
}

function cloneBorders(borders) {
  const copy = {};
  for (const [id, row] of Object.entries(borders || {})) {
    copy[id] = { style: row.style || "", width: row.width || "", radius: row.radius || "" };
  }
  return copy;
}

function quoteFont(name) {
  const cleaned = String(name || "").replace(/["\\;{}<>]/g, "").trim();
  if (!cleaned || !/^[\p{L}\p{N} .+-]+$/u.test(cleaned)) return "";
  return cleaned;
}

function cssSize(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(thin|medium|thick)$/i.test(raw)) return raw.toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)?$/i);
  if (!match) return "";
  return match[1] + (match[2] ? match[2].toLowerCase() : "px");
}

function borderStyle(value) {
  const raw = String(value || "").trim().toLowerCase();
  return BORDER_STYLES.includes(raw) ? raw : "";
}

function fontStack(name) {
  const cleaned = quoteFont(name);
  if (!cleaned) return "";
  return `"${cleaned}", "Installed ${cleaned}", sans-serif`;
}

function normalizeFonts(data, name) {
  const fonts = emptyFonts();
  const incoming = data && data.fonts;
  if (incoming && typeof incoming === "object") {
    if (typeof incoming.family === "string") fonts.family = incoming.family;
    if (typeof incoming.size === "string") fonts.size = incoming.size;
    if (incoming.text && typeof incoming.text === "object") {
      for (const def of TEXT_VARS) {
        const row = incoming.text[def.id];
        if (!row || typeof row !== "object") continue;
        const family = typeof row.family === "string" ? row.family : "";
        const size = typeof row.size === "string" ? row.size : "";
        if (family || size) fonts.text[def.id] = { family, size };
      }
    }
  } else if (data && (data.font === "pixel" || name === "nes")) {
    fonts.family = "Press Start 2P";
    fonts.size = "8px";
  }
  return fonts;
}

function normalizeBorders(data) {
  const borders = {};
  const incoming = data && data.borders;
  if (!incoming || typeof incoming !== "object") return borders;
  for (const def of BORDER_VARS) {
    const row = incoming[def.id];
    if (!row || typeof row !== "object") continue;
    const style = typeof row.style === "string" ? row.style : "";
    const width = typeof row.width === "string" ? row.width : "";
    const radius = typeof row.radius === "string" ? row.radius : "";
    if (style || width || radius) borders[def.id] = { style, width, radius };
  }
  return borders;
}

function stockTheme() {
  const tokens = {};
  for (const item of COLOR_CATALOG) {
    tokens[item.id] = { light: item.light, dark: item.dark };
  }
  return { name: "default", tokens };
}

const themeFilenames = new Set();

const state = {
  seed: null,
  theme: null,
  mode: "light",
  selectedId: null,
  picked: null,
};

const dummy = document.getElementById("dummy");
const themeName = document.getElementById("theme-name");
const themePreset = document.getElementById("theme-preset");
const status = document.getElementById("status");
const inspectorEmpty = document.getElementById("inspector-empty");
const inspectorBody = document.getElementById("inspector-body");
const inspectorLabel = document.getElementById("inspector-label");
const inspectorVar = document.getElementById("inspector-var");
const inspectorNote = document.getElementById("inspector-note");
const lightPicker = document.getElementById("light-picker");
const darkPicker = document.getElementById("dark-picker");
const lightHex = document.getElementById("light-hex");
const darkHex = document.getElementById("dark-hex");
const loadFile = document.getElementById("load-file");

function parseHex(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/^#/, "");
  if (!/^[\da-fA-F]+$/.test(raw)) return null;
  if (raw.length === 3 || raw.length === 4) {
    return "#" + raw.split("").map((part) => part + part).join("").toLowerCase();
  }
  if (raw.length === 6 || raw.length === 8) return "#" + raw.toLowerCase();
  return null;
}

function opaqueHex(value) {
  const parsed = parseHex(value);
  if (!parsed) return "#000000";
  return parsed.length === 9 ? parsed.slice(0, 7) : parsed;
}

function cloneTheme(theme) {
  const tokens = {};
  for (const def of TOKEN_DEFS) {
    tokens[def.id] = { light: theme.tokens[def.id].light, dark: theme.tokens[def.id].dark };
  }
  const copy = { name: theme.name, tokens, fonts: cloneFonts(theme.fonts), borders: cloneBorders(theme.borders) };
  if (theme.font) copy.font = theme.font;
  if (theme.shadow) copy.shadow = { x: theme.shadow.x, y: theme.shadow.y, blur: theme.shadow.blur, color: theme.shadow.color };
  return copy;
}

function normalizeShadow(data) {
  const shadow = data && data.shadow;
  if (!shadow || typeof shadow !== "object") return null;
  const blur = cssSize(shadow.blur);
  const color = typeof shadow.color === "string" ? parseHex(shadow.color) : "";
  if (!blur || !color) return null;
  return {
    x: cssSize(shadow.x) || "0px",
    y: cssSize(shadow.y) || "0px",
    blur,
    color,
  };
}

function shadowValue(shadow) {
  if (!shadow) return "";
  return `${shadow.x} ${shadow.y} ${shadow.blur} ${shadow.color}`;
}

function slotColor(incoming, slot, fallbackColor) {
  if (!incoming || typeof incoming[slot] !== "string") return fallbackColor;
  const raw = incoming[slot].trim();
  if (!raw) return "";
  return parseHex(raw) || fallbackColor;
}

function normalizeTheme(data, fallback) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Theme file must be an object");
  }
  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : fallback.name;
  const tokens = {};
  for (const def of TOKEN_DEFS) {
    const incoming = data.tokens && data.tokens[def.id];
    tokens[def.id] = {
      light: slotColor(incoming, "light", fallback.tokens[def.id].light),
      dark: slotColor(incoming, "dark", fallback.tokens[def.id].dark),
    };
  }
  const theme = { name, tokens, fonts: normalizeFonts(data, name), borders: normalizeBorders(data) };
  const shadow = normalizeShadow(data);
  if (shadow) theme.shadow = shadow;
  if (data.font === "pixel" || name === "nes") theme.font = "pixel";
  return theme;
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        name: state.theme.name,
        tokens: state.theme.tokens,
        fonts: state.theme.fonts,
        borders: state.theme.borders,
        shadow: state.theme.shadow,
        mode: state.mode,
      }),
    );
  } catch {
    // Private mode or a full store should not block editing.
  }
}

function readStorage(seed) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      theme: normalizeTheme(data, seed),
      mode: data.mode === "dark" ? "dark" : "light",
    };
  } catch {
    return null;
  }
}

function setStatus(message) {
  status.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    status.textContent = "";
  }, 3000);
}

function applyColors() {
  for (const def of TOKEN_DEFS) {
    if (!def.cssVar) continue;
    const value = state.theme.tokens[def.id][state.mode];
    if (value) dummy.style.setProperty(def.cssVar, value);
    else dummy.style.removeProperty(def.cssVar);
  }
  applyFonts();
  applyBorders();
  applyShadow();
  document.getElementById("mode-light").setAttribute("aria-pressed", String(state.mode === "light"));
  document.getElementById("mode-dark").setAttribute("aria-pressed", String(state.mode === "dark"));
}

function syncName() {
  if (document.activeElement !== themeName) themeName.value = state.theme.name;
}

function renderInspector() {
  if (!state.selectedId) {
    inspectorEmpty.hidden = false;
    inspectorBody.hidden = true;
    return;
  }
  const def = TOKEN_DEFS.find((item) => item.id === state.selectedId);
  const colors = state.theme.tokens[def.id];
  inspectorEmpty.hidden = true;
  inspectorBody.hidden = false;
  inspectorLabel.textContent = def.label;
  inspectorVar.textContent = def.kind === "desktop" ? ".toggle-sidebar" : def.id;
  inspectorNote.hidden = def.kind !== "desktop";
  inspectorNote.textContent = "Desktop shell color. Exported separately from the web theme variables.";
  syncingControls = true;
  if (document.activeElement !== lightHex) lightHex.value = colors.light;
  if (document.activeElement !== darkHex) darkHex.value = colors.dark;
  lightPicker.value = opaqueHex(colors.light);
  darkPicker.value = opaqueHex(colors.dark);
  syncingControls = false;
}

function markSelection() {
  dummy.querySelectorAll("[data-token]").forEach((element) => {
    element.classList.toggle("is-selected", element.dataset.token === state.selectedId);
    element.classList.toggle("is-picked", element === state.picked);
  });
}

function select(element) {
  state.selectedId = element.dataset.token;
  state.picked = element;
  markSelection();
  renderInspector();
}

function commitHex(slot, raw, input) {
  const parsed = parseHex(raw);
  if (!parsed || !state.selectedId) return false;
  state.theme.tokens[state.selectedId][slot] = parsed;
  persist();
  applyColors();
  syncCatalogRow(state.selectedId);
  const picker = slot === "light" ? lightPicker : darkPicker;
  syncingControls = true;
  picker.value = opaqueHex(parsed);
  syncingControls = false;
  if (input && document.activeElement !== input) input.value = parsed;
  return true;
}

let syncingControls = false;

function snapshotTheme() {
  if (!state.theme) return null;
  if (state.selectedId && document.activeElement === lightHex) commitHex("light", lightHex.value, lightHex);
  if (state.selectedId && document.activeElement === darkHex) commitHex("dark", darkHex.value, darkHex);
  const name = themeName.value.trim() || state.theme.name;
  state.theme.name = name;
  const tokens = {};
  for (const def of TOKEN_DEFS) {
    tokens[def.id] = {
      light: state.theme.tokens[def.id].light,
      dark: state.theme.tokens[def.id].dark,
    };
  }
  const theme = {
    name,
    tokens,
    fonts: cloneFonts(state.theme.fonts),
    borders: cloneBorders(state.theme.borders),
  };
  if (state.theme.shadow) theme.shadow = { x: state.theme.shadow.x, y: state.theme.shadow.y, blur: state.theme.shadow.blur, color: state.theme.shadow.color };
  if (state.theme.font === "pixel" || name === "nes") theme.font = "pixel";
  return theme;
}

const SHELL_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:black|white|transparent)\b/gi;

function shellValue(defs, theme) {
  const ordered = defs.slice().sort((a, b) => a.colorIndex - b.colorIndex);
  let index = 0;
  return ordered[0].value.replace(SHELL_COLOR_RE, () => {
    const def = ordered[index] || ordered[ordered.length - 1];
    index += 1;
    return cssColor(theme.tokens[def.id]);
  });
}

function fontFaceRule(name) {
  const cleaned = quoteFont(name);
  if (!cleaned) return "";
  const locals = [`local("${cleaned}")`];
  if (!/regular$/i.test(cleaned)) locals.push(`local("${cleaned} Regular")`);
  return `@font-face {
  font-family: "Installed ${cleaned}";
  src: ${locals.join(", ")};
  font-weight: 400;
  font-style: normal;
}
`;
}

function fontCss(theme) {
  const fonts = theme.fonts || emptyFonts();
  const names = new Set();
  if (quoteFont(fonts.family)) names.add(quoteFont(fonts.family));
  for (const row of Object.values(fonts.text || {})) {
    const name = quoteFont(row.family);
    if (name) names.add(name);
  }
  const faces = [...names].map(fontFaceRule).join("");
  const family = fontStack(fonts.family);
  const size = cssSize(fonts.size);
  const body = [];
  if (family) body.push(`  font-family: ${family} !important;`);
  if (size) body.push(`  font-size: ${size} !important;`);
  const bodyRule = body.length ? `body, body * {\n${body.join("\n")}\n}\n\n` : "";
  const lines = [];
  for (const [id, row] of Object.entries(fonts.text || {})) {
    const rowFamily = fontStack(row.family);
    const rowSize = cssSize(row.size);
    if (rowFamily) lines.push(`  --theme-font-${id}: ${rowFamily};`);
    if (rowSize) lines.push(`  --theme-font-size-${id}: ${rowSize};`);
  }
  const root = lines.length ? `:root {\n${lines.join("\n")}\n}\n\n` : "";
  return faces + bodyRule + root;
}

function squareCorners(theme) {
  const rows = Object.values((theme && theme.borders) || {});
  if (!rows.length) return false;
  return rows.every((row) => cssSize(row.radius) === "0px");
}

function shadowCss(theme) {
  const value = shadowValue(theme.shadow);
  if (!value) return "";
  return `body {\n  filter: drop-shadow(${value});\n}\n\n`;
}

function borderCss(theme) {
  const lines = [];
  for (const [id, row] of Object.entries(theme.borders || {})) {
    const style = borderStyle(row.style);
    const width = cssSize(row.width);
    const radius = cssSize(row.radius);
    if (style) lines.push(`  --theme-border-style-${id}: ${style};`);
    if (width) lines.push(`  --theme-border-width-${id}: ${width};`);
    if (radius) lines.push(`  --theme-border-radius-${id}: ${radius};`);
  }
  const square = squareCorners(theme) ? "body, body * {\n  border-radius: 0 !important;\n}\n\n" : "";
  if (!lines.length) return square;
  return square + `:root {\n${lines.join("\n")}\n}\n\n`;
}

function cssColor(colors) {
  if (!colors.dark) return colors.light;
  if (!colors.light) return colors.dark;
  if (colors.light === colors.dark) return colors.light;
  return `light-dark(${colors.light}, ${colors.dark})`;
}

function buildCss(theme) {
  const lines = TOKEN_DEFS.filter((def) => def.kind === "web").map((def) => {
    return `  ${def.id}: ${cssColor(theme.tokens[def.id])} !important;`;
  });
  const bySelector = new Map();
  const grouped = new Map();
  for (const def of TOKEN_DEFS) {
    if (def.kind !== "desktop" || !def.selector || !def.value) continue;
    const key = def.selector + "\0" + def.property;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(def);
  }
  for (const defs of grouped.values()) {
    const selector = defs[0].selector;
    if (!bySelector.has(selector)) bySelector.set(selector, []);
    bySelector.get(selector).push(`  ${defs[0].property}: ${shellValue(defs, theme)} !important;`);
  }
  const shellBlocks = [...bySelector.entries()].map(
    ([selector, props]) => `${selector} {\n${props.join("\n")}\n}`,
  );
  return `${fontCss(theme)}${shadowCss(theme)}${borderCss(theme)}/* zulip theme: ${theme.name}
   Same colors as the theme in the editor.
*/
:root {
${lines.join("\n")}
}

/* Desktop shell colors from Zulip.app. Add custom CSS does not apply these rules. */
${shellBlocks.join("\n\n")}
`;
}

function slug(name) {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "zulip-theme";
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function copyHex(slot) {
  if (!state.selectedId) return;
  const value = state.theme.tokens[state.selectedId][slot];
  const done = () => setStatus("Copied " + value);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(done).catch(() => fallbackCopy(value, done));
  } else {
    fallbackCopy(value, done);
  }
}

function fallbackCopy(value, done) {
  const field = document.createElement("textarea");
  field.value = value;
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
  done();
}

function syncCatalog() {
  for (const def of TOKEN_DEFS) syncCatalogRow(def.id);
}

function themeJsonNames(html) {
  const names = new Set();
  const pattern = /href="([^"]+)"/gi;
  let match = pattern.exec(html);
  while (match) {
    let href = match[1].split("#")[0].split("?")[0];
    try {
      href = decodeURIComponent(href);
    } catch {
      href = "";
    }
    const filename = href.split("/").pop();
    if (filename && filename.toLowerCase().endsWith(".json") && !filename.startsWith(".")) names.add(filename);
    match = pattern.exec(html);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function bundledThemeFiles() {
  const bundle = window.THEME_BUNDLE;
  if (!bundle || typeof bundle !== "object") return [];
  return Object.keys(bundle)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
}

async function listThemeJsonFiles() {
  try {
    const response = await fetch("themes/", { cache: "no-store" });
    if (response.ok) {
      const names = themeJsonNames(await response.text());
      if (names.length) return names;
    }
  } catch {
    // Opening index.html as a file cannot list the themes folder.
  }
  const bundled = bundledThemeFiles();
  if (bundled.length) return bundled;
  throw new Error("missing themes");
}

function fillThemeMenu(filenames) {
  themeFilenames.clear();
  const options = filenames.map((filename) => {
    themeFilenames.add(filename);
    const option = document.createElement("option");
    option.value = filename;
    option.textContent = filename.replace(/\.json$/i, "");
    return option;
  });
  themePreset.replaceChildren(...options);
}

async function refreshThemeMenu() {
  const filenames = await listThemeJsonFiles();
  const current = themePreset.value;
  const unchanged =
    filenames.length === themePreset.options.length &&
    filenames.every((filename, index) => themePreset.options[index].value === filename);
  if (unchanged) {
    for (const filename of filenames) themeFilenames.add(filename);
    return;
  }
  fillThemeMenu(filenames);
  if (themeFilenames.has(current)) themePreset.value = current;
}

function applyLoadedJson(data, label, announce) {
  const fallback = state.seed || stockTheme();
  const theme = normalizeTheme(data, fallback);
  state.seed = cloneTheme(theme);
  state.theme = cloneTheme(theme);
  if (label && themeFilenames.has(label)) themePreset.value = label;
  persist();
  applyColors();
  syncName();
  renderInspector();
  syncCatalog();
  syncStyleControls();
  if (announce) setStatus("Loaded " + label);
}

async function readThemeFile(filename) {
  try {
    const response = await fetch("themes/" + encodeURIComponent(filename), { cache: "no-store" });
    if (response.ok) {
      const text = await response.text();
      if (text.trim().startsWith("{")) return JSON.parse(text);
    }
  } catch {
    // Opening index.html as a file cannot fetch the JSON.
  }
  const bundled = window.THEME_BUNDLE && window.THEME_BUNDLE[filename];
  if (bundled && typeof bundled === "object") return bundled;
  throw new Error("missing theme");
}

async function loadThemeFromDirectory(filename, announce) {
  applyLoadedJson(await readThemeFile(filename), filename, announce);
}

dummy.addEventListener("click", (event) => {
  const target = event.target.closest("[data-token]");
  if (!target || !dummy.contains(target)) return;
  select(target);
});

themePreset.addEventListener("focus", () => {
  refreshThemeMenu().catch(() => {
    if (!themePreset.options.length) setStatus("Could not read the themes folder");
  });
});

themePreset.addEventListener("change", () => {
  const filename = themePreset.value;
  loadThemeFromDirectory(filename, true).catch(() => setStatus("Could not read that file"));
});

themeName.addEventListener("input", () => {
  state.theme.name = themeName.value;
  persist();
});

document.getElementById("mode-light").addEventListener("click", () => {
  state.mode = "light";
  persist();
  applyColors();
});

document.getElementById("mode-dark").addEventListener("click", () => {
  state.mode = "dark";
  persist();
  applyColors();
});

function bindHex(input, slot) {
  input.addEventListener("input", () => {
    commitHex(slot, input.value, input);
  });
  input.addEventListener("blur", () => {
    if (!state.selectedId) return;
    if (!parseHex(input.value)) input.value = state.theme.tokens[state.selectedId][slot];
    else input.value = state.theme.tokens[state.selectedId][slot];
  });
}

bindHex(lightHex, "light");
bindHex(darkHex, "dark");

function setPickedColor(slot, picker, hexField) {
  if (syncingControls || !state.selectedId || !state.theme) return;
  const color = picker.value.toLowerCase();
  state.theme.tokens[state.selectedId][slot] = color;
  hexField.value = color;
  persist();
  applyColors();
  syncCatalogRow(state.selectedId);
}

lightPicker.addEventListener("input", () => setPickedColor("light", lightPicker, lightHex));
darkPicker.addEventListener("input", () => setPickedColor("dark", darkPicker, darkHex));

document.getElementById("copy-light").addEventListener("click", () => copyHex("light"));
document.getElementById("copy-dark").addEventListener("click", () => copyHex("dark"));

document.getElementById("reset-token").addEventListener("click", () => {
  if (!state.selectedId) return;
  const seedColors = state.seed.tokens[state.selectedId];
  state.theme.tokens[state.selectedId] = { light: seedColors.light, dark: seedColors.dark };
  syncCatalogRow(state.selectedId);
  persist();
  applyColors();
  renderInspector();
  setStatus("Restored the Zulip seed for this surface");
});

document.getElementById("load-json").addEventListener("click", () => loadFile.click());

loadFile.addEventListener("change", () => {
  const file = loadFile.files && loadFile.files[0];
  loadFile.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyLoadedJson(JSON.parse(String(reader.result)), file.name, true);
    } catch {
      setStatus("Could not read that file");
    }
  };
  reader.readAsText(file);
});

document.getElementById("save-json").addEventListener("click", () => {
  const theme = snapshotTheme();
  if (!theme) return;
  const payload = JSON.stringify(theme, null, 2) + "\n";
  download(slug(theme.name) + ".json", payload, "application/json");
  setStatus("Saved " + slug(theme.name) + ".json");
});

document.getElementById("export-css").addEventListener("click", () => {
  const theme = snapshotTheme();
  if (!theme) return;
  const filename = slug(theme.name) + ".css";
  download(filename, buildCss(theme), "text/css");
  setStatus("Exported " + filename);
});

const catalogInputs = new Map();

function syncCatalogRow(id) {
  const row = catalogInputs.get(id);
  if (!row || !state.theme) return;
  const colors = state.theme.tokens[id];
  syncingControls = true;
  if (row.lightHex && document.activeElement !== row.lightHex) row.lightHex.value = colors.light;
  if (row.darkHex && document.activeElement !== row.darkHex) row.darkHex.value = colors.dark;
  if (row.light) row.light.value = opaqueHex(colors.light);
  if (row.dark) row.dark.value = opaqueHex(colors.dark);
  syncingControls = false;
}

function setCatalogColor(id, slot, raw, fromPicker) {
  if (syncingControls || !state.theme) return;
  const parsed = fromPicker ? String(raw).toLowerCase() : parseHex(raw);
  if (!parsed) return;
  const def = TOKEN_DEFS.find((item) => item.id === id);
  state.theme.tokens[id][slot] = parsed;
  if (def && def.kind === "desktop") {
    state.theme.tokens[id].light = parsed;
    state.theme.tokens[id].dark = parsed;
  }
  persist();
  applyColors();
  if (state.selectedId === id) renderInspector();
  syncCatalogRow(id);
}

function renderCatalog() {
  const list = document.getElementById("catalog-list");
  const search = document.getElementById("catalog-search");
  list.replaceChildren();
  let lastSource = "";
  for (const def of TOKEN_DEFS) {
    if (def.source !== lastSource) {
      lastSource = def.source;
      const heading = document.createElement("h3");
      heading.className = "catalog-group";
      heading.textContent = def.source === "Chat theme" ? "Chat theme variables" : def.source;
      list.appendChild(heading);
    }
    const row = document.createElement("div");
    row.className = "catalog-row" + (def.kind === "desktop" ? " is-shell" : "");
    row.dataset.search = (def.mention + " " + def.label).toLowerCase();
    const name = document.createElement("code");
    name.textContent = def.mention;
    name.title = def.label === def.mention ? def.source : def.label;
    row.appendChild(name);
    const fields = {};
    const addSlot = (slot, caption) => {
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = opaqueHex(state.theme.tokens[def.id][slot]);
      picker.setAttribute("aria-label", def.mention + " " + caption);
      picker.addEventListener("input", () => setCatalogColor(def.id, slot, picker.value, true));
      const hex = document.createElement("input");
      hex.type = "text";
      hex.spellcheck = false;
      hex.value = state.theme.tokens[def.id][slot];
      hex.setAttribute("aria-label", def.mention + " " + caption + " hex");
      hex.addEventListener("input", () => setCatalogColor(def.id, slot, hex.value, false));
      hex.addEventListener("blur", () => {
        if (!parseHex(hex.value)) hex.value = state.theme.tokens[def.id][slot];
      });
      row.append(picker, hex);
      fields[slot] = picker;
      fields[slot + "Hex"] = hex;
    };
    if (def.kind === "desktop") addSlot("light", "color");
    else {
      addSlot("light", "light");
      addSlot("dark", "dark");
    }
    catalogInputs.set(def.id, fields);
    list.appendChild(row);
  }
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    let visibleInGroup = false;
    let group = null;
    for (const child of list.children) {
      if (child.classList.contains("catalog-group")) {
        if (group) group.hidden = !visibleInGroup;
        group = child;
        visibleInGroup = false;
        continue;
      }
      const match = !query || child.dataset.search.includes(query);
      child.hidden = !match;
      if (match) visibleInGroup = true;
    }
    if (group) group.hidden = !visibleInGroup;
  });
}

function applyShadow() {
  const value = shadowValue(state.theme.shadow);
  dummy.classList.toggle("has-drop-shadow", Boolean(value));
  if (value) dummy.style.setProperty("--theme-drop-shadow", value);
  else dummy.style.removeProperty("--theme-drop-shadow");
}

function applyFonts() {
  const fonts = state.theme.fonts || emptyFonts();
  const family = fontStack(fonts.family);
  const size = cssSize(fonts.size);
  dummy.classList.toggle("use-font-family", Boolean(family));
  dummy.classList.toggle("use-font-size", Boolean(size));
  dummy.style.setProperty("--theme-font", family || "inherit");
  dummy.style.setProperty("--theme-font-size", size || "inherit");
  for (const el of dummy.querySelectorAll("[data-token]")) {
    const row = fonts.text[el.dataset.token];
    const rowFamily = row ? fontStack(row.family) : "";
    const rowSize = row ? cssSize(row.size) : "";
    el.classList.toggle("has-font", Boolean(rowFamily));
    el.classList.toggle("has-size", Boolean(rowSize));
    if (rowFamily) el.style.setProperty("--theme-font", rowFamily);
    else el.style.removeProperty("--theme-font");
    if (rowSize) el.style.setProperty("--theme-font-size", rowSize);
    else el.style.removeProperty("--theme-font-size");
  }
}

function applyBorders() {
  const borders = state.theme.borders || {};
  dummy.classList.toggle("is-square", squareCorners(state.theme));
  for (const el of dummy.querySelectorAll("[data-token]")) {
    const row = borders[el.dataset.token];
    const style = row ? borderStyle(row.style) : "";
    const width = row ? cssSize(row.width) : "";
    const radius = row ? cssSize(row.radius) : "";
    el.style.borderStyle = style;
    el.style.borderWidth = width;
    el.style.borderRadius = radius;
    if (el.classList.contains("topic-bracket") && (style || width)) {
      el.style.borderRightStyle = "none";
      el.style.borderRightWidth = "0";
    } else if (el.classList.contains("topic-bracket")) {
      el.style.borderRightStyle = "";
      el.style.borderRightWidth = "";
    }
  }
}

function syncStyleControls() {
  const fonts = state.theme.fonts || emptyFonts();
  const familyInput = document.getElementById("font-family");
  const sizeInput = document.getElementById("font-size");
  if (document.activeElement !== familyInput) familyInput.value = fonts.family;
  if (document.activeElement !== sizeInput) sizeInput.value = fonts.size;
  for (const def of TEXT_VARS) {
    const row = fonts.text[def.id] || { family: "", size: "" };
    const family = document.querySelector(`[data-font-family="${CSS.escape(def.id)}"]`);
    const size = document.querySelector(`[data-font-size="${CSS.escape(def.id)}"]`);
    if (family && document.activeElement !== family) family.value = row.family;
    if (size && document.activeElement !== size) size.value = row.size;
  }
  for (const def of BORDER_VARS) {
    const row = state.theme.borders[def.id] || { style: "", width: "", radius: "" };
    const style = document.querySelector(`[data-border-style="${CSS.escape(def.id)}"]`);
    const width = document.querySelector(`[data-border-width="${CSS.escape(def.id)}"]`);
    const radius = document.querySelector(`[data-border-radius="${CSS.escape(def.id)}"]`);
    if (style && document.activeElement !== style) style.value = borderStyle(row.style);
    if (width && document.activeElement !== width) width.value = row.width;
    if (radius && document.activeElement !== radius) radius.value = row.radius;
  }
}

function renderStyleLists() {
  const fontList = document.getElementById("font-text-list");
  const borderList = document.getElementById("border-list");
  for (const def of TEXT_VARS) {
    const row = document.createElement("div");
    row.className = "font-row";
    row.dataset.search = def.id.toLowerCase();
    const code = document.createElement("code");
    code.textContent = def.id;
    const family = document.createElement("input");
    family.type = "text";
    family.spellcheck = false;
    family.placeholder = "Font name";
    family.setAttribute("aria-label", def.id + " font");
    family.dataset.fontFamily = def.id;
    const size = document.createElement("input");
    size.type = "text";
    size.spellcheck = false;
    size.placeholder = "Size";
    size.setAttribute("aria-label", def.id + " font size");
    size.dataset.fontSize = def.id;
    family.addEventListener("input", () => {
      const current = state.theme.fonts.text[def.id] || { family: "", size: "" };
      current.family = family.value;
      if (current.family || current.size) state.theme.fonts.text[def.id] = current;
      else delete state.theme.fonts.text[def.id];
      persist();
      applyFonts();
    });
    size.addEventListener("input", () => {
      const current = state.theme.fonts.text[def.id] || { family: "", size: "" };
      current.size = size.value;
      if (current.family || current.size) state.theme.fonts.text[def.id] = current;
      else delete state.theme.fonts.text[def.id];
      persist();
      applyFonts();
    });
    row.append(code, family, size);
    fontList.appendChild(row);
  }
  for (const def of BORDER_VARS) {
    const item = document.createElement("details");
    item.className = "border-item";
    item.dataset.search = (def.id + " " + (def.property || "")).toLowerCase();
    const summary = document.createElement("summary");
    const code = document.createElement("code");
    code.textContent = def.id;
    summary.appendChild(code);
    const fields = document.createElement("div");
    fields.className = "border-fields";
    const styleLabel = document.createElement("label");
    styleLabel.append("Type");
    const style = document.createElement("select");
    style.dataset.borderStyle = def.id;
    style.setAttribute("aria-label", def.id + " border type");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Default";
    style.appendChild(blank);
    for (const name of BORDER_STYLES) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      style.appendChild(option);
    }
    styleLabel.appendChild(style);
    const widthLabel = document.createElement("label");
    widthLabel.append("Weight");
    const width = document.createElement("input");
    width.type = "text";
    width.spellcheck = false;
    width.placeholder = "1px";
    width.dataset.borderWidth = def.id;
    width.setAttribute("aria-label", def.id + " border weight");
    widthLabel.appendChild(width);
    const radiusLabel = document.createElement("label");
    radiusLabel.append("Radius");
    const radius = document.createElement("input");
    radius.type = "text";
    radius.spellcheck = false;
    radius.placeholder = "0";
    radius.dataset.borderRadius = def.id;
    radius.setAttribute("aria-label", def.id + " border radius");
    radiusLabel.appendChild(radius);
    const write = () => {
      const next = { style: style.value, width: width.value, radius: radius.value };
      if (next.style || next.width || next.radius) state.theme.borders[def.id] = next;
      else delete state.theme.borders[def.id];
      persist();
      applyBorders();
    };
    style.addEventListener("change", write);
    width.addEventListener("input", write);
    radius.addEventListener("input", write);
    fields.append(styleLabel, widthLabel, radiusLabel);
    item.append(summary, fields);
    borderList.appendChild(item);
  }
  const filter = (input, list) => {
    const query = input.value.trim().toLowerCase();
    for (const child of list.children) child.hidden = Boolean(query) && !child.dataset.search.includes(query);
  };
  document.getElementById("font-text-filter").addEventListener("input", (event) => filter(event.target, fontList));
  document.getElementById("border-filter").addEventListener("input", (event) => filter(event.target, borderList));
  document.getElementById("font-family").addEventListener("input", (event) => {
    state.theme.fonts.family = event.target.value;
    persist();
    applyFonts();
  });
  document.getElementById("font-size").addEventListener("input", (event) => {
    state.theme.fonts.size = event.target.value;
    persist();
    applyFonts();
  });
  syncStyleControls();
}

async function start() {
  state.mode = "light";
  let filenames = [];
  try {
    filenames = await listThemeJsonFiles();
  } catch {
    filenames = [];
  }
  fillThemeMenu(filenames);
  const initial = filenames.includes("isolate.json") ? "isolate.json" : filenames[0];
  if (initial) {
    try {
      await loadThemeFromDirectory(initial, false);
    } catch {
      state.seed = cloneTheme(ISOLATE_THEME);
      state.theme = cloneTheme(ISOLATE_THEME);
      syncName();
      applyColors();
      setStatus("Could not read that file");
    }
  } else {
    state.seed = cloneTheme(ISOLATE_THEME);
    state.theme = cloneTheme(ISOLATE_THEME);
    syncName();
    applyColors();
  }
  renderCatalog();
  renderStyleLists();
}

start();
