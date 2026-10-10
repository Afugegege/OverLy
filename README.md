# overLy

A lightweight, customizable desktop overlay for Windows that displays real-time synced lyrics for whatever you are currently listening to.

Hooks directly into Windows System Media Transport Controls (SMTC), meaning it works immediately with Spotify, Apple Music, YouTube Music, Tidal, Chrome, Edge, Brave, and other desktop or web players without requiring accounts, browser extensions, or API tokens.

---

## Features

### Dynamic Album Art Theming
- In Auto Theme mode, both the background tint and text colors are derived from the album art (with contrast checks ensuring text is always sharp and readable), and the accent color automatically switches to auto as well.
- In Auto Accent mode, overLy samples colors directly from the currently playing album artwork to theme lyrics, waveform visualizer, buttons, and progress scrubbers.
- If the Settings window is open when the track changes, Settings updates its accent colors, preview chips, and ambient glow in real time.
- Falls back to a clean neutral tone while artwork is fetching or if no cover art is found.

### Progress Bar as Pill Border
- In Collapsed Pill mode, track progress wraps around the entire perimeter border of the pill using an SVG stroke rather than a standard flat bar.
- Interactive seeking: hover to see the elapsed/remaining time, and click or drag anywhere along the border to seek directly in the track.

### Auto-Hiding Controls
- Media buttons, layout toggles, close buttons, and titlebar elements stay hidden while playing so the screen stays clean.
- Hovering anywhere near the overlay instantly brings the controls back into view.

### 5 Layout Views
Double-click the overlay or press `M` to cycle through layouts:
- **Collapsed Pill**: Minimal capsule with the border progress scrubber and playback controls on hover.
- **Normal Card**: Full card layout with album art, track details, animated waveform, seek bar, and synced scrolling lyrics.
- **Only Lyrics**: Floating text HUD without player chrome or backgrounds.
- **Expanded Lyrics**: Tall vertical layout showing upcoming and past lines.
- **Minimized Bubble**: Compact circular orb showing cover art with an ambient aura.

**Anchored Transitions**: Switching layouts keeps the window locked to its position anchor (center and screen edge), preventing the window from drifting across your monitor when toggling back and forth.

### Click-Through Lock Mode (Ctrl + Shift + L)
- Transparent mouse mode that ignores all clicks, allowing you to click games, browsers, or code editors directly behind the overlay without interrupting anything.
- An on-screen toast indicator confirms when lock mode is toggled.

### Custom Accent Color & Instant Recall
- Clicking the custom swatch instantly applies your last chosen custom color without opening picker menus.
- Clicking Edit opens a drawer with continuous Hue and Tone/Lightness sliders, raw Hex code input, a screen eyedropper pipette to pick colors from anywhere on your display, and color presets.

### Auto-Minimize on Pause
- Automatically shrinks the overlay into the collapsed pill or minimized bubble when media is paused for a set duration (5s to 5m, configurable in Settings).
- Automatically restores your previous layout once music resumes.

### Manual Lyrics Search & Timing Offset
- Automatic lookups use LRCLIB and NetEase with fuzzy artist/title matching.
- Built-in search bar in Settings to look up alternate song tags if automated lookup fails.
- Timing offset slider and buttons (-3.0s to +3.0s in 0.2s steps) to fix Bluetooth latency or audio desync.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Shift + L` | Toggle Click-Through Lock Mode |
| `M` (or double-click) | Cycle layout mode |
| `P` | Toggle Always on Top |
| `R` | Toggle window resizing mode |
| `Esc` | Close Settings window |

---

## Installation

### Option 1: Pre-Built Releases
Download from the [Releases](https://github.com/Afugegege/OverLy/releases) page:
- **`overLy Setup.exe`**: Windows installer with start menu entry and auto-launch options.
- **`overLy-win.zip`**: Portable build (extract and launch `overLy.exe`).

> **Windows SmartScreen**: Because this is an open-source project without a paid corporate certificate, Windows SmartScreen may show an initial prompt on first run. Click **"More info" -> "Run anyway"**.

---

### Option 2: Run from Source

#### Requirements
- Windows 10 (1809+) or Windows 11
- Node.js (v18+)

```bash
git clone https://github.com/Afugegege/OverLy.git
cd OverLy
npm install
npm start
```

To build installers or portable binaries:
```bash
npm run dist
```

---

## License

MIT
