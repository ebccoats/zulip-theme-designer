# Zulip Themer

A static page for recoloring the Zulip surfaces shown in the desktop client. Open `index.html` in a browser. There is no install and no build.

The preview is the chat layout the desktop app renders. Below it, All colors lists every chat theme variable from the web styles the desktop app renders, and every color in Zulip.app's own stylesheets. Each one has an editable color. Export CSS writes that full list.

Click a surface in the preview, then set its light and dark colors. The Light/Dark control chooses which pair the preview shows. Both colors are kept. The theme autosaves in this browser.

Save JSON downloads the theme. Load JSON reads a theme file back. Reset restores the selected surface to the seeded Zulip color.

Export CSS writes the colors currently in the editor, the same light and dark values Save JSON would save. You do not need to save or reload a JSON file first. The file also includes a `.toggle-sidebar` rule for the desktop org rail; Zulip's Add custom CSS upload does not apply that rule.

```css
:root {
  --color-background: light-dark(#f0f0f0, #1c1c1c) !important;
}

.toggle-sidebar {
  background: light-dark(#222c31, #222c31);
}
```

Paste the `:root` properties over the matching ones in Zulip's [`web/styles/app_variables.css`](https://github.com/zulip/zulip/blob/main/web/styles/app_variables.css), or load the file as a userstyle on your Zulip origin. Zulip Desktop renders that web app, so a userstyle on the organization origin restyles the desktop client.

The org rail is desktop chrome, not a web variable. Its rule replaces the `.toggle-sidebar` background in zulip-desktop [`app/renderer/css/main.css`](https://github.com/zulip/zulip-desktop/blob/v5.12.4/app/renderer/css/main.css).

The seed colors are the current Zulip light and dark pairs. Two dark values were flattened from `color-mix()` so they can be edited as hex: the selected channel row, and the compose input.

`themes/zulip-default.json` is that seed. When the page is opened from disk, the same seed is built into `app.js` because browsers block fetching a local JSON file. Over HTTP, the page prefers the JSON file.
