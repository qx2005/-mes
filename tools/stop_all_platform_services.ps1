param(
    [switch]$Preview
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$projectPrefix = $projectRoot + '\'
$serviceNames = @(
    'java.exe',
    'nginx.exe',
    'mysqld.exe',
    'redis-server.exe',
    'minio.exe',
    'postgres.exe',
    'pg_ctl.exe',
    'wrapper.exe',
    'node.exe'
)
$serviceBatNames = @(
    '01MQTTRun.bat',
    '02minIORun.bat',
    '10RedisRun.bat',
    '20MySQLRun.bat',
    '20MySQL8Run.bat',
    '21pgsqlRun.bat',
    '40UIRun.bat'
)
$platformPorts = @(82, 3188, 8080, 8090, 8306, 3306, 5432, 6379, 61616, 1893, 8161, 9000, 9001, 9090)
$runtimeLogRoot = Join-Path $projectRoot 'runtime-logs'
$theiaWatchdogScript = Join-Path $projectRoot 'tools\run_embedded_theia_watchdog.ps1'
$theiaWatchdogPidFile = Join-Path $runtimeLogRoot 'theia-watchdog.pid'
$theiaStopFile = Join-Path $runtimeLogRoot 'theia-watchdog.stop'

function Test-ProjectProcess {
    param($Process)

    $name = [string]$Process.Name
    $exe = [string]$Process.ExecutablePath
    $commandLine = [string]$Process.CommandLine
    $insideProject =
        $exe.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
        $commandLine.IndexOf($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0

    if (-not $insideProject) {
        return $false
    }

    if ($serviceNames -contains $name.ToLowerInvariant()) {
        return $true
    }

    if ($name -ieq 'cmd.exe') {
        foreach ($batName in $serviceBatNames) {
            if ($commandLine.IndexOf($batName, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                return $true
            }
        }
    }

    return $false
}

function Get-ProjectProcesses {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { Test-ProjectProcess $_ }
}

function Invoke-GracefulStop {
    param(
        [string]$Executable,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    if (-not (Test-Path -LiteralPath $Executable)) {
        return
    }

    try {
        $startInfo = @{
            FilePath = $Executable
            ArgumentList = $Arguments
            WindowStyle = 'Hidden'
            Wait = $true
            ErrorAction = 'Stop'
        }
        if ($WorkingDirectory) {
            $startInfo.WorkingDirectory = $WorkingDirectory
        }
        Start-Process @startInfo | Out-Null
    }
    catch {
        Write-Host "Graceful stop failed; falling back to process termination: $Executable" -ForegroundColor Yellow
    }
}

$initialProcesses = @(Get-ProjectProcesses)

if ($Preview) {
    Write-Host 'The following project services would be stopped:' -ForegroundColor Cyan
    if ($initialProcesses.Count -eq 0) {
        Write-Host 'No running platform services were detected.'
    }
    else {
        $initialProcesses |
            Sort-Object Name, ProcessId |
            Select-Object @{Name = 'Process'; Expression = { $_.Name } },
                          @{Name = 'PID'; Expression = { $_.ProcessId } },
                          @{Name = 'CommandLine'; Expression = { $_.CommandLine } } |
            Format-Table -AutoSize
    }
    exit 0
}

Write-Host 'Stopping Industrial Internet Platform services...' -ForegroundColor Cyan

# Stop the watchdog before its Node.js child so a normal platform shutdown is
# not mistaken for an IDE crash that should be restarted.
New-Item -ItemType Directory -Path $runtimeLogRoot -Force | Out-Null
Set-Content -LiteralPath $theiaStopFile -Value (Get-Date -Format o) -Encoding ASCII
if (Test-Path -LiteralPath $theiaWatchdogPidFile) {
    $watchdogPid = 0
    [void][int]::TryParse((Get-Content -LiteralPath $theiaWatchdogPidFile -Raw).Trim(), [ref]$watchdogPid)
    if ($watchdogPid -gt 0) {
        $watchdogProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$watchdogPid" -ErrorAction SilentlyContinue
        if ($watchdogProcess -and ([string]$watchdogProcess.CommandLine).IndexOf($theiaWatchdogScript, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Stop-Process -Id $watchdogPid -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped Theia watchdog, PID $watchdogPid"
        }
    }
}
Remove-Item -LiteralPath $theiaWatchdogPidFile -Force -ErrorAction SilentlyContinue

Invoke-GracefulStop `
    -Executable (Join-Path $projectRoot 'nginx-1.22.1\nginx.exe') `
    -Arguments @('-p', (Join-Path $projectRoot 'nginx-1.22.1'), '-s', 'quit') `
    -WorkingDirectory (Join-Path $projectRoot 'nginx-1.22.1')

Invoke-GracefulStop `
    -Executable (Join-Path $projectRoot 'redis\redis-cli.exe') `
    -Arguments @('-h', '127.0.0.1', '-p', '6379', 'shutdown') `
    -WorkingDirectory (Join-Path $projectRoot 'redis')

Invoke-GracefulStop `
    -Executable (Join-Path $projectRoot 'pgsql\bin\pg_ctl.exe') `
    -Arguments @('stop', '-D', (Join-Path $projectRoot 'pgsql\data'), '-m', 'fast', '-w') `
    -WorkingDirectory (Join-Path $projectRoot 'pgsql\bin')

Invoke-GracefulStop `
    -Executable (Join-Path $projectRoot 'mysql\bin\mysqladmin.exe') `
    -Arguments @('--protocol=tcp', '--host=127.0.0.1', '--port=3306', '-uroot', '-p123456', 'shutdown') `
    -WorkingDirectory (Join-Path $projectRoot 'mysql\bin')

Invoke-GracefulStop `
    -Executable (Join-Path $projectRoot 'mysql-8.0.30\bin\mysqladmin.exe') `
    -Arguments @('--protocol=tcp', '--host=127.0.0.1', '--port=8306', '-uroot', '-p123456', 'shutdown') `
    -WorkingDirectory (Join-Path $projectRoot 'mysql-8.0.30\bin')

Start-Sleep -Seconds 2

$remainingProcesses = @(Get-ProjectProcesses)
foreach ($process in $remainingProcesses) {
    try {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        Write-Host "Stopped $($process.Name), PID $($process.ProcessId)"
    }
    catch {
        Write-Host "Failed to stop $($process.Name), PID $($process.ProcessId): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Start-Sleep -Seconds 2

$stillOwned = @(Get-ProjectProcesses)
$ownedListeningPorts = @()
foreach ($port in $platformPorts) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
        if ($process -and (Test-ProjectProcess $process)) {
            $ownedListeningPorts += $port
        }
    }
}

if ($stillOwned.Count -gt 0 -or $ownedListeningPorts.Count -gt 0) {
    Write-Host 'Some project services are still running. See the messages above.' -ForegroundColor Red
    if ($ownedListeningPorts.Count -gt 0) {
        Write-Host "Project-owned ports still listening: $($ownedListeningPorts -join ', ')" -ForegroundColor Red
    }
    exit 1
}

Write-Host 'All Industrial Internet Platform services have been stopped.' -ForegroundColor Green
exit 0
