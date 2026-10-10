# overLy

<div align="center">
  <br />
  <p><strong>A sleek, glassmorphic floating desktop overlay for Windows that delivers real-time synced lyrics, dynamic album artwork theming, and an interactive perimeter border scrubber.</strong></p>
  <p>Works out of the box with <strong>Spotify</strong>, <strong>Apple Music</strong>, <strong>YouTube Music</strong>, <strong>Tidal</strong>, <strong>Chrome</strong>, <strong>Edge</strong>, <strong>Brave</strong>, and any player integrated with Windows System Media Transport Controls (SMTC).</p>
</div>

---

## ✨ Standout Features & Design Innovations

### 🎨 Dynamic Album Cover Follow Theme
- **Artwork-Driven Atmosphere**: In Auto Accent mode, overLy automatically extracts the primary and harmonic secondary colors from whatever album art is currently playing.
- **Comprehensive Theming**: It styles the entire experience—ambient frosted-glass background tint, glowing outer aura, active lyric highlights, waveform bars, buttons, and progress scrubbers.
- **Live Real-Time Sync**: When a track changes while the Settings window is open, the Settings palette, background ambient glow, and theme tokens update in real time.
- **Graceful Neutral Transitions**: Displays a refined, subtle monochrome palette (slate grey / cool white) while artwork is loading or when no cover art is available.

### ⭕ Playing Progress Bar as an Outer Pill Border
- **Perimeter Scrubber**: In the Collapsed Pill mode, the progress indicator isn't just a horizontal line—it wraps as a glowing SVG border around the entire capsule.
- **Interactive Seeking**: Hover over the border to view elapsed time and duration; click or drag anywhere along the perimeter to seek through the track with zero latency.

### 🪄 Auto-Hiding Controls & Toolbars ("Invisible Tools")
- **Zero-Clutter Aesthetics**: Window titlebars, close buttons, pin toggles, and playback controls automatically dissolve into the glass when your cursor is idle.
- **Instant Hover Awakening**: Move your mouse over the overlay to reveal playback buttons, layout cyclers, settings shortcuts, and dragging handles.

### 📐 5 Adaptive Window Layout Views
Double-click the overlay or press <kbd>M</kbd> to cycle smoothly:
1. **Collapsed Pill**: Minimal capsule with the glowing perimeter border scrubber and hover playback controls.
2. **Normal Card**: Full glass card with high-res album artwork, track & artist metadata, audio waveforms, scrubber, and scrolling synced lyrics.
3. **Only Lyrics**: Clean HUD overlay displaying only the flowing lyrics lines without player chrome.
4. **Expanded Lyrics**: Extended vertical sheet displaying multiple lines of synchronized lyrics for karaoke or deep listening.
5. **Minimized Bubble**: Discreet floating circular orb with cover art and ambient glow when you want minimal distraction.

> **Rock-Solid Anchored Transitions**: Switching frequently between layout modes maintains a fixed geometric screen anchor—no position drift, jumping, or wandering across your monitor.

### 👻 Click-Through Ghost Mode (`Ctrl + Shift + L`)
- Completely ignores all mouse events, passing clicks directly through to full-screen games, code editors, or browser tabs underneath.
- Press `Ctrl + Shift + L` at any time to lock or unlock with an on-screen toast reminder.

### 🎛️ Custom Color Studio & Instant Recall Swatch
- **One-Click Instant Recall**: Click the custom color swatch to instantly re-apply your last customized accent color without having to rebuild it each time.
- **Custom Color Drawer**: Expand the dedicated editor for continuous **Hue Spectrum** slider, **Tone & Lightness** slider, direct **Hex Code** input, and screen **Eyedropper Pipette** to sample any pixel from your display.
- **Curated Presets**: Quick-select vibrant curated tones like Sunset Coral, Instagram Magenta, Cyber Cyan, and Emerald Mint.

### ⏱️ Smart Auto-Minimize on Pause
- Automatically transitions into the compact pill or minimized orb when playback is paused for a configurable period (5s to 5m).
- Automatically restores your full preferred layout the moment playback resumes.

### 🔍 Manual Lyrics Search & Timing Sync Offset
- **Dual-Engine Search**: Powered by LRCLIB and NetEase Cloud Music with automated fuzzy matching.
- **Millisecond Timing Offset**: Fine-tune lyric synchronization from `-3.0s` to `+3.0s` using step buttons or slider to eliminate Bluetooth latency or alternate track master discrepancies.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> | Toggle Click-Through Ghost / Lock Mode |
| <kbd>M</kbd> *(or Double-Click)* | Cycle through the 5 Layout Views |
| <kbd>P</kbd> | Toggle Always on Top Pin |
| <kbd>R</kbd> | Toggle Interactive Window Resizing Mode |
| <kbd>Esc</kbd> | Close Settings Window |

---

## 📥 Download & Installation

### Option 1: Pre-Built Windows Installer or Portable (Recommended)
Grab the latest release from the [Releases](https://github.com/Afugegege/OverLy/releases) tab:
- **`overLy Setup.exe`**: Standard Windows installer (auto-updates, start menu entry, startup option).
- **`overLy-win.zip`**: Standalone portable build (unzip and run anywhere).

> **Windows SmartScreen Note**: Because overLy is an independent open-source project without an enterprise code-signing certificate, Windows SmartScreen may show an alert on first launch. Click **"More info" → "Run anyway"**.

---

### Option 2: Run from Source

#### Prerequisites
- Windows 10 (Build 1809+) or Windows 11
- [Node.js](https://nodejs.org/) (v18 or higher)
- Git

```bash
# Clone the repository
git clone https://github.com/Afugegege/OverLy.git
cd OverLy

# Install dependencies
npm install

# Run the application in development mode
npm start
```

To build a standalone production release:
```bash
npm run dist
```

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Electron (Context Isolation, Secure IPC, Preload Bridge)
- **Media Integration**: Windows Media Transports via `@nodert-win10-au/windows.media.control`
- **UI / Rendering**: Pure Vanilla HTML5, Modern CSS (Glassmorphism, CSS Custom Properties, backdrop-filter), and JavaScript
- **Lyrics Providers**: LRCLIB & NetEase Cloud Music APIs

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
