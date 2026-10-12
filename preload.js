const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlyAPI', {
  onMediaUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('media-update', handler);
    return () => ipcRenderer.removeListener('media-update', handler);
  },
  onLockToggle: (callback) => {
    const handler = (_event, locked) => callback(locked);
    ipcRenderer.on('lock-toggled', handler);
    return () => ipcRenderer.removeListener('lock-toggled', handler);
  },
  togglePlayPause: () => ipcRenderer.send('media-play-pause'),
  nextTrack: () => ipcRenderer.send('media-next'),
  prevTrack: () => ipcRenderer.send('media-prev'),
  seekTo: (seconds) => ipcRenderer.send('media-seek', seconds),
  setClickThrough: (locked) => ipcRenderer.send('set-click-through', locked),
  setAlwaysOnTop: (pinned) => ipcRenderer.send('set-always-on-top', pinned),
  setResizable: (resizable) => ipcRenderer.send('set-resizable', resizable),
  setWindowSize: (width, height, mode) => {
    if (typeof width === 'object' && width !== null) {
      ipcRenderer.send('set-window-size', width);
    } else {
      ipcRenderer.send('set-window-size', { width, height, mode });
    }
  },
  enterImmersive: (fromAutoMinRestore) => ipcRenderer.send('enter-immersive', fromAutoMinRestore),
  exitImmersive: (restoreBounds) => ipcRenderer.send('exit-immersive', restoreBounds),
  onImmersiveModeChanged: (callback) => {
    const handler = (_event, isImmersive) => callback(isImmersive);
    ipcRenderer.on('immersive-mode-changed', handler);
    return () => ipcRenderer.removeListener('immersive-mode-changed', handler);
  },
  manualSearchLyrics: (title, artist) => ipcRenderer.invoke('manual-search-lyrics', { title, artist }),
  retryLyrics: () => ipcRenderer.invoke('retry-lyrics'),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeApp: () => ipcRenderer.send('app-close'),
  dragStart: () => ipcRenderer.send('window-drag-start'),
  dragEnd: () => ipcRenderer.send('window-drag-end'),
  moveTo: (x, y) => ipcRenderer.send('window-move-to', { x, y }),
  moveWindow: (deltaX, deltaY) => ipcRenderer.send('window-move', { deltaX, deltaY }),
  getWindowPos: () => ipcRenderer.invoke('get-window-pos'),
  setTempIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-temp-ignore-mouse-events', ignore),
  openSettings: (title, artist) => ipcRenderer.send('open-settings', { title, artist }),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),
  updateSetting: (key, value) => ipcRenderer.send('update-setting', { key, value }),
  extractCoverColors: (coverUrl) => ipcRenderer.invoke('extract-cover-colors', coverUrl),
  previewLayoutMode: (mode) => ipcRenderer.send('preview-layout-mode', mode),
  restoreLayoutMode: () => ipcRenderer.send('restore-layout-mode'),
  onPreviewLayoutMode: (callback) => {
    const handler = (_event, mode) => callback(mode);
    ipcRenderer.on('preview-layout-mode', handler);
    return () => ipcRenderer.removeListener('preview-layout-mode', handler);
  },
  onRestoreLayoutMode: (callback) => {
    const handler = (_event) => callback();
    ipcRenderer.on('restore-layout-mode', handler);
    return () => ipcRenderer.removeListener('restore-layout-mode', handler);
  },
  onSettingUpdated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('setting-updated', handler);
    return () => ipcRenderer.removeListener('setting-updated', handler);
  },
  onInitSearchQuery: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('init-search-query', handler);
    return () => ipcRenderer.removeListener('init-search-query', handler);
  },
  applyManualLyrics: (data) => ipcRenderer.send('apply-manual-lyrics', data),
  onManualLyricsApplied: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('manual-lyrics-applied', handler);
    return () => ipcRenderer.removeListener('manual-lyrics-applied', handler);
  },
  setStartup: (enabled) => ipcRenderer.send('set-startup', enabled),
  getStartup: () => ipcRenderer.invoke('get-startup'),
  onStartupChanged: (callback) => {
    const handler = (_event, enabled) => callback(enabled);
    ipcRenderer.on('startup-changed', handler);
    return () => ipcRenderer.removeListener('startup-changed', handler);
  },
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onThemeChanged: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  },
  uninstallApp: () => ipcRenderer.send('uninstall-app'),
  openSetupWizard: () => ipcRenderer.send('open-setup-wizard'),
  closeSetupWizard: () => ipcRenderer.send('close-setup-wizard'),
  minimizeSetupWizard: () => ipcRenderer.send('minimize-setup-wizard'),
  finishSetupWizard: (data) => ipcRenderer.send('finish-setup-wizard', data)
});
