$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$issFile = Join-Path $PSScriptRoot 'SaladPatch.iss'
$packageJson = Join-Path $rootDir 'package.json'
$launcherSource = Join-Path $PSScriptRoot 'launcher\Program.cs'
$launcherOutDir = Join-Path $PSScriptRoot 'bin'
$launcherExe = Join-Path $launcherOutDir 'SaladPatchLauncher.exe'

if (-not (Test-Path $packageJson)) {
    throw 'package.json was not found.'
}

$package = Get-Content $packageJson -Raw | ConvertFrom-Json
$appVersion = [string]$package.version

if ([string]::IsNullOrWhiteSpace($appVersion)) {
    throw 'Could not read version from package.json.'
}

if (-not (Test-Path $launcherSource)) {
    throw 'Installer launcher source not found at installer/launcher/Program.cs.'
}

if (-not (Test-Path $launcherOutDir)) {
    New-Item -Path $launcherOutDir -ItemType Directory | Out-Null
}

$cscCandidates = @(
    (Get-Command csc.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
) | Where-Object { $_ -and (Test-Path $_) }

$csc = $cscCandidates | Select-Object -First 1
if (-not $csc) {
    throw 'C# compiler (csc.exe) not found. Install .NET SDK or .NET Framework Developer Pack and retry.'
}

Write-Host 'Building launcher executable...'
& $csc '/nologo' '/target:winexe' '/optimize+' '/r:System.dll' '/r:System.Windows.Forms.dll' '/r:System.Drawing.dll' "/out:$launcherExe" $launcherSource
if ($LASTEXITCODE -ne 0) {
    throw 'Launcher build failed.'
}

$isccCandidates = @(
    (Get-Command ISCC.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "${env:ProgramW6432}\Inno Setup 6\ISCC.exe",
    'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
    'C:\Program Files\Inno Setup 6\ISCC.exe'
) | Where-Object { $_ -and (Test-Path $_) }

$iscc = $isccCandidates | Select-Object -First 1
if (-not $iscc) {
    throw 'Inno Setup Compiler (ISCC.exe) not found. Install Inno Setup 6 from https://jrsoftware.org/isinfo.php and run again.'
}

Write-Host "Building SaladPatch installer v$appVersion..."
& $iscc "/DMyAppVersion=$appVersion" $issFile
if ($LASTEXITCODE -ne 0) {
    throw 'Installer build failed.'
}

Write-Host '[OK] Installer created in the dist folder.'
