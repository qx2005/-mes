$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$nginxRoot = Join-Path $projectRoot 'nginx-1.22.1'
$nginxExecutable = Join-Path $nginxRoot 'nginx.exe'
$nginxConfig = Join-Path $nginxRoot 'conf\nginx.conf'
$theiaStarter = Join-Path $PSScriptRoot 'start_embedded_theia.ps1'

function Test-HttpEndpoint {
    param([string]$Url, [int]$TimeoutMilliseconds = 1500)
    try {
        $request = [System.Net.HttpWebRequest]::Create($Url)
        $request.Proxy = $null
        $request.Timeout = $TimeoutMilliseconds
        $response = $request.GetResponse()
        try { return $true }
        finally { $response.Dispose() }
    }
    catch { return $false }
}

function Wait-HttpEndpoint {
    param([string]$Url, [int]$Attempts = 30, [int]$DelayMilliseconds = 500)
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        if (Test-HttpEndpoint -Url $Url) { return $true }
        Start-Sleep -Milliseconds $DelayMilliseconds
    }
    return $false
}

function Get-PortOwner {
    param([int]$Port)
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $listener) { return $null }
    return Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
}

Write-Host 'Starting MES web platform...' -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $nginxExecutable)) {
    throw "Nginx executable was not found: $nginxExecutable"
}
if (-not (Test-Path -LiteralPath $nginxConfig)) {
    throw "Nginx configuration was not found: $nginxConfig"
}

$portOwner = Get-PortOwner -Port 82
if ($portOwner) {
    $ownerPath = [string]$portOwner.ExecutablePath
    if (-not $ownerPath.Equals($nginxExecutable, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Port 82 is occupied by $($portOwner.Name) (PID $($portOwner.ProcessId))."
    }
    Write-Host "MES web service is already listening on port 82 (PID $($portOwner.ProcessId))."
}
else {
    $configTest = Start-Process `
        -FilePath $nginxExecutable `
        -ArgumentList @('-t', '-p', $nginxRoot, '-c', 'conf\nginx.conf') `
        -WorkingDirectory $nginxRoot `
        -WindowStyle Hidden `
        -Wait `
        -PassThru
    if ($configTest.ExitCode -ne 0) {
        throw 'Nginx configuration validation failed. See nginx-1.22.1\logs\error.log.'
    }

    Start-Process `
        -FilePath $nginxExecutable `
        -ArgumentList @('-p', $nginxRoot, '-c', 'conf\nginx.conf') `
        -WorkingDirectory $nginxRoot `
        -WindowStyle Hidden | Out-Null

    if (-not (Wait-HttpEndpoint -Url 'http://127.0.0.1:82/' -Attempts 30 -DelayMilliseconds 500)) {
        throw 'MES web service did not become ready on port 82. See nginx-1.22.1\logs\error.log.'
    }
    Write-Host 'MES web service is ready: http://127.0.0.1:82/' -ForegroundColor Green
}

Write-Host 'Starting embedded IDE service...' -ForegroundColor Cyan
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $theiaStarter
    if ($LASTEXITCODE -ne 0) {
        throw "Theia starter exited with code $LASTEXITCODE."
    }
    if (-not (Test-HttpEndpoint -Url 'http://127.0.0.1:3188/mes-sandbox/health' -TimeoutMilliseconds 2000)) {
        throw 'Theia health endpoint did not respond.'
    }
    Write-Host 'Embedded IDE is ready: http://127.0.0.1:3188/' -ForegroundColor Green
}
catch {
    Write-Warning "MES is available, but the embedded IDE could not be started: $($_.Exception.Message)"
    Write-Warning 'See runtime-logs\theia-watchdog.log and runtime-logs\theia-3188-error.log.'
}

Write-Host 'Startup checks completed.' -ForegroundColor Green
exit 0
