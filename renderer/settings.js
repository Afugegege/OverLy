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
const btnOffsetMinusOne = document.getElementById('btnOffsetMinusOne');
const btnOffsetMinus = document.getElementById('btnOffsetMinus');
const btnOffsetPlus = document.getElementById('btnOffsetPlus');
const btnOffsetPlusOne = document.getElementById('btnOffsetPlusOne');
const btnOffsetReset = document.getElementById('btnOffsetReset');
const inputSearchTrack = document.getElementById('inputSearchTrack');
const btnSearch = document.getElementById('btnSearch');
const searchFeedback = document.getElementById('searchFeedback');
const btnCloseSettingsWindow = document.getElementById('btnCloseSettingsWindow');

// Immediately bind close button and Escape shortcut to guarantee they work instantly
if (btnCloseSettingsWindow) {
  btnCloseSettingsWindow.addEventListener('click', () => {
    if (window.overlyAPI?.closeSettingsWindow) window.overlyAPI.closeSettingsWindow();
  });
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (window.overlyAPI?.closeSettingsWindow) window.overlyAPI.closeSettingsWindow();
  }
});

let currentAccent = '#FF3040';
let lastCustomColor = '#E1306C';
let lastExtractedAccentColor = null;
let lastCoverIsDark = true;
let currentThemeSetting = 'system';
let currentOffset = 0.0;
let committedMode = 'card';
let autoMinimizeEnabled = false;
let autoMinimizeExpandMethod = 'play';
let adaptAlbumColorSetting = true;

let isMediaPlaying = false;
let currentTrackKey = '';
let visTime = 0;
let visSongHash = 54321;
const titlebarBars = [];

function setupTitlebarVisualizer() {
  const container = document.getElementById('titlebarVisBars');
  if (!container) return;
  container.innerHTML = '';
  titlebarBars.length = 0;

  const BAR_COUNT = 30;
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('div');
    bar.className = 'titlebar-vis-bar';
    container.appendChild(bar);
    titlebarBars.push(bar);
  }

  requestAnimationFrame(titlebarVisualizerLoop);
}

function titlebarVisualizerLoop() {
  requestAnimationFrame(titlebarVisualizerLoop);
  visTime += isMediaPlaying ? 0.018 : 0.007;
  const t = visTime;

  const beatClock = (t * 1.1) % 4;
  const kick = Math.pow(Math.max(0, 1 - (beatClock % 1) * 2), 3.5);
  const snare = Math.pow(Math.max(0, 1 - ((beatClock + 1) % 2)), 3.8);

  const numBars = titlebarBars.length;
  if (!numBars) return;

  for (let i = 0; i < numBars; i++) {
    const bar = titlebarBars[i];
    const normI = i / (numBars - 1);
    let scale = 0.2;

    if (isMediaPlaying) {
      const phi1 = t * 1.6 - i * 0.20;
      const phi2 = t * 0.85 + i * 0.16;
      const wave = Math.sin(phi1) * 0.38 + Math.cos(phi2) * 0.28;
      const arch = Math.sin(normI * Math.PI);

      const bassEnergy = (1 - normI) * kick * 0.45;
      const midEnergy = arch * snare * 0.35;
      const flutter = Math.sin(t * 3.2 + i * 1.2) * 0.08;

      const raw = 0.32 + wave * 0.24 + bassEnergy + midEnergy + flutter;
      scale = Math.max(0.18, Math.min(1.0, raw));
    } else {
      const breathe = Math.sin(t * 0.8 + i * 0.18) * 0.06 + 0.18;
      scale = Math.max(0.14, Math.min(0.28, breathe));
    }

    bar.style.transform = `scaleY(${scale.toFixed(3)})`;
  }
}

// Show/hide the auto-minimize sub-option rows based on current state
function syncAutoMinimizeRows() {
  const show = (id, visible) => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? 'flex' : 'none';
  };
  show('autoMinimizeDelayRow', autoMinimizeEnabled);
  show('autoMinimizeExpandRow', autoMinimizeEnabled);
  show('autoMinimizeRehideRow', autoMinimizeEnabled && autoMinimizeExpandMethod === 'hover');
}

function updateActiveAutoMinimizeExpand(method) {
  autoMinimizeExpandMethod = (method === 'hover' ? 'hover' : 'play');
  document.querySelectorAll('#autoMinimizeExpandSwitch .segment-btn').forEach((btn) => {
    const active = btn.dataset.expand === autoMinimizeExpandMethod;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
  syncAutoMinimizeRows();
}

function setAutoMinimizeEnabledUI(enabled) {
  autoMinimizeEnabled = Boolean(enabled);
  const check = document.getElementById('checkAutoMinimize');
  if (check) check.checked = autoMinimizeEnabled;
  syncAutoMinimizeRows();
}

function updateActiveVisStyle(activeStyle) {
  if (!activeStyle) return;
  const visStyleCards = document.querySelectorAll('.vis-style-card');
  visStyleCards.forEach((card) => {
    card.classList.toggle('active', card.dataset.style === activeStyle);
  });
}

function applyAlbumArtThemeTokens(hexColor, isLight = false, isAuto = false) {
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return;
  const rgb = hexToRgb(hexColor);

  let bgHex, cardR, cardG, cardB;

  if (isAuto) {
    if (typeof lastCoverIsDark === 'boolean') {
      isLight = !lastCoverIsDark;
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
    bgHex = `#${bgR.toString(16).padStart(2, '0')}${bgG.toString(16).padStart(2, '0')}${bgB.toString(16).padStart(2, '0')}`;

    cardR = Math.min(255, Math.round(bgR + 4));
    cardG = Math.min(255, Math.round(bgG + 4));
    cardB = Math.min(255, Math.round(bgB + 4));
  } else {
    // Dark album art: deep sleek dark base with slight (14%) tint from the album art
    const bgR = Math.max(10, Math.min(28, Math.round(13 * 0.86 + rgb.r * 0.14)));
    const bgG = Math.max(12, Math.min(30, Math.round(15 * 0.86 + rgb.g * 0.14)));
    const bgB = Math.max(16, Math.min(38, Math.round(22 * 0.86 + rgb.b * 0.14)));
    bgHex = `#${bgR.toString(16).padStart(2, '0')}${bgG.toString(16).padStart(2, '0')}${bgB.toString(16).padStart(2, '0')}`;

    cardR = Math.min(48, Math.round(bgR + 12));
    cardG = Math.min(50, Math.round(bgG + 14));
    cardB = Math.min(58, Math.round(bgB + 18));
  }

  const bgRgb = hexToRgb(bgHex);
  const setVar = (prop, val) => {
    document.documentElement.style.setProperty(prop, val);
    if (document.body) document.body.style.setProperty(prop, val);
  };

  setVar('--bg-window', `rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`);
  setVar('--bg-titlebar', isLight ? `rgba(${cardR}, ${cardG}, ${cardB}, 0.95)` : `rgba(${cardR}, ${cardG}, ${cardB}, 0.85)`);
  setVar('--bg-card', isLight ? `rgba(${cardR}, ${cardG}, ${cardB}, 0.85)` : `rgba(${cardR}, ${cardG}, ${cardB}, 0.65)`);
  setVar('--bg-subtle', isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)');
  setVar('--border-color', isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
  setVar('--text-primary', isLight ? '#11131a' : '#ffffff');
  setVar('--text-secondary', isLight ? 'rgba(17, 19, 26, 0.80)' : 'rgba(255, 255, 255, 0.82)');
  setVar('--text-muted', isLight ? 'rgba(17, 19, 26, 0.52)' : 'rgba(255, 255, 255, 0.52)');
  setVar('--accent-glow-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isLight ? 0.16 : 0.22})`);
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

function applyCssTokensForColor(color) {
  let rgb = hexToRgb(color);
  let luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const isLight = document.body.classList.contains('theme-light');

  // Guard against muddy or near-black extracted accent colors on dark backgrounds
  if (!isLight && luminance < 0.42) {
    const boost = Math.max(1.7, 0.55 / Math.max(0.08, luminance));
    const r = Math.min(255, Math.round(rgb.r * boost + 75));
    const g = Math.min(255, Math.round(rgb.g * boost + 75));
    const b = Math.min(255, Math.round(rgb.b * boost + 75));
    rgb = { r, g, b };
    color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  let contrast = '#ffffff';
  let accentText = color;

  if (luminance > 0.7) {
    contrast = '#11131a';
    accentText = isLight ? '#121316' : '#ffffff';
  } else if (luminance < 0.25) {
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
  document.documentElement.style.setProperty('--vis-bar-color', color);
  document.documentElement.style.setProperty('--vis-bar-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`);

  updateAllSliderProgress();
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
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
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function syncCustomStudioUI(color) {
  if (!color || typeof color !== 'string' || !color.startsWith('#')) return;
  const cleanHex = color.replace('#', '').toUpperCase();
  const inputHexCode = document.getElementById('inputHexCode');
  const pickerPreviewChip = document.getElementById('pickerPreviewChip');
  const sliderPickerHue = document.getElementById('sliderPickerHue');
  const sliderPickerBrightness = document.getElementById('sliderPickerBrightness');

  if (inputHexCode && document.activeElement !== inputHexCode) {
    inputHexCode.value = cleanHex;
  }
  if (pickerPreviewChip) {
    pickerPreviewChip.style.background = color;
  }
  const hsl = hexToHsl(color);
  if (sliderPickerHue && document.activeElement !== sliderPickerHue) {
    sliderPickerHue.value = hsl.h;
  }
  if (sliderPickerBrightness && document.activeElement !== sliderPickerBrightness) {
    sliderPickerBrightness.value = hsl.l;
    const pureColor = hslToHex(hsl.h, 100, 50);
    sliderPickerBrightness.style.background = `linear-gradient(to right, #000000 0%, ${pureColor} 50%, #ffffff 100%)`;
  }
}

function updateThemeTokens(color, extractedColor = null) {
  currentAccent = color;
  if (extractedColor) {
    lastExtractedAccentColor = extractedColor;
  }
  const isAuto = (color === 'auto');
  const btnToggleCustomPicker = document.getElementById('btnToggleCustomPicker');
  const btnCustomSwatch = document.getElementById('btnCustomSwatch');

  if (isAuto) {
    if (labelCurrentColor) {
      labelCurrentColor.textContent = 'Auto';
    }
    colorSwatches.forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.color === 'auto');
    });
    if (btnCustomSwatch) btnCustomSwatch.classList.remove('active');
    if (btnToggleCustomPicker) btnToggleCustomPicker.classList.remove('active');

    const activeColor = lastExtractedAccentColor;
    if (activeColor && typeof activeColor === 'string' && activeColor.startsWith('#')) {
      applyCssTokensForColor(activeColor);
    } else {
      const isLight = document.body.classList.contains('theme-light');
      applyCssTokensForColor(isLight ? '#22242E' : '#A4AAB8');
    }
    return;
  }

  if (labelCurrentColor) {
    labelCurrentColor.textContent = color.toUpperCase();
  }

  let matchedStandard = false;
  colorSwatches.forEach((swatch) => {
    if (swatch.id === 'btnCustomSwatch') return;
    const isMatch = swatch.dataset.color && swatch.dataset.color.toLowerCase() === color.toLowerCase();
    swatch.classList.toggle('active', isMatch);
    if (isMatch) matchedStandard = true;
  });

  const isCustomMatch = !matchedStandard || (color.toLowerCase() === lastCustomColor.toLowerCase());
  if (btnCustomSwatch) {
    btnCustomSwatch.classList.toggle('active', isCustomMatch);
  }
  if (btnToggleCustomPicker) {
    btnToggleCustomPicker.classList.toggle('active', isCustomMatch);
  }
  const customSwatchCombo = document.getElementById('customSwatchCombo');
  if (customSwatchCombo) {
    customSwatchCombo.classList.toggle('active', isCustomMatch);
  }

  if (inputCustomColor) inputCustomColor.value = color;

  applyCssTokensForColor(color);
  syncCustomStudioUI(color);
}

function applyThemeUI(themeData) {
  const setting = typeof themeData === 'object' ? themeData.setting : themeData;
  currentThemeSetting = setting || 'system';

  document.querySelectorAll('.theme-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === setting);
  });

  let effectiveIsLight = false;

  if (setting === 'auto') {
    if (lastExtractedAccentColor && typeof lastCoverIsDark === 'boolean') {
      effectiveIsLight = !lastCoverIsDark;
    } else if (lastExtractedAccentColor) {
      const rgb = hexToRgb(lastExtractedAccentColor);
      const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      effectiveIsLight = lum >= 0.48;
    } else {
      effectiveIsLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    document.body.classList.add('theme-album-auto');
  } else if (setting === 'light') {
    effectiveIsLight = true;
    document.body.classList.remove('theme-album-auto');
  } else if (setting === 'dark') {
    effectiveIsLight = false;
    document.body.classList.remove('theme-album-auto');
  } else {
    // 'system'
    effectiveIsLight = (typeof themeData === 'object' && themeData.effective)
      ? themeData.effective === 'light'
      : window.matchMedia('(prefers-color-scheme: light)').matches;
    document.body.classList.remove('theme-album-auto');
  }

  document.body.classList.toggle('theme-light', effectiveIsLight);
  document.body.classList.toggle('theme-dark', !effectiveIsLight);

  if (lastExtractedAccentColor && adaptAlbumColorSetting !== false) {
    applyAlbumArtThemeTokens(lastExtractedAccentColor, effectiveIsLight, setting === 'auto');
  } else {
    // Reset standard background and text tokens
    const removeVar = (prop) => {
      document.documentElement.style.removeProperty(prop);
      if (document.body) document.body.style.removeProperty(prop);
    };
    removeVar('--bg-window');
    removeVar('--bg-titlebar');
    removeVar('--bg-card');
    removeVar('--bg-subtle');
    removeVar('--border-color');
    removeVar('--text-primary');
    removeVar('--text-secondary');
    removeVar('--text-muted');
  }

  updateThemeTokens(currentAccent, lastExtractedAccentColor);
}

function updateActiveModeBtn(mode) {
  const normalized = (mode === 'pill' ? 'collapsed' : (mode === 'normal' ? 'card' : (mode === 'mini' ? 'minimized' : mode)));
  document.querySelectorAll('.layout-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === normalized);
  });
}

function updateSliderProgress(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, rgba(255, 255, 255, 0.12) ${pct}%, rgba(255, 255, 255, 0.12) 100%)`;
}

function updateAllSliderProgress() {
  updateSliderProgress(sliderOpacity);
  updateSliderProgress(sliderFontSize);
  updateSliderProgress(sliderOffset);
}

async function initSettings() {
  try {
    setupEventListeners();
  } catch (err) {
    console.error('Settings setupEventListeners error:', err);
  }
  try {
    setupTitlebarVisualizer();
  } catch (err) {
    console.error('Settings titlebar visualizer error:', err);
  }
  try {
    await loadSettingsIntoUI();
  } catch (err) {
    console.error('Settings init error:', err);
  } finally {
    try { updateAllSliderProgress(); } catch (e) { console.error(e); }
  }
}

async function loadSettingsIntoUI() {
  if (window.overlyAPI) {
    const saved = await window.overlyAPI.getSettings();
    if (saved) {
      if (saved.mode) {
        committedMode = (saved.mode === 'pill' ? 'collapsed' : (saved.mode === 'normal' ? 'card' : (saved.mode === 'mini' ? 'minimized' : saved.mode)));
        updateActiveModeBtn(committedMode);
      }
      if (saved.customColor) {
        lastCustomColor = saved.customColor;
      } else if (saved.accentColor && saved.accentColor !== 'auto') {
        const standardColors = ['#FF3040', '#FF6B4A', '#E1306C', '#8A3AB9', '#4F86F7', '#00C9A7', '#18181B', '#FFFFFF'];
        if (!standardColors.some(c => c.toLowerCase() === saved.accentColor.toLowerCase())) {
          lastCustomColor = saved.accentColor;
        }
      }
      const btnCustomSwatch = document.getElementById('btnCustomSwatch');
      if (btnCustomSwatch) {
        btnCustomSwatch.style.background = lastCustomColor;
        btnCustomSwatch.dataset.color = lastCustomColor;
        btnCustomSwatch.title = `Custom Accent (${lastCustomColor.toUpperCase()})`;
      }
      if (saved.extractedAccentColor) {
        lastExtractedAccentColor = saved.extractedAccentColor;
      }
      if (saved.accentColor) updateThemeTokens(saved.accentColor, lastExtractedAccentColor);
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
      if (typeof saved.adaptAlbumColor === 'boolean') {
        adaptAlbumColorSetting = saved.adaptAlbumColor;
      } else {
        adaptAlbumColorSetting = true;
      }
      const checkAdaptAlbumColor = document.getElementById('checkAdaptAlbumColor');
      if (checkAdaptAlbumColor) checkAdaptAlbumColor.checked = adaptAlbumColorSetting;

      if (saved.theme) {
        applyThemeUI(saved.theme);
      }
      if (typeof saved.autoMinimize === 'boolean') {
        setAutoMinimizeEnabledUI(saved.autoMinimize);
      }
      if (saved.autoMinimizeExpand) {
        updateActiveAutoMinimizeExpand(saved.autoMinimizeExpand);
      }
      if (typeof saved.autoMinimizeRehide === 'boolean') {
        const checkRehide = document.getElementById('checkAutoMinimizeRehide');
        if (checkRehide) checkRehide.checked = saved.autoMinimizeRehide;
      }
      if (typeof saved.autoMinimizeDelay === 'number') {
        const selectAutoMinimizeDelay = document.getElementById('selectAutoMinimizeDelay');
        if (selectAutoMinimizeDelay) {
          selectAutoMinimizeDelay.value = String(saved.autoMinimizeDelay);
        }
      }
      if (saved.visualizerStyle) {
        updateActiveVisStyle(saved.visualizerStyle);
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

    // Real-time track artwork color extraction and search sync while Settings window is open
    let lastProcessedCoverUrl = null;
    if (window.overlyAPI.onMediaUpdate) {
      window.overlyAPI.onMediaUpdate(async (media) => {
        if (!media) return;

        // Sync playing status with titlebar visualizer
        if (typeof media.status === 'string') {
          isMediaPlaying = (media.status === 'Playing');
        }

        // Auto-update manual search input when song changes while settings window is open
        if (media.title) {
          const trackKey = `${(media.title || '').trim().toLowerCase()}:::${(media.artist || '').trim().toLowerCase()}`;
          if (trackKey !== currentTrackKey) {
            currentTrackKey = trackKey;
            visSongHash = Math.abs(trackKey.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0));
            const newQuery = media.artist ? `${media.title} — ${media.artist}` : media.title;
            if (inputSearchTrack) {
              inputSearchTrack.value = newQuery;
            }
            const searchFeedback = document.getElementById('searchFeedback');
            if (searchFeedback) {
              searchFeedback.innerHTML = '';
            }
          }
        }

        if (media.coverUrl) {
          if (media.coverUrl === lastProcessedCoverUrl) return;
          lastProcessedCoverUrl = media.coverUrl;
          try {
            const colors = media.coverColors || (await window.overlyAPI.extractCoverColors(media.coverUrl));
            if (colors && colors.primary) {
              lastExtractedAccentColor = colors.primary;
              lastCoverIsDark = typeof colors.isDark === 'boolean' ? colors.isDark : true;
              if (currentAccent === 'auto') {
                updateThemeTokens('auto', colors.primary);
              }
              applyThemeUI(currentThemeSetting);
            }
          } catch (err) {
            console.error('Settings cover color extraction error:', err);
          }
        } else if (!media.hasMedia || !media.title) {
          lastProcessedCoverUrl = null;
          lastExtractedAccentColor = null;
          lastCoverIsDark = true;
          if (currentAccent === 'auto') {
            updateThemeTokens('auto', null);
          }
          applyThemeUI(currentThemeSetting);
        }
      });
    }

    if (window.overlyAPI.onSettingUpdated) {
      window.overlyAPI.onSettingUpdated(({ key, value }) => {
        if (key === 'mode') {
          committedMode = (value === 'pill' ? 'collapsed' : (value === 'normal' ? 'card' : (value === 'mini' ? 'minimized' : value)));
          updateActiveModeBtn(committedMode);
        }
        if (key === 'extractedAccentColor') {
          lastExtractedAccentColor = value;
          applyThemeUI(currentThemeSetting);
        }
        if (key === 'customColor') {
          lastCustomColor = value;
          const btnCustomSwatch = document.getElementById('btnCustomSwatch');
          if (btnCustomSwatch) {
            btnCustomSwatch.style.background = lastCustomColor;
            btnCustomSwatch.dataset.color = lastCustomColor;
            btnCustomSwatch.title = `Custom Accent (${lastCustomColor.toUpperCase()})`;
          }
        }
        if (key === 'accentColor') {
          updateThemeTokens(value, lastExtractedAccentColor);
        }
        if (key === 'adaptAlbumColor') {
          adaptAlbumColorSetting = Boolean(value);
          const checkAdapt = document.getElementById('checkAdaptAlbumColor');
          if (checkAdapt) checkAdapt.checked = adaptAlbumColorSetting;
          applyThemeUI(currentThemeSetting);
        }
        if (key === 'autoMinimize') {
          setAutoMinimizeEnabledUI(value);
        }
        if (key === 'autoMinimizeRehide') {
          const checkRehide = document.getElementById('checkAutoMinimizeRehide');
          if (checkRehide) checkRehide.checked = Boolean(value);
        }
        if (key === 'autoMinimizeDelay') {
          const selectAutoMinimizeDelay = document.getElementById('selectAutoMinimizeDelay');
          if (selectAutoMinimizeDelay) {
            selectAutoMinimizeDelay.value = String(value);
          }
        }
        if (key === 'autoMinimizeExpand') {
          updateActiveAutoMinimizeExpand(value);
        }
        if (key === 'visualizerStyle') {
          updateActiveVisStyle(value);
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

    // Pre-fill search query if opened with one (or scroll to and focus search card)
    window.overlyAPI.onInitSearchQuery?.((query) => {
      if (query) {
        let val = '';
        if (typeof query === 'string') {
          val = query;
        } else if (query.title) {
          val = query.artist ? `${query.title} — ${query.artist}` : query.title;
        }
        if (val && inputSearchTrack) {
          inputSearchTrack.value = val;
          currentTrackKey = val.toLowerCase();
          const searchSection = inputSearchTrack.closest('.settings-card');
          searchSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputSearchTrack.focus();
          inputSearchTrack.select();
        }
      }
    });
  }
}

function setupEventListeners() {
  // Close window button & Esc shortcut
  btnCloseSettingsWindow.addEventListener('click', () => {
    if (window.overlyAPI?.closeSettingsWindow) window.overlyAPI.closeSettingsWindow();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (window.overlyAPI?.closeSettingsWindow) window.overlyAPI.closeSettingsWindow();
    }
  });

  // Theme mode buttons
  const themeModeBtns = document.querySelectorAll('.theme-mode-btn');
  themeModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyThemeUI(theme);
      if (theme === 'auto') {
        updateThemeTokens('auto', lastExtractedAccentColor);
        if (window.overlyAPI?.updateSetting) {
          window.overlyAPI.updateSetting('accentColor', 'auto');
        }
      }
      if (window.overlyAPI?.setTheme) {
        window.overlyAPI.setTheme(theme);
      }
    });
  });

  // Startup checkbox
  const checkStartup = document.getElementById('checkStartup');
  if (checkStartup) {
    checkStartup.addEventListener('change', (e) => {
      if (window.overlyAPI?.setStartup) {
        window.overlyAPI.setStartup(e.target.checked);
      }
    });
  }

  // Adapt background to album art color checkbox
  const checkAdaptAlbumColor = document.getElementById('checkAdaptAlbumColor');
  if (checkAdaptAlbumColor) {
    checkAdaptAlbumColor.addEventListener('change', (e) => {
      adaptAlbumColorSetting = e.target.checked;
      applyThemeUI(currentThemeSetting);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('adaptAlbumColor', e.target.checked);
      }
    });
  }

  // Auto minimize checkbox, delay selector, expand trigger switch & re-minimize toggle
  const checkAutoMinimize = document.getElementById('checkAutoMinimize');
  const selectAutoMinimizeDelay = document.getElementById('selectAutoMinimizeDelay');
  const checkAutoMinimizeRehide = document.getElementById('checkAutoMinimizeRehide');

  if (checkAutoMinimize) {
    checkAutoMinimize.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      setAutoMinimizeEnabledUI(isChecked);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('autoMinimize', isChecked);
      }
    });
  }

  if (selectAutoMinimizeDelay) {
    selectAutoMinimizeDelay.addEventListener('change', (e) => {
      const parsed = parseInt(e.target.value, 10);
      const delay = Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('autoMinimizeDelay', delay);
      }
    });
  }

  if (checkAutoMinimizeRehide) {
    checkAutoMinimizeRehide.addEventListener('change', (e) => {
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('autoMinimizeRehide', e.target.checked);
      }
    });
  }

  const autoMinimizeExpandBtns = document.querySelectorAll('#autoMinimizeExpandSwitch .segment-btn');
  autoMinimizeExpandBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.expand || 'play';
      updateActiveAutoMinimizeExpand(method);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('autoMinimizeExpand', method);
      }
    });
  });

  // Layout mode buttons
  const layoutModeBtns = document.querySelectorAll('.layout-mode-btn');
  layoutModeBtns.forEach((btn) => {
    const mode = btn.dataset.mode;
    btn.addEventListener('click', () => {
      committedMode = mode;
      updateActiveModeBtn(mode);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('mode', mode);
      }
    });
  });

  // Instrumental Visualizer style selection
  const visStyleCards = document.querySelectorAll('.vis-style-card');
  visStyleCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('.vis-style-card') || card;
      const style = btn.dataset.style;
      if (style) {
        updateActiveVisStyle(style);
        if (window.overlyAPI?.updateSetting) {
          window.overlyAPI.updateSetting('visualizerStyle', style);
        }
      }
    });
  });

  // Color swatches (exclude custom swatch button from standard handler)
  colorSwatches.forEach((swatch) => {
    if (swatch.id === 'btnCustomSwatch') return;
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      if (!color) return;
      updateThemeTokens(color, lastExtractedAccentColor);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('accentColor', color);
      }
    });
  });

  // Dedicated custom swatch click: IMMEDIATELY applies user's last customized color!
  const btnCustomSwatch = document.getElementById('btnCustomSwatch');
  if (btnCustomSwatch) {
    btnCustomSwatch.addEventListener('click', (e) => {
      e.stopPropagation();
      updateThemeTokens(lastCustomColor, lastExtractedAccentColor);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('accentColor', lastCustomColor);
        window.overlyAPI.updateSetting('customColor', lastCustomColor);
      }
    });
  }

  // Custom Color Studio elements & handlers
  const btnToggleCustomPicker = document.getElementById('btnToggleCustomPicker');
  const customPickerPanel = document.getElementById('customPickerPanel');
  const inputHexCode = document.getElementById('inputHexCode');
  const sliderPickerHue = document.getElementById('sliderPickerHue');
  const sliderPickerBrightness = document.getElementById('sliderPickerBrightness');
  const btnEyedropper = document.getElementById('btnEyedropper');
  const presetChips = document.querySelectorAll('.preset-chip');

  function applyCustomColor(hex) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return;
    lastCustomColor = hex.toUpperCase();
    if (btnCustomSwatch) {
      btnCustomSwatch.style.background = lastCustomColor;
      btnCustomSwatch.dataset.color = lastCustomColor;
      btnCustomSwatch.title = `Custom Accent (${lastCustomColor})`;
    }
    updateThemeTokens(lastCustomColor, lastExtractedAccentColor);
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('accentColor', lastCustomColor);
      window.overlyAPI.updateSetting('customColor', lastCustomColor);
    }
  }

  if (btnToggleCustomPicker && customPickerPanel) {
    btnToggleCustomPicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = customPickerPanel.classList.toggle('open');
      if (isOpen && currentAccent && currentAccent !== 'auto') {
        syncCustomStudioUI(currentAccent);
      }
    });
  }

  if (sliderPickerHue && sliderPickerBrightness) {
    const handleSliderInput = () => {
      const h = Number(sliderPickerHue.value);
      const l = Number(sliderPickerBrightness.value);
      const hex = hslToHex(h, 100, l);
      applyCustomColor(hex);
    };
    sliderPickerHue.addEventListener('input', handleSliderInput);
    sliderPickerBrightness.addEventListener('input', handleSliderInput);
  }

  if (inputHexCode) {
    inputHexCode.addEventListener('input', (e) => {
      let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
      e.target.value = val.toUpperCase();
      if (val.length === 6) {
        applyCustomColor('#' + val.toUpperCase());
      }
    });
    inputHexCode.addEventListener('blur', (e) => {
      if (currentAccent && currentAccent.startsWith('#')) {
        e.target.value = currentAccent.replace('#', '').toUpperCase();
      }
    });
  }

  presetChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = chip.dataset.color;
      if (color) applyCustomColor(color);
    });
  });

  if (btnEyedropper) {
    if (window.EyeDropper) {
      btnEyedropper.addEventListener('click', async () => {
        try {
          const eyeDropper = new EyeDropper();
          const res = await eyeDropper.open();
          if (res && res.sRGBHex) {
            applyCustomColor(res.sRGBHex.toUpperCase());
          }
        } catch (_) {}
      });
    } else {
      btnEyedropper.style.display = 'none';
    }
  }

  // Native input color fallback
  if (inputCustomColor) {
    inputCustomColor.addEventListener('input', (e) => {
      const color = e.target.value;
      applyCustomColor(color);
    });
  }

  // Opacity slider
  sliderOpacity.addEventListener('input', (e) => {
    const pct = Number(e.target.value);
    opacityVal.textContent = `${pct}%`;
    updateSliderProgress(sliderOpacity);
    const norm = pct / 100;
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('opacity', norm);
    }
  });

  // Font size slider
  sliderFontSize.addEventListener('input', (e) => {
    const size = Number(e.target.value);
    fontSizeVal.textContent = `${size}px`;
    updateSliderProgress(sliderFontSize);
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('fontSize', size);
    }
  });

  // Offset controls
  sliderOffset.addEventListener('input', (e) => {
    currentOffset = Number(e.target.value);
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    updateSliderProgress(sliderOffset);
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

  if (btnOffsetMinusOne) {
    btnOffsetMinusOne.addEventListener('click', () => {
      currentOffset = Math.max(-10, Math.round((currentOffset - 1.0) * 10) / 10);
      sliderOffset.value = currentOffset;
      offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
      updateSliderProgress(sliderOffset);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('offset', currentOffset);
      }
    });
  }

  btnOffsetMinus.addEventListener('click', () => {
    currentOffset = Math.max(-10, Math.round((currentOffset - 0.2) * 10) / 10);
    sliderOffset.value = currentOffset;
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    updateSliderProgress(sliderOffset);
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

  btnOffsetPlus.addEventListener('click', () => {
    currentOffset = Math.min(10, Math.round((currentOffset + 0.2) * 10) / 10);
    sliderOffset.value = currentOffset;
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    updateSliderProgress(sliderOffset);
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

  if (btnOffsetPlusOne) {
    btnOffsetPlusOne.addEventListener('click', () => {
      currentOffset = Math.min(10, Math.round((currentOffset + 1.0) * 10) / 10);
      sliderOffset.value = currentOffset;
      offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
      updateSliderProgress(sliderOffset);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('offset', currentOffset);
      }
    });
  }

  if (btnOffsetReset) {
    btnOffsetReset.addEventListener('click', () => {
      currentOffset = 0.0;
      sliderOffset.value = 0.0;
      offsetVal.textContent = '0.0s';
      updateSliderProgress(sliderOffset);
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('offset', 0.0);
      }
    });
  }

  // Lyric Search
  btnSearch.addEventListener('click', handleManualSearch);
  inputSearchTrack.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleManualSearch();
  });

  // App Uninstall
  const btnUninstallApp = document.getElementById('btnUninstallApp');
  if (btnUninstallApp) {
    btnUninstallApp.addEventListener('click', () => {
      if (confirm('Are you sure you want to uninstall overLy from your computer? This will remove all files.')) {
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

  searchFeedback.textContent = 'Searching lyrics database...';
  searchFeedback.className = 'search-feedback searching';
  btnSearch.disabled = true;

  try {
    if (window.overlyAPI?.manualSearchLyrics) {
      const res = await window.overlyAPI.manualSearchLyrics(title, artist);
      if (res && ((res.lyrics && res.lyrics.length > 0) || res.plainLyrics)) {
        searchFeedback.textContent = `Found lyrics (${res.hasSynced ? 'Synced' : 'Plain text'})! Applied to overlay.`;
        searchFeedback.className = 'search-feedback success';
        window.overlyAPI.applyManualLyrics?.(res);
      } else {
        searchFeedback.textContent = 'No matching lyrics found. Try alternate song name or artist.';
        searchFeedback.className = 'search-feedback error';
      }
    }
  } catch (err) {
    searchFeedback.textContent = 'Error searching lyrics. Check internet connection.';
    searchFeedback.className = 'search-feedback error';
  } finally {
    btnSearch.disabled = false;
  }
}

initSettings();
