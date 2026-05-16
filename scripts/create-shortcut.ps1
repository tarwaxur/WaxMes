# WaxMes Desktop Shortcut Creator
param(
  [string]$TargetPath,
  [string]$IconPath
)

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "WaxMes.lnk"

if (-not $TargetPath) {
  $ElectronExe = Join-Path $ProjectRoot "node_modules\electron\dist\electron.exe"
  $BuiltExe = Join-Path $ProjectRoot "dist\win-unpacked\WaxMes.exe"
  $ElectronCmd = Join-Path $ProjectRoot "node_modules\.bin\electron.cmd"

  if (Test-Path $BuiltExe) {
    $TargetPath = $BuiltExe
  } elseif (Test-Path $ElectronExe) {
    $TargetPath = $ElectronExe
  } else {
    $TargetPath = $ElectronCmd
  }
}

if (-not $IconPath) {
  $IconPath = Join-Path $ProjectRoot "assets\app.ico"
  if (-not (Test-Path $IconPath)) {
    $IconPath = Join-Path $ProjectRoot "assets\icon.ico"
  }
}

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $TargetPath

if ($TargetPath -like "*\electron.exe" -or $TargetPath -like "*\electron.cmd") {
  $shortcut.Arguments = "`"$ProjectRoot`""
} else {
  $shortcut.Arguments = ""
}

$shortcut.Description = "WaxMes - Modern Messaging App"
$shortcut.WorkingDirectory = $ProjectRoot

if ($IconPath -and (Test-Path $IconPath)) {
  $shortcut.IconLocation = $IconPath
}

$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Output "Shortcut created: $shortcutPath"
