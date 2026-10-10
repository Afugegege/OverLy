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
const btnOffsetReset = document.getElementById('btnOffsetReset');
const inputSearchTrack = document.getElementById('inputSearchTrack');
const btnSearch = document.getElementById('btnSearch');
const searchFeedback = document.getElementById('searchFeedback');
const btnCloseSettingsWindow = document.getElementById('btnCloseSettingsWindow');

let currentAccent = '#FF3040';
let lastCustomColor = '#E1306C';
let lastExtractedAccentColor = null;
let currentThemeSetting = 'system';
let currentOffset = 0.0;
let committedMode = 'card';

function applyAlbumArtThemeTokens(hexColor) {
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return;
  const rgb = hexToRgb(hexColor);

  const bgR = Math.max(9, Math.min(32, Math.round(rgb.r * 0.16 + 10 * 0.84)));
  const bgG = Math.max(11, Math.min(34, Math.round(rgb.g * 0.16 + 12 * 0.84)));
  const bgB = Math.max(16, Math.min(42, Math.round(rgb.b * 0.16 + 18 * 0.84)));

  const cardR = Math.round(bgR + 12);
  const cardG = Math.round(bgG + 14);
  const cardB = Math.round(bgB + 20);

  const textR = Math.round(255 * 0.94 + rgb.r * 0.06);
  const textG = Math.round(255 * 0.94 + rgb.g * 0.06);
  const textB = Math.round(255 * 0.94 + rgb.b * 0.06);

  document.documentElement.style.setProperty('--bg-window', `rgb(${bgR}, ${bgG}, ${bgB})`);
  document.documentElement.style.setProperty('--bg-card', `rgba(${cardR}, ${cardG}, ${cardB}, 0.65)`);
  document.documentElement.style.setProperty('--bg-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
  document.documentElement.style.setProperty('--border-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`);
  document.documentElement.style.setProperty('--text-primary', `rgb(${textR}, ${textG}, ${textB})`);
  document.documentElement.style.setProperty('--text-secondary', `rgba(${textR}, ${textG}, ${textB}, 0.72)`);
  document.documentElement.style.setProperty('--text-muted', `rgba(${textR}, ${textG}, ${textB}, 0.46)`);
  document.documentElement.style.setProperty('--accent-glow-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
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
  const rgb = hexToRgb(color);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const isLight = document.body.classList.contains('theme-light');

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
  const isAutoTheme = (setting === 'auto');

  document.querySelectorAll('.theme-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === setting);
  });

  if (isAutoTheme) {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark', 'theme-album-auto');
    if (lastExtractedAccentColor) {
      applyAlbumArtThemeTokens(lastExtractedAccentColor);
    }
    updateThemeTokens('auto', lastExtractedAccentColor);
    return;
  }

  document.body.classList.remove('theme-album-auto');
  const effective = (typeof themeData === 'object' && themeData.effective) ? themeData.effective : (
    setting === 'light' ? 'light' : setting === 'dark' ? 'dark' : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  );

  document.body.classList.toggle('theme-light', effective === 'light');
  document.body.classList.toggle('theme-dark', effective !== 'light');

  // Reset standard background and text tokens
  document.documentElement.style.removeProperty('--bg-window');
  document.documentElement.style.removeProperty('--bg-card');
  document.documentElement.style.removeProperty('--bg-subtle');
  document.documentElement.style.removeProperty('--border-color');
  document.documentElement.style.removeProperty('--text-primary');
  document.documentElement.style.removeProperty('--text-secondary');
  document.documentElement.style.removeProperty('--text-muted');

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
      if (saved.theme) {
        applyThemeUI(saved.theme);
      }
      if (typeof saved.autoMinimize === 'boolean') {
        const checkAutoMinimize = document.getElementById('checkAutoMinimize');
        const autoMinimizeDelayRow = document.getElementById('autoMinimizeDelayRow');
        if (checkAutoMinimize) {
          checkAutoMinimize.checked = saved.autoMinimize;
          if (autoMinimizeDelayRow) {
            autoMinimizeDelayRow.style.display = saved.autoMinimize ? 'flex' : 'none';
          }
        }
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

    // Real-time track artwork color extraction while Settings window is open
    if (window.overlyAPI.onMediaUpdate) {
      window.overlyAPI.onMediaUpdate(async (media) => {
        if (!media) return;
        if (media.coverUrl) {
          try {
            const colors = await window.overlyAPI.extractCoverColors(media.coverUrl);
            if (colors && colors.primary) {
              lastExtractedAccentColor = colors.primary;
              if (currentAccent === 'auto') {
                updateThemeTokens('auto', colors.primary);
              }
              if (currentThemeSetting === 'auto') {
                applyAlbumArtThemeTokens(colors.primary);
              }
            }
          } catch (err) {
            console.error('Settings cover color extraction error:', err);
          }
        } else if (currentAccent === 'auto') {
          lastExtractedAccentColor = null;
          updateThemeTokens('auto', null);
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
          if (currentAccent === 'auto') {
            updateThemeTokens('auto', lastExtractedAccentColor);
          }
          if (currentThemeSetting === 'auto' && value) {
            applyAlbumArtThemeTokens(value);
          }
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
        if (key === 'autoMinimize') {
          const checkAutoMinimize = document.getElementById('checkAutoMinimize');
          const autoMinimizeDelayRow = document.getElementById('autoMinimizeDelayRow');
          if (checkAutoMinimize) {
            checkAutoMinimize.checked = Boolean(value);
            if (autoMinimizeDelayRow) {
              autoMinimizeDelayRow.style.display = Boolean(value) ? 'flex' : 'none';
            }
          }
        }
        if (key === 'autoMinimizeDelay') {
          const selectAutoMinimizeDelay = document.getElementById('selectAutoMinimizeDelay');
          if (selectAutoMinimizeDelay) {
            selectAutoMinimizeDelay.value = String(value);
          }
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

    // Pre-fill search query if opened with one
    window.overlyAPI.onInitSearchQuery?.((query) => {
      if (query) {
        if (typeof query === 'string') {
          inputSearchTrack.value = query;
        } else if (query.title) {
          inputSearchTrack.value = query.artist ? `${query.title} - ${query.artist}` : query.title;
        }
      }
    });
  }

  updateAllSliderProgress();
  setupEventListeners();
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

  // Auto minimize checkbox & delay selector
  const checkAutoMinimize = document.getElementById('checkAutoMinimize');
  const autoMinimizeDelayRow = document.getElementById('autoMinimizeDelayRow');
  const selectAutoMinimizeDelay = document.getElementById('selectAutoMinimizeDelay');

  if (checkAutoMinimize) {
    checkAutoMinimize.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (autoMinimizeDelayRow) {
        autoMinimizeDelayRow.style.display = isChecked ? 'flex' : 'none';
      }
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('autoMinimize', isChecked);
      }
    });
  }

  if (selectAutoMinimizeDelay) {
    selectAutoMinimizeDelay.addEventListener('change', (e) => {
      const delay = parseInt(e.target.value, 10) || 10;
      if (window.overlyAPI?.updateSetting) {
        window.overlyAPI.updateSetting('autoMinimizeDelay', delay);
      }
    });
  }

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
    card.addEventListener('click', () => {
      const style = card.dataset.style;
      if (style) {
        updateActiveVisStyle(style);
        if (window.overlyAPI?.updateSetting) {
          window.overlyAPI.updateSetting('visualizerStyle', style);
        }
      }
    });
  });

  function updateActiveVisStyle(activeStyle) {
    if (!activeStyle) return;
    visStyleCards.forEach((card) => {
      card.classList.toggle('active', card.dataset.style === activeStyle);
    });
  }

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

  btnOffsetMinus.addEventListener('click', () => {
    currentOffset = Math.max(-3, Math.round((currentOffset - 0.2) * 10) / 10);
    sliderOffset.value = currentOffset;
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    updateSliderProgress(sliderOffset);
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

  btnOffsetPlus.addEventListener('click', () => {
    currentOffset = Math.min(3, Math.round((currentOffset + 0.2) * 10) / 10);
    sliderOffset.value = currentOffset;
    offsetVal.textContent = (currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`);
    updateSliderProgress(sliderOffset);
    if (window.overlyAPI?.updateSetting) {
      window.overlyAPI.updateSetting('offset', currentOffset);
    }
  });

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
