param(
    [switch]$Restart,
    [int]$Port = 8080,
    [int]$StartupTimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"

$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$healthUrl = "http://localhost:$Port/api/health"
$outLog = Join-Path $backendDir "backend-live.out.log"
$errLog = Join-Path $backendDir "backend-live.err.log"

function Get-PortOwner {
    param([int]$TargetPort)

    $match = netstat -ano | Select-String ":$TargetPort\s+.*LISTENING\s+(\d+)$" | Select-Object -First 1
    if (-not $match) {
        return $null
    }

    $processId = [int]$match.Matches[0].Groups[1].Value
    return Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
}

function Get-GeoSmartProcesses {
    Get-CimInstance Win32_Process |
        Where-Object {
            $_.CommandLine -and (
                $_.CommandLine -like "*GeoSmartManagerApplication*" -or
                (
                    $_.CommandLine -like "*$backendDir*" -and
                    $_.CommandLine -like "*spring-boot:run*"
                )
            )
        }
}

function Stop-GeoSmartProcesses {
    $processes = Get-GeoSmartProcesses | Sort-Object ProcessId -Descending
    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        } catch {
            # Ignore races where the process already exited.
        }
    }
}

function Wait-ForPortToFree {
    param([int]$TargetPort, [int]$TimeoutSeconds = 20)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-PortOwner -TargetPort $TargetPort)) {
            return
        }
        Start-Sleep -Milliseconds 500
    }

    throw "Port $TargetPort is still in use after waiting $TimeoutSeconds seconds."
}

function Wait-ForHealth {
    param([string]$Url, [int]$TimeoutSeconds)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5
            if ($response.status -eq "ok") {
                return $response
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    Write-Host "Backend did not become healthy in time. Recent logs:" -ForegroundColor Red
    if (Test-Path $errLog) {
        Get-Content $errLog -Tail 30
    }
    if (Test-Path $outLog) {
        Get-Content $outLog -Tail 30
    }
    throw "Backend failed to start on port $Port."
}

$owner = Get-PortOwner -TargetPort $Port
if ($owner) {
    $isGeoSmart = $owner.CommandLine -and (
        $owner.CommandLine -like "*GeoSmartManagerApplication*" -or
        $owner.CommandLine -like "*$backendDir*spring-boot:run*"
    )

    if (-not $Restart -and $isGeoSmart) {
        Write-Host "GeoSmart backend is already running on port $Port." -ForegroundColor Yellow
        Write-Host "Health check: $healthUrl"
        exit 0
    }

    if (-not $isGeoSmart) {
        throw "Port $Port is already in use by PID $($owner.ProcessId). Stop that process first or choose another port."
    }

    Stop-GeoSmartProcesses
    Wait-ForPortToFree -TargetPort $Port
}

$command = "Set-Location '$backendDir'; & ./mvnw.cmd '-Dmaven.test.skip=true' spring-boot:run *> '$outLog' 2> '$errLog'"
Start-Process powershell -ArgumentList "-NoProfile", "-Command", $command -WindowStyle Hidden | Out-Null

$health = Wait-ForHealth -Url $healthUrl -TimeoutSeconds $StartupTimeoutSeconds
Write-Host "GeoSmart backend is running on port $Port." -ForegroundColor Green
Write-Host "Health check: $healthUrl"
Write-Output ($health | ConvertTo-Json -Depth 4)
