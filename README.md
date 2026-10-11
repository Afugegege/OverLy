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

### Immersive Theater Mode (F)
- Fullscreen distraction-free lyric experience with dynamic blurred backdrop.
- Switch between **Split View** (album art + synced lyrics) and **Centered View** (focused lyric column).
- Auto-hides controls and cursor after mouse inactivity.
- Dedicated interactive scrubber, playback controls, and lyrics sync.
- **Auto-Minimize Support**: Automatically exits Fullscreen and shrinks to the compact album disc when paused or idle, and seamlessly restores to Fullscreen upon resuming playback or hover.

### Dynamic Album Art Theming & Auto Mode
- **Auto Theme**: Intelligently evaluates album art luminance to switch between dark and light aesthetics with tailored glass tints and radiant contrast visualizer colors.
- **Dynamic Accent**: Colors sampled from album artwork are applied dynamically to lyrics, visualizer waveforms, playback buttons, and progress scrubbers.
- Real-time accent and theme updates in the Settings window when tracks change.

### 5 Compact & Expanded Layouts
Double-click the overlay or press `M` to cycle through layouts:
- **Collapsed Pill**: Minimal capsule with perimeter SVG border progress scrubber and hover controls.
- **Normal Card**: Elegant card with album art, track details, animated spectrum, scrubber, and synced lyrics.
- **Only Lyrics**: Minimalist floating text HUD.
- **Expanded Lyrics**: Tall vertical view displaying upcoming and preceding lyric lines.
- **Minimized Bubble**: Compact circular orb with album artwork and ambient aura.
- **Instant Layout Lyric Alignment**: Switching layouts keeps the active lyric pinned dead-center with zero scrolling delay.

### Auto-Minimize on Pause & Hover
- Automatically minimizes to the compact orb or pill when paused (including in Fullscreen Immersive Mode).
- Configurable delay options: **Instant** (immediately when mouse leaves / idle), **1s**, **5s**, **10s**, up to **5m**.
- Choice of expansion behavior: expand upon **Resuming Playback** or immediately upon **Mouse Hover**.
- **Re-minimize Option**: Automatically re-collapses if expanded via hover while remaining paused.

### Resilient SMTC Windows Media Sync
- Multi-session discovery hooks directly into Windows SMTC, automatically finding active and paused media across Spotify, Apple Music, YouTube Music, web browsers, and media players.
- Pause retention grace period prevents track information from being lost or desyncing during extended pauses.

### Click-Through Lock Mode (Ctrl + Shift + L)
- Transparent mouse mode allowing interaction with games, browsers, or code editors behind the overlay without interruption.
- Visual toast notification confirms lock status.

### Manual Lyrics Search & Timing Offset
- Automatic lookups powered by LRCLIB and NetEase with fuzzy matching.
- Manual search dialog in Settings to query alternate song titles or artists.
- Timing offset adjustments (-3.0s to +3.0s in 0.2s increments) for Bluetooth audio synchronization.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Shift + L` | Toggle Click-Through Lock Mode |
| `M` (or double-click) | Cycle layout mode |
| `F` | Toggle Fullscreen Immersive Mode |
| `P` | Toggle Always on Top |
| `R` | Toggle window resizing mode |
| `Esc` | Close Settings window / Exit Immersive Mode |

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
