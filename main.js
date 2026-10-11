const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen, nativeTheme, dialog, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const smtcService = require('./smtc-service');
const lyricsService = require('./lyrics-service');

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let tray = null;
let isClickThrough = false;
let isAlwaysOnTop = true;
let currentTrackKey = '';
let currentTrackData = null;
let lastMediaData = null;
let currentWindowWidth = 460;
let currentWindowHeight = 260;
let isUserResizing = false;
let currentLayoutMode = 'card';

const settingsPath = path.join(app.getPath('userData'), 'overly-settings.json');

function applyTheme(theme) {
  if (theme === 'dark' || theme === 'light') {
    nativeTheme.themeSource = theme;
  } else {
    nativeTheme.themeSource = 'system';
  }
}

const defaultSettings = {
  mode: 'card', // 'pill' | 'card' | 'expanded'
  accentColor: 'auto',
  opacity: 0.85,
  fontSize: 18,
  offset: 0,
  bounds: null,
  alwaysOnTop: true,
  startOnBoot: false,
  theme: 'system', // 'system' | 'dark' | 'light' | 'auto'
  adaptAlbumColor: true,
  autoMinimize: false,
  autoMinimizeDelay: 10,
  autoMinimizeExpand: 'play', // 'play' | 'hover'
  autoMinimizeRehide: true,
  visualizerStyle: 'spectrum' // 'spectrum' | 'wave' | 'pulse' | 'minimal'
};

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '');
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...defaultSettings };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function createTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  }
  // 16x16 minimalist musical note icon in base64 PNG
  const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAHsXIhvg18DMwMDAw/P//n3EsGv7//8/AwMDAwMjIiE8xPjXIikCG/Pz5E4YhCih2AVU0o2sAaQZQ7AW4DUBp1g1kE4FpEIZhYjXj14BffYI0oBgAACs/JAFGk8C8AAAAAElFTkSuQmCC';
  return nativeImage.createFromBuffer(Buffer.from(iconBase64, 'base64'));
}

function normalizeMode(m) {
  if (m === 'pill') return 'collapsed';
  if (m === 'normal') return 'card';
  if (m === 'mini') return 'minimized';
  return m || 'card';
}

function createWindow() {
  const settings = loadSettings();
  applyTheme(settings.theme || 'system');
  if (typeof settings.startOnBoot === 'boolean') {
    app.setLoginItemSettings({
      openAtLogin: settings.startOnBoot,
      path: app.getPath('exe')
    });
  }
  isAlwaysOnTop = settings.alwaysOnTop ?? true;

  const modeSizes = {
    card: { width: 460, height: 274 },
    normal: { width: 460, height: 274 },
    collapsed: { width: 440, height: 104 },
    pill: { width: 440, height: 104 },
    minimized: { width: 230, height: 68 },
    mini: { width: 230, height: 68 },
    lyrics: { width: 460, height: 164 },
    expanded: { width: 460, height: 504 }
  };
  const currentMode = settings.mode || 'card';
  const targetSize = modeSizes[currentMode] || modeSizes.card;

  const defaultWidth = targetSize.width;
  const defaultHeight = targetSize.height;
  currentWindowWidth = defaultWidth;
  currentWindowHeight = defaultHeight;

  let x, y;
  const primaryDisplay = screen.getPrimaryDisplay();
  const wa = primaryDisplay.workArea;

  const normMode = normalizeMode(currentMode);
  if (settings.layoutPositions && settings.layoutPositions[normMode] && typeof settings.layoutPositions[normMode].x === 'number') {
    x = settings.layoutPositions[normMode].x;
    y = settings.layoutPositions[normMode].y;
  } else if (settings.bounds && typeof settings.bounds.x === 'number') {
    x = settings.bounds.x;
    y = settings.bounds.y;
  } else {
    // Default to bottom-center of primary display
    x = Math.round(wa.x + (wa.width - defaultWidth) / 2);
    y = Math.round(wa.y + wa.height - defaultHeight - 50);
  }

  // Ensure initial position is clamped safely on screen
  x = Math.max(wa.x, Math.min(wa.x + wa.width - defaultWidth, x));
  y = Math.max(wa.y, Math.min(wa.y + wa.height - defaultHeight, y));

  mainWindow = new BrowserWindow({
    x,
    y,
    width: defaultWidth,
    height: defaultHeight,
    minWidth: defaultWidth,
    minHeight: defaultHeight,
    maxWidth: defaultWidth,
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    transparent: true,
    frame: false,
    hasShadow: false,
    thickFrame: false,
    alwaysOnTop: isAlwaysOnTop,
    resizable: false,
    maximizable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true);
  }

  // Ensure window is fully interactive and accepting mouse clicks
  mainWindow.setIgnoreMouseEvents(false);

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[RENDERER] [${level}] ${message} (${path.basename(sourceId || '')}:${line})`);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[RENDERER FAIL LOAD] ${errorCode} ${errorDescription}`);
  });

  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const s = loadSettings();
      s.bounds = { x: bounds.x, y: bounds.y };
      saveSettings(s);
    }
  });

  mainWindow.on('moved', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const s = loadSettings();
      s.bounds = { x: bounds.x, y: bounds.y };
      saveSettings(s);
    }
  });

  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [w, h] = mainWindow.getSize();
      if (isUserResizing) {
        currentWindowWidth = w;
        currentWindowHeight = h;
      }
      console.log(`[ELECTRON RESIZE EVENT] Size: ${w}x${h}`);
    }
  });

  mainWindow.on('enter-full-screen', () => {
    isImmersiveMode = true;
    mainWindow.webContents.send('immersive-mode-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    isImmersiveMode = false;
    mainWindow.setMaximizable(false);
    mainWindow.webContents.send('immersive-mode-changed', false);
    if (preImmersiveBounds) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setBounds(preImmersiveBounds);
          mainWindow.setResizable(false);
        }
      }, 60);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function updateTray() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'overLy - Floating Lyrics',
      enabled: false
    },
    { type: 'separator' },
    {
      label: isClickThrough ? 'Unlock Mouse (Interactive)' : 'Lock Mouse (Click-Through)',
      accelerator: 'Ctrl+Shift+L',
      click: () => toggleClickThrough()
    },
    {
      label: 'Always On Top',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (item) => {
        isAlwaysOnTop = item.checked;
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(isAlwaysOnTop, isAlwaysOnTop ? 'floating' : 'normal');
        }
        updateTray();
      }
    },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          path: app.getPath('exe')
        });
        const s = loadSettings();
        s.startOnBoot = item.checked;
        saveSettings(s);
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.webContents.send('startup-changed', item.checked);
        }
      }
    },
    {
      label: 'Settings & Styling',
      click: () => openSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Play / Pause',
      click: () => smtcService.togglePlayPause()
    },
    {
      label: 'Next Track',
      click: () => smtcService.nextTrack()
    },
    {
      label: 'Previous Track',
      click: () => smtcService.previousTrack()
    },
    { type: 'separator' },
    {
      label: 'Show Overlay',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide Overlay',
      click: () => {
        if (mainWindow) mainWindow.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Uninstall overLy...',
      click: () => handleUninstall()
    },
    {
      label: 'Exit overLy',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip(isClickThrough ? 'overLy: Locked (Click-through enabled)' : 'overLy: Floating Lyrics Overlay');
  tray.setContextMenu(contextMenu);
}

function toggleClickThrough(explicitValue) {
  if (typeof explicitValue === 'boolean') {
    isClickThrough = explicitValue;
  } else {
    isClickThrough = !isClickThrough;
  }

  if (mainWindow) {
    if (isClickThrough) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
    mainWindow.webContents.send('lock-toggled', isClickThrough);
  }
  updateTray();
}

app.whenReady().then(() => {
  createWindow();

  // Initialize System Tray
  try {
    tray = new Tray(createTrayIcon());
    updateTray();
    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (e) {
    console.error('Tray init error:', e);
  }

  // Register Global Shortcuts for Click-through Lock: Ctrl+Shift+L and Ctrl+Alt+L
  try {
    globalShortcut.register('CommandOrControl+Shift+L', () => {
      toggleClickThrough();
    });
    globalShortcut.register('CommandOrControl+Alt+L', () => {
      toggleClickThrough();
    });
  } catch (e) {
    console.error('Failed to register global shortcut:', e);
  }

  // Start SMTC background service
  smtcService.start();

  async function broadcastMediaUpdate(payload) {
    if (payload && payload.coverUrl && !payload.coverColors) {
      try {
        payload.coverColors = await extractCoverColorsInternal(payload.coverUrl);
      } catch (_) {}
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-update', payload);
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('media-update', payload);
    }
  }

  let mediaAbsentGraceTimer = null;

  function resolveThumbnailDataUrl(thumbPath) {
    if (!thumbPath) return null;
    try {
      if (fs.existsSync(thumbPath)) {
        const buf = fs.readFileSync(thumbPath);
        if (buf && buf.length > 0) {
          const mime = buf[0] === 0x89 ? 'image/png' : 'image/jpeg';
          return `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
    } catch (e) {
      console.error('Error reading native SMTC thumbnail:', e);
    }
    return null;
  }

  smtcService.on('update', async (mediaData) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (!mediaData.hasMedia || !mediaData.title) {
      // If we previously had track data and media was active, preserve it across pauses/transient drops
      if (currentTrackData && lastMediaData) {
        if (!mediaAbsentGraceTimer) {
          broadcastMediaUpdate({
            ...lastMediaData,
            ...currentTrackData,
            status: 'Paused',
            hasMedia: true
          });
          mediaAbsentGraceTimer = setTimeout(() => {
            mediaAbsentGraceTimer = null;
            currentTrackKey = '';
            currentTrackData = null;
            lastMediaData = null;
            broadcastMediaUpdate({
              hasMedia: false,
              status: 'Stopped'
            });
          }, 30000);
        }
        return;
      }

      currentTrackKey = '';
      currentTrackData = null;
      lastMediaData = null;
      broadcastMediaUpdate({
        hasMedia: false,
        status: 'Stopped'
      });
      return;
    }

    if (mediaAbsentGraceTimer) {
      clearTimeout(mediaAbsentGraceTimer);
      mediaAbsentGraceTimer = null;
    }

    lastMediaData = mediaData;
    const trackKey = `${(mediaData.artist || '').toLowerCase()}:::${mediaData.title.toLowerCase()}`;

    // If song changed, IMMEDIATELY clear previous song's lyrics so they never bleed into new track
    if (trackKey !== currentTrackKey) {
      currentTrackKey = trackKey;
      const initialCover = resolveThumbnailDataUrl(mediaData.thumbnailPath);

      currentTrackData = {
        title: mediaData.title,
        artist: mediaData.artist,
        lyrics: [],
        hasSynced: false,
        plainLyrics: '',
        coverUrl: initialCover,
        isFetchingLyrics: true
      };

      // Notify renderers at once so previous lyrics vanish without delay and native album art appears instantly
      broadcastMediaUpdate({
        ...mediaData,
        ...currentTrackData
      });

      // Asynchronously fetch fresh lyrics & artwork for the new track
      (async () => {
        const fetchKey = trackKey;
        try {
          const freshData = await lyricsService.getTrackData(
            mediaData.artist,
            mediaData.title,
            mediaData.album,
            mediaData.duration,
            false,
            initialCover
          );
          // Only apply if the user is still listening to this track
          if (currentTrackKey === fetchKey) {
            currentTrackData = freshData
              ? { ...freshData, coverUrl: freshData.coverUrl || initialCover, isFetchingLyrics: false }
              : {
                  title: mediaData.title,
                  artist: mediaData.artist,
                  lyrics: [],
                  hasSynced: false,
                  plainLyrics: '',
                  coverUrl: initialCover,
                  isFetchingLyrics: false
                };
            broadcastMediaUpdate({
              ...mediaData,
              ...currentTrackData
            });
          }
        } catch (err) {
          console.error('Error fetching track data:', err);
          if (currentTrackKey === fetchKey && currentTrackData) {
            currentTrackData.isFetchingLyrics = false;
            broadcastMediaUpdate({
              ...mediaData,
              ...currentTrackData
            });
          }
        }
      })();
      return;
    }

    // If native thumbnail arrived slightly after initial track load and we don't have cover art yet
    if (!currentTrackData?.coverUrl && mediaData.thumbnailPath) {
      const lateCover = resolveThumbnailDataUrl(mediaData.thumbnailPath);
      if (lateCover && currentTrackData) {
        currentTrackData.coverUrl = lateCover;
      }
    }

    // Regular position / playback updates for currently playing track
    const payload = {
      ...mediaData,
      coverUrl: currentTrackData?.coverUrl || null,
      lyrics: currentTrackData?.lyrics || [],
      hasSynced: currentTrackData?.hasSynced || false,
      plainLyrics: currentTrackData?.plainLyrics || '',
      isFetchingLyrics: currentTrackData?.isFetchingLyrics || false
    };

    broadcastMediaUpdate(payload);
  });
});

// Settings Window
let settingsWindow = null;

function openSettingsWindow(searchQuery) {
  const effectiveQuery = searchQuery || (lastMediaData && lastMediaData.title ? { title: lastMediaData.title, artist: lastMediaData.artist } : null);
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    if (effectiveQuery) {
      settingsWindow.webContents.send('init-search-query', effectiveQuery);
    }
    return;
  }

  const display = (mainWindow && !mainWindow.isDestroyed())
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const wa = display.workArea;
  const sw = 420;
  const sh = 580;

  let x = wa.x + Math.round((wa.width - sw) / 2);
  let y = wa.y + Math.round((wa.height - sh) / 2);

  if (mainWindow && !mainWindow.isDestroyed()) {
    const [mx, my] = mainWindow.getPosition();
    const [mw, mh] = mainWindow.getSize();

    // Prefer opening to the right of the overlay
    if (mx + mw + 16 + sw <= wa.x + wa.width) {
      x = mx + mw + 16;
      y = my;
    }
    // Else prefer opening to the left of the overlay
    else if (mx - 16 - sw >= wa.x) {
      x = mx - 16 - sw;
      y = my;
    }
    // Else clamp horizontally near the overlay
    else {
      x = Math.max(wa.x + 12, Math.min(wa.x + wa.width - sw - 12, mx));
    }

    // Always clamp y so Settings is 100% on screen
    y = Math.max(wa.y + 12, Math.min(wa.y + wa.height - sh - 12, y));
  }

  settingsWindow = new BrowserWindow({
    x,
    y,
    width: sw,
    height: sh,
    minWidth: 380,
    minHeight: 520,
    title: 'overLy Settings',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    frame: false,
    backgroundColor: '#11131a',
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));

  settingsWindow.webContents.once('did-finish-load', () => {
    if (effectiveQuery) {
      settingsWindow.webContents.send('init-search-query', effectiveQuery);
    }
    if (lastMediaData) {
      settingsWindow.webContents.send('media-update', {
        ...lastMediaData,
        coverUrl: currentTrackData?.coverUrl || null,
        lyrics: currentTrackData?.lyrics || [],
        hasSynced: currentTrackData?.hasSynced || false,
        plainLyrics: currentTrackData?.plainLyrics || '',
        isFetchingLyrics: currentTrackData?.isFetchingLyrics || false
      });
    }
  });

  settingsWindow.on('closed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('restore-layout-mode');
    }
    settingsWindow = null;
  });
}

// IPC listeners
ipcMain.on('media-play-pause', () => smtcService.togglePlayPause());
ipcMain.on('media-next', () => smtcService.nextTrack());
ipcMain.on('media-prev', () => smtcService.previousTrack());
ipcMain.on('media-seek', (_event, seconds) => smtcService.seekTo(seconds));

ipcMain.on('set-click-through', (_event, locked) => {
  toggleClickThrough(locked);
});

ipcMain.on('set-always-on-top', (_event, pinned) => {
  isAlwaysOnTop = Boolean(pinned);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop, isAlwaysOnTop ? 'screen-saver' : 'normal');
  }
  updateTray();
});

let preImmersiveBounds = null;
let isImmersiveMode = false;

ipcMain.on('enter-immersive', (_event, fromAutoMinRestore) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const currentBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(currentBounds);

  if (!fromAutoMinRestore || !preImmersiveBounds) {
    if (
      currentBounds.width < display.bounds.width - 20 ||
      currentBounds.height < display.bounds.height - 20
    ) {
      preImmersiveBounds = currentBounds;
    }
  }

  isImmersiveMode = true;
  mainWindow.setResizable(true);
  mainWindow.setMaximizable(true);
  mainWindow.setMinimumSize(60, 60);
  mainWindow.setMaximumSize(10000, 10000);

  // Explicitly resize the transparent frameless surface buffer to display size, then enter fullscreen
  mainWindow.setBounds(display.bounds);
  mainWindow.setFullScreen(true);

  if (isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
  mainWindow.webContents.send('immersive-mode-changed', true);
});

ipcMain.on('exit-immersive', (_event, restoreBounds) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  isImmersiveMode = false;

  mainWindow.setFullScreen(false);
  mainWindow.setMaximizable(false);
  if (restoreBounds === false) {
    mainWindow.setResizable(false);
    mainWindow.webContents.send('immersive-mode-changed', false);
    return;
  }
  const target = (restoreBounds && typeof restoreBounds === 'object') ? restoreBounds : preImmersiveBounds;
  if (target) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setBounds(target);
        mainWindow.setResizable(false);
      }
    }, 60);
  } else {
    mainWindow.setResizable(false);
  }
  mainWindow.webContents.send('immersive-mode-changed', false);
});

let windowAnchor = null;
let targetAnimationBounds = null;

function updateWindowAnchor(bounds = null) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const b = bounds || (targetAnimationBounds || mainWindow.getBounds());
  const display = screen.getDisplayMatching(b);
  const wa = display.workArea;
  const isBottom = (b.y + b.height / 2) >= (wa.y + wa.height / 2);
  windowAnchor = {
    centerX: Math.round(b.x + b.width / 2),
    bottomY: Math.round(b.y + b.height),
    topY: Math.round(b.y),
    isBottom
  };
}

ipcMain.on('window-move', (_event, { deltaX, deltaY }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    let newX = Math.round(x + deltaX);
    let newY = Math.round(y + deltaY);

    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const wa = display.workArea;

    // Keep window securely on-screen during drag
    newX = Math.max(wa.x - currentWindowWidth + 60, Math.min(wa.x + wa.width - 60, newX));
    newY = Math.max(wa.y, Math.min(wa.y + wa.height - 40, newY));

    mainWindow.setBounds({
      x: newX,
      y: newY,
      width: currentWindowWidth,
      height: currentWindowHeight
    });

    updateWindowAnchor({ x: newX, y: newY, width: currentWindowWidth, height: currentWindowHeight });

    const s = loadSettings();
    const normMode = normalizeMode(s.mode);
    if (!s.layoutPositions) s.layoutPositions = {};
    s.layoutPositions[normMode] = { x: newX, y: newY };
    saveSettings(s);
  }
});

ipcMain.on('window-move-to', (_event, { x, y }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    let newX = Math.round(x);
    let newY = Math.round(y);

    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const wa = display.workArea;

    newX = Math.max(wa.x, Math.min(wa.x + wa.width - currentWindowWidth, newX));
    newY = Math.max(wa.y, Math.min(wa.y + wa.height - currentWindowHeight, newY));

    mainWindow.setBounds({
      x: newX,
      y: newY,
      width: currentWindowWidth,
      height: currentWindowHeight
    });

    updateWindowAnchor({ x: newX, y: newY, width: currentWindowWidth, height: currentWindowHeight });

    const s = loadSettings();
    const normMode = normalizeMode(s.mode);
    if (!s.layoutPositions) s.layoutPositions = {};
    s.layoutPositions[normMode] = { x: newX, y: newY };
    saveSettings(s);
  }
});

// Let the renderer query the current window position (needed for accurate drag start)
ipcMain.handle('get-window-pos', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

let boundsAnimationTimer = null;

function animateWindowBounds(targetBounds, duration = 320, onComplete) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (boundsAnimationTimer) {
    clearInterval(boundsAnimationTimer);
    boundsAnimationTimer = null;
  }

  targetAnimationBounds = { ...targetBounds };
  const startBounds = mainWindow.getBounds();
  if (
    Math.abs(startBounds.x - targetBounds.x) < 2 &&
    Math.abs(startBounds.y - targetBounds.y) < 2 &&
    Math.abs(startBounds.width - targetBounds.width) < 2 &&
    Math.abs(startBounds.height - targetBounds.height) < 2
  ) {
    mainWindow.setBounds(targetBounds);
    targetAnimationBounds = null;
    if (onComplete) onComplete();
    return;
  }

  const minW = Math.min(startBounds.width, targetBounds.width, 48);
  const minH = Math.min(startBounds.height, targetBounds.height, 48);
  const maxW = Math.max(startBounds.width, targetBounds.width, 2560);
  const maxH = Math.max(startBounds.height, targetBounds.height, 1440);
  mainWindow.setMinimumSize(minW, minH);
  mainWindow.setMaximumSize(maxW, maxH);

  const startTime = Date.now();
  const fps = 60;
  const frameInterval = 16;

  boundsAnimationTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(boundsAnimationTimer);
      boundsAnimationTimer = null;
      targetAnimationBounds = null;
      return;
    }

    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Smooth ease-out cubic curve
    const ease = 1 - Math.pow(1 - progress, 3.2);

    const curX = Math.round(startBounds.x + (targetBounds.x - startBounds.x) * ease);
    const curY = Math.round(startBounds.y + (targetBounds.y - startBounds.y) * ease);
    const curW = Math.round(startBounds.width + (targetBounds.width - startBounds.width) * ease);
    const curH = Math.round(startBounds.height + (targetBounds.height - startBounds.height) * ease);

    mainWindow.setBounds({
      x: curX,
      y: curY,
      width: curW,
      height: curH
    });

    if (progress >= 1) {
      clearInterval(boundsAnimationTimer);
      boundsAnimationTimer = null;
      mainWindow.setBounds(targetBounds);
      targetAnimationBounds = null;
      if (onComplete) onComplete();
    }
  }, frameInterval);
}

ipcMain.on('set-window-size', (_event, arg1, arg2) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (isImmersiveMode || mainWindow.isFullScreen()) {
    return; // Never exit fullscreen or shrink window while in immersive mode
  }

  let width, height, targetMode;
  if (typeof arg1 === 'object' && arg1 !== null) {
    width = arg1.width;
    height = arg1.height;
    targetMode = arg1.mode;
  } else {
    width = arg1;
    height = arg2;
  }

  currentWindowWidth = Math.round(width);
  currentWindowHeight = Math.round(height);

  const s = loadSettings();
  if (!targetMode) {
    targetMode = s.mode || 'card';
  }
  const normMode = normalizeMode(targetMode);

  if (!s.layoutPositions) s.layoutPositions = {};

  const currentBounds = targetAnimationBounds || mainWindow.getBounds();
  const display = screen.getDisplayMatching(currentBounds);
  const wa = display.workArea;

  let targetX, targetY;

  if (isUserResizing) {
    // Manual corner resize: keep current top-left, clamp within screen
    targetX = currentBounds.x;
    targetY = currentBounds.y;
    const isMini = (normMode === 'minimized');
    const minW = isMini ? 160 : (normMode === 'collapsed' ? 300 : 340);
    const minH = isMini ? 44 : (normMode === 'collapsed' ? 64 : 140);
    if (targetX + currentWindowWidth > wa.x + wa.width) {
      currentWindowWidth = Math.max(minW, wa.x + wa.width - targetX);
    }
    if (targetY + currentWindowHeight > wa.y + wa.height) {
      currentWindowHeight = Math.max(minH, wa.y + wa.height - targetY);
    }
    updateWindowAnchor({ x: targetX, y: targetY, width: currentWindowWidth, height: currentWindowHeight });
    s.layoutPositions[normMode] = { x: targetX, y: targetY };
    saveSettings(s);
  } else {
    currentLayoutMode = normMode;

    if (!windowAnchor) {
      updateWindowAnchor(currentBounds);
    }

    // Stable anchor: Window's center and bottom/top stay anchored without wandering
    targetX = Math.round(windowAnchor.centerX - currentWindowWidth / 2);
    targetY = windowAnchor.isBottom
      ? Math.round(windowAnchor.bottomY - currentWindowHeight)
      : Math.round(windowAnchor.topY);

    s.layoutPositions[normMode] = { x: targetX, y: targetY };
    saveSettings(s);
  }

  // Always clamp strictly within workArea so the window is NEVER off screen
  if (targetX + currentWindowWidth > wa.x + wa.width) {
    targetX = wa.x + wa.width - currentWindowWidth;
  }
  if (targetX < wa.x) {
    targetX = wa.x;
  }
  if (targetY + currentWindowHeight > wa.y + wa.height) {
    targetY = wa.y + wa.height - currentWindowHeight;
  }
  if (targetY < wa.y) {
    targetY = wa.y;
  }

  const isMiniTransition = (normMode === 'minimized' || currentLayoutMode === 'minimized' || currentWindowHeight <= 70 || currentWindowWidth <= 70);
  const animDuration = isMiniTransition ? 340 : 280;

  animateWindowBounds({
    x: Math.round(targetX),
    y: Math.round(targetY),
    width: currentWindowWidth,
    height: currentWindowHeight
  }, animDuration, () => {
    if (mainWindow && !mainWindow.isDestroyed() && !isUserResizing) {
      mainWindow.setMinimumSize(currentWindowWidth, currentWindowHeight);
      mainWindow.setMaximumSize(currentWindowWidth, currentWindowHeight);
    }
  });

  if (isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

ipcMain.on('set-resizable', (_event, resizable) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    isUserResizing = Boolean(resizable);
    mainWindow.setResizable(isUserResizing);
    if (isUserResizing) {
      const isCompact = (currentWindowHeight <= 120);
      const isMini = (currentWindowHeight <= 70);
      mainWindow.setMinimumSize(isMini ? 160 : (isCompact ? 300 : 340), isMini ? 44 : (isCompact ? 64 : 140));
      mainWindow.setMaximumSize(2560, 1440);
    } else {
      mainWindow.setMinimumSize(currentWindowWidth, currentWindowHeight);
      mainWindow.setMaximumSize(currentWindowWidth, currentWindowHeight);
    }
  }
});

ipcMain.on('open-settings', (_event, query) => {
  openSettingsWindow(query);
});

ipcMain.on('close-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
});

ipcMain.on('update-setting', (_event, { key, value }) => {
  const current = loadSettings();
  current[key] = value;
  saveSettings(current);
  if (key === 'theme') {
    applyTheme(value);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('setting-updated', { key, value });
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('setting-updated', { key, value });
  }
});

ipcMain.on('preview-layout-mode', (_event, mode) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('preview-layout-mode', mode);
  }
});

ipcMain.on('restore-layout-mode', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('restore-layout-mode');
  }
});

function rgbToHslMain(r, g, b) {
  const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgbMain(h, s, l) {
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
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function analyzeBitmapColors(buffer) {
  if (!buffer || buffer.length < 16) return null;
  const buckets = [];
  let totalLum = 0;
  let pixelCount = 0;

  for (let i = 0; i < buffer.length; i += 4) {
    // Windows nativeImage.toBitmap() buffer is BGRA
    const b = buffer[i];
    const g = buffer[i + 1];
    const r = buffer[i + 2];
    const a = buffer[i + 3];
    if (a < 128) continue;

    const lumPixel = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    totalLum += lumPixel;
    pixelCount++;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 510;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    if (l > 0.04 && l < 0.96 && s > 0.06) {
      const score = s * 2.5 + (1 - Math.abs(l - 0.50)) * 1.5;
      buckets.push({ r, g, b, score });
    }
  }

  const avgLuminance = pixelCount > 0 ? (totalLum / pixelCount) : 0.5;
  const isDark = (avgLuminance < 0.46);

  if (buckets.length === 0) {
    for (let i = 0; i < buffer.length; i += 16) {
      const b = buffer[i];
      const g = buffer[i + 1];
      const r = buffer[i + 2];
      buckets.push({ r, g, b, score: 1 });
    }
  }

  if (buckets.length === 0) return null;

  buckets.sort((a, b) => b.score - a.score);
  const primary = buckets[0];

  let secondary = null;
  for (let i = 1; i < buckets.length; i++) {
    const c = buckets[i];
    const dist = Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b);
    if (dist > 70) {
      secondary = c;
      break;
    }
  }

  if (!secondary) {
    secondary = {
      r: Math.min(255, Math.round(primary.r * 0.7 + 255 * 0.3)),
      g: Math.min(255, Math.round(primary.g * 0.7 + 255 * 0.3)),
      b: Math.min(255, Math.round(primary.b * 0.7 + 255 * 0.3))
    };
  }

  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  const authenticPrimary = `#${toHex(primary.r)}${toHex(primary.g)}${toHex(primary.b)}`;
  let accent = authenticPrimary;
  const lum = (0.299 * primary.r + 0.587 * primary.g + 0.114 * primary.b) / 255;
  if (lum < 0.40) {
    const hsl = rgbToHslMain(primary.r, primary.g, primary.b);
    const boosted = hslToRgbMain(hsl.h, Math.max(0.45, hsl.s), 0.60);
    accent = `#${toHex(boosted.r)}${toHex(boosted.g)}${toHex(boosted.b)}`;
  }

  return {
    primary: authenticPrimary,
    accent,
    secondary: `#${toHex(secondary.r)}${toHex(secondary.g)}${toHex(secondary.b)}`,
    isDark,
    luminance: avgLuminance
  };
}

const coverColorsCache = new Map();

async function extractCoverColorsInternal(urlOrPath) {
  try {
    if (!urlOrPath) return null;
    if (coverColorsCache.has(urlOrPath)) {
      return coverColorsCache.get(urlOrPath);
    }
    let img;
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      const response = await net.fetch(urlOrPath);
      const buffer = Buffer.from(await response.arrayBuffer());
      img = nativeImage.createFromBuffer(buffer);
    } else if (urlOrPath.startsWith('data:image/')) {
      img = nativeImage.createFromDataURL(urlOrPath);
    } else {
      img = nativeImage.createFromPath(urlOrPath);
    }
    if (!img || img.isEmpty()) return null;
    const resized = img.resize({ width: 36, height: 36, quality: 'good' });
    const bitmap = resized.toBitmap();
    const result = analyzeBitmapColors(bitmap);
    if (result) {
      if (coverColorsCache.size > 100) {
        const firstKey = coverColorsCache.keys().next().value;
        coverColorsCache.delete(firstKey);
      }
      coverColorsCache.set(urlOrPath, result);
    }
    return result;
  } catch (e) {
    console.error('Failed to extract cover colors in main:', e);
    return null;
  }
}

ipcMain.handle('extract-cover-colors', async (_event, urlOrPath) => {
  return extractCoverColorsInternal(urlOrPath);
});

ipcMain.handle('get-startup', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.on('set-startup', (_event, enabled) => {
  const isEnabled = Boolean(enabled);
  app.setLoginItemSettings({
    openAtLogin: isEnabled,
    path: app.getPath('exe')
  });
  const s = loadSettings();
  s.startOnBoot = isEnabled;
  saveSettings(s);
  updateTray();
});

ipcMain.handle('get-theme', () => {
  const s = loadSettings();
  const setting = s.theme || 'system';
  const effective = (setting === 'auto')
    ? 'auto'
    : ((setting === 'dark' || setting === 'light')
      ? setting
      : (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));
  return { setting, effective };
});

ipcMain.on('set-theme', (_event, theme) => {
  applyTheme(theme);
  const s = loadSettings();
  s.theme = theme;
  if (theme === 'auto') {
    s.accentColor = 'auto';
  }
  saveSettings(s);
  const effective = (theme === 'auto')
    ? 'auto'
    : ((theme === 'dark' || theme === 'light')
      ? theme
      : (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-changed', { setting: theme, effective });
    if (theme === 'auto') {
      mainWindow.webContents.send('setting-updated', { key: 'accentColor', value: 'auto' });
    }
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('theme-changed', { setting: theme, effective });
    if (theme === 'auto') {
      settingsWindow.webContents.send('setting-updated', { key: 'accentColor', value: 'auto' });
    }
  }
});

nativeTheme.on('updated', () => {
  const isDark = nativeTheme.shouldUseDarkColors;
  const currentSetting = loadSettings().theme || 'system';
  const effective = isDark ? 'dark' : 'light';
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-changed', { setting: currentSetting, effective });
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('theme-changed', { setting: currentSetting, effective });
  }
});

ipcMain.on('apply-manual-lyrics', (_event, trackData) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    currentTrackData = trackData;
    mainWindow.webContents.send('manual-lyrics-applied', trackData);
  }
});

ipcMain.on('set-temp-ignore-mouse-events', (_event, ignore) => {
  if (mainWindow && !mainWindow.isDestroyed() && isClickThrough) {
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  }
});

ipcMain.handle('manual-search-lyrics', async (_event, { title, artist }) => {
  return await lyricsService.getTrackData(artist, title, '', 0, true);
});

ipcMain.handle('retry-lyrics', async () => {
  if (!lastMediaData || !lastMediaData.title) return null;
  const artist = lastMediaData.artist || '';
  const title = lastMediaData.title || '';
  const album = lastMediaData.album || '';
  const duration = lastMediaData.duration || 0;
  const trackKey = `${artist.toLowerCase()}:::${title.toLowerCase()}`;

  if (currentTrackData) {
    currentTrackData.isFetchingLyrics = true;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('media-update', {
      ...lastMediaData,
      ...currentTrackData,
      isFetchingLyrics: true
    });
  }

  try {
    const existingCover = currentTrackData?.coverUrl || resolveThumbnailDataUrl(lastMediaData?.thumbnailPath);
    const freshData = await lyricsService.getTrackData(artist, title, album, duration, true, existingCover);
    if (currentTrackKey === trackKey && freshData) {
      currentTrackData = { ...freshData, coverUrl: freshData.coverUrl || existingCover, isFetchingLyrics: false };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-update', {
          ...lastMediaData,
          ...currentTrackData
        });
      }
      return currentTrackData;
    }
  } catch (err) {
    console.error('Retry lyrics error:', err);
  } finally {
    if (currentTrackData) {
      currentTrackData.isFetchingLyrics = false;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-update', {
        ...lastMediaData,
        ...currentTrackData
      });
    }
  }
  return currentTrackData;
});

ipcMain.on('save-settings', (_event, settings) => {
  saveSettings(settings);
});

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('app-close', () => {
  app.quit();
});

function handleUninstall() {
  const exeDir = path.dirname(app.getPath('exe'));
  const candidateUninstallerNames = [
    'Uninstall overLy.exe',
    'Uninstall.exe',
    'uninstall.exe'
  ];

  let uninstallerPath = null;
  for (const name of candidateUninstallerNames) {
    const candidate = path.join(exeDir, name);
    if (fs.existsSync(candidate)) {
      uninstallerPath = candidate;
      break;
    }
  }

  if (uninstallerPath) {
    try {
      spawn(uninstallerPath, [], { detached: true, stdio: 'ignore' }).unref();
      setTimeout(() => {
        app.quit();
      }, 300);
      return;
    } catch (e) {
      console.error('Failed to launch uninstaller:', e);
    }
  }

  // Fallback for development/portable mode or if direct exe is missing
  dialog.showMessageBox({
    type: 'question',
    title: 'Uninstall overLy',
    message: 'To uninstall overLy from Windows:',
    detail: 'Would you like to open Windows Installed Apps or the application folder to run the uninstaller?',
    buttons: ['Open Windows Installed Apps', 'Open App Folder', 'Cancel'],
    defaultId: 0,
    cancelId: 2
  }).then(({ response }) => {
    if (response === 0) {
      shell.openExternal('ms-settings:appsfeatures');
    } else if (response === 1) {
      shell.showItemInFolder(app.getPath('exe'));
    }
  });
}

ipcMain.on('uninstall-app', () => {
  handleUninstall();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  smtcService.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
