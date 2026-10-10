const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen, nativeTheme, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const smtcService = require('./smtc-service');
const lyricsService = require('./lyrics-service');

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

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
  accentColor: '#FF3040',
  opacity: 0.85,
  fontSize: 18,
  offset: 0,
  bounds: null,
  alwaysOnTop: true,
  startOnBoot: false,
  theme: 'system', // 'system' | 'dark' | 'light'
  autoMinimize: false
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
    minimized: { width: 208, height: 62 },
    mini: { width: 208, height: 62 },
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

  smtcService.on('update', async (mediaData) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (!mediaData.hasMedia || !mediaData.title) {
      currentTrackKey = '';
      currentTrackData = null;
      lastMediaData = null;
      mainWindow.webContents.send('media-update', {
        hasMedia: false,
        status: 'Stopped'
      });
      return;
    }

    lastMediaData = mediaData;
    const trackKey = `${(mediaData.artist || '').toLowerCase()}:::${mediaData.title.toLowerCase()}`;

    // If song changed, IMMEDIATELY clear previous song's lyrics so they never bleed into new track
    if (trackKey !== currentTrackKey) {
      currentTrackKey = trackKey;
      currentTrackData = {
        title: mediaData.title,
        artist: mediaData.artist,
        lyrics: [],
        hasSynced: false,
        plainLyrics: '',
        coverUrl: null,
        isFetchingLyrics: true
      };

      // Notify renderer at once so previous lyrics vanish without delay
      mainWindow.webContents.send('media-update', {
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
            mediaData.duration
          );
          // Only apply if the user is still listening to this track
          if (currentTrackKey === fetchKey) {
            currentTrackData = freshData
              ? { ...freshData, isFetchingLyrics: false }
              : {
                  title: mediaData.title,
                  artist: mediaData.artist,
                  lyrics: [],
                  hasSynced: false,
                  plainLyrics: '',
                  coverUrl: null,
                  isFetchingLyrics: false
                };
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('media-update', {
                ...mediaData,
                ...currentTrackData
              });
            }
          }
        } catch (err) {
          console.error('Error fetching track data:', err);
          if (currentTrackKey === fetchKey && currentTrackData) {
            currentTrackData.isFetchingLyrics = false;
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('media-update', {
                ...mediaData,
                ...currentTrackData
              });
            }
          }
        }
      })();
      return;
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

    mainWindow.webContents.send('media-update', payload);
  });
});

// Settings Window
let settingsWindow = null;

function openSettingsWindow(searchQuery) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    if (searchQuery) {
      settingsWindow.webContents.send('init-search-query', searchQuery);
    }
    return;
  }

  const display = (mainWindow && !mainWindow.isDestroyed())
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const wa = display.workArea;
  const sw = 380;
  const sh = 540;

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
    minWidth: 340,
    minHeight: 480,
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
    if (searchQuery) {
      settingsWindow.webContents.send('init-search-query', searchQuery);
    }
  });

  settingsWindow.on('closed', () => {
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

ipcMain.on('set-window-size', (_event, arg1, arg2) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

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

  const currentBounds = mainWindow.getBounds();
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
    s.layoutPositions[normMode] = { x: targetX, y: targetY };
    saveSettings(s);
  } else {
    // 1. If this layout mode already has a saved position, return to it!
    if (s.layoutPositions[normMode] && typeof s.layoutPositions[normMode].x === 'number') {
      targetX = s.layoutPositions[normMode].x;
      targetY = s.layoutPositions[normMode].y;
    } else {
      // 2. Otherwise: smart-anchor based on proximity to screen edges
      const isNearBottom = (currentBounds.y + currentBounds.height >= wa.y + wa.height - 40);
      const isNearRight = (currentBounds.x + currentBounds.width >= wa.x + wa.width - 40);

      targetX = isNearRight
        ? (currentBounds.x + currentBounds.width - currentWindowWidth)
        : currentBounds.x;

      targetY = isNearBottom
        ? (currentBounds.y + currentBounds.height - currentWindowHeight)
        : currentBounds.y;

      s.layoutPositions[normMode] = { x: targetX, y: targetY };
      saveSettings(s);
    }

    // 3. Always clamp strictly within workArea so the window is NEVER off screen
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
  }

  mainWindow.setMinimumSize(currentWindowWidth, currentWindowHeight);
  mainWindow.setMaximumSize(currentWindowWidth, currentWindowHeight);

  mainWindow.setBounds({
    x: Math.round(targetX),
    y: Math.round(targetY),
    width: currentWindowWidth,
    height: currentWindowHeight
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
  const effective = (setting === 'dark' || setting === 'light')
    ? setting
    : (nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  return { setting, effective };
});

ipcMain.on('set-theme', (_event, theme) => {
  applyTheme(theme);
  const s = loadSettings();
  s.theme = theme;
  saveSettings(s);
  const effective = (theme === 'dark' || theme === 'light')
    ? theme
    : (nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-changed', { setting: theme, effective });
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-changed', { setting: theme, effective });
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
    const freshData = await lyricsService.getTrackData(artist, title, album, duration, true);
    if (currentTrackKey === trackKey && freshData) {
      currentTrackData = { ...freshData, isFetchingLyrics: false };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-update', {
          ...lastMediaData,
          ...currentTrackData
        });
      }
      return freshData;
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
