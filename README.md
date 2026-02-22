# Timestamp Picker for Obsidian

A plugin that makes inline timestamps in your notes clickable, opening a date and time picker modal to easily edit them.

## Features

- **Click to edit** — Any timestamp matching the pattern `YYYY-MM-DD HH:mm` becomes clickable
- **Date + Time picker** — Opens a modal with native date and time inputs
- **Live Preview support** — Works in both Live Preview and Reading view
- **Configurable pattern** — Customise the regex pattern to match your timestamp format
- **Frontmatter aware** — Timestamps in frontmatter are ignored
- **Mobile friendly** — Works on both desktop and mobile

## Demo

In any note, write a timestamp like `2025-01-15 09:30` and it will appear as a clickable link. Click it to open the picker modal and change the date/time.

## Installation

### From Community Plugins

1. Open **Settings → Community plugins**
2. Search for "Timestamp Picker"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest)
2. Create a folder `timestamp-picker` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into it
4. Enable the plugin in **Settings → Community plugins**

## Configuration

Go to **Settings → Timestamp Picker** to customise:

- **Timestamp pattern** — The regex pattern used to detect timestamps (default: `\d{4}-\d{2}-\d{2} \d{2}:\d{2}`)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Build with watch mode
npm run dev
```

## License

[MIT](LICENSE)
