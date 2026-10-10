# overLy

A lightweight, floating desktop overlay that displays synced lyrics for whatever you're listening to on Windows.

Works automatically with **Spotify**, **Apple Music**, **YouTube Music**, **Tidal**, browsers (**Chrome**, **Edge**, **Brave**), and any player supported by Windows Media Controls.

---

## Features

- **Picks up whatever is playing** — Hooks into Windows Media Controls (SMTC) automatically. No browser extensions, logins, or API keys needed.
- **Synced Lyrics** — Automatically fetches and scrolls synced lines in time with the track.
- **Manual Search & Timing Offset** — If a track has timing drift (e.g. over Bluetooth) or needs alternate tags, tweak the offset slider (-3s to +3s) or search manually in Settings.
- **4 Layout Views**:
  - **Collapsed Pill**: Minimal compact capsule with song progress and quick media controls on hover.
  - **Normal Card**: Album artwork, track info, scrubber, and scrolling lyrics.
  - **Only Lyrics**: Clean floating lyrics overlay without player clutter.
  - **Expanded**: Full-height lyrics sheet.
  - *Tip: Double-click the overlay or press `M` to cycle through views.*
- **Click-Through / Lock Mode (`Ctrl + Shift + L`)** — Makes the overlay ignore all mouse clicks so you can game or work without clicking it by accident.
- **Themes & Colors** — Supports Dark mode, Light mode, or automatically follows your Windows theme. Choose your accent color or pick a custom one.
- **Start with Windows** — Option to launch automatically on boot (toggle in Settings or via the system tray).
- **Always on Top & Resizable** — Pin the window to stay on top, or enable resize mode (`R`) to scale the window to any dimension.

---

## Download & Installation

### Option 1: Installer or Portable ZIP (Recommended)
Grab the latest release from the [Releases](https://github.com/Afugegege/OverLy/releases) page:
- **`overLy Setup 1.0.0.exe`**: Standard Windows installer (creates desktop shortcut & auto-updater).
- **`overLy-1.0.0-win.zip`**: Portable standalone build (extract and run without installing).

> **Note on Windows SmartScreen**: Because this is an open-source build without an enterprise Microsoft code-signing certificate, Windows SmartScreen may show a popup on first launch. Click **"More info" → "Run anyway"**.

---

### Option 2: Run from Source

Requirements:
- Windows 10 (1809+) or Windows 11
- [Node.js](https://nodejs.org/) (v18+)

```bash
# Clone the repository
git clone https://github.com/Afugegege/OverLy.git
cd OverLy

# Install dependencies
npm install

# Start the app
npm start
```

To build your own installer or portable binaries:
```bash
npm run dist
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Shift + L` | Toggle Click-Through Lock Mode |
| `M` (or double-click) | Cycle through layout modes |
| `P` | Toggle Always on Top |
| `R` | Toggle window resize mode |

---

## License

[MIT](LICENSE)
