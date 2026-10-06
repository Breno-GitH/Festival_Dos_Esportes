param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $root 'archery_assets'
$manifest = Get-Content -Raw (Join-Path $assetRoot 'archery_assets_manifest.json') | ConvertFrom-Json
$invalid = [System.Collections.Generic.List[string]]::new()
$opaqueSprites = [System.Collections.Generic.List[string]]::new()
$badAnchors = [System.Collections.Generic.List[string]]::new()

foreach ($frame in $manifest.frames) {
    $path = Join-Path $assetRoot $frame.file
    if (!(Test-Path -LiteralPath $path)) { $invalid.Add("missing: $($frame.file)"); continue }
    $image = [System.Drawing.Bitmap]::FromFile($path)
    if ($image.Width -ne $frame.width -or $image.Height -ne $frame.height) { $invalid.Add("dimensions: $($frame.file)") }
    if ($frame.anchorX -lt 0 -or $frame.anchorX -ge $frame.width -or $frame.anchorY -lt 0 -or $frame.anchorY -ge $frame.height) { $badAnchors.Add($frame.file) }
    if ($frame.category -ne 'arena') {
        $corners = @($image.GetPixel(0,0).A, $image.GetPixel($image.Width - 1,0).A, $image.GetPixel(0,$image.Height - 1).A, $image.GetPixel($image.Width - 1,$image.Height - 1).A)
        if (@($corners | Where-Object { $_ -eq 0 }).Count -eq 0) { $opaqueSprites.Add($frame.file) }
    }
    $image.Dispose()
}

Write-Output "frames=$($manifest.frames.Count) invalid=$($invalid.Count) badAnchors=$($badAnchors.Count) spritesWithoutTransparentEdge=$($opaqueSprites.Count)"
if ($invalid.Count) { $invalid | ForEach-Object { Write-Output $_ } }
if ($badAnchors.Count) { $badAnchors | ForEach-Object { Write-Output "anchor: $_" } }
if ($opaqueSprites.Count) { $opaqueSprites | ForEach-Object { Write-Output "opacity: $_" } }
if ($invalid.Count -or $badAnchors.Count -or $opaqueSprites.Count) { exit 1 }
