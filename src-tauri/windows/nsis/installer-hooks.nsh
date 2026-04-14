!macro NSIS_HOOK_POSTUNINSTALL
  StrCmp $DeleteAppDataCheckboxState 1 0 mmgh_cleanup_done
  RMDir /r "$LOCALAPPDATA\com.mmgh.agent"
  RMDir /r "$APPDATA\com.mmgh.agent"
  RMDir /r "$LOCALAPPDATA\MMGH Agent Deck"
  RMDir /r "$APPDATA\MMGH Agent Deck"
  mmgh_cleanup_done:
!macroend
