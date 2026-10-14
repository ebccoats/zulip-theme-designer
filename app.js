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

const EMBEDDED_DEFAULT = ISOLATE_THEME;

function stockTheme() {
  const tokens = {};
  for (const item of COLOR_CATALOG) {
    tokens[item.id] = { light: item.light, dark: item.dark };
  }
  return { name: "default", tokens };
}

const PRESETS = {
  isolate: ISOLATE_THEME,
  default: stockTheme(),
};

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
  return { name: theme.name, tokens };
}

function normalizeTheme(data, fallback) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Theme file must be an object");
  }
  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : fallback.name;
  const tokens = {};
  for (const def of TOKEN_DEFS) {
    const incoming = data.tokens && data.tokens[def.id];
    const light = incoming && parseHex(incoming.light);
    const dark = incoming && parseHex(incoming.dark);
    tokens[def.id] = {
      light: light || fallback.tokens[def.id].light,
      dark: dark || fallback.tokens[def.id].dark,
    };
  }
  return { name, tokens };
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        name: state.theme.name,
        tokens: state.theme.tokens,
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
    dummy.style.setProperty(def.cssVar, state.theme.tokens[def.id][state.mode]);
  }
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
  return { name, tokens };
}

const SHELL_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:black|white|transparent)\b/gi;

function shellValue(defs, theme) {
  const ordered = defs.slice().sort((a, b) => a.colorIndex - b.colorIndex);
  let index = 0;
  return ordered[0].value.replace(SHELL_COLOR_RE, () => {
    const def = ordered[index] || ordered[ordered.length - 1];
    index += 1;
    const colors = theme.tokens[def.id];
    if (colors.light === colors.dark) return colors.light;
    return `light-dark(${colors.light}, ${colors.dark})`;
  });
}

function buildCss(theme) {
  const lines = TOKEN_DEFS.filter((def) => def.kind === "web").map((def) => {
    const colors = theme.tokens[def.id];
    return `  ${def.id}: light-dark(${colors.light}, ${colors.dark}) !important;`;
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
  return `/* zulip theme: ${theme.name}
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

async function loadPresetFile(url, fallback) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("missing theme");
    return normalizeTheme(await response.json(), fallback);
  } catch {
    return cloneTheme(fallback);
  }
}

function syncCatalog() {
  for (const def of TOKEN_DEFS) syncCatalogRow(def.id);
}

function applyPreset(id) {
  const preset = PRESETS[id] || PRESETS.isolate;
  state.seed = preset;
  state.theme = cloneTheme(preset);
  themePreset.value = PRESETS[id] ? id : "isolate";
  syncName();
  applyColors();
  renderInspector();
  syncCatalog();
  persist();
}

dummy.addEventListener("click", (event) => {
  const target = event.target.closest("[data-token]");
  if (!target || !dummy.contains(target)) return;
  select(target);
});

themePreset.addEventListener("change", () => {
  applyPreset(themePreset.value);
  setStatus("Loaded " + themePreset.value);
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
      state.theme = normalizeTheme(JSON.parse(String(reader.result)), state.seed);
      const loadedName = state.theme.name;
      if (loadedName === "isolate" || loadedName === "default" || loadedName === "zulip-default") {
        themePreset.value = loadedName === "isolate" ? "isolate" : "default";
        state.seed = PRESETS[themePreset.value];
      }
      persist();
      applyColors();
      syncName();
      renderInspector();
      syncCatalog();
      setStatus("Loaded " + file.name);
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

async function start() {
  PRESETS.isolate = await loadPresetFile("themes/isolate.json", ISOLATE_THEME);
  const savedDefault = await loadPresetFile("themes/zulip-default.json", PRESETS.default);
  PRESETS.default = savedDefault.name === "zulip-default" ? { name: "default", tokens: savedDefault.tokens } : savedDefault;
  state.mode = "light";
  applyPreset("isolate");
  renderCatalog();
}

start();
