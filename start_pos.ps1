$ErrorActionPreference = "SilentlyContinue"
$targetDir = $PSScriptRoot

$portActive = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue

if (-not $portActive) {
    Start-Process -FilePath "node" -ArgumentList "server/index.js" -WorkingDirectory $targetDir -WindowStyle Hidden
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Milliseconds 800
        $portActive = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
        if ($portActive) { break }
    }
}

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}

if (Test-Path $edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList "--app=http://localhost:5000 --window-size=1366,768"
} elseif (Test-Path $chromePath) {
    Start-Process -FilePath $chromePath -ArgumentList "--app=http://localhost:5000 --window-size=1366,768"
} else {
    Start-Process "http://localhost:5000"
}
