$path = "C:\Users\karah\OneDrive\Masaüstü\WaxMes\dist\win-unpacked\resources\app.asar"
$dest = "C:\Users\karah\OneDrive\Masaüstü\WaxMes\dist\app.asar.bak"
Move-Item -LiteralPath $path -Destination $dest -Force
if (Test-Path -LiteralPath "C:\Users\karah\OneDrive\Masaüstü\WaxMes\dist") {
  Remove-Item -LiteralPath "C:\Users\karah\OneDrive\Masaüstü\WaxMes\dist" -Recurse -Force
}
Write-Host "Done"
