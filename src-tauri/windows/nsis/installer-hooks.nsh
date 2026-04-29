!macro MMGH_REMOVE_APP_DATA
  RMDir /r "$LOCALAPPDATA\com.mmgh.agent"
  RMDir /r "$APPDATA\com.mmgh.agent"
  RMDir /r "$LOCALAPPDATA\MMGH Agent Deck"
  RMDir /r "$APPDATA\MMGH Agent Deck"
  RMDir /r "$LOCALAPPDATA\mygh"
  RMDir /r "$APPDATA\mygh"
!macroend

!macro NSIS_HOOK_PREINSTALL
  Delete "$INSTDIR\MMGH Agent Deck.exe"
  Delete "$INSTDIR\MMGH.exe"
  Delete "$INSTDIR\mygh.old.exe"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\MMGH\MMGH Agent Deck" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\MMGH\MMGH Agent Deck" "Version" "${VERSION}"
  WriteRegStr HKCU "Software\MMGH\MMGH Agent Deck" "BundleId" "${BUNDLEID}"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MMGH Agent Deck"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "mygh"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  StrCmp $UpdateMode 1 mmgh_cleanup_done

  Delete "$DESKTOP\mygh.lnk"
  Delete "$DESKTOP\MMGH.lnk"
  Delete "$SMPROGRAMS\mygh.lnk"
  Delete "$SMPROGRAMS\MMGH.lnk"
  Delete "$SMPROGRAMS\MMGH\mygh.lnk"
  Delete "$SMPROGRAMS\MMGH\MMGH.lnk"
  RMDir "$SMPROGRAMS\MMGH"

  DeleteRegKey HKCU "Software\MMGH\MMGH Agent Deck"
  DeleteRegKey /ifempty HKCU "Software\MMGH"

  StrCmp $DeleteAppDataCheckboxState 1 0 mmgh_cleanup_done
  SetShellVarContext current
  !insertmacro MMGH_REMOVE_APP_DATA
  mmgh_cleanup_done:
!macroend
