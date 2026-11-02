$ErrorActionPreference = "SilentlyContinue"
$conn = Get-NetTCPConnection -LocalPort 5000, 3000 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conn) {
    if ($c.OwningProcess) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
