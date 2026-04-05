$ErrorActionPreference = 'Stop'

$winget = Get-Command winget -ErrorAction SilentlyContinue
if ($winget) {
    Start-Process -FilePath $winget.Source -ArgumentList 'install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements' -Verb RunAs -Wait
    exit 0
}

Start-Process 'https://nodejs.org/en/download'
exit 0
