$ErrorActionPreference = 'Stop'

$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$logDir = Join-Path $root 'runtime-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Test-Port([int]$Port) {
    $client = [Net.Sockets.TcpClient]::new()
    try {
        $pending = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $pending.AsyncWaitHandle.WaitOne(150)) { return $false }
        $client.EndConnect($pending)
        return $true
    }
    catch { return $false }
    finally { $client.Dispose() }
}

function Wait-Ports([int[]]$Ports, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $missing = @($Ports | Where-Object { -not (Test-Port $_) })
        if ($missing.Count -eq 0) { return $true }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    Write-Warning ('Ports not ready: ' + ($missing -join ', '))
    return $false
}

function Start-Batch([string]$Name, [string]$File, [int]$Port) {
    if (Test-Port $Port) {
        Write-Host "$Name is already running on port $Port."
        return
    }
    $path = Join-Path $root $File
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing starter: $path" }
    Start-Process -FilePath $env:ComSpec `
        -ArgumentList @('/d', '/c', "`"$path`"") `
        -WorkingDirectory $root -WindowStyle Hidden | Out-Null
    Write-Host "Starting $Name..."
}

function Start-Java([string]$Name, [string]$Java, [string[]]$Arguments,
                    [string]$WorkingDirectory, [int]$Port) {
    if (Test-Port $Port) {
        Write-Host "$Name is already running on port $Port."
        return
    }
    Start-Process -FilePath $Java -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir "$Name.out.log") `
        -RedirectStandardError (Join-Path $logDir "$Name.err.log") | Out-Null
    Write-Host "Starting $Name..."
}

# Recover a missing IDE even when Nginx is running. Leave an active IDE alone
# because its explicit starter restores the presentation workspace.
if (-not (Test-Port 82) -or -not (Test-Port 3188)) {
    Start-Process -FilePath powershell.exe `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
            (Join-Path $PSScriptRoot 'start_ui_and_ide.ps1')) `
        -WorkingDirectory $root -WindowStyle Hidden | Out-Null
    Write-Host 'Starting MES web UI and embedded IDE...'
}
else { Write-Host 'MES web UI and embedded IDE are already running.' }

# Independent infrastructure starts in parallel.
Start-Batch 'ActiveMQ' '01MQTTRun.bat' 8161
Start-Batch 'MinIO' '02minIORun.bat' 9000
Start-Batch 'Redis' '10RedisRun.bat' 6379
Start-Batch 'MySQL' '20MySQLRun.bat' 3306
Start-Batch 'MySQL8' '20MySQL8Run.bat' 8306
Start-Batch 'PostgreSQL' '21pgsqlRun.bat' 5432

if (-not (Wait-Ports @(3306, 8306, 5432, 6379, 1893, 9000) 60)) { exit 1 }

$java8 = Join-Path $root 'jdk\bin\java.exe'
$java21 = Join-Path $root 'jdk-21\bin\java.exe'
Start-Java 'bsq-admin' $java8 @('-Dfile.encoding=utf-8', '-jar', (Join-Path $root 'bsq-admin.jar')) $root 8080

[Environment]::SetEnvironmentVariable('install.data_dir', (Join-Path $root 'data'), 'Process')
Start-Java 'thingsboard' $java8 @('-Dfile.encoding=utf-8', '-Dloader.main=org.thingsboard.server.ThingsboardServerApplication', '-jar', (Join-Path $root 'thingsboard.jar')) $root 8090
Start-Java 'dataease' $java21 @('-Dfile.encoding=utf-8', '-jar', (Join-Path $root 'CoreApplication.jar')) (Join-Path $root 'opt') 8081

if (-not (Wait-Ports @(82, 8080) 75)) { exit 1 }
Write-Host 'Platform is ready: http://127.0.0.1:82/' -ForegroundColor Green
exit 0
