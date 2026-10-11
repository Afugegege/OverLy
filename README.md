# overLy

<p align="center">
  <strong>A modern, minimalist, and deeply customizable Windows desktop overlay for real-time synced lyrics and media control.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D4?logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/Electron-44.7.0-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
  <img src="https://img.shields.io/badge/Zero%20Config-SMTC%20Native-blueviolet" alt="Zero Config" />
</p>

---

## Overview

**overLy** is a lightweight, translucent floating HUD that hooks directly into the **Windows System Media Transport Controls (SMTC)**. It automatically tracks playback, fetches time-synced lyrics with verified high-resolution album artwork, and themes itself dynamically based on whatever you are listening to.

Works out of the box with **Spotify, Apple Music, YouTube Music, Tidal, Chrome, Edge, Brave, VLC**, and any other desktop or browser media player -- **no API keys, accounts, or browser extensions required.**

---

## Feature Showcase

### 1. Zero-Configuration Windows Media Sync (SMTC)
- **Native WinRT Daemon**: Communicates with the Windows SMTC subsystem (`smtc_daemon.ps1`) to track media playback status, timeline progress, track titles, artists, and playback positions at 60 FPS.
- **Multi-Player Support**: Automatically tracks active sessions from Spotify (Desktop and Web), Apple Music, Tidal, YouTube Music, Chrome, Edge, Brave, Firefox, and VLC.
- **Smart Session Priority**: Immediately latches onto actively playing sessions; handles track transitions, pauses, and player switching seamlessly with pause-retention grace periods.
- **Hardware Media Key Integration**: Control playback (Play/Pause, Next Track, Previous Track, Seek) directly from overLy, with automatic fallback to Windows media keys.

### 2. Multi-Source Synced Lyrics Engine
- **Aggregated Lookups**: Queries **LRCLIB**, **Kugou**, and **QQ Music / NetEase** concurrently to guarantee maximum lyric coverage worldwide.
- **CJK and Multi-Lingual Normalization**: Full Unicode tokenization supporting Simplified and Traditional Chinese, Japanese Kanji/Kana, and Korean Hangul.
- **Strict Title Scoring**: Validates track titles and artists before matching to prevent wrong song mismatches (e.g. tracks with identical album names or from the same artist).
- **Interactive Lyric Seeking**: Click any lyric line to jump directly to that exact moment in the song.
- **Top-Scroll on Track Change**: Lyrics immediately reset and scroll to line 1 the second a new song starts, rather than waiting for vocal synchronization.
- **Instrumental and No-Lyrics Fallback**: Automatically switches to an audio visualizer when an instrumental track or track without lyrics is detected.

### 3. Verified High-Resolution Album Artwork
- **Intelligent Art Search**: Retrieves authentic high-res album covers (up to 1000x1000) via iTunes (including regional stores: TW, HK, JP, US) and Deezer.
- **Verification Guarantee**: Top 5 candidate results are title-checked so album art always matches the exact track playing.
- **Local SMTC Fallback**: If offline or searching, smoothly falls back to the native media player's embedded thumbnail stream.

### 4. Dynamic Album Art Theming and Ambient Auras
- **Auto Theme**: Analyzes the cover art's luminance to switch between sleek dark and radiant light glassmorphism styles with high contrast for crisp readability.
- **Auto Accent Color**: Extracts the dominant vibrant color from the album artwork and themes lyric highlights, visualizer bars, progress scrubbers, buttons, and glow effects.
- **Ambient Aura Glow**: Softly diffuses blurred album colors behind the overlay for a modern aesthetic.
- **Live Theme Sync**: Standalone Settings window updates its preview chips, glowing accents, and sliders live as tracks change.

### 5. Five Versatile Layout Modes (Press M or Double-Click)
Switch between layouts to fit your workspace:

| Layout | Description |
| :--- | :--- |
| **Normal Card** | Full-featured card featuring album art, title, artist, media controls, seeking progress bar, and synced scrolling lyrics. |
| **Collapsed Pill** | Minimalist rounded capsule featuring an innovative perimeter SVG border progress bar, hover controls, and drawer. |
| **Only Lyrics** | Pure floating typography HUD displaying only the active lyric line for minimal distraction while gaming or working. |
| **Expanded Lyrics** | Tall vertical card displaying upcoming and preceding lyric lines for an Apple Music-style lyric view. |
| **Minimized Bubble** | Compact circular orb with album artwork, breathing status pulse, click-to-play overlay, and floating hover drawer. |

### 6. Perimeter SVG Border Scrubber (Pill Mode)
- In Collapsed Pill mode, playback progress wraps around the entire pill's rounded perimeter using an interactive SVG gradient stroke.
- Hover anywhere on the border to preview elapsed and remaining time.
- Click or drag along the border to seek instantly in the track.

### 7. Immersive Fullscreen Theater Mode (Press F)
- **Cinematic Fullscreen Experience**: Dynamic, heavily blurred album backdrop with ambient lighting.
- **Two Layout Options**:
  - **Split View**: Large high-res artwork on the left + synced scrolling lyrics on the right.
  - **Centered View**: Centered lyric column.
- **Inactivity Auto-Hide**: Controls, progress bars, and cursor automatically fade away after 3 seconds of mouse inactivity.
- **Full Media Controls**: Timeline scrubber, play/pause, next/previous, and lyric retry.

### 8. Auto-Minimize and Smart Re-Expand
- Automatically minimizes to the compact disc orb when music is paused or idle.
- **Customizable Timer**: Instant, 1s, 5s, 10s, 30s, 1m, 2m, or 5m delays.
- **Expansion Triggers**:
  - **On Play**: Re-expands automatically when music resumes.
  - **On Hover**: Temporarily expands when you hover your cursor over the orb, and automatically re-minimizes if you move away while paused.

### 9. One-Click Refetch Button and Shortcut (F5)
- When a player lags or updates slowly, click the **Refetch** button to immediately re-poll Windows SMTC, purge cached entries, and fetch fresh lyrics and cover art.
- Available across all layouts:
  - Top Control Bar
  - Hover Media Controls
  - Pill Mode Drawer
  - Minimized Mode Hover Drawer
  - Keyboard Shortcut: **F5** or **Ctrl + Shift + R**

### 10. Click-Through Ghost Mode (Ctrl + Shift + L)
- Completely ignores mouse events so you can interact with games, IDEs, or browser windows beneath overLy without interruption.
- A subtle floating unlock banner appears outside the window to easily restore clickability with a single click.

### 11. Window Resizing and Pinning (R, P)
- **Always on Top (P)**: Pins overLy above all full-screen or windowed apps.
- **Interactive Resizing (R)**: Enables an aesthetic bottom-right resize grip. Drag to freely scale width and height; double-click the grip to reset to default layout dimensions.

### 12. Audio Visualizer for Instrumental Tracks
- When instrumental tracks play or no lyrics are available, overLy renders a real-time reactive audio visualizer.
- Four selectable visualizer styles in Settings:
  - **Spectrum** (Equalizer bars)
  - **Wave** (Smooth wave peaks)
  - **Pulse** (Rhythmic breathing bars)
  - **Minimal** (Subtle indicator)

### 13. Standalone Settings Window
- Accessible via the gear icon or tray icon:
  - **Theme**: System, Dark, Light, or Auto.
  - **Accent Color**: Auto (from album art) or Custom color palette (Purple, Blue, Emerald, Coral, Pink, Gold, Cyan).
  - **Opacity Slider**: Adjust transparency from 30% to 100%.
  - **Font Size Slider**: Customize lyric text size from 12px to 32px.
  - **Timing Offset**: Adjust synchronization from -3.0s to +3.0s in 0.2s increments (useful for Bluetooth latency).
  - **Manual Lyrics Search**: Search by custom track title and artist to manually bind lyrics.
  - **Auto-Minimize Settings**: Configure delay times and expand behavior.
  - **Launch on Windows Startup**: Toggle automatic startup on Windows boot.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`M`** *(or double-click)* | Cycle layout mode (*Card -> Pill -> Minimized -> Only Lyrics -> Expanded*) |
| **`F`** | Toggle Fullscreen Immersive Theater Mode |
| **`Ctrl + Shift + L`** | Toggle Click-Through Lock Mode (Ghost Mode) |
| **`F5`** / **`Ctrl + Shift + R`** | Refetch active track info, lyrics, and album artwork |
| **`P`** | Toggle Always on Top |
| **`R`** | Toggle Window Resizing Mode (double-click grip to reset) |
| **`Esc`** | Exit Immersive Mode / Close Settings Window |

---

## Installation

### Option 1: Pre-Built Release (Recommended)
Download the latest version from the **[Releases](https://github.com/Afugegege/OverLy/releases)** page:
- **`overLy Setup 1.0.1.exe`**: Modern Windows installer with Start Menu shortcuts and optional auto-launch.
- **`overLy-1.0.1-win.zip`**: Standalone portable version (extract anywhere and run `overLy.exe`).

> **Note on Windows SmartScreen**: Because overLy is an independent open-source project without a paid corporate certificate, Windows SmartScreen may show an initial warning. Click **"More info" -> "Run anyway"**.

---

### Option 2: Run from Source

#### Prerequisites
- **Windows 10** (build 1809+) or **Windows 11**
- **Node.js** (v18 or newer)
- **PowerShell 5.1+** (preinstalled on Windows)

```bash
# Clone the repository
git clone https://github.com/Afugegege/OverLy.git
cd OverLy

# Install dependencies
npm install

# Start overLy
npm start
```

#### Build Executable and Installer
```bash
npm run dist
```
Build outputs will be generated in the `dist/` directory.

---

## Tech Stack and Architecture

- **Runtime**: Electron 44, Node.js
- **Media Bridge**: Native PowerShell WinRT script (`smtc_daemon.ps1`) interfacing with Windows `GlobalSystemMediaTransportControlsSessionManager`
- **Frontend**: Vanilla HTML5, CSS3 Glassmorphism tokens, and JavaScript
- **Lyrics Providers**: LRCLIB API, Kugou API, QQ Music API, NetEase API
- **Cover Providers**: iTunes Search API (Multi-regional), Deezer API, and native SMTC stream

---

## License

This project is licensed under the [MIT License](LICENSE).
