[CmdletBinding()]
param(
    [string]$ProjectRoot = '.'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$Root = Join-Path $ProjectRoot 'boxe_assets'
$errors = [System.Collections.Generic.List[string]]::new()
$frameCount = 0
$previewCount = 0

foreach ($manifestName in @('boxe_zorp_manifest.json', 'boxe_master_manifest.json')) {
    $manifestPath = Join-Path $Root $manifestName
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        $errors.Add("Missing manifest: $manifestName")
        continue
    }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    foreach ($animation in $manifest.animations) {
        if ($animation.canvas.width -ne 256 -or $animation.canvas.height -ne 192) {
            $errors.Add("Invalid canvas in $manifestName/$($animation.name)")
        }
        foreach ($frame in $animation.frames) {
            $framePath = Join-Path $Root $frame.file
            if (-not (Test-Path -LiteralPath $framePath)) {
                $errors.Add("Missing frame: $($frame.file)")
                continue
            }
            $image = [System.Drawing.Bitmap]::new($framePath)
            if ($image.Width -ne 256 -or $image.Height -ne 192) {
                $errors.Add("Invalid dimensions: $($frame.file)")
            }
            $hasAlpha = $false
            foreach ($point in @(@(0,0), @(255,0), @(0,191), @(255,191))) {
                if ($image.GetPixel($point[0], $point[1]).A -eq 0) { $hasAlpha = $true; break }
            }
            if (-not $hasAlpha) { $errors.Add("No transparent canvas edge: $($frame.file)") }
            $image.Dispose()
            $frameCount++
        }
    }
}

foreach ($preview in @('previews/boxe_zorp_preview.png', 'previews/boxe_master_preview.png')) {
    if (-not (Test-Path -LiteralPath (Join-Path $Root $preview))) {
        $errors.Add("Missing preview: $preview")
    } else { $previewCount++ }
}
if (-not (Test-Path -LiteralPath (Join-Path $Root 'arena/boxe_arena.png'))) {
    $errors.Add('Missing prepared arena.')
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}
Write-Output "frames=$frameCount manifests=2 previews=$previewCount arena=ok errors=0"
