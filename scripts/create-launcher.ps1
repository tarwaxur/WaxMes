# Creates a tiny dist\WaxMes-<version>.exe launcher for dist\win-unpacked\WaxMes.exe.
param(
  [string]$OutputPath
)

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PackageJson = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json

if (-not $OutputPath) {
  $OutputPath = Join-Path $ProjectRoot ("dist\WaxMes-" + $PackageJson.version + ".exe")
}

$SourcePath = Join-Path $PSScriptRoot "WaxMesLauncher.cs"
$IconPath = Join-Path $ProjectRoot "assets\app.ico"
$DistAppExe = Join-Path $ProjectRoot "dist\win-unpacked\WaxMes.exe"

if (-not (Test-Path $DistAppExe)) {
  throw "Build output not found: $DistAppExe"
}

if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

$compilerOptions = @()
if (Test-Path $IconPath) {
  $compilerOptions += "/win32icon:`"$IconPath`""
}

Add-Type `
  -Path $SourcePath `
  -OutputAssembly $OutputPath `
  -OutputType WindowsApplication `
  -ReferencedAssemblies "System.Windows.Forms.dll", "System.Core.dll" `
  -CompilerOptions $compilerOptions

Write-Output "Launcher created: $OutputPath"
