const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
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

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {
    mode: 'card', // 'pill' | 'card' | 'expanded'
    accentColor: '#FF3040',
    opacity: 0.85,
    fontSize: 18,
    offset: 0,
    bounds: null,
    alwaysOnTop: true
  };
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

function createWindow() {
  const settings = loadSettings();
  isAlwaysOnTop = settings.alwaysOnTop ?? true;

  const modeSizes = {
    card: { width: 460, height: 274 },
    normal: { width: 460, height: 274 },
    collapsed: { width: 440, height: 104 },
    pill: { width: 440, height: 104 },
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
  if (settings.bounds && typeof settings.bounds.x === 'number') {
    x = settings.bounds.x;
    y = settings.bounds.y;
  } else {
    // Default to bottom-center of primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    x = Math.round((width - defaultWidth) / 2);
    y = Math.round(height - defaultHeight - 50);
  }

  mainWindow = new BrowserWindow({
    x,
    y,
    width: defaultWidth,
    height: defaultHeight,
    minWidth: defaultWidth,
    minHeight: defaultHeight,
    maxWidth: defaultWidth,
    maxHeight: defaultHeight,
    icon: path.join(__dirname, 'assets', 'icon.png'),
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

  let x = 120, y = 120;
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [mx, my] = mainWindow.getPosition();
    const [mw, _mh] = mainWindow.getSize();
    x = mx + mw + 16;
    y = my;
  }

  settingsWindow = new BrowserWindow({
    x,
    y,
    width: 380,
    height: 540,
    minWidth: 340,
    minHeight: 480,
    title: 'overLy Settings',
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
    mainWindow.setBounds({
      x: Math.round(x + deltaX),
      y: Math.round(y + deltaY),
      width: currentWindowWidth,
      height: currentWindowHeight
    });
  }
});

ipcMain.on('window-move-to', (_event, { x, y }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: currentWindowWidth,
      height: currentWindowHeight
    });
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

ipcMain.on('set-window-size', (_event, width, height) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    currentWindowWidth = Math.round(width);
    currentWindowHeight = Math.round(height);
    const [x, y] = mainWindow.getPosition();
    if (!isUserResizing) {
      mainWindow.setMinimumSize(currentWindowWidth, currentWindowHeight);
      mainWindow.setMaximumSize(currentWindowWidth, currentWindowHeight);
    }
    mainWindow.setBounds({
      x,
      y,
      width: currentWindowWidth,
      height: currentWindowHeight
    });
    if (isAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }
});

ipcMain.on('set-resizable', (_event, resizable) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    isUserResizing = Boolean(resizable);
    mainWindow.setResizable(isUserResizing);
    if (isUserResizing) {
      const isCompact = (currentWindowHeight <= 120);
      mainWindow.setMinimumSize(isCompact ? 300 : 340, isCompact ? 64 : 140);
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('setting-updated', { key, value });
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  smtcService.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
