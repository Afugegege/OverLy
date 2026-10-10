// ==========================================================================
// overLy - Dedicated Settings Screen Application Logic
// ==========================================================================

const labelCurrentColor = document.getElementById('labelCurrentColor');
const colorSwatches = document.querySelectorAll('.color-swatch');
const inputCustomColor = document.getElementById('inputCustomColor');
const sliderOpacity = document.getElementById('sliderOpacity');
const opacityVal = document.getElementById('opacityVal');
const sliderFontSize = document.getElementById('sliderFontSize');
const fontSizeVal = document.getElementById('fontSizeVal');
const sliderOffset = document.getElementById('sliderOffset');
const offsetVal = document.getElementById('offsetVal');
const btnOffsetMinus = document.getElementById('btnOffsetMinus');
const btnOffsetPlus = document.getElementById('btnOffsetPlus');
const inputSearchTrack = document.getElementById('inputSearchTrack');
const btnSearch = document.getElementById('btnSearch');
const searchFeedback = document.getElementById('searchFeedback');
const btnCloseSettingsWindow = document.getElementById('btnCloseSettingsWindow');

let currentAccent = '#FF3040';
let currentOffset = 0.0;

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

function updateThemeTokens(color) {
  currentAccent = color;
  const rgb = hexToRgb(color);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const isLight = document.body.classList.contains('theme-light');

  // Intelligent contrast & accent-text calculation for White and Black accents
  let contrast = '#ffffff';
  let accentText = color;

  if (luminance > 0.7) {
    // Very light or pure white accent
    contrast = '#11131a';
    accentText = isLight ? '#121316' : '#ffffff';
  } else if (luminance < 0.25) {
    // Very dark or jet black accent
    contrast = '#ffffff';
    accentText = isLight ? '#121316' : '#ffffff';
  } else {
    contrast = luminance > 0.6 ? '#11131a' : '#ffffff';
    accentText = color;
  }

  const lighterR = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.35));
  const lighterG = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.35));
  const lighterB = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.35));
  const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;

  const glowAlpha = luminance > 0.65 ? 0.22 : 0.35;
  const subtleGlowAlpha = luminance > 0.65 ? 0.08 : 0.14;

  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-contrast', contrast);
  document.documentElement.style.setProperty('--accent-text', accentText);
  document.documentElement.style.setProperty('--accent-light', lighterColor);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`);
  document.documentElement.style.setProperty('--accent-glow-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${subtleGlowAlpha})`);
  if (labelCurrentColor) labelCurrentColor.textContent = color.toUpperCase();

  colorSwatches.forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === color.toLowerCase());
  });
  if (inputCustomColor) inputCustomColor.value = color;
}

function applyThemeUI(themeData) {
  const setting = typeof themeData === 'object' ? themeData.setting : themeData;
  const effective = (typeof themeData === 'object' && themeData.effective) ? themeData.effective : (
    setting === 'light' ? 'light' : setting === 'dark' ? 'dark' : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  );

  document.body.classList.toggle('theme-light', effective === 'light');
  document.body.classList.toggle('theme-dark', effective !== 'light');

  document.querySelectorAll('.theme-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === setting);
  });

  updateThemeTokens(currentAccent);
}

function updateActiveModeBtn(mode) {
  const normalized = (mode === 'pill' ? 'collapsed' : (mode === 'normal' ? 'card' : mode));
  document.querySelectorAll('.layout-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === normalized);
  });
}

async function initSettings() {
  if (window.overlyAPI) {
    const saved = await window.overlyAPI.getSettings();
    if (saved) {
      if (saved.mode) updateActiveModeBtn(saved.mode);
      if (saved.accentColor) updateThemeTokens(saved.accentColor);
      if (typeof saved.opacity === 'number') {
        const pct = Math.round((saved.opacity > 1 ? saved.opacity / 100 : saved.opacity) * 100);
        sliderOpacity.value = pct;
        opacityVal.textContent = `${pct}%`;
      }
      if (saved.fontSize) {
        sliderFontSize.value = saved.fontSize;
        fontSizeVal.textContent = `${saved.fontSize}px`;
      }
      if (typeof saved.offset === 'number') {
        currentOffset = saved.offset;
        sliderOffset.value = saved.offset;
        offsetVal.textContent = (saved.offset > 0 ? `+${saved.offset.toFixed(1)}s` : `${saved.offset.toFixed(1)}s`);
      }
      if (saved.theme) {
        applyThemeUI(saved.theme);
      }
      if (typeof saved.autoMinimize === 'boolean') {
        const checkAutoMinimize = document.getElementById('checkAutoMinimize');
        if (checkAutoMinimize) checkAutoMinimize.checked = saved.autoMinimize;
      }
    }

    if (window.overlyAPI.getTheme) {
      const themeData = await window.overlyAPI.getTheme();
      if (themeData) applyThemeUI(themeData);
    }
    if (window.overlyAPI.onThemeChanged) {
      window.overlyAPI.onThemeChanged((themeData) => {
        applyThemeUI(themeData);
      });
    }

    if (window.overlyAPI.onSettingUpdated) {
      window.overlyAPI.onSettingUpdated(({ key, value }) => {
        if (key === 'autoMinimize') {
          const checkAutoMinimize = document.getElementById('checkAutoMinimize');
          if (checkAutoMinimize) checkAutoMinimize.checked = Boolean(value);
        }
      });
    }

    if (window.overlyAPI.getStartup) {
      const isStartup = await window.overlyAPI.getStartup();
      const checkStartup = document.getElementById('checkStartup');
      if (checkStartup) checkStartup.checked = Boolean(isStartup);
    }
    if (window.overlyAPI.onStartupChanged) {
      window.overlyAPI.onStartupChanged((enabled) => {
        const checkStartup = document.getElementById('checkStartup');
        if (checkStartup) checkStartup.checked = Boolean(enabled);
      });
    }

    // Pre-fill search query if opened with one
    window.overlyAPI.onInitSearchQuery((query) => {
      if (query) {
        if (typeof query === 'string') {
          inputSearchTrack.value = query;
        } else if (query.title) {
          inputSearchTrack.value = query.artist ? `${query.title} - ${query.artist}` : query.title;
        }
      }
    });
  }

  setupEventListeners();
}

function setupEventListeners() {
  // Close window
  btnCloseSettingsWindow.addEventListener('click', () => {
    if (window.overlyAPI) window.overlyAPI.closeSettingsWindow();
  });

  // Theme mode buttons
  const themeModeBtns = document.querySelectorAll('.theme-mode-btn');
  themeModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyThemeUI(theme);
      if (window.overlyAPI && window.overlyAPI.setTheme) {
        window.overlyAPI.setTheme(theme);
      }
    });
  });

  // Startup checkbox
  const checkStartup = document.getElementById('checkStartup');
  if (checkStartup) {
    checkStartup.addEventListener('change', (e) => {
      if (window.overlyAPI && window.overlyAPI.setStartup) {
        window.overlyAPI.setStartup(e.target.checked);
      }
    });
  }

  // Auto minimize checkbox
  const checkAutoMinimize = document.getElementById('checkAutoMinimize');
  if (checkAutoMinimize) {
    checkAutoMinimize.addEventListener('change', (e) => {
      if (window.overlyAPI && window.overlyAPI.updateSetting) {
        window.overlyAPI.updateSetting('autoMinimize', e.target.checked);
      }
    });
  }

  // Layout mode buttons
  const layoutModeBtns = document.querySelectorAll('.layout-mode-btn');
  layoutModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      updateActiveModeBtn(mode);
      if (window.overlyAPI) {
        window.overlyAPI.updateSetting('mode', mode);
      }
    });
  });

  // Color swatches
  colorSwatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      updateThemeTokens(color);
      if (window.overlyAPI) {
        window.overlyAPI.updateSetting('accentColor', color);
      }
    });
  });

  // Custom color picker
  if (inputCustomColor) {
    inputCustomColor.addEventListener('input', (e) => {
      const color = e.target.value;
      updateThemeTokens(color);
      if (window.overlyAPI) {
        window.overlyAPI.updateSetting('accentColor', color);
      }
    });
  }

  // Opacity slider
  sliderOpacity.addEventListener('input', (e) => {
    const pct = Number(e.target.value);
    opacityVal.textContent = `${pct}%`;
    const norm = pct / 100;
    if (window.overlyAPI) {
      window.overlyAPI.updateSetting('opacity', norm);
    }
  });

  // Font size slider
  sliderFontSize.addEventListener('input', (e) => {
    const size = Number(e.target.value);
    fontSizeVal.textContent = `${size}px`;
    if (window.overlyAPI) {
      window.overlyAPI.updateSetting('fontSize', size);
    }
  });

  // Offset controls
  sliderOffset.addEventListener('input', (e) => {
    currentOffset = Number(e.target.value);
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    if (window.overlyAPI) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

  btnOffsetMinus.addEventListener('click', () => {
    currentOffset = Math.max(-3, Math.round((currentOffset - 0.2) * 10) / 10);
    sliderOffset.value = currentOffset;
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    if (window.overlyAPI) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

  btnOffsetPlus.addEventListener('click', () => {
    currentOffset = Math.min(3, Math.round((currentOffset + 0.2) * 10) / 10);
    sliderOffset.value = currentOffset;
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    if (window.overlyAPI) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

  // Lyric Search
  btnSearch.addEventListener('click', handleManualSearch);
  inputSearchTrack.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleManualSearch();
  });

  // App Uninstall
  const btnUninstallApp = document.getElementById('btnUninstallApp');
  if (btnUninstallApp) {
    btnUninstallApp.addEventListener('click', () => {
      if (confirm('Are you sure you want to uninstall overLy from your computer?')) {
        if (window.overlyAPI?.uninstallApp) {
          window.overlyAPI.uninstallApp();
        }
      }
    });
  }
}

async function handleManualSearch() {
  const q = inputSearchTrack.value.trim();
  if (!q) return;

  const parts = q.split('-');
  const title = (parts[0] || '').trim();
  const artist = (parts[1] || '').trim();

  searchFeedback.textContent = 'Searching database...';
  searchFeedback.style.color = 'var(--text-secondary)';
  btnSearch.disabled = true;

  try {
    if (window.overlyAPI) {
      const res = await window.overlyAPI.manualSearchLyrics(title, artist);
      if (res && ((res.lyrics && res.lyrics.length > 0) || res.plainLyrics)) {
        searchFeedback.textContent = `Found lyrics (${res.hasSynced ? 'Synced' : 'Plain text'})! Applied to overlay.`;
        searchFeedback.style.color = '#00C9A7';
        window.overlyAPI.applyManualLyrics(res);
      } else {
        searchFeedback.textContent = 'No matching lyrics found. Try alternate song name or artist.';
        searchFeedback.style.color = '#FF6B4A';
      }
    }
  } catch (err) {
    searchFeedback.textContent = 'Error searching lyrics. Check internet connection.';
    searchFeedback.style.color = '#FF6B4A';
  } finally {
    btnSearch.disabled = false;
  }
}

initSettings();
