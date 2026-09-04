param(
    [Parameter(Mandatory = $true)]
    [string]$NodeExecutable
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$theiaRoot = Join-Path $projectRoot 'theia-embedded'
$backendMain = Join-Path $theiaRoot 'lib\backend\main.js'
$workspaceRoot = Join-Path $projectRoot 'ide-workspace\bsq_usr'
$runtimeLogRoot = Join-Path $projectRoot 'runtime-logs'
$watchdogPidFile = Join-Path $runtimeLogRoot 'theia-watchdog.pid'
$servicePidFile = Join-Path $runtimeLogRoot 'theia-3188.pid'
$stopFile = Join-Path $runtimeLogRoot 'theia-watchdog.stop'
$watchdogLog = Join-Path $runtimeLogRoot 'theia-watchdog.log'
$standardLog = Join-Path $runtimeLogRoot 'theia-3188.log'
$errorLog = Join-Path $runtimeLogRoot 'theia-3188-error.log'

function Write-WatchdogLog {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $watchdogLog -Value "[$timestamp] $Message" -Encoding UTF8
}

New-Item -ItemType Directory -Path $runtimeLogRoot -Force | Out-Null
Set-Content -LiteralPath $watchdogPidFile -Value $PID -Encoding ASCII
Write-WatchdogLog "watchdog started; pid=$PID"

try {
    while (-not (Test-Path -LiteralPath $stopFile)) {
        $listener = @(Get-NetTCPConnection -State Listen -LocalPort 3188 -ErrorAction SilentlyContinue)
        if ($listener.Count -gt 0) {
            Write-WatchdogLog "port 3188 is already occupied by pid=$($listener[0].OwningProcess); retrying in 5 seconds"
            Start-Sleep -Seconds 5
            continue
        }

        Set-Content -LiteralPath $standardLog -Value '' -Encoding UTF8
        Set-Content -LiteralPath $errorLog -Value '' -Encoding UTF8
        $service = Start-Process `
            -FilePath $NodeExecutable `
            -ArgumentList @($backendMain, $workspaceRoot, '--hostname=127.0.0.1', '--port=3188', '--log-level=warn') `
            -WorkingDirectory $theiaRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput $standardLog `
            -RedirectStandardError $errorLog `
            -PassThru

        Set-Content -LiteralPath $servicePidFile -Value $service.Id -Encoding ASCII
        Write-WatchdogLog "Theia backend started; pid=$($service.Id)"

        while (-not $service.HasExited -and -not (Test-Path -LiteralPath $stopFile)) {
            Start-Sleep -Seconds 2
            $service.Refresh()
        }

        if (Test-Path -LiteralPath $stopFile) {
            if (-not $service.HasExited) { Stop-Process -Id $service.Id -Force -ErrorAction SilentlyContinue }
            Write-WatchdogLog 'stop requested; Theia backend stopped'
            break
        }

        Write-WatchdogLog "Theia backend exited unexpectedly; exitCode=$($service.ExitCode); restarting in 3 seconds"
        Remove-Item -LiteralPath $servicePidFile -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
}
catch {
    Write-WatchdogLog "watchdog error: $($_.Exception.Message)"
    throw
}
finally {
    Remove-Item -LiteralPath $servicePidFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $watchdogPidFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
    Write-WatchdogLog 'watchdog stopped'
}
