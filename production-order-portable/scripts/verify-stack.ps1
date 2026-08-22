# PowerShell: verify production line stack before first run
# 首次运行前检查产线依赖是否就绪
$ErrorActionPreference = 'Continue'

Write-Host '=== Production Line Stack Check ==='

function Test-Port($port) {
    $r = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
    return $r.TcpTestSucceeded
}

$checks = @(
    @{ Name = 'Bridge/MES API :8080'; Port = 8080 },
    @{ Name = 'ActiveMQ MQTT :1893'; Port = 1893 },
    @{ Name = 'ThingsBoard :8090'; Port = 8090 }
)

foreach ($c in $checks) {
    $ok = Test-Port $c.Port
    $status = if ($ok) { 'OK' } else { 'FAIL' }
    Write-Host ("[{0}] {1}" -f $status, $c.Name)
}

$bridgeHealth = $null
try {
    $bridgeHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/health' -TimeoutSec 3
    Write-Host '[OK] Bridge /health' ($bridgeHealth | ConvertTo-Json -Compress)
} catch {
    Write-Host '[FAIL] Bridge /health not reachable'
}

Write-Host ''
Write-Host 'Required for real line motion:'
Write-Host '  1. bridge or bsq-admin running on :8080'
Write-Host '  2. ActiveMQ MQTT on :1893'
Write-Host '  3. ThingsBoard/device subscribed to SubTopic1'
