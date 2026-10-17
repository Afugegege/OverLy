# ==============================================================================
# overLy - Custom NSIS Setup Integration Script
# One-Click Fast Modern Installation + Launch Setup Wizard
# ==============================================================================

!include "LogicLib.nsh"

# ------------------------------------------------------------------------------
# Custom Post-Installation Hook: Run overLy with --setup flag
# ------------------------------------------------------------------------------
!macro customInstall
  # Write one-time setup marker so overLy knows it was launched from the setup exe
  CreateDirectory "$APPDATA\overLy"
  FileOpen $0 "$APPDATA\overLy\.run_setup" w
  FileClose $0

  # Execute overLy with --setup argument
  Exec '"$INSTDIR\overLy.exe" --setup'
!macroend

# ------------------------------------------------------------------------------
# Custom Uninstaller Cleanup Hook
# ------------------------------------------------------------------------------
!macro customUnInit
  # Clean up Windows Run key on uninstallation
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "overLy"
  Delete "$APPDATA\overLy\.run_setup"
!macroend
