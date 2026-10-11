!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to overLy"
  !define MUI_WELCOMEPAGE_TEXT "A modern, minimalist floating lyrics overlay for Windows.$\r$\n$\r$\nHighlights:$\r$\n  • Real-time lyrics auto-synced with Spotify, Apple Music && YouTube Music$\r$\n  • 4 Flexible layouts: Floating Card, Compact Pill, Minimized Disc && Expanded view$\r$\n  • Adaptive themes: Real-time album-art colors && frosted glass effects$\r$\n  • Click-Through ghost mode (Ctrl+Shift+L) for gaming && workflow$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Uninstall overLy"
  !define MUI_WELCOMEPAGE_TEXT "This wizard will uninstall overLy from your computer.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
