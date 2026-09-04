$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$theiaRoot = Join-Path $projectRoot 'theia-embedded'
$runtimeLogRoot = Join-Path $projectRoot 'runtime-logs'
$watchdogScript = Join-Path $PSScriptRoot 'run_embedded_theia_watchdog.ps1'
$watchdogPidFile = Join-Path $runtimeLogRoot 'theia-watchdog.pid'
$stopFile = Join-Path $runtimeLogRoot 'theia-watchdog.stop'

function Test-TheiaReady {
    try {
        $request = [System.Net.HttpWebRequest]::Create('http://127.0.0.1:3188/mes-sandbox/health')
        $request.Proxy = $null
        $request.Timeout = 2000
        $response = $request.GetResponse()
        try {
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
            try {
                $body = $reader.ReadToEnd()
                return $body -match '"ok"\s*:\s*true' -and $body -match 'mes-embedded-theia'
            }
            finally { $reader.Dispose() }
        }
        finally { $response.Dispose() }
    }
    catch { return $false }
}

# Reset on explicit startup, but preserve edits during watchdog reconnects.
& (Join-Path $PSScriptRoot 'reset_ide_presentation_code.ps1')

if (Test-TheiaReady) {
    Write-Host 'MES Embedded Theia IDE is already running on 127.0.0.1:3188.'
    exit 0
}

New-Item -ItemType Directory -Path $runtimeLogRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $theiaRoot 'node_modules\.package-lock.json'))) {
    Write-Error 'Theia dependencies are incomplete. Offline startup will not download packages automatically.'
    exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $theiaRoot 'lib\backend\main.js'))) {
    Write-Error 'Theia production build is missing. Rebuild it before entering the offline environment.'
    exit 1
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Error 'Node.js was not found. The online IDE cannot be started.'
    exit 1
}

if (Test-Path -LiteralPath $watchdogPidFile) {
    $existingPid = 0
    [void][int]::TryParse((Get-Content -LiteralPath $watchdogPidFile -Raw).Trim(), [ref]$existingPid)
    if ($existingPid -gt 0) {
        $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$existingPid" -ErrorAction SilentlyContinue
        if ($existing -and ([string]$existing.CommandLine).IndexOf($watchdogScript, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Write-Host "Theia watchdog is already running (PID $existingPid); waiting for the IDE to become ready."
        }
        else { Remove-Item -LiteralPath $watchdogPidFile -Force -ErrorAction SilentlyContinue }
    }
}

if (-not (Test-Path -LiteralPath $watchdogPidFile)) {
    Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
    $watchdog = Start-Process `
        -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $watchdogScript, '-NodeExecutable', $nodeCommand.Source) `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -PassThru
    Write-Host "Theia watchdog started (PID $($watchdog.Id))."
}

for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (Test-TheiaReady) {
        Write-Host 'MES Embedded Theia IDE is ready on 127.0.0.1:3188.'
        exit 0
    }
    Start-Sleep -Milliseconds 500
}

Write-Error 'Theia did not become ready within 30 seconds. See runtime-logs\theia-watchdog.log and theia-3188-error.log.'
exit 1
