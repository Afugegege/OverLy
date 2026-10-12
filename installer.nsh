# ==============================================================================
# overLy - Custom NSIS Setup Integration Script
# One-Click Fast Modern Installation + Registry Cleanup
# ==============================================================================

!include "LogicLib.nsh"

# ------------------------------------------------------------------------------
# Custom Uninstaller Cleanup Hook
# ------------------------------------------------------------------------------
!macro customUnInit
  # Clean up Windows Run key on uninstallation
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "overLy"
!macroend
