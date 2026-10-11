// ==========================================================================
// overLy - Renderer Application Logic (Minimalist / Ins Aesthetic)
// ==========================================================================

const state = {
  hasMedia: false,
  title: '',
  artist: '',
  album: '',
  duration: 0,
  position: 0,
  lastPositionTime: Date.now(),
  status: 'Stopped', // 'Playing' | 'Paused' | 'Stopped'
  coverUrl: '',
  lyrics: [],
  hasSynced: false,
  plainLyrics: '',
  
  // App preferences
  mode: 'card', // 'pill' | 'card' | 'expanded'
  lastNonCardMode: 'collapsed',
  theme: 'system', // 'system' | 'dark' | 'light'
  effectiveTheme: (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark',
  accentColor: 'auto',
  adaptAlbumColor: true,
  opacity: 0.85,
  fontSize: 18,
  offset: 0.0,
  isLocked: false,
  isPinned: true,
  isResizeMode: false,
  autoMinimize: false,
  autoMinimizeDelay: 10,
  autoMinimizeExpand: 'play', // 'play' | 'hover'
  autoMinimizeRehide: true, // re-minimize when cursor leaves after a hover expansion without playback
  hoverExpandedWhilePaused: false,
  isAutoMinimized: false,
  preAutoMinMode: null,
  visualizerStyle: 'spectrum', // 'spectrum' | 'wave' | 'pulse' | 'minimal'

  activeLyricIndex: -1,
  isFetchingLyrics: false,

  // OverLy — Immersive Mode state
  isImmersive: false,
  preImmersiveMode: 'card',
  immersiveLayout: 'split' // 'split' | 'centered'
};

// DOM Elements
const body = document.body;
const ambientAura = document.getElementById('ambientAura');
const overlayContainer = document.getElementById('overlayContainer');

// Header & Controls
const brandPill = document.getElementById('brandPill');
const headerDragZone = document.getElementById('headerDragZone');
const btnModeToggle = document.getElementById('btnModeToggle');
const btnLockToggle = document.getElementById('btnLockToggle');
const btnPinToggle = document.getElementById('btnPinToggle');
const btnResizeToggle = document.getElementById('btnResizeToggle');
const btnImmersiveToggle = document.getElementById('btnImmersiveToggle');
const btnPillPin = document.getElementById('btnPillPin');
const btnPillResize = document.getElementById('btnPillResize');
const btnPillImmersive = document.getElementById('btnPillImmersive');
const pillMoreContainer = document.getElementById('pillMoreContainer');
const btnPillMore = document.getElementById('btnPillMore');
const pillMoreActions = document.getElementById('pillMoreActions');
const btnPillLock = document.getElementById('btnPillLock');
const btnPillSettings = document.getElementById('btnPillSettings');
const btnPillMinimize = document.getElementById('btnPillMinimize');
const btnPillClose = document.getElementById('btnPillClose');
const btnSettingsToggle = document.getElementById('btnSettingsToggle');
const btnMinimize = document.getElementById('btnMinimize');
const btnClose = document.getElementById('btnClose');
const lockToast = document.getElementById('lockToast');

// Minimized View Floating More Menu Drawer
const miniMoreContainer = document.getElementById('miniMoreContainer');
const miniMoreActions = document.getElementById('miniMoreActions');
const btnMiniExpand = document.getElementById('btnMiniExpand');
const btnMiniPin = document.getElementById('btnMiniPin');
const btnMiniSettings = document.getElementById('btnMiniSettings');
const btnMiniClose = document.getElementById('btnMiniClose');

// Track Metadata
const albumArt = document.getElementById('albumArt');
const albumPlaceholder = document.getElementById('albumPlaceholder');
const playingIndicator = document.getElementById('playingIndicator');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');

// Media Playback
const btnPrev = document.getElementById('btnPrev');
const btnPlayPause = document.getElementById('btnPlayPause');
const btnNext = document.getElementById('btnNext');
const btnPillExpand = document.getElementById('btnPillExpand');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');

// Lyrics & Timeline
const pillLyricContainer = document.getElementById('pillLyricContainer');
const pillLyricText = document.getElementById('pillLyricText');
const minimizedPlayOverlay = document.getElementById('minimizedPlayOverlay');
const btnMinimizedPlay = document.getElementById('btnMinimizedPlay');
const iconMiniPlay = document.getElementById('iconMiniPlay');
const iconMiniPause = document.getElementById('iconMiniPause');
const pillLyricsBadge = document.getElementById('pillLyricsBadge');
const pillSearchingIndicator = document.getElementById('pillSearchingIndicator');
const btnPillRetry = document.getElementById('btnPillRetry');
const btnPillSearch = document.getElementById('btnPillSearch');
const btnPillVisRetry = document.getElementById('btnPillVisRetry');
const lyricsScrollArea = document.getElementById('lyricsScrollArea');
const lyricsList = document.getElementById('lyricsList');
const timeCurrent = document.getElementById('timeCurrent');
const timeDuration = document.getElementById('timeDuration');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');

// Immersive Fullscreen Mode DOM Elements
const immersiveView = document.getElementById('immersiveView');
const immersiveBg = document.getElementById('immersiveBg');
const immersiveBgArt = document.getElementById('immersiveBgArt');
const immersiveTopBar = document.getElementById('immersiveTopBar');
const btnImmersiveLayoutToggle = document.getElementById('btnImmersiveLayoutToggle');
const immersiveLayoutLabel = document.getElementById('immersiveLayoutLabel');
const btnImmersiveExit = document.getElementById('btnImmersiveExit');
const immersiveStage = document.getElementById('immersiveStage');
const immersiveLeft = document.getElementById('immersiveLeft');
const immersiveArt = document.getElementById('immersiveArt');
const immersiveArtPlaceholder = document.getElementById('immersiveArtPlaceholder');
const immersiveTitle = document.getElementById('immersiveTitle');
const immersiveArtist = document.getElementById('immersiveArtist');
const immersiveTimelineWrap = document.querySelector('.immersive-timeline-wrap');
const immersiveTimeCurrent = document.getElementById('immersiveTimeCurrent');
const immersiveTimeDuration = document.getElementById('immersiveTimeDuration');
const immersiveProgressBar = document.getElementById('immersiveProgressBar');
const immersiveProgressFill = document.getElementById('immersiveProgressFill');
const immersiveProgressThumb = document.getElementById('immersiveProgressThumb');
const immersiveControls = document.querySelector('.immersive-controls');
const btnImmersivePrev = document.getElementById('btnImmersivePrev');
const btnImmersivePlayPause = document.getElementById('btnImmersivePlayPause');
const iconImmersivePlay = document.getElementById('iconImmersivePlay');
const iconImmersivePause = document.getElementById('iconImmersivePause');
const btnImmersiveNext = document.getElementById('btnImmersiveNext');
const immersiveRight = document.getElementById('immersiveRight');
const immersiveLyricsViewport = document.getElementById('immersiveLyricsViewport');
const immersiveLyricsList = document.getElementById('immersiveLyricsList');
const immersiveInstrumentalStage = document.getElementById('immersiveInstrumentalStage');
const immersiveVisBarsStage = document.getElementById('immersiveVisBarsStage');
const immersiveInstTag = document.getElementById('immersiveInstTag');
const btnImmersiveRetry = document.getElementById('btnImmersiveRetry');

// Collapsed View Rounded Border Progress Bar Elements
const pillBorderSvg = document.getElementById('pillBorderSvg');
const pillBorderTrack = document.getElementById('pillBorderTrack');
const pillBorderRect = document.getElementById('pillBorderRect');

// Dragging & seeking state
let isDraggingProgress = false;
let lastSeekTime = 0;
let pendingLyricSeekTimer = null;
let dragJustEndedTime = 0;

// Optimistic play/pause state & debounce
let optimisticStatus = null;
let optimisticStatusTime = 0;
const OPTIMISTIC_STATUS_TIMEOUT = 1200;

// Auto-minimize idle state & timer
let autoMinimizeTimer = null;
let isMouseOverOverlay = false;
let isAutoMinimizeTransitioning = false;
let lastAutoMinimizeActionTime = 0;

function getAutoMinimizeDelaySeconds() {
  const n = Number(state.autoMinimizeDelay);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

function startAutoMinimizeTimer() {
  cancelAutoMinimizeTimer();
  if (!state.autoMinimize) return;
  if (state.mode === 'minimized' || state.isAutoMinimized) return;
  if (isMouseOverOverlay && !state.isImmersive) return;
  const isPlaying = (state.hasMedia && state.status === 'Playing');
  if (isPlaying) return;

  // Window was expanded by hovering while still paused:
  if (state.hoverExpandedWhilePaused) {
    if (!state.autoMinimizeRehide) return;
    const delaySec = getAutoMinimizeDelaySeconds();
    // In immersive mode, give a comfortable idle delay (e.g. 1.2s to 1.5s), else 400ms buffer
    const delayMs = state.isImmersive
      ? (delaySec === 0 ? 1200 : Math.max(1000, Math.min(delaySec, 2) * 1000))
      : (delaySec === 0 ? 400 : Math.max(500, Math.min(delaySec, 1) * 1000));
    autoMinimizeTimer = setTimeout(() => {
      triggerAutoMinimize();
    }, delayMs);
    return;
  }

  const delaySec = getAutoMinimizeDelaySeconds();
  // Safe hysteresis buffer: even for 0s (instant), wait buffer so mouse leaving boundary doesn't stutter
  // In immersive mode, if 0s, wait 1500ms idle so cursor/UI idle can happen smoothly before minimize
  const delayMs = state.isImmersive
    ? (delaySec === 0 ? 1500 : Math.max(1000, delaySec * 1000))
    : (delaySec === 0 ? 400 : Math.max(500, delaySec * 1000));
  autoMinimizeTimer = setTimeout(() => {
    triggerAutoMinimize();
  }, delayMs);
}

function cancelAutoMinimizeTimer() {
  if (autoMinimizeTimer) {
    clearTimeout(autoMinimizeTimer);
    autoMinimizeTimer = null;
  }
}

function applyAutoMinimizeExpandUI() {
  const isHoverExpand = Boolean(state.isAutoMinimized && state.mode === 'minimized' && state.autoMinimizeExpand === 'hover');
  body.classList.toggle('hover-expand-minimized', isHoverExpand);
}

function triggerAutoMinimize() {
  cancelAutoMinimizeTimer();
  if (!state.autoMinimize) return;
  if (state.mode === 'minimized' || state.isAutoMinimized) return;
  if (isMouseOverOverlay && !state.isImmersive) return;
  const isPlaying = (state.hasMedia && state.status === 'Playing');
  if (isPlaying) return;

  const now = Date.now();
  if (now - lastAutoMinimizeActionTime < 500) return; // Prevent transition thrashing
  lastAutoMinimizeActionTime = now;
  isAutoMinimizeTransitioning = true;
  setTimeout(() => { isAutoMinimizeTransitioning = false; }, 450);

  if (state.isImmersive) {
    state.preAutoMinMode = 'immersive';
    state.isAutoMinimized = true;
    exitImmersiveMode(true, false);
    setMode('minimized', true, true);
    applyAutoMinimizeExpandUI();
    return;
  }

  state.preAutoMinMode = state.mode;
  state.isAutoMinimized = true;
  setMode('minimized', true, true);
  applyAutoMinimizeExpandUI();
}

function restoreFromAutoMinimize(viaHover = false) {
  cancelAutoMinimizeTimer();
  if (!state.isAutoMinimized) return;

  const now = Date.now();
  if (now - lastAutoMinimizeActionTime < 500) return; // Prevent transition thrashing
  lastAutoMinimizeActionTime = now;
  isAutoMinimizeTransitioning = true;
  setTimeout(() => { isAutoMinimizeTransitioning = false; }, 450);

  const targetMode = state.preAutoMinMode || 'card';
  const isPlaying = (state.hasMedia && state.status === 'Playing');
  state.hoverExpandedWhilePaused = Boolean(viaHover && !isPlaying);
  state.isAutoMinimized = false;
  state.preAutoMinMode = null;
  applyAutoMinimizeExpandUI();

  if (targetMode === 'immersive') {
    enterImmersiveMode(true);
    return;
  }

  setMode(targetMode, true, true);
}

// Corner Resize Handle
const resizeHandle = document.getElementById('resizeHandle');

// ==========================================================================
// Initialization & Settings
// ==========================================================================

async function init() {
  // Start in dull monochrome unfetched state until media metadata is received
  document.body.classList.add('is-unfetched');

  // Always register UI event listeners (close, minimize, controls, dragging) first
  try {
    setupEventListeners();
  } catch (err) {
    console.error('Error setting up event listeners:', err);
  }

  // Start playback animation loop
  requestAnimationFrame(playbackLoop);

  try {
    if (window.overlyAPI) {
      // Always ensure window starts in interactive mode accepting clicks
      window.overlyAPI.setClickThrough?.(false);

      const saved = await window.overlyAPI.getSettings?.();
      if (saved) {
        if (saved.extractedAccentColor) {
          state.lastExtractedPrimary = saved.extractedAccentColor;
        }
        if (typeof saved.adaptAlbumColor === 'boolean') {
          state.adaptAlbumColor = saved.adaptAlbumColor;
        }
        if (saved.theme) applyTheme(saved.theme);
        if (saved.mode) setMode(saved.mode, false);
        else setMode(state.mode, false);
        if (saved.accentColor) setAccentColor(saved.accentColor);
        else setAccentColor(state.accentColor);
        if (typeof saved.opacity === 'number') setOpacity(saved.opacity);
        else setOpacity(state.opacity);
        if (saved.fontSize) setFontSize(saved.fontSize);
        if (typeof saved.offset === 'number') setOffset(saved.offset);
        if (typeof saved.alwaysOnTop === 'boolean') {
          setPinState(saved.alwaysOnTop);
        }
        if (typeof saved.autoMinimize === 'boolean') {
          state.autoMinimize = saved.autoMinimize;
        }
        if (typeof saved.autoMinimizeDelay === 'number') {
          state.autoMinimizeDelay = saved.autoMinimizeDelay;
        }
        if (saved.autoMinimizeExpand) {
          state.autoMinimizeExpand = saved.autoMinimizeExpand === 'hover' ? 'hover' : 'play';
        }
        if (typeof saved.autoMinimizeRehide === 'boolean') {
          state.autoMinimizeRehide = saved.autoMinimizeRehide;
        }
        if (saved.visualizerStyle) {
          state.visualizerStyle = saved.visualizerStyle;
        }
      } else {
        setMode(state.mode, false);
        setAccentColor(state.accentColor);
        setOpacity(state.opacity);
        setPinState(state.isPinned);
      }

      applyAutoMinimizeExpandUI();

      if (window.overlyAPI.getTheme) {
        const themeData = await window.overlyAPI.getTheme();
        if (themeData) applyTheme(themeData);
      }
      if (window.overlyAPI.onThemeChanged) {
        window.overlyAPI.onThemeChanged((themeData) => {
          applyTheme(themeData);
        });
      }

      // Subscribe to SMTC media updates
      window.overlyAPI.onMediaUpdate?.((data) => {
        handleMediaUpdate(data);
      });

      // Subscribe to Lock toggle (e.g. from global shortcut Ctrl+Shift+L)
      window.overlyAPI.onLockToggle?.((locked) => {
        setLockState(locked);
      });

      // Subscribe to live settings updates from separate Settings window
      window.overlyAPI.onSettingUpdated?.(({ key, value }) => {
        if (key === 'previewLayoutMode') {
          if (!state.committedMode) state.committedMode = state.mode;
          setMode(value, true, true);
        }
        if (key === 'restoreLayoutMode') {
          if (state.committedMode && state.mode !== state.committedMode) {
            setMode(state.committedMode, true, true);
          }
        }
        if (key === 'mode') {
          state.committedMode = value;
          setMode(value, true, false);
        }
        if (key === 'extractedAccentColor') {
          if (value) {
            state.lastExtractedPrimary = value;
            if (state.accentColor === 'auto') {
              applyAccentTokens(value);
            }
            applyTheme(state.theme);
          }
        }
        if (key === 'theme') applyTheme(value);
        if (key === 'accentColor') setAccentColor(value);
        if (key === 'opacity') setOpacity(value);
        if (key === 'fontSize') setFontSize(value);
        if (key === 'offset') setOffset(value);
        if (key === 'alwaysOnTop') {
          setPinState(value);
        }
        if (key === 'autoMinimize') {
          state.autoMinimize = Boolean(value);
          if (!state.autoMinimize) {
            cancelAutoMinimizeTimer();
            if (state.isAutoMinimized) {
              restoreFromAutoMinimize();
            }
          } else {
            const isPlaying = (state.hasMedia && state.status === 'Playing');
            if (!isPlaying && !isMouseOverOverlay && state.mode !== 'minimized') {
              startAutoMinimizeTimer();
            }
          }
        }
        if (key === 'autoMinimizeDelay') {
          const n = Number(value);
          state.autoMinimizeDelay = Number.isFinite(n) && n >= 0 ? n : 10;
          if (state.autoMinimize && !state.isAutoMinimized) {
            startAutoMinimizeTimer();
          }
        }
        if (key === 'autoMinimizeRehide') {
          state.autoMinimizeRehide = Boolean(value);
        }
        if (key === 'autoMinimizeExpand') {
          state.autoMinimizeExpand = value === 'hover' ? 'hover' : 'play';
          applyAutoMinimizeExpandUI();
        }
        if (key === 'adaptAlbumColor') {
          state.adaptAlbumColor = Boolean(value);
          applyTheme(state.theme);
        }
        if (key === 'visualizerStyle') {
          state.visualizerStyle = value || 'spectrum';
          updateInstrumentalVisualizerStyle();
        }
      });

      // Subscribe to hover layout mode preview and restore
      window.overlyAPI.onPreviewLayoutMode?.((mode) => {
        if (!state.committedMode) {
          state.committedMode = state.mode;
        }
        setMode(mode, true, true);
      });

      window.overlyAPI.onRestoreLayoutMode?.(() => {
        if (state.committedMode && state.mode !== state.committedMode) {
          setMode(state.committedMode, true, true);
        }
      });

      // Subscribe to manually applied lyrics from Settings window search
      window.overlyAPI.onManualLyricsApplied?.((trackData) => {
        if (trackData) {
          state.coverUrl = trackData.coverUrl || state.coverUrl;
          state.lyrics = trackData.lyrics || [];
          state.hasSynced = trackData.hasSynced || false;
          state.plainLyrics = trackData.plainLyrics || '';
          state.activeLyricIndex = -1;
          state.isFetchingLyrics = false;
          document.body.classList.remove('pill-art-hovered');
          overlayContainer?.classList.remove('pill-more-open');
          pillMoreContainer?.classList.remove('open');
          updatePillLyricsBadge();
          renderTrackInfo();
          renderLyricsList();
          updatePillInstrumentalView();
          realignLyricsToCurrentPosition(true);
        }
      });

      // If auto-minimize is active and player is paused or idle at startup, arm the timer
      if (state.autoMinimize && (!isMouseOverOverlay || state.isImmersive) && state.mode !== 'minimized' && (!state.hasMedia || state.status !== 'Playing')) {
        startAutoMinimizeTimer();
      }
    }
  } catch (err) {
    console.error('App init error:', err);
  }
}

function persistSettings() {
  if (window.overlyAPI?.saveSettings) {
    window.overlyAPI.saveSettings({
      mode: state.isAutoMinimized ? (state.preAutoMinMode || 'card') : state.mode,
      theme: state.theme,
      accentColor: state.accentColor,
      opacity: state.opacity,
      fontSize: state.fontSize,
      offset: state.offset,
      alwaysOnTop: state.isPinned,
      autoMinimize: state.autoMinimize,
      autoMinimizeDelay: state.autoMinimizeDelay,
      autoMinimizeExpand: state.autoMinimizeExpand,
      autoMinimizeRehide: state.autoMinimizeRehide
    });
  }
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHex(r, g, b) {
  const toHex = x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getHighContrastVisualizerColor(baseHex, isLight) {
  if (!baseHex) return isLight ? '#4f46e5' : '#818cf8';
  const { h, s, l } = hexToHsl(baseHex);

  if (!isLight) {
    // Dark mode / Auto theme (dark background L ~ 0.08)
    // Guarantee radiant high luminance (L: 0.68 to 0.86) so bars never blend into dark backgrounds
    let targetL = l;
    if (l < 0.55) {
      targetL = 0.68 + (l * 0.22);
    } else if (l > 0.90) {
      targetL = 0.86;
    }
    const targetS = s < 0.15 ? 0.38 : Math.max(0.45, s);
    const targetH = s < 0.15 ? 0.58 : h;
    return hslToHex(targetH, targetS, targetL);
  } else {
    // Light mode (light background L ~ 0.95)
    // Guarantee high contrast deep luminance (L: 0.22 to 0.40)
    let targetL = l;
    if (l > 0.45) {
      targetL = 0.26 + ((1 - l) * 0.16);
    } else if (l < 0.15) {
      targetL = 0.22;
    }
    const targetS = Math.max(0.50, s);
    return hslToHex(h, targetS, targetL);
  }
}

function applyAlbumArtThemeTokens(hexColor, isLight = false, isAuto = (state.theme === 'auto')) {
  if (state.adaptAlbumColor === false) return;
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return;
  const rgb = hexToRgb(hexColor);
  const norm = (typeof state.opacity === 'number') ? state.opacity : 0.85;

  let bgHex, cardR, cardG, cardB;

  if (isAuto) {
    if (typeof state.coverIsDark === 'boolean') {
      isLight = !state.coverIsDark;
    } else if (typeof state.coverLuminance === 'number') {
      isLight = state.coverLuminance >= 0.50;
    } else {
      const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      isLight = lum >= 0.50;
    }
    document.body.classList.toggle('theme-light', isLight);
    document.body.classList.toggle('theme-dark', !isLight);
  }

  if (isLight) {
    // Light album art: clean soft base mixed with balanced (~20%) tint from the album art
    const maxC = Math.max(rgb.r, rgb.g, rgb.b);
    const scale = maxC > 0 && maxC < 170 ? 170 / maxC : 1;
    const lr = Math.min(255, Math.round(rgb.r * scale));
    const lg = Math.min(255, Math.round(rgb.g * scale));
    const lb = Math.min(255, Math.round(rgb.b * scale));

    const bgR = Math.max(215, Math.min(252, Math.round(250 * 0.80 + lr * 0.20)));
    const bgG = Math.max(218, Math.min(252, Math.round(251 * 0.80 + lg * 0.20)));
    const bgB = Math.max(222, Math.min(253, Math.round(253 * 0.80 + lb * 0.20)));
    bgHex = rgbToHex(bgR, bgG, bgB);

    cardR = Math.min(255, Math.round(bgR + 4));
    cardG = Math.min(255, Math.round(bgG + 4));
    cardB = Math.min(255, Math.round(bgB + 4));
  } else {
    // Dark album art: deep sleek dark base with slight (14%) tint from the album art
    const bgR = Math.max(10, Math.min(28, Math.round(13 * 0.86 + rgb.r * 0.14)));
    const bgG = Math.max(12, Math.min(30, Math.round(15 * 0.86 + rgb.g * 0.14)));
    const bgB = Math.max(16, Math.min(38, Math.round(22 * 0.86 + rgb.b * 0.14)));
    bgHex = rgbToHex(bgR, bgG, bgB);

    cardR = Math.min(48, Math.round(bgR + 12));
    cardG = Math.min(50, Math.round(bgG + 14));
    cardB = Math.min(58, Math.round(bgB + 18));
  }

  const bgRgb = hexToRgb(bgHex);
  const visColor = getHighContrastVisualizerColor(hexColor, isLight);
  const visRgb = hexToRgb(visColor);

  document.body.classList.add('theme-album-tinted');

  const setVar = (prop, val) => {
    document.documentElement.style.setProperty(prop, val);
    if (document.body) document.body.style.setProperty(prop, val);
    const container = document.getElementById('overlayContainer');
    if (container) container.style.setProperty(prop, val);
  };

  setVar('--bg-glass', `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${norm})`);
  setVar('--bg-glass-card', isLight ? `rgba(${cardR}, ${cardG}, ${cardB}, 0.65)` : `rgba(${cardR}, ${cardG}, ${cardB}, 0.50)`);
  setVar('--border-glass', isLight ? 'rgba(0, 0, 0, 0.09)' : 'rgba(255, 255, 255, 0.14)');
  setVar('--text-primary', isLight ? '#11131a' : '#ffffff');
  setVar('--text-secondary', isLight ? 'rgba(17, 19, 26, 0.82)' : 'rgba(255, 255, 255, 0.85)');
  setVar('--text-muted', isLight ? 'rgba(17, 19, 26, 0.55)' : 'rgba(255, 255, 255, 0.55)');
  setVar('--aura-color1', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isLight ? 0.22 : 0.28})`);
  setVar('--aura-color2', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isLight ? 0.10 : 0.14})`);

  setVar('--vis-bar-color', visColor);
  setVar('--vis-bar-glow', `rgba(${visRgb.r}, ${visRgb.g}, ${visRgb.b}, ${isLight ? 0.20 : 0.28})`);
  setVar('--vis-bar-highlight', isLight ? '#11131a' : '#ffffff');
  setVar('--vis-status-bg', isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)');
  setVar('--vis-btn-bg', isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)');
  setVar('--vis-btn-border', isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.22)');
}

function applyTheme(themeData) {
  const setting = typeof themeData === 'object' ? themeData.setting : themeData;
  state.theme = setting || 'system';

  let effectiveIsLight = false;

  if (setting === 'auto') {
    // Auto: Totally adapts to album artwork and luminance
    if (state.lastExtractedPrimary) {
      if (typeof state.coverIsDark === 'boolean') {
        effectiveIsLight = !state.coverIsDark;
      } else if (typeof state.coverLuminance === 'number') {
        effectiveIsLight = state.coverLuminance >= 0.50;
      } else {
        const rgb = hexToRgb(state.lastExtractedPrimary);
        const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        effectiveIsLight = lum >= 0.50;
      }
    } else {
      effectiveIsLight = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    }
    state.effectiveTheme = effectiveIsLight ? 'light' : 'dark';
    document.body.classList.add('theme-album-auto');
  } else if (setting === 'light') {
    // Light: Permanent light appearance, but still adapts to artwork
    effectiveIsLight = true;
    state.effectiveTheme = 'light';
    document.body.classList.remove('theme-album-auto');
  } else if (setting === 'dark') {
    // Dark: Permanent dark appearance, but still adapts to artwork
    effectiveIsLight = false;
    state.effectiveTheme = 'dark';
    document.body.classList.remove('theme-album-auto');
  } else {
    // System: Follows OS light/dark, adapting to artwork
    effectiveIsLight = (typeof themeData === 'object' && themeData.effective)
      ? themeData.effective === 'light'
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    state.effectiveTheme = effectiveIsLight ? 'light' : 'dark';
    document.body.classList.remove('theme-album-auto');
  }

  document.body.classList.toggle('theme-light', effectiveIsLight);
  document.body.classList.toggle('theme-dark', !effectiveIsLight);

  const isUnfetched = (!state.hasMedia || !state.title);
  document.body.classList.toggle('is-unfetched', isUnfetched);

  // In all modes (Auto, Dark, Light, System): if artwork is present AND media is fetched AND adaptAlbumColor is enabled, adapt to it!
  const shouldTintAlbum = (!isUnfetched && Boolean(state.lastExtractedPrimary) && state.adaptAlbumColor !== false);

  if (shouldTintAlbum) {
    document.body.classList.add('theme-album-tinted');
    applyAlbumArtThemeTokens(state.lastExtractedPrimary, effectiveIsLight, setting === 'auto');
    if (immersiveBgArt && state.coverUrl) {
      immersiveBgArt.style.display = '';
      immersiveBgArt.classList.add('visible');
    }
  } else {
    document.body.classList.remove('theme-album-tinted');
    // Reset standard tokens when unfetched or when adaptAlbumColor is turned off
    const removeVar = (prop) => {
      document.documentElement.style.removeProperty(prop);
      if (document.body) document.body.style.removeProperty(prop);
      const container = document.getElementById('overlayContainer');
      if (container) container.style.removeProperty(prop);
    };
    removeVar('--bg-glass');
    removeVar('--bg-glass-card');
    removeVar('--border-glass');
    removeVar('--text-primary');
    removeVar('--text-secondary');
    removeVar('--text-muted');
    removeVar('--aura-color1');
    removeVar('--aura-color2');
    removeVar('--vis-bar-color');
    removeVar('--vis-bar-glow');
    removeVar('--vis-bar-highlight');
    removeVar('--vis-status-bg');
    removeVar('--vis-btn-bg');
    removeVar('--vis-btn-border');

    const norm = (typeof state.opacity === 'number') ? state.opacity : 0.85;
    const defaultBg = effectiveIsLight
      ? `rgba(248, 250, 254, ${norm})`
      : `rgba(14, 16, 24, ${norm})`;
    const defaultCard = effectiveIsLight
      ? 'rgba(0, 0, 0, 0.05)'
      : 'rgba(255, 255, 255, 0.08)';
    const defaultBorder = effectiveIsLight
      ? 'rgba(0, 0, 0, 0.10)'
      : 'rgba(255, 255, 255, 0.12)';
    const defaultTextPrimary = effectiveIsLight ? '#12141a' : '#ffffff';
    const defaultTextSecondary = effectiveIsLight ? 'rgba(18, 20, 26, 0.70)' : 'rgba(255, 255, 255, 0.65)';
    const defaultTextMuted = effectiveIsLight ? 'rgba(18, 20, 26, 0.42)' : 'rgba(255, 255, 255, 0.35)';

    const setPureVar = (prop, val) => {
      document.documentElement.style.setProperty(prop, val);
      if (document.body) document.body.style.setProperty(prop, val);
      const container = document.getElementById('overlayContainer');
      if (container) container.style.setProperty(prop, val);
    };

    setPureVar('--bg-glass', defaultBg);
    setPureVar('--bg-glass-card', defaultCard);
    setPureVar('--border-glass', defaultBorder);
    setPureVar('--text-primary', defaultTextPrimary);
    setPureVar('--text-secondary', defaultTextSecondary);
    setPureVar('--text-muted', defaultTextMuted);
    setPureVar('--aura-color1', 'transparent');
    setPureVar('--aura-color2', 'transparent');
    document.documentElement.style.setProperty('--glass-opacity', norm);
    if (ambientAura) ambientAura.style.opacity = '0';

    if (immersiveBgArt) {
      immersiveBgArt.style.display = 'none';
      immersiveBgArt.classList.remove('visible');
    }
  }

  if (isUnfetched) {
    // Enforce dull neutral grey accent and disable ambient aura when unfetched
    applyAccentTokens(effectiveIsLight ? '#6b7280' : '#71717a');
    if (ambientAura) ambientAura.style.opacity = '0';
  } else {
    const activeAccent = (state.accentColor === 'auto' || setting === 'auto')
      ? (state.lastExtractedPrimary || getNeutralAccentColor())
      : (state.accentColor || getNeutralAccentColor());
    applyAccentTokens(activeAccent);
  }
}

// ==========================================================================
// Event Listeners
// ==========================================================================

function setupEventListeners() {
  // Shield all interactive buttons from mousedown so dragging never interferes
  const interactiveBtns = [
    btnModeToggle, btnLockToggle, btnPinToggle, btnResizeToggle, btnSettingsToggle,
    btnPillMore, btnPillPin, btnPillResize, btnPillLock, btnPillSettings, btnPillMinimize, btnPillClose,
    btnMiniExpand, btnMiniPin, btnMiniSettings, btnMiniClose,
    btnMinimize, btnClose, btnPlayPause, btnPrev, btnNext, btnPillExpand, btnPillRetry, btnPillSearch,
    btnMinimizedPlay, minimizedPlayOverlay,
    btnImmersiveToggle, btnPillImmersive, btnImmersiveExit, btnImmersiveLayoutToggle,
    btnImmersivePrev, btnImmersivePlayPause, btnImmersiveNext, btnImmersiveRetry, btnPillVisRetry
  ];
  interactiveBtns.forEach((btn) => {
    if (btn) {
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
    }
  });

  // Mode toggle & Layout cycling
  btnModeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleNextLayout();
  });

  // Double click anywhere on overlay to cycle through overall layout
  window.addEventListener('dblclick', (e) => {
    // If double clicking the minimized disc/ball, always cycle layout
    if (e.target.closest('#minimizedBall, #minimizedBallArt, .disc-groove, #minimizedPlayOverlay')) {
      e.stopPropagation();
      cycleNextLayout();
      return;
    }
    // Ignore interactive controls
    if (e.target.closest('button, input, select, textarea, #resizeHandle, .progress-bar-wrap, .pill-more-actions, .pill-more-menu')) {
      return;
    }
    cycleNextLayout();
  });

  // Lock (Click-Through) toggle
  btnLockToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLock();
  });
  if (lockToast) {
    lockToast.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLock();
    });
  }

  // Allow unlocking even when click-through is enabled by capturing hover over lock elements
  const unlockTargets = [btnLockToggle, btnPillLock, lockToast, document.querySelector('.top-bar')];
  unlockTargets.forEach((el) => {
    if (!el) return;
    el.addEventListener('mouseenter', () => {
      if (state.isLocked && window.overlyAPI?.setTempIgnoreMouseEvents) {
        window.overlyAPI.setTempIgnoreMouseEvents(false);
      }
    });
    el.addEventListener('mouseleave', () => {
      if (state.isLocked && window.overlyAPI?.setTempIgnoreMouseEvents) {
        window.overlyAPI.setTempIgnoreMouseEvents(true);
      }
    });
  });

  // Pin (Always on top) toggle - supported in both Card/Expanded view & Collapsed view
  if (btnPinToggle) {
    btnPinToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setPinState(!state.isPinned);
    });
  }
  if (btnPillPin) {
    btnPillPin.addEventListener('click', (e) => {
      e.stopPropagation();
      setPinState(!state.isPinned);
    });
  }

  // Window Resize toggle - supported in Card/Expanded view & Collapsed view
  if (btnResizeToggle) {
    btnResizeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleResizeMode();
    });
    btnResizeToggle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      resetToDefaultSize();
    });
  }
  if (btnPillResize) {
    btnPillResize.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleResizeMode();
    });
  }

  // Collapsed View "More Actions" Three-Dots menu & Sub-Buttons
  if (btnPillMore) {
    btnPillMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = pillMoreContainer?.classList.toggle('open');
      overlayContainer?.classList.toggle('pill-more-open', Boolean(isOpen));
    });
  }

  if (pillMoreContainer) {
    pillMoreContainer.addEventListener('mouseenter', () => {
      overlayContainer?.classList.add('pill-more-open');
    });
    pillMoreContainer.addEventListener('mouseleave', () => {
      if (!pillMoreContainer.classList.contains('open')) {
        overlayContainer?.classList.remove('pill-more-open');
      }
    });
  }

  // Minimized View Floating Action Drawer Sub-Buttons
  if (miniMoreContainer) {
    miniMoreContainer.addEventListener('mouseenter', () => {
      overlayContainer?.classList.add('mini-more-open');
    });
    miniMoreContainer.addEventListener('mouseleave', () => {
      if (!miniMoreContainer.classList.contains('open')) {
        overlayContainer?.classList.remove('mini-more-open');
      }
    });
  }

  if (btnMiniExpand) {
    btnMiniExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      miniMoreContainer?.classList.remove('open');
      overlayContainer?.classList.remove('mini-more-open');
      // Intuitively exit minimized layout back to previous mode (or card layout)
      const targetMode = (state.lastNonCardMode && state.lastNonCardMode !== 'minimized') ? state.lastNonCardMode : 'card';
      setMode(targetMode, true);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('mode', targetMode);
      }
    });
  }

  if (btnMiniPin) {
    btnMiniPin.addEventListener('click', (e) => {
      e.stopPropagation();
      setPinState(!state.isPinned);
    });
  }

  if (btnMiniSettings) {
    btnMiniSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      miniMoreContainer?.classList.remove('open');
      overlayContainer?.classList.remove('mini-more-open');
      if (window.overlyAPI?.openSettings) {
        window.overlyAPI.openSettings(state.title, state.artist);
      }
    });
  }

  if (btnMiniClose) {
    btnMiniClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.overlyAPI) window.overlyAPI.closeApp();
    });
  }

  if (btnPillLock) {
    btnPillLock.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLock();
    });
  }

  if (btnPillSettings) {
    btnPillSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      pillMoreContainer?.classList.remove('open');
      overlayContainer?.classList.remove('pill-more-open');
      if (window.overlyAPI?.openSettings) {
        window.overlyAPI.openSettings(state.title, state.artist);
      }
    });
  }

  if (btnPillMinimize) {
    btnPillMinimize.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.overlyAPI) window.overlyAPI.minimizeWindow();
    });
  }

  if (btnPillClose) {
    btnPillClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.overlyAPI) window.overlyAPI.closeApp();
    });
  }

  // Close pill and mini more actions trays if clicking outside
  document.addEventListener('click', (e) => {
    if (pillMoreContainer && !pillMoreContainer.contains(e.target)) {
      pillMoreContainer.classList.remove('open');
      overlayContainer?.classList.remove('pill-more-open');
    }
    if (miniMoreContainer && !miniMoreContainer.contains(e.target)) {
      miniMoreContainer.classList.remove('open');
      overlayContainer?.classList.remove('mini-more-open');
    }
  });

  // Also close trays when window blurs
  window.addEventListener('blur', () => {
    pillMoreContainer?.classList.remove('open');
    overlayContainer?.classList.remove('pill-more-open');
    miniMoreContainer?.classList.remove('open');
    overlayContainer?.classList.remove('mini-more-open');
  });

  if (overlayContainer) {
    overlayContainer.addEventListener('mouseenter', () => {
      isMouseOverOverlay = true;
      cancelAutoMinimizeTimer();
      if (state.isAutoMinimized && !isAutoMinimizeTransitioning) {
        if (state.mode !== 'minimized') {
          restoreFromAutoMinimize();
        } else if (state.autoMinimizeExpand === 'hover') {
          restoreFromAutoMinimize(true);
        }
      }
    });

    overlayContainer.addEventListener('mouseleave', () => {
      isMouseOverOverlay = false;
      document.body.classList.remove('pill-art-hovered');
      pillMoreContainer?.classList.remove('open');
      overlayContainer.classList.remove('pill-more-open');
      miniMoreContainer?.classList.remove('open');
      overlayContainer.classList.remove('mini-more-open');
      if (state.autoMinimize && !state.isAutoMinimized && state.mode !== 'minimized') {
        const isPlaying = (state.hasMedia && state.status === 'Playing');
        if (!isPlaying) {
          startAutoMinimizeTimer();
        }
      }
    });
  }

  // Window control
  btnMinimize.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.overlyAPI) window.overlyAPI.minimizeWindow();
  });

  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.overlyAPI) window.overlyAPI.closeApp();
  });

  // Media playback actions
  btnPlayPause.addEventListener('click', (e) => {
    e.stopPropagation();
    const now = Date.now();
    // Debounce rapid clicking within 220ms
    if (now - optimisticStatusTime < 220) return;

    const currentEffective = optimisticStatus || state.status;
    const willBePlaying = currentEffective !== 'Playing';
    const targetStatus = willBePlaying ? 'Playing' : 'Paused';

    optimisticStatus = targetStatus;
    optimisticStatusTime = now;

    if (willBePlaying) {
      cancelAutoMinimizeTimer();
      if (state.isAutoMinimized) {
        restoreFromAutoMinimize();
      }
    } else {
      if (state.autoMinimize && (!isMouseOverOverlay || state.isImmersive) && !state.isAutoMinimized && (state.mode !== 'minimized' || state.isImmersive)) {
        startAutoMinimizeTimer();
      }
    }

    // Snapshot position smoothly when pausing or unpausing
    if (state.status === 'Playing' && !willBePlaying) {
      const elapsed = (now - state.lastPositionTime) / 1000;
      state.position = Math.min(state.duration, state.position + elapsed);
    }
    state.lastPositionTime = now;
    state.status = targetStatus;

    iconPlay.classList.toggle('hidden', willBePlaying);
    iconPause.classList.toggle('hidden', !willBePlaying);
    iconImmersivePlay?.classList.toggle('hidden', willBePlaying);
    iconImmersivePause?.classList.toggle('hidden', !willBePlaying);
    playingIndicator.classList.toggle('active', willBePlaying);

    if (window.overlyAPI) window.overlyAPI.togglePlayPause();
  });
  btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.overlyAPI) window.overlyAPI.prevTrack();
  });
  btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.overlyAPI) window.overlyAPI.nextTrack();
  });
  function cycleNextLayout() {
    if (minimizedPlayTimer) {
      clearTimeout(minimizedPlayTimer);
      minimizedPlayTimer = null;
    }
    const modes = ['card', 'collapsed', 'minimized', 'lyrics', 'expanded'];
    const currentMode = (state.mode === 'pill') ? 'collapsed' : (state.mode === 'normal') ? 'card' : (state.mode === 'mini' ? 'minimized' : state.mode);
    const nextIdx = (modes.indexOf(currentMode) + 1) % modes.length;
    setMode(modes[nextIdx], true);
  }

  if (btnPillExpand) {
    btnPillExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      pillMoreContainer?.classList.remove('open');
      overlayContainer?.classList.remove('pill-more-open');
      cycleNextLayout();
    });
  }

  let minimizedPlayTimer = null;

  function executeMinimizedPlay() {
    const now = Date.now();
    if (now - optimisticStatusTime < 220) return;

    const currentEffective = optimisticStatus || state.status;
    const willBePlaying = (currentEffective !== 'Playing');
    const targetStatus = willBePlaying ? 'Playing' : 'Paused';

    optimisticStatus = targetStatus;
    optimisticStatusTime = now;

    if (state.status === 'Playing' && !willBePlaying) {
      const elapsed = (now - state.lastPositionTime) / 1000;
      state.position = Math.min(state.duration, state.position + elapsed);
    }
    state.lastPositionTime = now;
    state.status = targetStatus;

    iconPlay?.classList.toggle('hidden', willBePlaying);
    iconPause?.classList.toggle('hidden', !willBePlaying);
    iconMiniPlay?.classList.toggle('hidden', willBePlaying);
    iconMiniPause?.classList.toggle('hidden', !willBePlaying);
    playingIndicator?.classList.toggle('active', willBePlaying);

    if (window.overlyAPI) window.overlyAPI.togglePlayPause();

    if (state.isAutoMinimized && state.preAutoMinMode) {
      if (willBePlaying) {
        restoreFromAutoMinimize();
      }
    }
  }

  function handleMinimizedPlay(e) {
    if (Date.now() - dragJustEndedTime < 220) {
      return;
    }
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      // If e.detail > 1, this click is part of a double-click: immediately abort single-click play/pause!
      if (e.detail > 1) {
        if (minimizedPlayTimer) {
          clearTimeout(minimizedPlayTimer);
          minimizedPlayTimer = null;
        }
        return;
      }
    }

    if (minimizedPlayTimer) {
      clearTimeout(minimizedPlayTimer);
      minimizedPlayTimer = null;
    }

    // Debounce single-click by 220ms so double click NEVER triggers play/pause
    minimizedPlayTimer = setTimeout(() => {
      minimizedPlayTimer = null;
      executeMinimizedPlay();
    }, 220);
  }

  if (btnMinimizedPlay) {
    btnMinimizedPlay.addEventListener('click', handleMinimizedPlay);
  }
  if (minimizedPlayOverlay) {
    minimizedPlayOverlay.addEventListener('click', handleMinimizedPlay);
  }
  const artContainer = document.querySelector('.art-container');
  if (artContainer) {
    artContainer.addEventListener('click', (e) => {
      if (state.mode === 'minimized') {
        if (state.isAutoMinimized && state.autoMinimizeExpand === 'hover') {
          restoreFromAutoMinimize(true);
        } else {
          handleMinimizedPlay(e);
        }
      }
    });
    artContainer.addEventListener('mouseenter', () => {
      if (state.mode === 'minimized' && state.isAutoMinimized && state.autoMinimizeExpand === 'hover' && !isAutoMinimizeTransitioning) {
        restoreFromAutoMinimize(true);
      }
      if (state.mode === 'pill' || state.mode === 'collapsed') {
        updatePillHoverTitle();
        document.body.classList.add('pill-art-hovered');
      }
    });
    artContainer.addEventListener('mouseleave', () => {
      document.body.classList.remove('pill-art-hovered');
    });
  }

  // Allow double-clicking anywhere directly on minimized orb to cycle layout without play/pause
  const handleOrbDblClick = (e) => {
    if (state.mode === 'minimized') {
      e.preventDefault();
      e.stopPropagation();
      if (minimizedPlayTimer) {
        clearTimeout(minimizedPlayTimer);
        minimizedPlayTimer = null;
      }
      cycleNextLayout();
    }
  };
  btnMinimizedPlay?.addEventListener('dblclick', handleOrbDblClick);
  minimizedPlayOverlay?.addEventListener('dblclick', handleOrbDblClick);
  artContainer?.addEventListener('dblclick', handleOrbDblClick);

  // Pill view lyrics retry buttons
  const wireRetry = (btn) => {
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.classList.add('spinning');
      await triggerRetryLyrics();
      btn.classList.remove('spinning');
    });
  };
  wireRetry(btnPillRetry);
  wireRetry(document.getElementById('btnPillVisRetry'));

  // Pill view lyrics search buttons
  const wireSearch = (btn) => {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.overlyAPI?.openSettings) {
        window.overlyAPI.openSettings(state.title, state.artist);
      }
    });
  };
  wireSearch(btnPillSearch);
  wireSearch(document.getElementById('btnPillVisSearch'));

  // Open standalone Settings window
  btnSettingsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.overlyAPI?.openSettings) {
      window.overlyAPI.openSettings(state.title, state.artist);
    }
  });

  // Cancel any lyric seek on double click everywhere
  window.addEventListener('dblclick', () => {
    if (pendingLyricSeekTimer) {
      clearTimeout(pendingLyricSeekTimer);
      pendingLyricSeekTimer = null;
    }
    if (minimizedPlayTimer) {
      clearTimeout(minimizedPlayTimer);
      minimizedPlayTimer = null;
    }
  }, true);

  // Double-click anywhere outside interactive controls to toggle layout window
  overlayContainer?.addEventListener('dblclick', (e) => {
    if (pendingLyricSeekTimer) {
      clearTimeout(pendingLyricSeekTimer);
      pendingLyricSeekTimer = null;
    }
    if (minimizedPlayTimer) {
      clearTimeout(minimizedPlayTimer);
      minimizedPlayTimer = null;
    }

    // In minimized mode, double-clicking anywhere on the widget cycles layout
    if (state.mode === 'minimized') {
      e.preventDefault();
      e.stopPropagation();
      cycleNextLayout();
      return;
    }

    // If double-clicked on interactive buttons, inputs, seek bar, or menu controls, ignore
    const interactive = e.target.closest(
      'button, input, select, textarea, .media-btn, .icon-btn, .pill-action-btn, ' +
      '.no-lyrics-btn, .progress-container, .resize-handle, .pill-more-actions'
    );
    if (interactive) return;

    e.preventDefault();
    e.stopPropagation();
    cycleNextLayout();
  });

  // Global keyboard shortcuts: 'M' (cycle mode), 'P' (toggle pin), 'R' (toggle resize), 'Esc' (exit immersive), 'F' (toggle immersive)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'Escape') {
      if (state.isImmersive) {
        e.preventDefault();
        exitImmersiveMode();
      }
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (state.isImmersive) {
        exitImmersiveMode();
      } else {
        enterImmersiveMode();
      }
    } else if (e.key === 'm' || e.key === 'M' || (e.ctrlKey && e.key.toLowerCase() === 'm')) {
      if (!state.isImmersive) {
        e.preventDefault();
        const modes = ['card', 'collapsed', 'minimized', 'lyrics', 'expanded'];
        const nextIdx = (modes.indexOf(state.mode) + 1) % modes.length;
        setMode(modes[nextIdx], true);
      }
    } else if (e.key === 'p' || e.key === 'P' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
      e.preventDefault();
      setPinState(!state.isPinned);
    } else if (e.key === 'r' || e.key === 'R' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
      if (!state.isImmersive) {
        e.preventDefault();
        toggleResizeMode();
      }
    }
  });

  // Immersive Mode Buttons & Triggers
  if (btnImmersiveToggle) {
    btnImmersiveToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      enterImmersiveMode();
    });
  }

  if (btnPillImmersive) {
    btnPillImmersive.addEventListener('click', (e) => {
      e.stopPropagation();
      pillMoreContainer?.classList.remove('open');
      overlayContainer?.classList.remove('pill-more-open');
      enterImmersiveMode();
    });
  }

  if (btnImmersiveExit) {
    btnImmersiveExit.addEventListener('click', (e) => {
      e.stopPropagation();
      exitImmersiveMode();
    });
  }

  if (btnImmersiveLayoutToggle) {
    btnImmersiveLayoutToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleImmersiveLayout();
    });
  }

  if (btnImmersivePlayPause) {
    btnImmersivePlayPause.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImmersiveIdleTimer();
      btnPlayPause?.click();
    });
  }

  if (btnImmersivePrev) {
    btnImmersivePrev.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImmersiveIdleTimer();
      if (window.overlyAPI?.prevTrack) {
        window.overlyAPI.prevTrack();
      } else {
        btnPrev?.click();
      }
    });
  }

  if (btnImmersiveNext) {
    btnImmersiveNext.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImmersiveIdleTimer();
      if (window.overlyAPI?.nextTrack) {
        window.overlyAPI.nextTrack();
      } else {
        btnNext?.click();
      }
    });
  }

  if (btnImmersiveRetry) {
    btnImmersiveRetry.addEventListener('click', async (e) => {
      e.stopPropagation();
      resetImmersiveIdleTimer();
      btnImmersiveRetry.classList.add('spinning');
      await triggerRetryLyrics();
      btnImmersiveRetry.classList.remove('spinning');
    });
  }

  // Auto-hide controls and cursor after mouse inactivity in immersive mode
  const handleUserActivity = () => {
    if (state.isImmersive) {
      resetImmersiveIdleTimer();
      if (state.autoMinimize && !state.isAutoMinimized) {
        const isPlaying = (state.hasMedia && state.status === 'Playing');
        if (!isPlaying) {
          startAutoMinimizeTimer();
        }
      }
    }
  };
  window.addEventListener('mousemove', handleUserActivity);
  window.addEventListener('pointermove', handleUserActivity);
  window.addEventListener('pointerdown', handleUserActivity);

  // Sync when immersive mode state changed via Electron full screen event
  if (window.overlyAPI?.onImmersiveModeChanged) {
    window.overlyAPI.onImmersiveModeChanged((isImm) => {
      if (!isImm && state.isImmersive) {
        exitImmersiveMode(false);
      } else if (isImm && !state.isImmersive) {
        enterImmersiveMode();
      }
    });
  }

  // Setup interactive audio progress bar scrubber (click & drag to pull/seek)
  setupProgressScrubber();
  setupImmersiveProgressScrubber();

  // Setup reliable pointer-captured window dragging from clicking anywhere outside interactive controls
  setupWindowDrag(overlayContainer);

  // Setup corner resize handle
  setupCornerResize();

  const handleDimensionsChanged = () => {
    if (state.mode === 'collapsed' || state.mode === 'pill') {
      updatePillBorderDimensions();
    } else if (state.mode === 'card' || state.mode === 'lyrics' || state.mode === 'expanded') {
      if (lyricsScrollArea && lyricsScrollArea.clientHeight > 0 && state.activeLyricIndex >= 0) {
        scrollActiveLyricToCenter(true);
      }
    }
    if (state.isImmersive && immersiveLyricsViewport && immersiveLyricsViewport.clientHeight > 0 && state.activeLyricIndex >= 0) {
      scrollActiveImmersiveLyricToCenter(true);
    }
  };

  // Keep collapsed border progress bar aligned and lyrics centered on window resize / layout reflow
  window.addEventListener('resize', handleDimensionsChanged);

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(handleDimensionsChanged);
    if (overlayContainer) ro.observe(overlayContainer);
    if (lyricsScrollArea) ro.observe(lyricsScrollArea);
  }
}

function setupProgressScrubber() {
  if (!progressBar) return;

  const updateScrub = (e) => {
    if (!state.duration || state.duration <= 0) return 0;
    const rect = progressBar.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const targetSec = Math.max(0, Math.min(state.duration, ratio * state.duration));

    progressFill.style.width = `${ratio * 100}%`;
    if (progressThumb) {
      progressThumb.style.left = `${ratio * 100}%`;
    }
    timeCurrent.textContent = formatTime(targetSec);
    return targetSec;
  };

  progressBar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // Left click only
    if (!state.hasMedia || !state.duration) return;

    e.preventDefault();
    e.stopPropagation();

    isDraggingProgress = true;
    try {
      progressBar.setPointerCapture(e.pointerId);
    } catch {}

    progressBar.classList.add('is-dragging');
    const targetSec = updateScrub(e);
    syncLyrics(targetSec, true);
  });

  progressBar.addEventListener('pointermove', (e) => {
    if (!isDraggingProgress) return;
    e.preventDefault();
    e.stopPropagation();

    const targetSec = updateScrub(e);
    syncLyrics(targetSec, true);
  });

  const finishScrub = (e) => {
    if (!isDraggingProgress) return;
    isDraggingProgress = false;
    progressBar.classList.remove('is-dragging');
    try {
      progressBar.releasePointerCapture(e.pointerId);
    } catch {}

    const targetSec = updateScrub(e);
    if (window.overlyAPI?.seekTo) {
      window.overlyAPI.seekTo(targetSec);
    }

    state.position = targetSec;
    state.lastPositionTime = Date.now();
    lastSeekTime = Date.now();
    syncLyrics(targetSec, true);
  };

  progressBar.addEventListener('pointerup', finishScrub);
  progressBar.addEventListener('pointercancel', finishScrub);
}

function setupImmersiveProgressScrubber() {
  if (!immersiveProgressBar) return;

  const updateScrub = (e) => {
    if (!state.duration || state.duration <= 0) return 0;
    const rect = immersiveProgressBar.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const targetSec = Math.max(0, Math.min(state.duration, ratio * state.duration));

    if (immersiveProgressFill) immersiveProgressFill.style.width = `${ratio * 100}%`;
    if (immersiveProgressThumb) immersiveProgressThumb.style.left = `${ratio * 100}%`;
    if (immersiveTimeCurrent) immersiveTimeCurrent.textContent = formatTime(targetSec);
    return targetSec;
  };

  immersiveProgressBar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !state.hasMedia || !state.duration) return;
    e.preventDefault();
    e.stopPropagation();
    resetImmersiveIdleTimer();

    isDraggingProgress = true;
    try {
      immersiveProgressBar.setPointerCapture(e.pointerId);
    } catch {}

    const targetSec = updateScrub(e);
    syncLyrics(targetSec, true);
  });

  immersiveProgressBar.addEventListener('pointermove', (e) => {
    if (!isDraggingProgress) return;
    e.preventDefault();
    e.stopPropagation();
    resetImmersiveIdleTimer();

    const targetSec = updateScrub(e);
    syncLyrics(targetSec, true);
  });

  const finishScrub = (e) => {
    if (!isDraggingProgress) return;
    isDraggingProgress = false;
    resetImmersiveIdleTimer();
    try {
      immersiveProgressBar.releasePointerCapture(e.pointerId);
    } catch {}

    const targetSec = updateScrub(e);
    if (window.overlyAPI?.seekTo) {
      window.overlyAPI.seekTo(targetSec);
    }

    state.position = targetSec;
    state.lastPositionTime = Date.now();
    lastSeekTime = Date.now();
    syncLyrics(targetSec, true);
  };

  immersiveProgressBar.addEventListener('pointerup', finishScrub);
  immersiveProgressBar.addEventListener('pointercancel', finishScrub);
}

// Inactivity timer for immersive mode
let immersiveIdleTimer = null;

function resetImmersiveIdleTimer() {
  if (!state.isImmersive) return;
  body.classList.remove('immersive-idle');
  if (immersiveIdleTimer) {
    clearTimeout(immersiveIdleTimer);
  }
  immersiveIdleTimer = setTimeout(() => {
    if (state.isImmersive) {
      body.classList.add('immersive-idle');
    }
  }, 4500);
}

function stopImmersiveIdleTimer() {
  if (immersiveIdleTimer) {
    clearTimeout(immersiveIdleTimer);
    immersiveIdleTimer = null;
  }
  body.classList.remove('immersive-idle');
}

function enterImmersiveMode(isRestore = false) {
  // If already in immersive mode and window is truly full screen, do nothing
  if (state.isImmersive && window.innerWidth > 600 && window.innerHeight > 500) return;
  state.isImmersive = true;
  if (!isRestore || !state.preImmersiveMode) {
    state.preImmersiveMode = state.mode;
  }
  if (!isRestore) {
    state.isAutoMinimized = false;
    state.preAutoMinMode = null;
    applyAutoMinimizeExpandUI();
  }

  body.classList.add('mode-immersive');
  if (immersiveView) {
    immersiveView.classList.remove('hidden');
    immersiveView.setAttribute('aria-hidden', 'false');
  }

  renderTrackInfo();
  renderLyricsList();

  const isPlaying = state.status === 'Playing';
  iconImmersivePlay?.classList.toggle('hidden', isPlaying);
  iconImmersivePause?.classList.toggle('hidden', !isPlaying);

  if (state.hasMedia) {
    const elapsed = isPlaying ? (Date.now() - state.lastPositionTime) / 1000 : 0;
    updateProgress(Math.min(state.duration, state.position + elapsed));
  }

  resetImmersiveIdleTimer();

  // If entering/restoring immersive mode while playback is paused or idle, arm auto-minimize
  if (!isPlaying && state.autoMinimize) {
    startAutoMinimizeTimer();
  }

  if (window.overlyAPI?.enterImmersive) {
    window.overlyAPI.enterImmersive(isRestore);
  }
}

function exitImmersiveMode(notifyIpc = true, restoreMode = true) {
  if (!state.isImmersive) return;
  state.isImmersive = false;

  stopImmersiveIdleTimer();
  body.classList.remove('mode-immersive', 'immersive-idle');
  if (immersiveView) {
    immersiveView.classList.add('hidden');
    immersiveView.setAttribute('aria-hidden', 'true');
  }

  if (notifyIpc && window.overlyAPI?.exitImmersive) {
    window.overlyAPI.exitImmersive(restoreMode ? undefined : false);
  }

  if (restoreMode) {
    setMode(state.preImmersiveMode || 'card', true);
  }
}

function toggleImmersiveLayout() {
  state.immersiveLayout = (state.immersiveLayout === 'split') ? 'centered' : 'split';
  if (immersiveView) {
    immersiveView.classList.toggle('immersive-layout-centered', state.immersiveLayout === 'centered');
  }
  if (immersiveLayoutLabel) {
    immersiveLayoutLabel.textContent = (state.immersiveLayout === 'centered') ? 'Centered View' : 'Split View';
  }
  const layoutIcon = document.getElementById('iconImmersiveLayout');
  if (layoutIcon) {
    if (state.immersiveLayout === 'centered') {
      layoutIcon.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="3"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/>';
    } else {
      layoutIcon.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="3"/><line x1="12" y1="3" x2="12" y2="21"/>';
    }
  }
  if (state.activeLyricIndex >= 0) {
    setActiveLyric(state.activeLyricIndex, true);
  }
}

function renderImmersiveLyricsList() {
  if (!immersiveLyricsList) return;
  immersiveLyricsList.innerHTML = '';

  if (!state.hasMedia) {
    immersiveInstrumentalStage?.classList.add('hidden');
    immersiveLyricsViewport?.classList.remove('hidden');
    const pl = document.createElement('div');
    pl.className = 'immersive-lyric-line placeholder';
    pl.textContent = 'Listening for playback...';
    immersiveLyricsList.appendChild(pl);
    return;
  }

  if (isInstrumentalOrNoLyrics()) {
    immersiveLyricsViewport?.classList.add('hidden');
    immersiveInstrumentalStage?.classList.remove('hidden');
    if (immersiveInstTag) {
      immersiveInstTag.textContent = getInstrumentalTag();
    }
    return;
  }

  immersiveInstrumentalStage?.classList.add('hidden');
  immersiveLyricsViewport?.classList.remove('hidden');

  if (state.hasSynced && state.lyrics.length > 1) {
    state.lyrics.forEach((line, idx) => {
      const el = document.createElement('div');
      el.className = 'immersive-lyric-line';
      el.textContent = line.text;
      el.dataset.index = idx;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        resetImmersiveIdleTimer();
        if (typeof line.time === 'number' && state.duration > 0 && window.overlyAPI?.seekTo) {
          window.overlyAPI.seekTo(line.time);
          state.position = line.time;
          state.lastPositionTime = Date.now();
          lastSeekTime = Date.now();
        }
        setActiveLyric(idx, true);
      });
      immersiveLyricsList.appendChild(el);
    });

    if (state.activeLyricIndex >= 0) {
      setActiveLyric(state.activeLyricIndex, true);
    }
  } else if (state.plainLyrics) {
    const lines = state.plainLyrics.split(/\r?\n/).filter(l => l.trim().length > 0);
    lines.forEach((l) => {
      const el = document.createElement('div');
      el.className = 'immersive-lyric-line active';
      el.textContent = l.trim();
      immersiveLyricsList.appendChild(el);
    });
  }
}

function setupWindowDrag(element) {
  if (!element) return;

  element.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // Left click only

    // If click is on an interactive button or control, let the element handle it
    const interactive = e.target.closest(
      'button, input, select, textarea, .media-btn, .icon-btn, .pill-action-btn, ' +
      '.no-lyrics-btn, .progress-container, .resize-handle, .pill-more-actions, ' +
      '.mini-more-actions, .mini-sub-btn, ' +
      '.lyric-line'
    );
    if (interactive) {
      return;
    }

    let isMoving = false;
    let startX = e.screenX;
    let startY = e.screenY;
    let lastX = e.screenX;
    let lastY = e.screenY;

    const onPointerMove = (ev) => {
      const dist = Math.hypot(ev.screenX - startX, ev.screenY - startY);
      if (!isMoving && dist > 3) {
        isMoving = true;
        try {
          element.setPointerCapture(e.pointerId);
        } catch {}
        document.body.classList.add('is-dragging');
      }

      if (isMoving) {
        const deltaX = ev.screenX - lastX;
        const deltaY = ev.screenY - lastY;
        lastX = ev.screenX;
        lastY = ev.screenY;
        if (deltaX !== 0 || deltaY !== 0) {
          if (window.overlyAPI?.moveWindow) {
            window.overlyAPI.moveWindow(deltaX, deltaY);
          }
        }
      }
    };

    const onPointerUp = (ev) => {
      if (isMoving) {
        dragJustEndedTime = Date.now();
        try {
          element.releasePointerCapture(ev.pointerId);
        } catch {}
        document.body.classList.remove('is-dragging');
        persistSettings();
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  });
}

function toggleLock() {
  const next = !state.isLocked;
  if (window.overlyAPI) {
    window.overlyAPI.setClickThrough(next);
  }
  setLockState(next);
}

// ==========================================================================
// Window Resize Toggle & Corner Handle Logic
// ==========================================================================

function toggleResizeMode(forceState) {
  state.isResizeMode = typeof forceState === 'boolean' ? forceState : !state.isResizeMode;

  if (btnResizeToggle) {
    btnResizeToggle.classList.toggle('active', state.isResizeMode);
    btnResizeToggle.title = state.isResizeMode
      ? 'Lock Window Size (Resizing Active - Click to Lock, R)'
      : 'Toggle Window Resizing (R) • Double-click to reset size';
  }

  if (btnPillResize) {
    btnPillResize.classList.toggle('active', state.isResizeMode);
    btnPillResize.title = state.isResizeMode
      ? 'Lock Window Size (Resizing Active, R)'
      : 'Toggle Window Resizing (R)';
  }

  if (overlayContainer) {
    overlayContainer.classList.toggle('resize-mode-active', state.isResizeMode);
  }

  if (window.overlyAPI?.setResizable) {
    window.overlyAPI.setResizable(state.isResizeMode);
  }
}

function resetToDefaultSize() {
  const target = getTargetWindowDimensions(state.mode);
  if (window.overlyAPI?.setWindowSize) {
    window.overlyAPI.setWindowSize(target.width, target.height, state.mode);
  }
  if (state.mode === 'collapsed' || state.mode === 'pill') {
    setTimeout(updatePillBorderDimensions, 60);
  }
}

function setupCornerResize() {
  if (!resizeHandle) return;

  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  resizeHandle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !state.isResizeMode) return;
    e.preventDefault();
    e.stopPropagation();

    isResizing = true;
    try {
      resizeHandle.setPointerCapture(e.pointerId);
    } catch (_) {}

    startX = e.screenX;
    startY = e.screenY;
    startW = window.outerWidth;
    startH = window.outerHeight;

    body.classList.add('is-resizing');
  });

  resizeHandle.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    e.preventDefault();

    const isCompact = state.mode === 'collapsed' || state.mode === 'pill';
    const minW = isCompact ? 300 : 340;
    const minH = isCompact ? 64 : 140;

    const newW = Math.max(minW, Math.round(startW + (e.screenX - startX)));
    const newH = Math.max(minH, Math.round(startH + (e.screenY - startY)));

    if (window.overlyAPI?.setWindowSize) {
      window.overlyAPI.setWindowSize(newW, newH);
    }
  });

  const onPointerUp = (e) => {
    if (!isResizing) return;
    isResizing = false;
    try {
      if (resizeHandle.hasPointerCapture(e.pointerId)) {
        resizeHandle.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    body.classList.remove('is-resizing');
    persistSettings();
    if (state.mode === 'collapsed' || state.mode === 'pill') {
      setTimeout(updatePillBorderDimensions, 60);
    }
    // Auto untoggle the resize mode after finished adjusting (when mouse releases)
    toggleResizeMode(false);
  };

  resizeHandle.addEventListener('pointerup', onPointerUp);
  resizeHandle.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Double-click resize handle to snap back to default preset dimensions
  resizeHandle.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetToDefaultSize();
    toggleResizeMode(false);
  });

  // Auto untoggle resize mode when user clicks/deselects outside the resize handle & buttons
  document.addEventListener('pointerdown', (e) => {
    if (!state.isResizeMode || isResizing) return;
    const isResizeControl = e.target.closest('#resizeHandle, #btnResizeToggle, #btnPillResize');
    if (!isResizeControl) {
      toggleResizeMode(false);
    }
  });
}



// ==========================================================================
// Mode, Accent Color & Opacity Functions
// ==========================================================================

function getTargetWindowDimensions(mode = state.mode) {
  if (mode === 'minimized' || mode === 'mini') {
    return { width: 230, height: 68 };
  } else if (mode === 'collapsed' || mode === 'pill') {
    return { width: 440, height: 104 };
  } else if (mode === 'lyrics') {
    return { width: 460, height: 164 };
  } else if (mode === 'expanded') {
    return { width: 460, height: 504 };
  }
  return { width: 460, height: 274 };
}

function updateWindowDimensionsForLyrics() {
  if (!window.overlyAPI || state.isImmersive) return;
  const target = getTargetWindowDimensions(state.mode);
  window.overlyAPI.setWindowSize?.(target.width, target.height, state.mode);
  if (state.isPinned) {
    window.overlyAPI.setAlwaysOnTop?.(true);
  }
  if (state.mode === 'collapsed' || state.mode === 'pill') {
    setTimeout(updatePillBorderDimensions, 60);
  }
}

function setMode(mode, updateSize = true, isInternalAutoAction = false) {
  // Normalize aliases
  if (mode === 'pill') mode = 'collapsed';
  if (mode === 'normal') mode = 'card';
  if (mode === 'mini') mode = 'minimized';

  if (!isInternalAutoAction) {
    state.committedMode = mode;
    state.hoverExpandedWhilePaused = false;
    if (state.isAutoMinimized) {
      state.isAutoMinimized = false;
      state.preAutoMinMode = null;
    }
    if (mode === 'minimized') {
      cancelAutoMinimizeTimer();
    } else if (state.autoMinimize && (!isMouseOverOverlay || state.isImmersive) && (!state.hasMedia || state.status !== 'Playing')) {
      startAutoMinimizeTimer();
    }
  }

  const oldMode = state.mode;
  if (oldMode && oldMode !== mode) {
    const allTrans = [
      'from-collapsed-to-minimized', 'from-minimized-to-collapsed',
      'from-pill-to-minimized', 'from-minimized-to-pill',
      'from-card-to-minimized', 'from-minimized-to-card',
      'from-normal-to-minimized', 'from-minimized-to-normal',
      'from-expanded-to-minimized', 'from-minimized-to-expanded',
      'from-lyrics-to-minimized', 'from-minimized-to-lyrics',
      'from-card-to-collapsed', 'from-collapsed-to-card',
      'from-card-to-pill', 'from-pill-to-card',
      'from-card-to-lyrics', 'from-lyrics-to-card',
      'from-card-to-expanded', 'from-expanded-to-card'
    ];
    body.classList.remove(...allTrans);
    body.classList.add(`from-${oldMode}-to-${mode}`);
    setTimeout(() => {
      body.classList.remove(...allTrans);
    }, 440);
  }

  state.mode = mode;
  if (mode !== 'card') {
    state.lastNonCardMode = mode;
  }
  body.classList.remove('mode-pill', 'mode-collapsed', 'mode-minimized', 'mode-card', 'mode-normal', 'mode-lyrics', 'mode-expanded');
  body.classList.add(`mode-${mode}`);
  if (mode === 'collapsed') body.classList.add('mode-pill');
  if (mode === 'card') body.classList.add('mode-normal');

  applyAutoMinimizeExpandUI();

  overlayContainer?.classList.remove('pill-more-open');
  pillMoreContainer?.classList.remove('open');
  overlayContainer?.classList.remove('mini-more-open');
  miniMoreContainer?.classList.remove('open');
  body.classList.remove('pill-art-hovered');

  updateModeButtonUI(mode);

  if (mode === 'minimized') {
    updateMinimizedDisplay();
  }

  updatePillInstrumentalView();
  if (mode === 'collapsed' || mode === 'pill') {
    if (state.hasSynced && state.lyrics && state.lyrics.length > 0) {
      const idx = state.activeLyricIndex >= 0 ? state.activeLyricIndex : 0;
      updatePillLyric(state.lyrics[idx]?.text || state.title);
    } else if (state.plainLyrics) {
      const firstLine = state.plainLyrics.split(/\r?\n/).find(l => l.trim().length > 0);
      if (firstLine) updatePillLyric(firstLine);
    }
  }

  if (updateSize && window.overlyAPI && !state.isImmersive) {
    const target = getTargetWindowDimensions(mode);
    window.overlyAPI.setWindowSize?.(target.width, target.height, mode);
    // Re-assert topmost state on mode size transition
    if (state.isPinned) {
      window.overlyAPI.setAlwaysOnTop?.(true);
    }
  }

  // Maintain and realign lyrics immediately and at progressive animation milestones
  realignLyricsToCurrentPosition(true);

  const realignMilestones = [40, 120, 240, 360, 480];
  realignMilestones.forEach((delay) => {
    setTimeout(() => {
      realignLyricsToCurrentPosition(true);
      if (mode === 'collapsed' || mode === 'pill') {
        updatePillBorderDimensions();
      }
    }, delay);
  });

  persistSettings();
}

function cycleNextLayout() {
  const modes = ['card', 'collapsed', 'minimized', 'lyrics', 'expanded'];
  const cur = (state.mode === 'pill' ? 'collapsed' : (state.mode === 'normal' ? 'card' : (state.mode === 'mini' ? 'minimized' : state.mode)));
  const nextIdx = (modes.indexOf(cur) + 1) % modes.length;
  const nextMode = modes[nextIdx];
  setMode(nextMode, true);
  if (window.overlyAPI?.updateSetting) {
    window.overlyAPI.updateSetting('mode', nextMode);
  }
}

function updateModeButtonUI(mode) {
  if (!btnModeToggle) return;
  const icons = {
    card: {
      svg: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>`,
      title: 'Layout: Normal (Click for Collapsed)'
    },
    collapsed: {
      svg: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="12" r="2" fill="currentColor"/><line x1="12" y1="12" x2="17" y2="12"/></svg>`,
      title: 'Layout: Collapsed Pill (Click for Minimized)'
    },
    minimized: {
      svg: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>`,
      title: 'Layout: Minimized Ball (Click for Lyrics Only)'
    },
    lyrics: {
      svg: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
      title: 'Layout: Lyrics Only (Click for Expanded)'
    },
    expanded: {
      svg: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M3 9h18"/></svg>`,
      title: 'Layout: Expanded (Click for Normal)'
    }
  };

  const current = icons[mode] || icons.card;
  btnModeToggle.innerHTML = current.svg;
  btnModeToggle.title = current.title;
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 255, g: 48, b: 64 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    const bigint = parseInt(clean, 16);
    if (!isNaN(bigint)) {
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    }
  }
  return { r: 255, g: 48, b: 64 };
}

function applyAccentTokens(color, customSecondary = null) {
  let rgb = hexToRgb(color);
  let luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const isLight = document.body.classList.contains('theme-light');

  // Guard against muddy or near-black extracted accent colors on dark backgrounds
  if (!isLight && luminance < 0.42 && color !== getNeutralAccentColor()) {
    const boost = Math.max(1.7, 0.55 / Math.max(0.08, luminance));
    const r = Math.min(255, Math.round(rgb.r * boost + 75));
    const g = Math.min(255, Math.round(rgb.g * boost + 75));
    const b = Math.min(255, Math.round(rgb.b * boost + 75));
    rgb = { r, g, b };
    color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  let contrastColor = '#ffffff';
  let accentText = color;
  let playBtnBg = color;
  let playBtnText = '#ffffff';
  let playBtnBorder = '1px solid rgba(255, 255, 255, 0.2)';
  let playBtnShadow = 'none';

  if (luminance > 0.70) {
    if (isLight) {
      accentText = '#0f1118';
      contrastColor = '#0f1118';
      playBtnBg = '#ffffff';
      playBtnText = '#0f1118';
      playBtnBorder = '1.5px solid rgba(0, 0, 0, 0.22)';
      playBtnShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
    } else {
      accentText = '#ffffff';
      contrastColor = '#0e1018';
      playBtnBg = '#ffffff';
      playBtnText = '#0e1018';
      playBtnBorder = '1px solid rgba(255, 255, 255, 0.35)';
      playBtnShadow = '0 4px 14px rgba(255, 255, 255, 0.25)';
    }
  } else if (luminance < 0.25) {
    if (isLight) {
      accentText = '#18181b';
      contrastColor = '#ffffff';
      playBtnBg = '#18181b';
      playBtnText = '#ffffff';
      playBtnBorder = '1px solid rgba(0, 0, 0, 0.2)';
      playBtnShadow = '0 4px 14px rgba(0, 0, 0, 0.2)';
    } else {
      accentText = '#ffffff';
      contrastColor = '#ffffff';
      playBtnBg = '#22232a';
      playBtnText = '#ffffff';
      playBtnBorder = '1.5px solid rgba(255, 255, 255, 0.45)';
      playBtnShadow = '0 4px 14px rgba(255, 255, 255, 0.2)';
    }
  } else {
    contrastColor = luminance > 0.6 ? '#11131a' : '#ffffff';
    accentText = color;
    playBtnBg = color;
    playBtnText = contrastColor;
    playBtnBorder = '1px solid rgba(255, 255, 255, 0.25)';
    playBtnShadow = `0 4px 14px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  }

  const lighterR = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.35));
  const lighterG = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.35));
  const lighterB = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.35));
  const lighterColor = customSecondary || `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
  const secRgb = customSecondary ? hexToRgb(customSecondary) : { r: lighterR, g: lighterG, b: lighterB };

  const glowAlpha = luminance > 0.65 ? 0.25 : 0.4;
  const subtleGlowAlpha = luminance > 0.65 ? 0.08 : 0.14;

  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-contrast', contrastColor);
  document.documentElement.style.setProperty('--accent-text', accentText);
  document.documentElement.style.setProperty('--accent-play-bg', playBtnBg);
  document.documentElement.style.setProperty('--accent-play-text', playBtnText);
  document.documentElement.style.setProperty('--accent-play-border', playBtnBorder);
  document.documentElement.style.setProperty('--accent-play-shadow', playBtnShadow);
  document.documentElement.style.setProperty('--accent-light', lighterColor);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`);
  document.documentElement.style.setProperty('--accent-glow-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${subtleGlowAlpha})`);
  document.documentElement.style.setProperty('--aura-color1', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`);
  document.documentElement.style.setProperty('--aura-color2', `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.12)`);

  const visColor = getHighContrastVisualizerColor(color, isLight);
  const visRgb = hexToRgb(visColor);
  document.documentElement.style.setProperty('--vis-bar-color', visColor);
  document.documentElement.style.setProperty('--vis-bar-glow', `rgba(${visRgb.r}, ${visRgb.g}, ${visRgb.b}, ${isLight ? 0.20 : 0.28})`);
  document.documentElement.style.setProperty('--vis-bar-highlight', isLight ? 'rgba(0, 0, 0, 0.45)' : '#ffffff');
  document.documentElement.style.setProperty('--vis-status-bg', isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)');
  document.documentElement.style.setProperty('--vis-btn-bg', isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.15)');
  document.documentElement.style.setProperty('--vis-btn-border', isLight ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.24)');

  const gradStop1 = document.getElementById('pillGradStop1');
  if (gradStop1) {
    const grad1 = (luminance < 0.25 && !isLight) ? '#ffffff' : (luminance > 0.70 && isLight ? '#0f1118' : color);
    gradStop1.setAttribute('stop-color', grad1);
  }
  const gradStop2 = document.getElementById('pillGradStop2');
  if (gradStop2) {
    const grad2 = (luminance < 0.25 && !isLight) ? '#b0b5c5' : (luminance > 0.70 && isLight ? '#3a3f50' : lighterColor);
    gradStop2.setAttribute('stop-color', grad2);
  }
}

function extractColorsFromCanvas(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 36;
    canvas.height = 36;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 36, 36);
    const data = ctx.getImageData(0, 0, 36, 36).data;
    const buckets = [];
    let totalLum = 0;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      const lumPixel = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      totalLum += lumPixel;
      pixelCount++;

      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 510;
      const d = max - min;
      const s = max === 0 ? 0 : d / max;
      if (l > 0.04 && l < 0.96 && s > 0.06) {
        buckets.push({ r, g, b, score: s * 2.5 + (1 - Math.abs(l - 0.50)) * 1.5 });
      }
    }

    const avgLuminance = pixelCount > 0 ? (totalLum / pixelCount) : 0.5;
    const isDark = (avgLuminance < 0.46);

    if (!buckets.length) {
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue;
        buckets.push({ r, g, b, score: 1 });
      }
    }
    if (!buckets.length) return null;

    buckets.sort((a, b) => b.score - a.score);
    const primary = buckets[0];
    let secondary = buckets.find(c => Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b) > 70);

    const authenticPrimary = rgbToHex(primary.r, primary.g, primary.b);
    let accent = authenticPrimary;
    const lum = (0.299 * primary.r + 0.587 * primary.g + 0.114 * primary.b) / 255;
    if (lum < 0.40) {
      const hVal = hexToHsl(authenticPrimary);
      accent = hslToHex(hVal.h, Math.max(0.45, hVal.s), 0.60);
    }

    return {
      primary: authenticPrimary,
      accent,
      secondary: secondary ? rgbToHex(secondary.r, secondary.g, secondary.b) : null,
      isDark,
      luminance: avgLuminance
    };
  } catch (_) {
    return null;
  }
}

function getNeutralAccentColor() {
  const isLight = document.body.classList.contains('theme-light');
  return isLight ? '#22242E' : '#A4AAB8';
}

let isExtractingAlbumColors = false;

async function applyExtractedAlbumColors() {
  if (isExtractingAlbumColors) return;
  isExtractingAlbumColors = true;

  try {
    if (!state.coverUrl) {
      if (!state.hasMedia || !state.title) {
        state.lastExtractedPrimary = null;
        state.coverIsDark = true;
        if (state.accentColor === 'auto') {
          applyAccentTokens(getNeutralAccentColor(), null);
        }
        applyTheme(state.theme);
        if (window.overlyAPI?.updateSetting) {
          window.overlyAPI.updateSetting('extractedAccentColor', null);
        }
      }
      return;
    }

    let colors = null;
    if (window.overlyAPI?.extractCoverColors) {
      colors = await window.overlyAPI.extractCoverColors(state.coverUrl);
    }
    if (!colors && albumArt && albumArt.complete && albumArt.naturalWidth) {
      colors = extractColorsFromCanvas(albumArt);
    }
    if (colors && colors.primary) {
      state.lastExtractedPrimary = colors.primary;
      state.coverIsDark = typeof colors.isDark === 'boolean' ? colors.isDark : true;
      state.coverLuminance = typeof colors.luminance === 'number' ? colors.luminance : 0.5;

      if (state.accentColor === 'auto') {
        applyAccentTokens(colors.primary, colors.secondary);
      }
      applyTheme(state.theme);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('extractedAccentColor', colors.primary);
      }
    }
    // If colors are still fetching or not found, keep using current active colors so UI never switches twice!
  } catch (err) {
    console.warn('Cover color extraction error:', err);
    // Keep current colors
  } finally {
    isExtractingAlbumColors = false;
  }
}

function setAccentColor(color) {
  state.accentColor = color;
  if (color === 'auto') {
    if (state.lastExtractedPrimary) {
      applyAccentTokens(state.lastExtractedPrimary);
    } else {
      applyAccentTokens(getNeutralAccentColor(), null);
      applyExtractedAlbumColors();
    }
  } else {
    applyAccentTokens(color);
  }
}

function setOpacity(val) {
  const norm = val > 1 ? val / 100 : val;
  state.opacity = norm;

  const isLight = document.body.classList.contains('theme-light');
  document.documentElement.style.setProperty('--glass-opacity', norm);
  if (state.lastExtractedPrimary && state.adaptAlbumColor !== false) {
    applyAlbumArtThemeTokens(state.lastExtractedPrimary, isLight, state.theme === 'auto');
  } else {
    const defaultBg = isLight ? `rgba(248, 250, 254, ${norm})` : `rgba(14, 16, 24, ${norm})`;
    document.documentElement.style.setProperty('--bg-glass', defaultBg);
    if (document.body) document.body.style.setProperty('--bg-glass', defaultBg);
    const container = document.getElementById('overlayContainer');
    if (container) container.style.setProperty('--bg-glass', defaultBg);
  }
}

function setFontSize(size) {
  state.fontSize = size;
  document.documentElement.style.setProperty('--lyric-font-size', `${size}px`);
}

function setOffset(offset) {
  state.offset = offset;
}

function setLockState(locked) {
  state.isLocked = locked;
  if (btnLockToggle) {
    btnLockToggle.classList.toggle('active', locked);
    btnLockToggle.title = locked ? 'Locked: Click to unlock (Ctrl+Shift+L)' : 'Lock (Click-Through Mode, Ctrl+Shift+L)';
  }
  if (btnPillLock) {
    btnPillLock.classList.toggle('active', locked);
    btnPillLock.title = locked ? 'Locked: Click to unlock (Ctrl+Shift+L)' : 'Lock (Click-Through Mode, Ctrl+Shift+L)';
  }

  if (locked) {
    lockToast.classList.remove('hidden');
    lockToast.innerHTML = `
      <svg class="lock-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span>Locked • <u>Click to unlock</u> (Ctrl+Shift+L)</span>
    `;
  } else {
    lockToast.classList.add('hidden');
    if (window.overlyAPI?.setTempIgnoreMouseEvents) {
      window.overlyAPI.setTempIgnoreMouseEvents(false);
    }
  }
}

function setPinState(pinned) {
  state.isPinned = Boolean(pinned);
  if (btnPinToggle) {
    btnPinToggle.classList.toggle('active', state.isPinned);
    btnPinToggle.title = state.isPinned ? 'Always on Top (Enabled)' : 'Always on Top (Disabled)';
  }
  if (btnPillPin) {
    btnPillPin.classList.toggle('active', state.isPinned);
    btnPillPin.title = state.isPinned ? 'Always on Top (Enabled, P)' : 'Always on Top (Disabled, P)';
  }
  if (btnMiniPin) {
    btnMiniPin.classList.toggle('active', state.isPinned);
    btnMiniPin.title = state.isPinned ? 'Always on Top (Enabled, P)' : 'Always on Top (Disabled, P)';
  }
  if (window.overlyAPI?.setAlwaysOnTop) {
    window.overlyAPI.setAlwaysOnTop(state.isPinned);
  }
  persistSettings();
}

// ==========================================================================
// Media & Lyric Updates
// ==========================================================================

function handleMediaUpdate(data) {
  const isDifferentTrack = (state.title !== (data.title || '') || state.artist !== (data.artist || ''));
  if (isDifferentTrack) {
    updateVisSongProfile(data.title, data.artist);
  }
  const hadNoLyrics = (!state.lyrics || state.lyrics.length === 0) && !state.plainLyrics;
  const hasNowLyrics = Boolean((data.lyrics && data.lyrics.length > 0) || (data.plainLyrics && data.plainLyrics.trim()));
  const hasNewLyrics = (hadNoLyrics && hasNowLyrics) ||
    Boolean(data.lyrics && (!state.lyrics || data.lyrics.length !== state.lyrics.length)) ||
    Boolean(data.plainLyrics && data.plainLyrics !== state.plainLyrics) ||
    Boolean(data.hasSynced !== state.hasSynced && hasNowLyrics);
  const hasNewCover = Boolean(data.coverUrl && data.coverUrl !== state.coverUrl);

  const wasUnfetched = !state.hasMedia || !state.title;
  const isNowUnfetched = !data.hasMedia || !data.title;

  state.hasMedia = Boolean(data.hasMedia);
  state.title = data.title || '';
  state.artist = data.artist || '';
  state.album = data.album || '';
  state.duration = data.duration || 0;
  state.isFetchingLyrics = Boolean(data.isFetchingLyrics);

  document.body.classList.toggle('is-unfetched', isNowUnfetched);
  if (wasUnfetched !== isNowUnfetched) {
    applyTheme(state.theme);
  }

  const incomingStatus = data.status || 'Stopped';
  const now = Date.now();

  // If user recently clicked play/pause, keep optimistic status until player catches up or timeout expires
  if (optimisticStatus) {
    if (incomingStatus === optimisticStatus) {
      // Confirmed by player
      optimisticStatus = null;
      state.status = incomingStatus;
    } else if (now - optimisticStatusTime < OPTIMISTIC_STATUS_TIMEOUT) {
      // Player is still reporting stale previous state during IPC roundtrip
      state.status = optimisticStatus;
    } else {
      // Timeout reached: revert to actual player status
      optimisticStatus = null;
      state.status = incomingStatus;
    }
  } else {
    state.status = incomingStatus;
  }
  if (isDifferentTrack) {
    state.position = data.position || 0;
    state.lastPositionTime = now;
    state.trackSwitchTime = now;
  } else if (!isDraggingProgress) {
    // If user recently scrubbed/seeked manually, ignore stale incoming updates for 1s
    const timeSinceSeek = now - lastSeekTime;
    if (timeSinceSeek >= 1000) {
      const incomingPos = data.position || 0;
      if (state.status === 'Playing') {
        const currentEstimated = Math.min(state.duration, state.position + (now - state.lastPositionTime) / 1000);
        const drift = incomingPos - currentEstimated;

        // At track start (first 8s) or within 8s of track switch:
        // Snap rapidly so lyrics lock in on-beat right from the start
        const isTrackStart = (currentEstimated < 8.0 || (now - (state.trackSwitchTime || 0)) < 8000);
        const snapThreshold = isTrackStart ? 0.20 : 0.50;

        if (Math.abs(drift) > snapThreshold) {
          state.position = incomingPos;
          state.lastPositionTime = now;
          syncLyrics(incomingPos, true);
        } else if (Math.abs(drift) > 0.02) {
          const convergenceRate = isTrackStart ? 0.80 : 0.45;
          state.position = currentEstimated + (drift * convergenceRate);
          state.lastPositionTime = now;
        } else {
          // Micro-drift is negligible: keep smooth continuous progress
          state.position = currentEstimated;
          state.lastPositionTime = now;
        }
      } else {
        // Paused or Stopped: exact position
        state.position = incomingPos;
        state.lastPositionTime = now;
      }
    }
  }

  if (isDifferentTrack || hasNewLyrics || hasNewCover) {
    state.coverUrl = data.coverUrl || '';
    state.lyrics = data.lyrics || [];
    state.hasSynced = Boolean(data.hasSynced);
    state.plainLyrics = data.plainLyrics || '';
    state.activeLyricIndex = -1;

    document.body.classList.remove('pill-art-hovered');
    overlayContainer?.classList.remove('pill-more-open');
    pillMoreContainer?.classList.remove('open');

    if (data.coverColors && data.coverColors.primary) {
      state.lastExtractedPrimary = data.coverColors.primary;
      state.coverIsDark = typeof data.coverColors.isDark === 'boolean' ? data.coverColors.isDark : true;
      state.coverLuminance = typeof data.coverColors.luminance === 'number' ? data.coverColors.luminance : 0.5;
      if (state.accentColor === 'auto') {
        applyAccentTokens(data.coverColors.primary, data.coverColors.secondary);
      }
      applyTheme(state.theme);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('extractedAccentColor', data.coverColors.primary);
      }
    } else if (data.coverUrl && (!state.lastExtractedPrimary || hasNewCover)) {
      applyExtractedAlbumColors();
    }

    renderTrackInfo();
    renderLyricsList();
    updatePillInstrumentalView();
    realignLyricsToCurrentPosition(true);
    setTimeout(() => realignLyricsToCurrentPosition(true), 60);
    setTimeout(() => realignLyricsToCurrentPosition(true), 180);
  }

  // Update play/pause icon & pulse
  const isPlaying = state.status === 'Playing';
  iconPlay.classList.toggle('hidden', isPlaying);
  iconPause.classList.toggle('hidden', !isPlaying);
  if (iconMiniPlay && iconMiniPause) {
    iconMiniPlay.classList.toggle('hidden', isPlaying);
    iconMiniPause.classList.toggle('hidden', !isPlaying);
  }
  playingIndicator.classList.toggle('active', isPlaying);
  if (isPlaying) state.hoverExpandedWhilePaused = false;

  // Auto-minimize handling based on playback status
  if (isPlaying) {
    cancelAutoMinimizeTimer();
    if (state.isAutoMinimized) {
      restoreFromAutoMinimize();
    }
  } else {
    if (state.autoMinimize && (!isMouseOverOverlay || state.isImmersive) && !state.isAutoMinimized && (state.mode !== 'minimized' || state.isImmersive)) {
      if (!autoMinimizeTimer) {
        startAutoMinimizeTimer();
      }
    }
  }

  if (state.mode === 'minimized') {
    updateMinimizedDisplay();
  }

  updatePillInstrumentalView();
}

function updateMinimizedDisplay() {
  if (state.mode !== 'minimized') return;
  if (!state.hasMedia || !state.title) {
    updatePillLyric('overLy • Idle');
  } else if (state.status !== 'Playing') {
    updatePillLyric(state.title ? `Paused • ${state.title}` : 'overLy • Paused');
  } else {
    updatePillLyric(state.title);
  }
}

function updatePillLyricsBadge() {
  btnPillRetry?.classList.add('hidden');
  btnPillSearch?.classList.add('hidden');
}

function updatePillHoverTitle() {
  const hoverTitleEl = document.getElementById('pillHoverTitleText');
  if (!hoverTitleEl) return;
  if (state.hasMedia && state.title) {
    const fullText = state.artist ? `${state.title} — ${state.artist}` : state.title;
    hoverTitleEl.textContent = fullText;
    hoverTitleEl.title = fullText;
  } else {
    hoverTitleEl.textContent = 'Waiting for music...';
    hoverTitleEl.title = 'Waiting for music...';
  }
}

function renderTrackInfo() {
  if (state.mode === 'minimized') {
    updateMinimizedDisplay();
  }

  updatePillHoverTitle();

  if (!state.hasMedia || !state.title) {
    document.body.classList.add('is-unfetched');
    trackTitle.textContent = 'Searching';
    trackArtist.textContent = '';
    albumArt.classList.remove('visible');
    albumPlaceholder.classList.remove('hidden');
    updatePillLyricsBadge();
    if (state.mode !== 'minimized') {
      updatePillLyric('');
    }
    if (state.lastExtractedPrimary) {
      state.lastExtractedPrimary = null;
      if (state.accentColor === 'auto') {
        applyAccentTokens(getNeutralAccentColor(), null);
      }
      applyTheme(state.theme);
    }
    // Update Immersive Mode Elements
    if (immersiveTitle) immersiveTitle.textContent = 'Searching...';
    if (immersiveArtist) immersiveArtist.textContent = '';
    if (immersiveArt) {
      immersiveArt.src = '';
      immersiveArt.classList.remove('visible');
    }
    if (immersiveArtPlaceholder) immersiveArtPlaceholder.classList.remove('hidden');
    if (immersiveBgArt) {
      immersiveBgArt.src = '';
      immersiveBgArt.classList.remove('visible');
    }
    return;
  }

  document.body.classList.remove('is-unfetched');

  trackTitle.textContent = state.title;
  trackArtist.textContent = state.artist || 'Unknown Artist';

  // Update Immersive Mode Elements
  if (immersiveTitle) {
    immersiveTitle.textContent = state.title;
    immersiveTitle.title = state.title;
  }
  if (immersiveArtist) {
    immersiveArtist.textContent = state.artist || 'Unknown Artist';
    immersiveArtist.title = state.artist || 'Unknown Artist';
  }

  if (state.mode === 'minimized') {
    updateMinimizedDisplay();
  }

  updatePillInstrumentalView();

  if (state.coverUrl) {
    const onArtLoaded = () => {
      albumArt.classList.add('visible');
      albumPlaceholder.classList.add('hidden');
      if (!state.lastExtractedPrimary) {
        applyExtractedAlbumColors();
      }
    };
    albumArt.onload = onArtLoaded;
    albumArt.onerror = () => {
      albumArt.removeAttribute('src');
      albumArt.classList.remove('visible');
      albumPlaceholder.classList.remove('hidden');
    };

    if (albumArt.src !== state.coverUrl) {
      albumArt.src = state.coverUrl;
    }
    if (albumArt.complete && albumArt.naturalWidth > 0) {
      onArtLoaded();
    }

    if (immersiveArt) {
      immersiveArt.onload = () => {
        immersiveArt.classList.add('visible');
        immersiveArtPlaceholder?.classList.add('hidden');
      };
      immersiveArt.onerror = () => {
        immersiveArt.removeAttribute('src');
        immersiveArt.classList.remove('visible');
        immersiveArtPlaceholder?.classList.remove('hidden');
      };
      if (immersiveArt.src !== state.coverUrl) {
        immersiveArt.src = state.coverUrl;
      }
      if (immersiveArt.complete && immersiveArt.naturalWidth > 0) {
        immersiveArt.classList.add('visible');
        immersiveArtPlaceholder?.classList.add('hidden');
      }
    }
    if (immersiveBgArt) {
      if (state.adaptAlbumColor !== false) {
        if (immersiveBgArt.src !== state.coverUrl) {
          immersiveBgArt.src = state.coverUrl;
        }
        immersiveBgArt.style.display = '';
        immersiveBgArt.classList.add('visible');
      } else {
        immersiveBgArt.style.display = 'none';
        immersiveBgArt.classList.remove('visible');
      }
    }
  } else {
    albumArt.removeAttribute('src');
    albumArt.classList.remove('visible');
    albumPlaceholder.classList.remove('hidden');
    applyExtractedAlbumColors();
    if (immersiveArt) {
      immersiveArt.removeAttribute('src');
      immersiveArt.classList.remove('visible');
    }
    if (immersiveArtPlaceholder) immersiveArtPlaceholder.classList.remove('hidden');
    if (immersiveBgArt) {
      immersiveBgArt.removeAttribute('src');
      immersiveBgArt.style.display = 'none';
      immersiveBgArt.classList.remove('visible');
    }
  }

  // Update dynamic fetching status on body & placeholder tag
  document.body.classList.toggle('fetching-lyrics', state.isFetchingLyrics);
  const placeholderLabel = document.getElementById('immersivePlaceholderLabel');
  if (placeholderLabel) {
    if (state.isFetchingLyrics) {
      placeholderLabel.textContent = 'Searching...';
    } else if (!state.hasMedia || !state.title) {
      placeholderLabel.textContent = 'Idle';
    } else {
      placeholderLabel.textContent = 'No Artwork';
    }
  }
}

function hasAnyLyrics() {
  if (state.hasSynced && state.lyrics && state.lyrics.length > 0) return true;
  if (state.plainLyrics && state.plainLyrics.trim().length > 0) return true;
  return false;
}

function isInstrumentalOrNoLyrics() {
  if (!state.hasMedia) return false;
  // If actively fetching lyrics, do NOT treat as instrumental yet
  if (state.isFetchingLyrics) return false;

  const hasSynced = Boolean(state.hasSynced && state.lyrics && state.lyrics.length > 0);
  const hasPlain = Boolean(state.plainLyrics && state.plainLyrics.trim().length > 0);

  // If literally 0 lyrics found after fetching completed
  if (!hasSynced && !hasPlain) return true;

  // Collect text lines
  const allTexts = [];
  if (hasSynced) {
    state.lyrics.forEach(l => {
      const t = (l?.text || '').trim();
      if (t) allTexts.push(t);
    });
  } else if (hasPlain) {
    state.plainLyrics.split(/\r?\n/).forEach(l => {
      const t = l.trim();
      if (t) allTexts.push(t);
    });
  }

  // 0 lines is instrumental / no lyrics
  if (allTexts.length === 0) return true;

  // If song has more than 2 lines, it has real lyrics — NEVER treat as instrumental!
  if (allTexts.length > 2) return false;

  // If only 1 or 2 lines exist, check if they explicitly denote an instrumental track
  const combined = allTexts.join(' ').toLowerCase();
  const pureInstMarkers = [
    '纯音乐', '请欣赏', 'instrumental', 'pure music', 'no lyrics',
    '没有歌词', '无歌词', '作词 : 无', '作词：无', '作词:无', 'instrumental track'
  ];
  return pureInstMarkers.some(marker => combined.includes(marker));
}

function getInstrumentalTag() {
  let text = '';
  if (state.lyrics && state.lyrics.length > 0) {
    for (const l of state.lyrics) {
      if (l.text && (l.text.includes('纯音乐') || l.text.toLowerCase().includes('instrumental') || l.text.includes('音乐'))) {
        text = l.text;
        break;
      }
    }
    if (!text && state.lyrics[0]) text = state.lyrics[0].text;
  } else if (state.plainLyrics) {
    const lines = state.plainLyrics.split(/\r?\n/).filter(l => l.trim().length > 0);
    for (const l of lines) {
      if (l.includes('纯音乐') || l.toLowerCase().includes('instrumental') || l.includes('音乐')) {
        text = l;
        break;
      }
    }
    if (!text && lines[0]) text = lines[0];
  }

  if (state.isFetchingLyrics) return 'Searching...';
  if (!text) return 'No lyrics';
  if (text.includes('纯音乐')) return '纯音乐';
  if (text.toLowerCase().includes('instrumental')) return 'Instrumental';
  return text.length > 16 ? text.slice(0, 14) + '...' : text;
}

function updatePillInstrumentalView() {
  const pillVisWrap = document.getElementById('pillVisualizer');
  const pillLyricWrap = document.getElementById('pillLyricWrap');
  const pillText = document.getElementById('pillLyricText');
  const pillEqualizer = document.getElementById('pillLyricEqualizer');
  if (!pillVisWrap || !pillText) return;

  const hasLyrics = hasAnyLyrics();
  const isInst = !hasLyrics && isInstrumentalOrNoLyrics();

  if (hasLyrics) {
    // If lyrics are available, STRICTLY show lyrics row and NEVER audio visualizer
    pillVisWrap.style.display = 'none';
    if (pillLyricWrap) pillLyricWrap.style.display = 'flex';
    pillText.style.display = '';

    // Hide any mini-equalizer visualizer when lyrics are present
    if (pillEqualizer) pillEqualizer.classList.add('hidden');

    // Ensure pill text shows lyrics immediately
    if (!pillText.textContent || pillText.textContent === 'Searching lyrics...' || pillText.textContent === 'No lyrics' || pillText.textContent === 'Listening for playback') {
      if (state.hasSynced && state.lyrics.length > 0) {
        const idx = state.activeLyricIndex >= 0 ? state.activeLyricIndex : 0;
        pillText.textContent = state.lyrics[idx]?.text || state.title;
      }
      realignLyricsToCurrentPosition(true);
    }
    return;
  }

  if (isInst) {
    // Confirmed pure instrumental or 0 lyrics: show visualizer
    if (pillLyricWrap) pillLyricWrap.style.display = 'none';
    pillText.style.display = 'none';
    pillVisWrap.style.display = 'flex';
    const tagEl = document.getElementById('pillVisLabel');
    if (tagEl) {
      tagEl.textContent = getInstrumentalTag();
    }
    const stage = document.getElementById('pillVisBarsStage');
    if (stage) {
      stage.className = `vis-bars-stage pill-vis-bars vis-style-${state.visualizerStyle || 'spectrum'}`;
    }
  } else {
    // Searching or loading: show text without visualizer
    pillVisWrap.style.display = 'none';
    if (pillLyricWrap) pillLyricWrap.style.display = 'flex';
    pillText.style.display = '';
    if (pillEqualizer) pillEqualizer.classList.add('hidden');
    if (state.isFetchingLyrics) {
      pillText.textContent = 'Searching lyrics...';
    } else if (state.hasMedia && state.title) {
      pillText.textContent = `${state.title} — ${state.artist}`;
    }
  }
}

// ==========================================================================
// Instrumental Audio Visualizer Engine (Organic Audio Dynamics & Ballistics)
// ==========================================================================

let visSongHash = 0;
let visBpm = 118;
let visTimeOffset = 0;
let visLastFrameTime = 0;
const visPhysicsBuffers = new WeakMap();

function updateVisSongProfile(title, artist) {
  const str = `${title || 'overLy'}|${artist || 'Instrumental'}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  visSongHash = Math.abs(hash);
  // Derive song-specific tempo between 92 and 136 BPM
  visBpm = 92 + (visSongHash % 45);
}

function updateInstrumentalVisualizerStyle() {
  const cardStage = document.getElementById('visBarsStage');
  if (cardStage) {
    cardStage.className = `vis-bars-stage vis-style-${state.visualizerStyle || 'spectrum'}`;
  }
  const pillStage = document.getElementById('pillVisBarsStage');
  if (pillStage) {
    pillStage.className = `vis-bars-stage pill-vis-bars vis-style-${state.visualizerStyle || 'spectrum'}`;
  }
  const pillEqualizer = document.getElementById('pillLyricEqualizer');
  if (pillEqualizer) {
    const isPlaying = (state.hasMedia && state.status === 'Playing');
    pillEqualizer.className = `vis-bars-stage pill-mini-equalizer vis-style-${state.visualizerStyle || 'spectrum'}${isPlaying ? '' : ' hidden'}`;
  }
  const immersiveStage = document.getElementById('immersiveVisBarsStage');
  if (immersiveStage) {
    immersiveStage.className = `vis-bars-stage immersive-vis-bars vis-style-${state.visualizerStyle || 'spectrum'}`;
  }
}

function updateInstrumentalVisualizer() {
  const stages = [
    { el: document.getElementById('visBarsStage'), maxH: 48 },
    { el: document.getElementById('pillVisBarsStage'), maxH: 24 },
    { el: document.getElementById('pillLyricEqualizer'), maxH: 14 },
    { el: document.getElementById('immersiveVisBarsStage'), maxH: 80 }
  ];

  const isPlaying = Boolean(state.hasMedia && state.status === 'Playing');
  const now = performance.now();
  if (!visLastFrameTime) visLastFrameTime = now;
  const dt = Math.min(0.1, (now - visLastFrameTime) / 1000);
  visLastFrameTime = now;

  if (isPlaying) {
    visTimeOffset += dt;
  }

  // Use song elapsed position plus continuous local time offset for non-repeating continuous clock
  const t = (state.hasMedia && state.position > 0)
    ? (state.position + visTimeOffset)
    : visTimeOffset;

  const style = state.visualizerStyle || 'spectrum';
  const bpm = visBpm || 116;
  const bps = bpm / 60; // beats per second

  // Multi-tier musical rhythm components
  const beatClock = t * bps;
  const beatFrac = beatClock % 1; // 0..1 in current beat
  const kick = Math.pow(Math.max(0, 1 - beatFrac), 3.2); // Punchy kick transient on quarter notes

  // Snare/clap on beats 2 & 4
  const snareFrac = ((beatClock + 1) % 2) / 2;
  const snare = Math.pow(Math.max(0, 1 - snareFrac * 2), 4.2);

  // Hi-hat micro-rhythm on 16th notes
  const hihatFrac = (beatClock * 4) % 1;
  const hihat = Math.pow(Math.max(0, 1 - hihatFrac), 5.5) * 0.4;

  // Organic non-repeating multi-octave harmonic modulation (using irrational frequency multipliers)
  const drift1 = Math.sin(t * 1.414 + (visSongHash % 17));
  const drift2 = Math.cos(t * 2.236 + (visSongHash % 29));
  const drift3 = Math.sin(t * 3.605);
  const macroEnergy = 0.58 + 0.38 * Math.sin(t * 0.28 + drift1 * 0.45); // Dynamic musical verse/chorus swells

  stages.forEach(({ el, maxH }) => {
    if (!el || el.offsetParent === null) return;
    const bars = el.children;
    const numBars = bars.length;
    if (!numBars) return;

    let heights = visPhysicsBuffers.get(el);
    if (!heights || heights.length !== numBars) {
      heights = new Float32Array(numBars).fill(3);
      visPhysicsBuffers.set(el, heights);
    }

    const midPoint = (numBars - 1) / 2;

    for (let i = 0; i < numBars; i++) {
      const bar = bars[i];
      const normI = numBars > 1 ? (i / (numBars - 1)) : 0.5;
      let targetNorm = 0;

      if (isPlaying) {
        if (style === 'wave') {
          // Smooth, continuous undulating liquid wave ribbon
          // Coherent traveling wave superposition (forward, backward, micro-ripple)
          const phi1 = t * 4.2 - i * 0.32;
          const phi2 = t * 2.1 + i * 0.22;
          const phi3 = t * 6.5 - i * 0.55;
          const waveInterference = Math.sin(phi1) * 0.52 + Math.cos(phi2) * 0.34 + Math.sin(phi3) * 0.14;
          // Smooth arch envelope so the wave tapers gracefully at the edges
          const edgeEnvelope = Math.sin(normI * Math.PI);
          const waveAmp = (0.42 + 0.38 * kick + 0.2 * snare) * macroEnergy;
          targetNorm = 0.48 + waveInterference * (0.32 + 0.18 * edgeEnvelope) * waveAmp;
        } else if (style === 'pulse') {
          // Symmetric center heartbeat shockwave (propagates outward from the core)
          const centerDist = Math.abs(i - midPoint) / (midPoint || 1);
          const centerCore = Math.pow(Math.max(0, 1 - centerDist), 1.4);
          const coreHit = kick * 0.72 + snare * 0.28;
          // Traveling shockwave ripple moving outward to both edges
          const shockwave = Math.sin(t * 8.5 - centerDist * 6.8);
          targetNorm = (centerCore * (0.3 + 0.7 * coreHit) + Math.max(0, shockwave) * (0.18 + 0.32 * snare) * (1 - centerDist * 0.35)) * macroEnergy;
        } else if (style === 'minimal') {
          // Clean, modern studio level meter (NOT a traveling wave!)
          // Damped acoustic level channels reflecting musical volume envelope and frequency gradient
          const bandTilt = 0.88 - normI * 0.32;
          const breath = 0.42 + 0.36 * kick + 0.22 * snare;
          const subtleHarmonic = (Math.sin(t * 1.9 + normI * 1.5) * 0.08);
          targetNorm = Math.min(0.62, Math.max(0.14, (breath * bandTilt + subtleHarmonic) * macroEnergy * 0.65));
        } else {
          // Default: 'spectrum' (Realistic multi-band Graphic EQ Analyzer)
          // Lows/Bass on left, Mids in center, Highs/Treble on right
          let bandEnergy = 0;
          if (normI < 0.3) {
            // Bass: heavy kick thump & sub-drone
            const sub = Math.sin(t * 5.8 + i * 1.6) * 0.3 + 0.7;
            bandEnergy = kick * 0.8 + sub * 0.4;
          } else if (normI < 0.7) {
            // Mids: snare snap & vocal flutter
            const midFlutter = Math.sin(t * 9.2 + i * 2.8) * 0.4 + 0.6;
            bandEnergy = snare * 0.65 + midFlutter * 0.45;
          } else {
            // Treble: hi-hat ticks & sparkling fast transients
            const shimmer = Math.sin(t * 16.5 + i * 4.9) * 0.5 + 0.5;
            bandEnergy = hihat * 0.7 + shimmer * 0.45;
          }
          // Individual bar fractional noise so adjacent bars don't lock together
          const barHash = (((visSongHash + i * 107) % 31) / 30) * 0.25;
          const irrationalNoise = Math.sin(t * 3.1415 + i * 2.718) * Math.cos(t * 4.472 - i * 1.414) * 0.2;
          const freqTilt = 1.0 - normI * 0.28;
          targetNorm = (bandEnergy + barHash + irrationalNoise) * macroEnergy * freqTilt;
        }
      }

      // Ballistic physics calculation
      let curH = heights[i] || 3;
      if (isPlaying) {
        const clampedTarget = Math.max(0.05, Math.min(1.0, targetNorm));
        const targetH = 4 + clampedTarget * (maxH - 4);
        if (targetH > curH) {
          // Snappy attack: jump fast toward transient peaks
          const attackSpeed = (style === 'minimal') ? 0.38 : (style === 'wave' ? 0.5 : 0.68);
          curH += (targetH - curH) * attackSpeed;
        } else {
          // Exponential gravity decay
          const decayRate = (style === 'minimal') ? 0.92 : (style === 'wave' ? 0.88 : 0.84);
          curH = Math.max(targetH, curH * decayRate - 0.22);
        }
      } else {
        // Paused/stopped: smoothly decay down to rest height 3px
        if (curH > 3.1) {
          curH = Math.max(3, curH * 0.84 - 0.25);
        } else {
          curH = 3;
        }
      }

      heights[i] = curH;
      bar.style.height = `${Math.round(curH)}px`;
    }
  });
}

function renderLyricsList() {
  lyricsList.innerHTML = '';

  if (!state.hasMedia) {
    body.classList.remove('no-lyrics-collapsed');
    if (!state.isImmersive) updateWindowDimensionsForLyrics();
    updatePillLyricsBadge();
    updatePillInstrumentalView();
    const el = document.createElement('div');
    el.className = 'lyric-line placeholder-line';
    el.textContent = 'Listening for playback...';
    lyricsList.appendChild(el);
    renderImmersiveLyricsList();
    return;
  }

  // Pure instrumental or no lyrics condition
  if (isInstrumentalOrNoLyrics()) {
    body.classList.add('no-lyrics-collapsed');
    if (!state.isImmersive) updateWindowDimensionsForLyrics();
    updatePillLyricsBadge();
    updatePillInstrumentalView();

    // Render Audio Visualizer with vertical bars expanding up & down from center
    const visContainer = document.createElement('div');
    visContainer.className = 'instrumental-visualizer-container';
    visContainer.id = 'instrumentalVisualizerStage';

    const barsStage = document.createElement('div');
    barsStage.className = `vis-bars-stage vis-style-${state.visualizerStyle || 'spectrum'}`;
    barsStage.id = 'visBarsStage';

    const NUM_BARS = 22;
    for (let i = 0; i < NUM_BARS; i++) {
      const bar = document.createElement('span');
      bar.className = 'vis-bar';
      bar.style.height = '4px';
      barsStage.appendChild(bar);
    }
    visContainer.appendChild(barsStage);

    // Compact subtle footer with status and tiny Retry & Search buttons
    const footer = document.createElement('div');
    footer.className = 'vis-footer-bar';

    const statusLabel = getInstrumentalTag();

    footer.innerHTML = `
      <span class="vis-status-tag" id="visStatusTag">${statusLabel}</span>
      <button class="vis-mini-btn vis-mini-retry" id="btnVisRetry" title="Retry fetching lyrics">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
        <span>Retry</span>
      </button>
      <button class="vis-mini-btn vis-mini-search" id="btnVisSearch" title="Search for lyrics online">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>Search</span>
      </button>
    `;

    const btnRetry = footer.querySelector('#btnVisRetry');
    if (btnRetry) {
      btnRetry.addEventListener('click', async (e) => {
        e.stopPropagation();
        btnRetry.classList.add('spinning');
        await triggerRetryLyrics();
        btnRetry.classList.remove('spinning');
      });
    }

    const btnSearch = footer.querySelector('#btnVisSearch');
    if (btnSearch) {
      btnSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.overlyAPI?.openSettings) {
          window.overlyAPI.openSettings(state.title, state.artist);
        }
      });
    }

    visContainer.appendChild(footer);
    lyricsList.appendChild(visContainer);
    renderImmersiveLyricsList();
    return;
  }

  // Full lyrics available: normal lyrics rendering
  body.classList.remove('no-lyrics-collapsed');
  if (!state.isImmersive) updateWindowDimensionsForLyrics();
  updatePillLyricsBadge();
  updatePillInstrumentalView();

  if (state.hasSynced && state.lyrics.length > 0) {
    state.lyrics.forEach((line, idx) => {
      const el = document.createElement('div');
      el.className = 'lyric-line';
      el.textContent = line.text;
      el.dataset.index = idx;
      el.addEventListener('click', (e) => {
        if (e.detail > 1) {
          if (pendingLyricSeekTimer) {
            clearTimeout(pendingLyricSeekTimer);
            pendingLyricSeekTimer = null;
          }
          return;
        }

        if (pendingLyricSeekTimer) {
          clearTimeout(pendingLyricSeekTimer);
        }

        pendingLyricSeekTimer = setTimeout(() => {
          if (typeof line.time === 'number' && state.duration > 0 && window.overlyAPI?.seekTo) {
            window.overlyAPI.seekTo(line.time);
            state.position = line.time;
            state.lastPositionTime = Date.now();
            lastSeekTime = Date.now();
          }
          setActiveLyric(idx, true);
          pendingLyricSeekTimer = null;
        }, 240);
      });
      lyricsList.appendChild(el);
    });

    requestAnimationFrame(() => {
      const isPlaying = state.status === 'Playing';
      const elapsed = isPlaying ? (Date.now() - state.lastPositionTime) / 1000 : 0;
      const currentPos = Math.min(state.duration, state.position + elapsed);
      const adjustedPos = currentPos + state.offset + 0.10;
      let snapIdx = -1;
      for (let i = 0; i < state.lyrics.length; i++) {
        if (state.lyrics[i].time <= adjustedPos) snapIdx = i;
        else break;
      }
      state.activeLyricIndex = -1;
      if (snapIdx >= 0) {
        setActiveLyric(snapIdx, true);
      } else {
        if (state.lyrics.length > 0 && state.lyrics[0]?.text) {
          updatePillLyric(state.lyrics[0].text);
        } else {
          updatePillLyric(`${state.title} — ${state.artist}`);
        }
      }
    });
  } else if (state.plainLyrics) {
    const lines = state.plainLyrics.split(/\r?\n/).filter(l => l.trim().length > 0);
    lines.forEach((l) => {
      const el = document.createElement('div');
      el.className = 'lyric-line active';
      el.textContent = l.trim();
      lyricsList.appendChild(el);
    });
    if (lines.length > 0) {
      updatePillLyric(lines[0]);
    }
  }

  renderImmersiveLyricsList();
}

// ==========================================================================
// 60FPS Playback Loop & Lyric Interpolation
// ==========================================================================

function playbackLoop() {
  if (state.hasMedia && state.status === 'Playing') {
    const elapsed = (Date.now() - state.lastPositionTime) / 1000;
    const currentPos = Math.min(state.duration, state.position + elapsed);
    if (!isDraggingProgress) {
      updateProgress(currentPos);
      syncLyrics(currentPos);
    }
  } else if (state.hasMedia) {
    if (!isDraggingProgress) {
      updateProgress(state.position);
      syncLyrics(state.position);
    }
  }

  updateInstrumentalVisualizer();

  requestAnimationFrame(playbackLoop);
}

function updateProgress(currSec) {
  timeCurrent.textContent = formatTime(currSec);
  timeDuration.textContent = formatTime(state.duration);

  let percent = 0;
  if (state.duration > 0) {
    percent = Math.min(100, Math.max(0, (currSec / state.duration) * 100));
    progressFill.style.width = `${percent}%`;
    if (progressThumb) {
      progressThumb.style.left = `${percent}%`;
    }
  } else {
    progressFill.style.width = '0%';
    if (progressThumb) {
      progressThumb.style.left = '0%';
    }
  }

  // Update Immersive Mode Scrubber & Timeline
  if (immersiveTimeCurrent) immersiveTimeCurrent.textContent = formatTime(currSec);
  if (immersiveTimeDuration) immersiveTimeDuration.textContent = formatTime(state.duration);
  if (immersiveProgressFill) immersiveProgressFill.style.width = `${percent}%`;
  if (immersiveProgressThumb) immersiveProgressThumb.style.left = `${percent}%`;

  // Update collapsed view rounded border progress indicator (view-only)
  if (state.mode === 'collapsed' || state.mode === 'pill') {
    updatePillBorderProgress(percent);
  }
}

function updatePillBorderDimensions() {
  if (state.isImmersive || !pillBorderRect || !overlayContainer) return;
  const rect = overlayContainer.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w <= 0 || h <= 0) return;

  const strokeW = 2;
  const inset = strokeW / 2;
  const rectW = Math.max(0, w - strokeW);
  const rectH = Math.max(0, h - strokeW);
  const radius = rectH / 2;
  const cx = inset + rectW / 2;
  const rightX = inset + rectW;
  const bottomY = inset + rectH;
  const leftX = inset;
  const topY = inset;

  // Path starts from the middle top of the bar border and traces clockwise:
  // (cx, topY) -> top-right arc -> bottom-right arc -> bottom-left arc -> top-left arc -> closes to (cx, topY)
  const d = `M ${cx} ${topY} ` +
            `H ${rightX - radius} ` +
            `A ${radius} ${radius} 0 0 1 ${rightX} ${topY + radius} ` +
            `V ${bottomY - radius} ` +
            `A ${radius} ${radius} 0 0 1 ${rightX - radius} ${bottomY} ` +
            `H ${leftX + radius} ` +
            `A ${radius} ${radius} 0 0 1 ${leftX} ${bottomY - radius} ` +
            `V ${topY + radius} ` +
            `A ${radius} ${radius} 0 0 1 ${leftX + radius} ${topY} ` +
            `Z`;

  if (pillBorderSvg) {
    pillBorderSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  pillBorderRect.setAttribute('d', d);
  if (pillBorderTrack) {
    pillBorderTrack.setAttribute('d', d);
  }

  const totalLen = pillBorderRect.getTotalLength();
  state.pillBorderTotalLength = totalLen;
  pillBorderRect.style.strokeDasharray = `${totalLen}`;
}

function updatePillBorderProgress(percent) {
  if (!pillBorderRect) return;
  if (!state.pillBorderTotalLength || state.pillBorderTotalLength <= 0) {
    updatePillBorderDimensions();
  }
  const totalLen = state.pillBorderTotalLength;
  if (totalLen <= 0) return;

  if (percent <= 0 || !state.hasMedia) {
    pillBorderRect.style.opacity = '0';
  } else {
    pillBorderRect.style.opacity = '1';
    const offset = totalLen * (1 - percent / 100);
    pillBorderRect.style.strokeDashoffset = `${offset}`;
  }
}

function formatTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updatePillLyric(text) {
  const pillLyricWrap = document.getElementById('pillLyricWrap');
  const pillVisWrap = document.getElementById('pillVisualizer');
  const pillEqualizer = document.getElementById('pillLyricEqualizer');

  if (hasAnyLyrics()) {
    // There ARE lyrics: strictly display lyric text, NEVER visualizer
    if (pillVisWrap && pillVisWrap.style.display !== 'none') {
      pillVisWrap.style.display = 'none';
    }
    if (pillLyricWrap && pillLyricWrap.style.display !== 'flex') {
      pillLyricWrap.style.display = 'flex';
    }
    if (pillLyricText && pillLyricText.style.display !== '') {
      pillLyricText.style.display = '';
    }
    if (pillEqualizer) pillEqualizer.classList.add('hidden');

    if (!pillLyricText) return;
    const newText = text || '';
    if (pillLyricText.textContent === newText) return;
    pillLyricText.textContent = newText;
    pillLyricText.classList.remove('anim-change');
    void pillLyricText.offsetWidth; // Force reflow to re-trigger pop-in animation
    pillLyricText.classList.add('anim-change');
    return;
  }

  if (isInstrumentalOrNoLyrics()) {
    updatePillInstrumentalView();
    return;
  }

  // Ensure pill lyric container and wrap are visible and visualizer is hidden
  if (pillVisWrap && pillVisWrap.style.display !== 'none') {
    pillVisWrap.style.display = 'none';
  }
  if (pillLyricWrap && pillLyricWrap.style.display !== 'flex') {
    pillLyricWrap.style.display = 'flex';
  }
  if (pillLyricText && pillLyricText.style.display !== '') {
    pillLyricText.style.display = '';
  }
  if (pillEqualizer) pillEqualizer.classList.add('hidden');

  if (!pillLyricText) return;
  const newText = text || '';
  if (pillLyricText.textContent === newText) return;
  pillLyricText.textContent = newText;
  pillLyricText.classList.remove('anim-change');
  void pillLyricText.offsetWidth; // Force reflow to re-trigger pop-in animation
  pillLyricText.classList.add('anim-change');
}

async function triggerRetryLyrics() {
  if (!window.overlyAPI?.retryLyrics) return;
  if (state.isFetchingLyrics) return;

  state.isFetchingLyrics = true;
  updatePillLyricsBadge();
  if (btnPillRetry) {
    btnPillRetry.classList.add('spinning');
    btnPillRetry.setAttribute('disabled', 'true');
  }
  const retryCardBtn = document.getElementById('btnRetryEmptyLyrics');
  if (retryCardBtn) {
    retryCardBtn.classList.add('spinning');
    retryCardBtn.setAttribute('disabled', 'true');
    retryCardBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
      </svg>
      Retrying...`;
  }
  updatePillLyric('Retrying lyrics...');

  try {
    const res = await window.overlyAPI.retryLyrics();
    if (res && ((res.lyrics && res.lyrics.length > 0) || res.plainLyrics)) {
      state.coverUrl = res.coverUrl || state.coverUrl;
      state.lyrics = res.lyrics || [];
      state.hasSynced = Boolean(res.hasSynced);
      state.plainLyrics = res.plainLyrics || '';
      state.activeLyricIndex = -1;
      document.body.classList.remove('pill-art-hovered');
      overlayContainer?.classList.remove('pill-more-open');
      pillMoreContainer?.classList.remove('open');
      renderTrackInfo();
      renderLyricsList();
      updatePillInstrumentalView();
      realignLyricsToCurrentPosition(true);
    }
  } catch (err) {
    console.error('Error retrying lyrics:', err);
  } finally {
    state.isFetchingLyrics = false;
    if (btnPillRetry) {
      btnPillRetry.classList.remove('spinning');
      btnPillRetry.removeAttribute('disabled');
    }
    const cardBtn = document.getElementById('btnRetryEmptyLyrics');
    if (cardBtn) {
      cardBtn.classList.remove('spinning');
      cardBtn.removeAttribute('disabled');
      cardBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
        Retry`;
    }
    const hasLyrics = Boolean(state.hasSynced && state.lyrics.length > 0) || Boolean(state.plainLyrics);
    if (!hasLyrics && state.hasMedia && state.title) {
      updatePillLyric('No lyrics');
    }
    updatePillLyricsBadge();
  }
}

function syncLyrics(currentPos, force = false) {
  const hasLyrics = Boolean(state.hasSynced && state.lyrics.length > 0);

  if (!hasLyrics) {
    if (state.hasMedia && state.title) {
      if (state.plainLyrics) {
        const lines = state.plainLyrics.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const ratio = state.duration > 0 ? Math.max(0, Math.min(1, currentPos / state.duration)) : 0;
          const idx = Math.min(lines.length - 1, Math.floor(ratio * lines.length));
          updatePillLyric(lines[idx]);
        } else {
          updatePillLyric(`${state.title} — ${state.artist}`);
        }
      } else {
        updatePillLyric(state.isFetchingLyrics ? 'Searching lyrics...' : 'No lyrics');
      }
    }
    updatePillLyricsBadge();
    return;
  }

  // 100ms lead-in compensates for OS audio output buffer latency, ensuring lyrics highlight right on the vocal beat
  const adjustedPos = currentPos + state.offset + 0.10;
  let targetIdx = -1;

  for (let i = 0; i < state.lyrics.length; i++) {
    if (state.lyrics[i].time <= adjustedPos) {
      targetIdx = i;
    } else {
      break;
    }
  }

  // If before first lyric (song intro/instrumental)
  if (targetIdx === -1) {
    const pillTextEl = document.getElementById('pillLyricText');
    const isUninitialized = !pillTextEl || !pillTextEl.textContent || pillTextEl.textContent === 'Listening for playback' || pillTextEl.textContent === 'Searching lyrics...';
    if (state.activeLyricIndex !== -1 || force || isUninitialized) {
      state.activeLyricIndex = -1;
      const introText = (state.lyrics && state.lyrics.length > 0 && state.lyrics[0]?.text)
        ? state.lyrics[0].text
        : `${state.title} — ${state.artist}`;
      updatePillLyric(introText);
      const lineEls = lyricsList.querySelectorAll('.lyric-line');
      lineEls.forEach(el => el.classList.remove('active', 'near-active'));
      if (immersiveLyricsList) {
        const immLines = immersiveLyricsList.querySelectorAll('.immersive-lyric-line');
        immLines.forEach(el => el.classList.remove('active'));
      }
    }
    return;
  }

  // Prevent jumping back and forth:
  // Only allow advancing forward, or rewinding if force is true (seek/click/mode-change)
  // or if playback genuinely rewound past the current line's start time
  if (targetIdx !== state.activeLyricIndex) {
    if (force || targetIdx > state.activeLyricIndex) {
      setActiveLyric(targetIdx, force);
    } else {
      const currentActiveTime = state.lyrics[state.activeLyricIndex]?.time ?? 0;
      if (adjustedPos < currentActiveTime - 0.35) {
        setActiveLyric(targetIdx, false);
      }
    }
  }
}

function scrollActiveLyricToCenter(instant = false) {
  if (state.activeLyricIndex < 0 || !state.lyrics || !state.lyrics.length) return;
  if (!lyricsScrollArea || !lyricsList) return;
  if (state.mode === 'collapsed' || state.mode === 'pill' || state.mode === 'minimized') return;

  const vpHeight = lyricsScrollArea.clientHeight;
  if (vpHeight <= 0) return;

  const lineEls = lyricsList.querySelectorAll('.lyric-line');
  const activeEl = lineEls[state.activeLyricIndex];
  if (!activeEl) return;

  const activeTop = activeEl.offsetTop;
  const activeHeight = activeEl.clientHeight;
  if (activeHeight <= 0) return;

  const scrollTarget = activeTop - (vpHeight / 2) + (activeHeight / 2);
  lyricsScrollArea.scrollTo({
    top: Math.max(0, scrollTarget),
    behavior: instant ? 'instant' : 'smooth'
  });
}

function scrollActiveImmersiveLyricToCenter(instant = false) {
  if (!state.isImmersive || state.activeLyricIndex < 0) return;
  if (!immersiveLyricsList || !immersiveLyricsViewport) return;

  const vpHeight = immersiveLyricsViewport.clientHeight;
  if (vpHeight <= 0) return;

  const immLines = immersiveLyricsList.querySelectorAll('.immersive-lyric-line');
  const activeImmLine = immLines[state.activeLyricIndex];
  if (!activeImmLine) return;

  const scrollTarget = activeImmLine.offsetTop - (vpHeight / 2) + (activeImmLine.clientHeight / 2);
  immersiveLyricsViewport.scrollTo({
    top: Math.max(0, scrollTarget),
    behavior: instant ? 'instant' : 'smooth'
  });
}

function realignLyricsToCurrentPosition(instant = true) {
  if (!state.hasMedia) return;

  const isPlaying = state.status === 'Playing';
  const elapsed = isPlaying ? (Date.now() - state.lastPositionTime) / 1000 : 0;
  const currentPos = Math.min(state.duration, state.position + elapsed);

  const hasLyrics = Boolean(state.hasSynced && state.lyrics && state.lyrics.length > 0);
  if (hasLyrics) {
    const adjustedPos = currentPos + state.offset + 0.10;
    let targetIdx = -1;
    for (let i = 0; i < state.lyrics.length; i++) {
      if (state.lyrics[i].time <= adjustedPos) {
        targetIdx = i;
      } else {
        break;
      }
    }

    if (targetIdx >= 0) {
      setActiveLyric(targetIdx, instant);
      scrollActiveLyricToCenter(instant);
      if (state.isImmersive) {
        scrollActiveImmersiveLyricToCenter(instant);
      }
    } else {
      state.activeLyricIndex = -1;
      const introText = (state.lyrics && state.lyrics.length > 0 && state.lyrics[0]?.text)
        ? state.lyrics[0].text
        : `${state.title} — ${state.artist}`;
      updatePillLyric(introText);
      const lineEls = lyricsList?.querySelectorAll('.lyric-line');
      lineEls?.forEach(el => el.classList.remove('active', 'near-active'));
      if (immersiveLyricsList) {
        const immLines = immersiveLyricsList.querySelectorAll('.immersive-lyric-line');
        immLines.forEach(el => el.classList.remove('active', 'near-active'));
      }
    }
  } else if (state.plainLyrics) {
    const lines = state.plainLyrics.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const ratio = state.duration > 0 ? Math.max(0, Math.min(1, currentPos / state.duration)) : 0;
      const idx = Math.min(lines.length - 1, Math.floor(ratio * lines.length));
      updatePillLyric(lines[idx]);
    }
  }
}

function setActiveLyric(index, instant = false) {
  if (state.activeLyricIndex === index && !instant) return;
  state.activeLyricIndex = index;
  const lineEls = lyricsList ? lyricsList.querySelectorAll('.lyric-line') : null;

  if (lineEls) {
    lineEls.forEach((el, idx) => {
      const isActive = idx === index;
      const isNear = Math.abs(idx - index) === 1;
      el.classList.toggle('active', isActive);
      el.classList.toggle('near-active', isNear && !isActive);
    });
  }

  // Immersive Mode Synchronized Lyrics Highlight & Smooth Scrolling
  if (immersiveLyricsList) {
    const immLines = immersiveLyricsList.querySelectorAll('.immersive-lyric-line');
    immLines.forEach((el, idx) => {
      const isActive = idx === index;
      const isNear = Math.abs(idx - index) === 1;
      el.classList.toggle('active', isActive);
      el.classList.toggle('near-active', isNear && !isActive);
    });

    scrollActiveImmersiveLyricToCenter(instant);
  }

  if (index >= 0 && index < state.lyrics.length) {
    const currentLine = state.lyrics[index];
    updatePillLyric(currentLine.text || state.title);

    scrollActiveLyricToCenter(instant);
  } else if (state.hasMedia && state.title) {
    updatePillLyric(`${state.title} — ${state.artist}`);
  }
}

// Start app reliably
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
