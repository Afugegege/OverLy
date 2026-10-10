# overLy ✨
> **Modern Minimalist Floating Overlay Lyrics for Windows**  
> Supports **Spotify**, **Apple Music**, **YouTube Music**, **Tidal**, **Chrome/Edge**, and any media player on Windows. Designed with an Instagram-aesthetic frosted glass interface.

---

## 🌟 Highlights

- **Universal Windows Player Support**: Automatically detects whatever is playing across Spotify, Apple Music, YouTube Music, Deezer, Tidal, Foobar2000, Chrome, Edge, and more using native Windows System Media Transport Controls (SMTC).
- **Synced Karaoke-Style Lyrics**: Live real-time synced lyrics powered by LRCLIB with millisecond accuracy, smooth spring auto-scrolling, and active lyric glow.
- **Instagram / Modern Minimalist Aesthetic**:
  - Ultra-smooth frosted glassmorphism (`backdrop-filter: blur(28px)`).
  - Dynamic ambient color aura that automatically adapts to current album artwork.
  - Minimalist typography with active lyric illumination and soft dimming of surrounding lines.
- **Multiple Layout Modes**:
  - 💊 **Dynamic Island / Minimalist Pill Mode**: A sleek compact capsule (64px) with rotating vinyl art, active lyric text, and hover media controls. Perfect for gaming, coding, or watching videos.
  - 🎴 **Story / Card Mode**: Instagram-card layout with high-res album art, progress bar, multi-line scrolling lyrics, and controls.
  - 📜 **Expanded Lyric Canvas**: Taller view for singing along and reading complete verses.
- **Ghost Mode (Click-Through)**:
  - Toggle with **`Ctrl + Shift + L`** or the lock button.
  - When locked, clicks pass straight through to games or apps beneath the overlay!
- **Aesthetic Themes**:
  - 🌌 **Glass Dark**: Sleek obsidian frosted glass with pure white typography.
  - 🤍 **Pearl Light**: Clean Scandinavian/Ins minimalist white frosted glass.
  - 🌅 **Ins Sunset**: Warm sunset gradient aura (rose, fuchsia, amber).
  - 🖤 **OLED Pitch**: Deep ink-black with sharp neon highlights.
  - 🎨 **Album Aura**: Dynamically adapts colors from the playing song's album art.
- **Audio Sync Offset**:
  - Slider from `-3.0s` to `+3.0s` to compensate for Bluetooth headphone latency.
- **System Tray Controls**:
  - Background tray icon with quick actions: Lock/Unlock, Show/Hide, Play/Pause, Next/Prev, Pin on Top, Quit.

---

## 🚀 Getting Started & Download

### 📥 Download Beta Release (.zip / Installer)
Download the latest portable zip or installer from the [Releases](https://github.com/Afugegege/OverLy/releases) page.

> [!IMPORTANT]
> **Notice for Beta Testers**: Since this is an early beta build without an enterprise Microsoft certificate, click **"More info" → "Run anyway"** when launching for the first time.

### 🛠️ Run from Source
- Windows 10 (1809+) or Windows 11
- [Node.js](https://nodejs.org/) (v18+)

```bash
# Clone the repository
git clone https://github.com/Afugegege/OverLy.git
cd OverLy

# Install dependencies
npm install

# Start the application
npm start
```

---

## ⌨️ Shortcuts & Controls

| Action | Shortcut / Gesture |
| :--- | :--- |
| **Toggle Ghost Mode (Click-Through)** | `Ctrl + Shift + L` |
| **Switch Layout Mode** | Click the layout button in the header (or double-click the Pill) |
| **Drag Window** | Drag anywhere on the header or top bar |
| **Tray Menu** | Right-click the overLy music icon in the Windows taskbar tray |
| **Adjust Lyric Delay** | Open Settings (gear icon) ➔ Lyrics Sync Offset |

---

## 📂 Project Architecture

```
overLy/
├── package.json          # Project configuration & Electron dependencies
├── main.js               # Electron main process, window creation, tray, global shortcuts
├── preload.js            # Secure context bridge between Electron and renderer
├── smtc-service.js       # Node.js service managing the SMTC PowerShell daemon
├── smtc_daemon.ps1       # Native Windows Media Transport Controls listener
├── lyrics-service.js     # LRCLIB synced lyrics API & Deezer/iTunes artwork fetcher
├── renderer/
│   ├── index.html        # Frameless, modern HTML structure
│   ├── style.css         # Instagram aesthetic, glassmorphism, animations & themes
│   └── app.js            # 60fps lyric interpolation, UI bindings, settings persistence
└── assets/
    └── icon.png          # High-resolution application and tray icon
```

---

## 📄 License
MIT License. Created for music lovers who appreciate clean, aesthetic desktop software.
