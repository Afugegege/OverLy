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
  accentColor: '#FF3040',
  opacity: 0.85,
  fontSize: 18,
  offset: 0.0,
  isLocked: false,
  isPinned: true,
  isResizeMode: false,
  autoMinimize: false,
  isAutoMinimized: false,
  preAutoMinMode: null,

  activeLyricIndex: -1,
  isFetchingLyrics: false
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
const btnPillPin = document.getElementById('btnPillPin');
const btnPillResize = document.getElementById('btnPillResize');
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
const btnMinimizedExpand = document.getElementById('btnMinimizedExpand');
const pillLyricsBadge = document.getElementById('pillLyricsBadge');
const pillSearchingIndicator = document.getElementById('pillSearchingIndicator');
const btnPillRetry = document.getElementById('btnPillRetry');
const btnPillSearch = document.getElementById('btnPillSearch');
const lyricsScrollArea = document.getElementById('lyricsScrollArea');
const lyricsList = document.getElementById('lyricsList');
const timeCurrent = document.getElementById('timeCurrent');
const timeDuration = document.getElementById('timeDuration');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');

// Collapsed View Rounded Border Progress Bar Elements
const pillBorderSvg = document.getElementById('pillBorderSvg');
const pillBorderTrack = document.getElementById('pillBorderTrack');
const pillBorderRect = document.getElementById('pillBorderRect');

// Dragging & seeking state
let isDraggingProgress = false;
let lastSeekTime = 0;
let pendingLyricSeekTimer = null;

// Optimistic play/pause state & debounce
let optimisticStatus = null;
let optimisticStatusTime = 0;
const OPTIMISTIC_STATUS_TIMEOUT = 1200;

// Auto-minimize idle state & timer
let autoMinimizeTimer = null;
let isMouseOverOverlay = false;
const AUTO_MINIMIZE_DELAY_MS = 10000;

function startAutoMinimizeTimer() {
  cancelAutoMinimizeTimer();
  if (!state.autoMinimize) return;
  if (state.mode === 'minimized' || state.isAutoMinimized || isMouseOverOverlay) return;
  const isPlaying = (state.hasMedia && state.status === 'Playing');
  if (isPlaying) return;

  autoMinimizeTimer = setTimeout(() => {
    triggerAutoMinimize();
  }, AUTO_MINIMIZE_DELAY_MS);
}

function cancelAutoMinimizeTimer() {
  if (autoMinimizeTimer) {
    clearTimeout(autoMinimizeTimer);
    autoMinimizeTimer = null;
  }
}

function triggerAutoMinimize() {
  cancelAutoMinimizeTimer();
  if (!state.autoMinimize) return;
  if (state.mode === 'minimized' || state.isAutoMinimized || isMouseOverOverlay) return;
  const isPlaying = (state.hasMedia && state.status === 'Playing');
  if (isPlaying) return;

  state.preAutoMinMode = state.mode;
  state.isAutoMinimized = true;
  setMode('minimized', true, true);
}

function restoreFromAutoMinimize() {
  cancelAutoMinimizeTimer();
  if (!state.isAutoMinimized) return;
  const targetMode = state.preAutoMinMode || 'card';
  state.isAutoMinimized = false;
  state.preAutoMinMode = null;
  setMode(targetMode, true, true);
}

// Corner Resize Handle
const resizeHandle = document.getElementById('resizeHandle');

// ==========================================================================
// Initialization & Settings
// ==========================================================================

async function init() {
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
      } else {
        setMode(state.mode, false);
        setAccentColor(state.accentColor);
        setOpacity(state.opacity);
        setPinState(state.isPinned);
      }

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
        if (key === 'mode') setMode(value, true);
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
          updatePillLyricsBadge();
          renderTrackInfo();
          renderLyricsList();
        }
      });

      // If auto-minimize is active and player is paused or idle at startup, arm the timer
      if (state.autoMinimize && !isMouseOverOverlay && state.mode !== 'minimized' && (!state.hasMedia || state.status !== 'Playing')) {
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
      autoMinimize: state.autoMinimize
    });
  }
}

function applyTheme(themeData) {
  const setting = typeof themeData === 'object' ? themeData.setting : themeData;
  const effective = (typeof themeData === 'object' && themeData.effective) ? themeData.effective : (
    setting === 'light' ? 'light' : setting === 'dark' ? 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  );

  state.theme = setting || 'system';
  state.effectiveTheme = effective;

  document.body.classList.toggle('theme-light', effective === 'light');
  document.body.classList.toggle('theme-dark', effective !== 'light');

  // Re-apply opacity with new base background color
  setOpacity(state.opacity);

  // Re-calculate accent tokens for light/dark contrast
  if (state.accentColor) {
    setAccentColor(state.accentColor);
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
    btnMinimize, btnClose, btnPlayPause, btnPrev, btnNext, btnPillExpand, btnPillRetry, btnPillSearch,
    btnMinimizedExpand
  ];
  interactiveBtns.forEach((btn) => {
    if (btn) {
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
    }
  });

  // Mode toggle
  btnModeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const modes = ['card', 'collapsed', 'minimized', 'lyrics', 'expanded'];
    const nextIdx = (modes.indexOf(state.mode) + 1) % modes.length;
    setMode(modes[nextIdx], true);
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

  // Close pill more actions tray if clicking outside
  document.addEventListener('click', (e) => {
    if (pillMoreContainer && !pillMoreContainer.contains(e.target)) {
      pillMoreContainer.classList.remove('open');
      overlayContainer?.classList.remove('pill-more-open');
    }
  });

  // Also close pill more actions when window blurs or mouse leaves overlay
  window.addEventListener('blur', () => {
    pillMoreContainer?.classList.remove('open');
    overlayContainer?.classList.remove('pill-more-open');
  });

  if (overlayContainer) {
    overlayContainer.addEventListener('mouseenter', () => {
      isMouseOverOverlay = true;
      cancelAutoMinimizeTimer();
      if (state.isAutoMinimized) {
        restoreFromAutoMinimize();
      }
    });

    overlayContainer.addEventListener('mousemove', () => {
      isMouseOverOverlay = true;
      if (state.isAutoMinimized) {
        restoreFromAutoMinimize();
      }
    });

    overlayContainer.addEventListener('mouseleave', () => {
      isMouseOverOverlay = false;
      pillMoreContainer?.classList.remove('open');
      overlayContainer.classList.remove('pill-more-open');
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
  if (btnPillExpand) {
    btnPillExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      pillMoreContainer?.classList.remove('open');
      overlayContainer?.classList.remove('pill-more-open');
      const modes = ['card', 'collapsed', 'minimized', 'lyrics', 'expanded'];
      const nextIdx = (modes.indexOf(state.mode) + 1) % modes.length;
      setMode(modes[nextIdx], true);
    });
  }

  // Minimized mode quick expand/restore button
  if (btnMinimizedExpand) {
    btnMinimizedExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = state.preAutoMinMode || 'card';
      setMode(target, true);
    });
  }

  // Pill view lyrics retry button
  if (btnPillRetry) {
    btnPillRetry.addEventListener('click', async (e) => {
      e.stopPropagation();
      await triggerRetryLyrics();
    });
  }

  // Pill view lyrics search button
  if (btnPillSearch) {
    btnPillSearch.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.overlyAPI?.openSettings) {
        window.overlyAPI.openSettings(state.title, state.artist);
      }
    });
  }

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
  }, true);

  // Double-click anywhere outside interactive controls to toggle layout window
  overlayContainer?.addEventListener('dblclick', (e) => {
    if (pendingLyricSeekTimer) {
      clearTimeout(pendingLyricSeekTimer);
      pendingLyricSeekTimer = null;
    }

    // If double-clicked on interactive buttons, inputs, seek bar, or menu controls, ignore
    const interactive = e.target.closest(
      'button, input, select, textarea, .media-btn, .icon-btn, .pill-action-btn, ' +
      '.no-lyrics-btn, .progress-container, .resize-handle, .pill-more-actions'
    );
    if (interactive) return;

    e.preventDefault();
    e.stopPropagation();

    const modes = ['card', 'collapsed', 'minimized', 'lyrics', 'expanded'];
    const currentMode = (state.mode === 'pill') ? 'collapsed' : (state.mode === 'normal') ? 'card' : (state.mode === 'mini' ? 'minimized' : state.mode);
    const nextIdx = (modes.indexOf(currentMode) + 1) % modes.length;
    setMode(modes[nextIdx], true);
  });

  // Global keyboard shortcuts: 'M' (cycle mode), 'P' (toggle pin), 'R' (toggle resize)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'm' || e.key === 'M' || (e.ctrlKey && e.key.toLowerCase() === 'm')) {
      e.preventDefault();
      const modes = ['card', 'collapsed', 'minimized', 'lyrics', 'expanded'];
      const nextIdx = (modes.indexOf(state.mode) + 1) % modes.length;
      setMode(modes[nextIdx], true);
    } else if (e.key === 'p' || e.key === 'P' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
      e.preventDefault();
      setPinState(!state.isPinned);
    } else if (e.key === 'r' || e.key === 'R' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
      e.preventDefault();
      toggleResizeMode();
    }
  });

  // Setup reliable pointer-captured window dragging from clicking anywhere outside interactive controls
  setupWindowDrag(overlayContainer);

  // Setup interactive audio progress bar scrubber (click & drag to pull/seek)
  setupProgressScrubber();

  // Setup corner resize handle
  setupCornerResize();

  // Keep collapsed border progress bar aligned on window resize / layout reflow
  window.addEventListener('resize', () => {
    if (state.mode === 'collapsed' || state.mode === 'pill') {
      updatePillBorderDimensions();
    }
  });

  if (window.ResizeObserver && overlayContainer) {
    const ro = new ResizeObserver(() => {
      if (state.mode === 'collapsed' || state.mode === 'pill') {
        updatePillBorderDimensions();
      }
    });
    ro.observe(overlayContainer);
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

function setupWindowDrag(element) {
  if (!element) return;

  element.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // Left click only

    // If click is on an interactive button or control, let the element handle it
    const interactive = e.target.closest(
      'button, input, select, textarea, .media-btn, .icon-btn, .pill-action-btn, ' +
      '.no-lyrics-btn, .progress-container, .resize-handle, .pill-more-actions, ' +
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
    return { width: 208, height: 62 };
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
  if (!window.overlyAPI) return;
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
    if (state.isAutoMinimized) {
      state.isAutoMinimized = false;
      state.preAutoMinMode = null;
    }
    if (mode === 'minimized') {
      cancelAutoMinimizeTimer();
    } else if (state.autoMinimize && !isMouseOverOverlay && (!state.hasMedia || state.status !== 'Playing')) {
      startAutoMinimizeTimer();
    }
  }

  state.mode = mode;
  if (mode !== 'card') {
    state.lastNonCardMode = mode;
  }
  body.classList.remove('mode-pill', 'mode-collapsed', 'mode-minimized', 'mode-card', 'mode-normal', 'mode-lyrics', 'mode-expanded');
  body.classList.add(`mode-${mode}`);
  if (mode === 'collapsed') body.classList.add('mode-pill');
  if (mode === 'card') body.classList.add('mode-normal');

  overlayContainer?.classList.remove('pill-more-open');
  pillMoreContainer?.classList.remove('open');

  updateModeButtonUI(mode);

  if (mode === 'minimized') {
    updateMinimizedDisplay();
  }

  if (updateSize && window.overlyAPI) {
    const target = getTargetWindowDimensions(mode);
    window.overlyAPI.setWindowSize?.(target.width, target.height, mode);
    // Re-assert topmost state on mode size transition
    if (state.isPinned) {
      window.overlyAPI.setAlwaysOnTop?.(true);
    }
  }

  // Force re-sync lyrics after mode switch so they stay in sync.
  // Reset activeLyricIndex so the guards in syncLyrics/setActiveLyric
  // don't skip the update, and use a short delay for the DOM to reflow
  // after the CSS mode class change.
  const savedIndex = state.activeLyricIndex;
  state.activeLyricIndex = -1;
  setTimeout(() => {
    if (savedIndex >= 0) {
      setActiveLyric(savedIndex, true);
    }
    // Also force a position-based sync to catch any drift
    if (state.hasMedia && state.status === 'Playing') {
      const elapsed = (Date.now() - state.lastPositionTime) / 1000;
      const currentPos = Math.min(state.duration, state.position + elapsed);
      syncLyrics(currentPos, true);
    } else if (state.hasMedia) {
      syncLyrics(state.position, true);
    }

    if (mode === 'collapsed' || mode === 'pill') {
      updatePillBorderDimensions();
    }
  }, 60);

  persistSettings();
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
      svg: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="9" width="16" height="6" rx="3"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/></svg>`,
      title: 'Layout: Minimized (Click for Lyrics Only)'
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

function setAccentColor(color) {
  state.accentColor = color;
  const rgb = hexToRgb(color);

  // Perceived luminance formula (ITU-R BT.709 / W3C)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const isLight = document.body.classList.contains('theme-light');

  let contrastColor = '#ffffff';
  let accentText = color;
  let playBtnBg = color;
  let playBtnText = '#ffffff';
  let playBtnBorder = '1px solid rgba(255, 255, 255, 0.2)';
  let playBtnShadow = 'none';

  if (luminance > 0.70) {
    // Pure white or very bright accent (e.g. #FFFFFF)
    if (isLight) {
      // In Light mode: white text is invisible against light glass, so accent text is rich dark
      accentText = '#0f1118';
      contrastColor = '#0f1118';
      playBtnBg = '#ffffff';
      playBtnText = '#0f1118';
      playBtnBorder = '1.5px solid rgba(0, 0, 0, 0.22)';
      playBtnShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
    } else {
      // In Dark mode: white is bright, vibrant, and high contrast
      accentText = '#ffffff';
      contrastColor = '#0e1018';
      playBtnBg = '#ffffff';
      playBtnText = '#0e1018';
      playBtnBorder = '1px solid rgba(255, 255, 255, 0.35)';
      playBtnShadow = '0 4px 14px rgba(255, 255, 255, 0.25)';
    }
  } else if (luminance < 0.25) {
    // Jet black or very dark accent (e.g. #18181B or #000000)
    if (isLight) {
      // In Light mode: black is sharp and crisp
      accentText = '#18181b';
      contrastColor = '#ffffff';
      playBtnBg = '#18181b';
      playBtnText = '#ffffff';
      playBtnBorder = '1px solid rgba(0, 0, 0, 0.2)';
      playBtnShadow = '0 4px 14px rgba(0, 0, 0, 0.2)';
    } else {
      // In Dark mode: pure black text is invisible on dark card, so accent text is white!
      accentText = '#ffffff';
      contrastColor = '#ffffff';
      playBtnBg = '#22232a';
      playBtnText = '#ffffff';
      playBtnBorder = '1.5px solid rgba(255, 255, 255, 0.45)';
      playBtnShadow = '0 4px 14px rgba(255, 255, 255, 0.2)';
    }
  } else {
    // Standard chromatic accents
    contrastColor = luminance > 0.6 ? '#11131a' : '#ffffff';
    accentText = color;
    playBtnBg = color;
    playBtnText = contrastColor;
    playBtnBorder = '1px solid rgba(255, 255, 255, 0.25)';
    playBtnShadow = `0 4px 14px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  }

  // Harmonious lighter tint for gradients without any hardcoded pink/red
  const lighterR = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.35));
  const lighterG = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.35));
  const lighterB = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.35));
  const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;

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
  document.documentElement.style.setProperty('--aura-color2', `rgba(${lighterR}, ${lighterG}, ${lighterB}, 0.10)`);

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

function setOpacity(val) {
  const norm = val > 1 ? val / 100 : val;
  state.opacity = norm;

  const isLight = document.body.classList.contains('theme-light');
  document.documentElement.style.setProperty('--glass-opacity', norm);
  if (isLight) {
    document.documentElement.style.setProperty('--bg-glass', `rgba(248, 250, 254, ${norm})`);
  } else {
    document.documentElement.style.setProperty('--bg-glass', `rgba(14, 16, 24, ${norm})`);
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
  const hadNoLyrics = (state.lyrics.length === 0 && !state.plainLyrics);
  const hasNowLyrics = Boolean((data.lyrics && data.lyrics.length > 0) || data.plainLyrics);
  const hasNewLyrics = (hadNoLyrics && hasNowLyrics) || (data.lyrics && data.lyrics.length !== state.lyrics.length);
  const hasNewCover = Boolean(data.coverUrl && data.coverUrl !== state.coverUrl);

  state.hasMedia = Boolean(data.hasMedia);
  state.title = data.title || '';
  state.artist = data.artist || '';
  state.album = data.album || '';
  state.duration = data.duration || 0;
  state.isFetchingLyrics = Boolean(data.isFetchingLyrics);

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
  } else if (!isDraggingProgress) {
    // If user recently scrubbed/seeked manually, ignore stale incoming updates for 1s
    const timeSinceSeek = now - lastSeekTime;
    if (timeSinceSeek >= 1000) {
      const incomingPos = data.position || 0;
      if (state.status === 'Playing') {
        const currentEstimated = Math.min(state.duration, state.position + (now - state.lastPositionTime) / 1000);
        const drift = incomingPos - currentEstimated;

        // If drift is significant (> 1.2s), it's a real seek in the external player
        if (Math.abs(drift) > 1.2) {
          state.position = incomingPos;
          state.lastPositionTime = now;
          syncLyrics(incomingPos, true);
        } else if (Math.abs(drift) > 0.04) {
          // Smooth continuous time nudge: adjust from currentEstimated to prevent clock stutter
          state.position = currentEstimated + (drift * 0.35);
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

    renderTrackInfo();
    renderLyricsList();
  }

  // Update play/pause icon & pulse
  const isPlaying = state.status === 'Playing';
  iconPlay.classList.toggle('hidden', isPlaying);
  iconPause.classList.toggle('hidden', !isPlaying);
  playingIndicator.classList.toggle('active', isPlaying);

  // Auto-minimize handling based on playback status
  if (isPlaying) {
    cancelAutoMinimizeTimer();
    if (state.isAutoMinimized) {
      restoreFromAutoMinimize();
    }
  } else {
    if (state.autoMinimize && !isMouseOverOverlay && !state.isAutoMinimized && state.mode !== 'minimized') {
      if (!autoMinimizeTimer) {
        startAutoMinimizeTimer();
      }
    }
  }

  if (state.mode === 'minimized') {
    updateMinimizedDisplay();
  }
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
  const hasLyrics = Boolean(state.hasSynced && state.lyrics.length > 0) || Boolean(state.plainLyrics);

  if (!state.hasMedia || !state.title || hasLyrics) {
    btnPillRetry?.classList.add('hidden');
    btnPillSearch?.classList.add('hidden');
    return;
  }

  if (state.isFetchingLyrics) {
    btnPillRetry?.classList.add('hidden');
    btnPillSearch?.classList.add('hidden');
  } else {
    btnPillRetry?.classList.remove('hidden');
    btnPillSearch?.classList.remove('hidden');
  }
}

function renderTrackInfo() {
  if (state.mode === 'minimized') {
    updateMinimizedDisplay();
  }

  if (!state.hasMedia || !state.title) {
    trackTitle.textContent = 'Waiting for music...';
    trackArtist.textContent = 'Spotify • Apple Music • Any Player';
    albumArt.classList.remove('visible');
    albumPlaceholder.classList.remove('hidden');
    updatePillLyricsBadge();
    if (state.mode !== 'minimized') {
      updatePillLyric('Listening for playback');
    }
    return;
  }

  trackTitle.textContent = state.title;
  trackArtist.textContent = state.artist || 'Unknown Artist';

  if (state.mode === 'minimized') {
    updateMinimizedDisplay();
  }

  if (state.coverUrl) {
    albumArt.src = state.coverUrl;
    albumArt.onload = () => {
      albumArt.classList.add('visible');
      albumPlaceholder.classList.add('hidden');
    };
    albumArt.onerror = () => {
      albumArt.classList.remove('visible');
      albumPlaceholder.classList.remove('hidden');
    };
  } else {
    albumArt.classList.remove('visible');
    albumPlaceholder.classList.remove('hidden');
  }
}

function renderLyricsList() {
  lyricsList.innerHTML = '';

  const hasLyrics = Boolean(state.hasSynced && state.lyrics.length > 0) || Boolean(state.plainLyrics);

  if (!state.hasMedia) {
    body.classList.remove('no-lyrics-collapsed');
    updateWindowDimensionsForLyrics();
    updatePillLyricsBadge();
    const el = document.createElement('div');
    el.className = 'lyric-line placeholder-line';
    el.textContent = 'Listening for playback...';
    lyricsList.appendChild(el);
    return;
  }

  // When no lyrics are available: collapse window height while strictly preserving user's chosen layout mode
  if (hasLyrics) {
    body.classList.remove('no-lyrics-collapsed');
    updateWindowDimensionsForLyrics();
    updatePillLyricsBadge();
  } else {
    body.classList.add('no-lyrics-collapsed');
    updateWindowDimensionsForLyrics();
    updatePillLyricsBadge();
    if (state.hasMedia && state.title && !state.plainLyrics) {
      updatePillLyric(state.isFetchingLyrics ? 'Searching lyrics...' : 'No lyrics');
    }
  }

  if (state.hasSynced && state.lyrics.length > 0) {
    state.lyrics.forEach((line, idx) => {
      const el = document.createElement('div');
      el.className = 'lyric-line';
      el.textContent = line.text;
      el.dataset.index = idx;
      el.addEventListener('click', (e) => {
        // If clicking as part of a double-click gesture (e.detail > 1), don't trigger lyric seek
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

    // After rendering, immediately snap-scroll to wherever in the song we currently are.
    // Use requestAnimationFrame so the DOM has painted the lines before we measure offsetTop.
    requestAnimationFrame(() => {
      const adjustedPos = state.position + state.offset;
      let snapIdx = -1;
      for (let i = 0; i < state.lyrics.length; i++) {
        if (state.lyrics[i].time <= adjustedPos) snapIdx = i;
        else break;
      }
      state.activeLyricIndex = -1; // force setActiveLyric to run
      if (snapIdx >= 0) {
        setActiveLyric(snapIdx, true /* instant */);
      } else {
        // Song is in intro before first lyric line: display track info instead of "No lyrics"
        updatePillLyric(`${state.title} — ${state.artist}`);
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
  } else {
    // Sleek, compact empty state with Retry and Search buttons
    const emptyCard = document.createElement('div');
    emptyCard.className = 'no-lyrics-card';
    if (state.isFetchingLyrics) {
      emptyCard.innerHTML = `
        <div class="no-lyrics-searching">
          <svg class="searching-spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span class="no-lyrics-status">Searching...</span>
        </div>
      `;
    } else {
      emptyCard.innerHTML = `
        <span class="no-lyrics-status">No lyrics</span>
        <div class="no-lyrics-actions">
          <button id="btnRetryEmptyLyrics" class="no-lyrics-btn retry-btn" title="Retry fetching lyrics">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            Retry
          </button>
          <button id="btnSearchEmptyLyrics" class="no-lyrics-btn search-btn" title="Search for lyrics online">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Search
          </button>
        </div>
      `;
    }
    const btnRetryEmpty = emptyCard.querySelector('#btnRetryEmptyLyrics');
    if (btnRetryEmpty) {
      btnRetryEmpty.addEventListener('click', async (e) => {
        e.stopPropagation();
        await triggerRetryLyrics();
      });
    }
    const btnSearchEmpty = emptyCard.querySelector('#btnSearchEmptyLyrics');
    if (btnSearchEmpty) {
      btnSearchEmpty.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.overlyAPI?.openSettings) {
          window.overlyAPI.openSettings(state.title, state.artist);
        }
      });
    }
    lyricsList.appendChild(emptyCard);
  }
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

  // Update collapsed view rounded border progress indicator (view-only)
  if (state.mode === 'collapsed' || state.mode === 'pill') {
    updatePillBorderProgress(percent);
  }
}

function updatePillBorderDimensions() {
  if (!pillBorderRect || !overlayContainer) return;
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
      renderTrackInfo();
      renderLyricsList();
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

  // If before first lyric (song intro/instrumental), display track info instead of "No lyrics"
  if (targetIdx === -1) {
    if (state.activeLyricIndex !== -1 || force) {
      state.activeLyricIndex = -1;
      updatePillLyric(`${state.title} — ${state.artist}`);
      const lineEls = lyricsList.querySelectorAll('.lyric-line');
      lineEls.forEach(el => el.classList.remove('active', 'near-active'));
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

function setActiveLyric(index, instant = false) {
  if (state.activeLyricIndex === index && !instant) return;
  state.activeLyricIndex = index;
  const lineEls = lyricsList.querySelectorAll('.lyric-line');

  lineEls.forEach((el, idx) => {
    const isActive = idx === index;
    const isNear = Math.abs(idx - index) === 1;
    el.classList.toggle('active', isActive);
    el.classList.toggle('near-active', isNear && !isActive);
  });

  if (index >= 0 && index < state.lyrics.length) {
    const currentLine = state.lyrics[index];
    updatePillLyric(currentLine.text || state.title);

    const activeEl = lineEls[index];
    if (activeEl && lyricsScrollArea) {
      const scrollTarget = activeEl.offsetTop - (lyricsScrollArea.clientHeight / 2) + (activeEl.clientHeight / 2);
      lyricsScrollArea.scrollTo({
        top: Math.max(0, scrollTarget),
        behavior: instant ? 'instant' : 'smooth'
      });
    }
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
