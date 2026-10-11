!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to overLy"
  !define MUI_WELCOMEPAGE_TEXT "A lightweight floating lyrics overlay that keeps your lyrics in sync while you work, play, or browse.$\r$\n$\r$\nKey Features:$\r$\n  • Live Media Detection: Auto-syncs with Spotify, Apple Music & Windows media$\r$\n  • Flexible Layouts: Floating Card, Compact Pill, Minimized Disc & Expanded view$\r$\n  • Adaptive Themes: Real-time album-art colors & glassmorphism effects$\r$\n  • Click-Through Ghost Mode: Press Ctrl+Shift+L to click through into games$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Uninstall overLy"
  !define MUI_WELCOMEPAGE_TEXT "This wizard will uninstall overLy - Floating Lyrics Overlay from your computer.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
