$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'production-scheduling'))
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'ide-workspace\bsq_usr\production-scheduling'))
$expectedWorkspacePrefix = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'ide-workspace\bsq_usr')).TrimEnd('\') + '\'

if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
    throw "Production scheduling source directory was not found: $sourceRoot"
}
if (-not $workspaceRoot.StartsWith($expectedWorkspacePrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to restore outside the isolated IDE workspace: $workspaceRoot"
}

[System.IO.Directory]::CreateDirectory($workspaceRoot) | Out-Null
Copy-Item -Path (Join-Path $sourceRoot '*') -Destination $workspaceRoot -Recurse -Force

# The protected source tree intentionally uses the Windows read-only attribute.
# Copy-Item preserves it, so explicitly make only the isolated IDE copy writable.
Get-ChildItem -LiteralPath $workspaceRoot -Recurse -File | ForEach-Object {
    if ($_.IsReadOnly) {
        $_.IsReadOnly = $false
    }
}

# Share the line manifest with editor decorations to keep highlights aligned.
$manifestPath = Join-Path $projectRoot 'theia-embedded\extensions\mes-sandbox\src\browser\presentation-lines.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$utf8 = New-Object System.Text.UTF8Encoding($false)
foreach ($entry in $manifest.PSObject.Properties) {
    $target = [System.IO.Path]::GetFullPath((Join-Path (Join-Path $projectRoot 'ide-workspace\bsq_usr') $entry.Name))
    if (-not $target.StartsWith($expectedWorkspacePrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to blank code outside the IDE workspace: $target"
    }
    $lines = [System.IO.File]::ReadAllLines($target, $utf8)
    foreach ($lineNumber in $entry.Value) {
        if ($lineNumber -lt 1 -or $lineNumber -gt $lines.Length) { throw "Invalid presentation line: $lineNumber" }
        $lines[$lineNumber - 1] = [regex]::Match($lines[$lineNumber - 1], '^\s*').Value
    }
    [System.IO.File]::WriteAllLines($target, $lines, $utf8)
}
Write-Host 'The IDE code has been restored with the current presentation lines blanked.'
