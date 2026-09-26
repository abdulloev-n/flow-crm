!macro customFinishPage
  Function LaunchFlowCRM
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  Function CreateFlowCRMDesktopShortcut
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
    WinShell::SetLnkAUMI "$DESKTOP\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  FunctionEnd

  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "Launch flow.crm"
  !define MUI_FINISHPAGE_RUN_FUNCTION "LaunchFlowCRM"
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop shortcut"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "CreateFlowCRMDesktopShortcut"
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
!macroend
