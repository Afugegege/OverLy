!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to overLy"
  !define MUI_WELCOMEPAGE_TEXT "overLy is a lightweight, minimalist floating synchronized lyrics overlay for Windows.$\r$\n$\r$\nDesigned to stay gracefully above your work, games, and browsing with real-time lyrics tracking.$\r$\n$\r$\nKey Features:$\r$\n  • Real-Time Synced Lyrics: Auto-syncs with Spotify, Apple Music, and Windows media players$\r$\n  • 4 Flexible Display Modes: Floating Card, Compact Pill, Pure Lyrics, and Expanded Sheet$\r$\n  • Click-Through Ghost Mode: Press Ctrl+Shift+L to click through the overlay during games & work$\r$\n  • Ultra Customizable: Custom fonts, glassmorphism, accent colors, and live timing offsets$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Uninstall overLy"
  !define MUI_WELCOMEPAGE_TEXT "This wizard will uninstall overLy - Floating Lyrics Overlay from your computer.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
