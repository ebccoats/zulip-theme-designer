# Making a Zulip theme

Read this before adding or changing a theme in this repo. A theme is a JSON file the editor loads, plus a CSS file the user pastes into Zulip Desktop. Those two have to describe the same look.

Zulip import path: menu, Desktop Settings, General, Add custom CSS. That CSS is injected only into the chat webview. Desktop shell rules are still written into the file, and Zulip ignores them. After a CSS change, the user re-imports the file. Command-R reloads the client.

## Files

| File | Role |
| --- | --- |
| `themes/<name>.json` | What the editor loads from the theme menu |
| `themes/<name>.css` | What the user imports into Zulip. Same colors and effects as the JSON |
| `themes/bundle.js` | `window.THEME_BUNDLE`, a fallback copy of every JSON for when the page is opened as a file |
| `app.js` | Loads themes, paints the preview, and builds export CSS |
| `styles.css` | Preview-only styling. Effect rules here are scoped to the dummy |
| `catalog.js` | Every color token. Do not regenerate it |
| `index.html` | The dummy Zulip mock. Script order is `catalog.js`, `themes/isolate.js`, `themes/bundle.js`, `app.js` |

Name the JSON with a slug: `themes/crt.json`, `"name": "crt"`. When extra CSS is required, set `"cssFile": "crt.css"` and keep that filename.

Leave these files alone unless the task is about them: `catalog.js`, `README.md`, and any theme you were not asked to change. `isolate.json` is the boot theme. `disco-ball.json` and `disco-ball.css` are huge; do not re-serialize them. Generator scripts go in `/tmp`, not the repo. Do not commit unless asked.

## What the editor does

Opening the page always loads `isolate.json` when that file is in the menu. It does not restore the last theme from localStorage. Switching the Light / Dark toggle keeps the current theme. Choosing a menu item fetches `themes/<file>.json` with `cache: "no-store"`, and uses the bundle only if that fetch fails.

A live server that can list `themes/` wins over the bundle. Opening `index.html` as a file cannot list a folder, so the bundle is the menu. If the menu already has themes, do not report that the themes folder could not be read.

`Export CSS` runs `buildCss()`. The committed `themes/<name>.css` has to match that output, because the user imports the file rather than clicking Export.

## Theme JSON

```json
{
  "name": "crt",
  "note": "One sentence about the look.",
  "cssFile": "crt.css",
  "crt": true,
  "fonts": { "family": "Press Start 2P", "size": "18px", "text": {} },
  "borders": {},
  "tokens": { "--color-text-default": { "light": "#ffa900", "dark": "" } }
}
```

Optional top-level fields the loader already understands: `fonts`, `borders`, `shadow` (`x`, `y`, `blur`, `color`), `disco` (`size`, `frames`), `darkness`, `crt`, `cssFile`, `font` (`"pixel"` is the NES shortcut). A new flag has to be copied in `normalizeTheme`, `cloneTheme`, and `snapshotTheme`, or Save JSON and Export CSS drop it. Also call it from `applyColors` and include its CSS in `buildCss`.

`tokens` is keyed by catalog `id`. Each value is `{ "light": "#rrggbb", "dark": "#rrggbb" }`.

Color rules:

- A single-look theme sets every `dark` to `""`. An explicit empty string stays empty. A missing slot falls back to the seed color. An invalid hex falls back too.
- Export writes the light color alone when dark is empty. It writes one color when both match. It writes `light-dark(light, dark) !important` when they differ. Web variables are `!important`, so they beat Zulip.
- 8-digit colors that end in `00` are transparent. Keep them transparent when the surface is supposed to show what is behind it.
- Decide a surface from the catalog `property` and the id together. `desktop-org-rail` is a background. `--color-background-direct-mention` is the whole DM card, not the mention pill. The pill is `--color-background-text-direct-mention`, and its text is `--color-text-self-direct-mention`.

Copy an existing theme's full token map and recolor it. Do not invent ids. `COLOR_CATALOG` in `catalog.js` is the list, about 616 web tokens and 144 desktop shell tokens.

## Fonts

`fonts.family` is the installed font's real family name. `fonts.size` is a number (pixels are added) or a value with `px`, `rem`, or `em`. Empty fields inherit. `fonts.text` is an optional override per catalog id that contains `text`: `{ "<id>": { "family": "", "size": "" } }`.

Export builds this stack, with a separate face so the installed font is not shadowed:

```css
@font-face {
  font-family: "Installed Press Start 2P";
  src: local("Press Start 2P"), local("Press Start 2P Regular");
}
body, body * {
  font-family: "Press Start 2P", "Installed Press Start 2P", sans-serif !important;
  font-size: 18px !important;
}
```

The preview does not use that `local()` face. It uses `@font-face` in `styles.css`, and the family name there must match `fonts.family` exactly. Faces already in `styles.css`: Press Start 2P, UnifrakturMaguntia, Comic Relief, VT323, from `fonts/*.woff2`. A new preview font needs a woff2 plus a matching `@font-face`. Do not embed a font as a data URI.

`nes` is the exception: `"font": "pixel"` or the name `nes`, with no `fonts` object, becomes Press Start 2P at 8px.

## Borders

`borders` is one row per catalog id whose id or property matches `/border/i`:

```json
"--color-message-header-contents-border": { "style": "", "width": "", "radius": "0" }
```

`style` is a CSS border style or `""`. `width` and `radius` use the same size rules as font size. `""` leaves Zulip's default. Border color stays in `tokens`, not in this object.

Square corners turn on only when there is at least one border row and every row's radius normalizes to `0px`. The preview gets `is-square`. Export prepends `body, body * { border-radius: 0 !important; }`. The editor's own chrome stays rounded.

## Effects that tokens cannot do

Scanlines, flicker, a flashlight, and the disco background are CSS, not colors. Three copies of that CSS stay identical:

1. `styles.css`, scoped to `.dummy.is-<flag>`. The overlay is `position: absolute` inside the dummy. An unscoped `body::before` covers the editor.
2. A function in `app.js` (`crtCss`, `darknessCss`, `discoCss`) that `buildCss` concatenates, targeting `body` for Zulip. Full-screen overlays there are `position: fixed`.
3. The same rules at the top of `themes/<name>.css`, which is the file the user imports.

Wire the flag through `normalizeTheme` (also true when `cssFile` or `name` matches), `cloneTheme`, `snapshotTheme`, `persist`, `applyColors`, and a `dummy.classList.toggle`. Preview-only chrome that is not a token (`.rail-mark`, `.rail-icon`, `.presence`, `.navbar-avatar`) is recolored under `.dummy.is-<flag>` in `styles.css` only.

`total-darkness` keeps `overflow: visible !important` on `body, body *`. That is what lets the yellow circle escape its box. Leave it.

Disco frames live in the JSON and in `bundle.js`. Do not strip them. Do not put `@keyframes disco-cycle` in `styles.css`; `applyDisco` injects that stylesheet.

## Add the theme to the menu

Append the JSON to `themes/bundle.js` before the final `};`. The file is one line. Keep the opening comment as a `//` line. Do not pretty-print or rewrite the file.

```js
,"my-theme.json":{ ...the json object... }
```

Then `node --check themes/bundle.js` and `node --check app.js`.

## Check it in the browser

Serve the repo with `python3 -m http.server 8765`. File URLs do not work in the browser tool. The page boots on isolate. Choose the new theme in the menu. Confirm `.dummy` has the expected classes (`use-font-family`, `use-font-size`, `is-square`, `is-crt`, and so on) and that computed font, color, and effect styles match the JSON. Screenshot `.dummy`.

The mock uses Ada Lovelace, Bo Davis, and the channels general, welcome, and design. Use that dummy data. The catalog list is large; prefer a small DOM query over a full-page accessibility snapshot.

Reload `styles.css` with a query string when the preview CSS changes. The theme JSON is fetched with `cache: "no-store"`. Selecting the theme again picks up JSON edits.
