// overly Setup Wizard Controller
let currentStep = 1;
const totalSteps = 4;
let selectedLayout = 'card';

const stepLabels = [
  'WELCOME · STEP 1 OF 4',
  'LAYOUT · STEP 2 OF 4',
  'PREFERENCES · STEP 3 OF 4',
  'READY · STEP 4 OF 4'
];

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const stepPages = [
    document.getElementById('step1'),
    document.getElementById('step2'),
    document.getElementById('step3'),
    document.getElementById('step4')
  ];

  const dotElements = document.querySelectorAll('#stepDots .dot');
  const stepLabel = document.getElementById('stepLabel');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnCancel = document.getElementById('btnCancel');
  const btnTitleMinimize = document.getElementById('btnTitleMinimize');
  const btnTitleClose = document.getElementById('btnTitleClose');

  const chkAdaptAlbumColor = document.getElementById('chkAdaptAlbumColor');
  const chkAlwaysOnTop = document.getElementById('chkAlwaysOnTop');
  const chkStartOnBoot = document.getElementById('chkStartOnBoot');

  // Load current settings if available
  if (window.overlyAPI?.getSettings) {
    try {
      const currentSettings = await window.overlyAPI.getSettings();
      if (currentSettings) {
        if (currentSettings.mode) {
          selectedLayout = currentSettings.mode;
        }
        if (typeof currentSettings.adaptAlbumColor === 'boolean') {
          chkAdaptAlbumColor.checked = currentSettings.adaptAlbumColor;
        }
        if (typeof currentSettings.alwaysOnTop === 'boolean') {
          chkAlwaysOnTop.checked = currentSettings.alwaysOnTop;
        }
        if (typeof currentSettings.startOnBoot === 'boolean') {
          chkStartOnBoot.checked = currentSettings.startOnBoot;
        }
      }
    } catch (e) {
      console.warn('Could not load existing settings:', e);
    }
  }

  // Pre-select layout card
  const layoutCards = document.querySelectorAll('.layout-card');
  layoutCards.forEach(card => {
    if (card.dataset.mode === selectedLayout) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }

    card.addEventListener('click', () => {
      layoutCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedLayout = card.dataset.mode;
    });
  });

  function updateStep(step) {
    currentStep = step;

    // Show active step page
    stepPages.forEach((page, idx) => {
      if (idx + 1 === currentStep) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    // Update dots
    dotElements.forEach((dot, idx) => {
      if (idx + 1 === currentStep) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update step label
    stepLabel.textContent = stepLabels[currentStep - 1] || `STEP ${currentStep} OF ${totalSteps}`;

    // Update buttons
    if (currentStep === 1) {
      btnPrev.classList.add('hidden');
    } else {
      btnPrev.classList.remove('hidden');
    }

    if (currentStep === totalSteps) {
      btnNext.textContent = 'Launch overLy';
    } else {
      btnNext.textContent = 'Next';
    }
  }

  // Next / Launch click
  btnNext.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      updateStep(currentStep + 1);
    } else {
      // Final Step: Complete setup and launch
      const config = {
        mode: selectedLayout,
        adaptAlbumColor: chkAdaptAlbumColor.checked,
        alwaysOnTop: chkAlwaysOnTop.checked,
        startOnBoot: chkStartOnBoot.checked,
        hasCompletedSetup: true
      };

      if (window.overlyAPI?.finishSetupWizard) {
        window.overlyAPI.finishSetupWizard(config);
      } else {
        window.close();
      }
    }
  });

  // Prev click
  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
      updateStep(currentStep - 1);
    }
  });

  // Cancel / Close buttons
  btnCancel.addEventListener('click', () => {
    if (window.overlyAPI?.closeSetupWizard) {
      window.overlyAPI.closeSetupWizard();
    } else {
      window.close();
    }
  });

  if (btnTitleClose) {
    btnTitleClose.addEventListener('click', () => {
      if (window.overlyAPI?.closeSetupWizard) {
        window.overlyAPI.closeSetupWizard();
      } else {
        window.close();
      }
    });
  }

  if (btnTitleMinimize) {
    btnTitleMinimize.addEventListener('click', () => {
      if (window.overlyAPI?.minimizeSetupWizard) {
        window.overlyAPI.minimizeSetupWizard();
      }
    });
  }

  // Initialize view
  updateStep(1);
});
