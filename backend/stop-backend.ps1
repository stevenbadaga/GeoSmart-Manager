param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$processes = Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -and (
            $_.CommandLine -like "*GeoSmartManagerApplication*" -or
            (
                $_.CommandLine -like "*$backendDir*" -and
                $_.CommandLine -like "*spring-boot:run*"
            )
        )
    } |
    Sort-Object ProcessId -Descending

if (-not $processes) {
    Write-Host "No GeoSmart backend process was found."
    exit 0
}

foreach ($process in $processes) {
    try {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        Write-Host "Stopped PID $($process.ProcessId)"
    } catch {
        # Ignore races.
    }
}

Start-Sleep -Seconds 1
$owner = netstat -ano | Select-String ":$Port\s+.*LISTENING\s+(\d+)$" | Select-Object -First 1
if ($owner) {
    Write-Host "Port $Port is still in use. Check remaining processes manually." -ForegroundColor Yellow
} else {
    Write-Host "GeoSmart backend stopped."
}
