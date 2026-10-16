[CmdletBinding()]
param([string]$ProjectRoot = '.')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$manifestPath = Join-Path $ProjectRoot 'boxe_assets/v3/boxing_v3_manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$used = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$errors = [Collections.Generic.List[string]]::new()
$frames = 0
$arenaPath = Join-Path $ProjectRoot 'arena_boxe3.0.png'
if (-not (Test-Path -LiteralPath $arenaPath)) { $errors.Add('Missing official arena: arena_boxe3.0.png') }
$boxingLoader = Get-Content -LiteralPath (Join-Path $ProjectRoot 'script.js') -Raw
if (-not $boxingLoader.Contains('loadBoxingImage("arena_boxe3.0.png")')) { $errors.Add('Official boxing arena is not preloaded') }
if ($boxingLoader.Contains('loadBoxingImage("boxe_arena.png")')) { $errors.Add('Retired boxing arena is still preloaded') }
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'boxing_presentation.js'))) { $errors.Add('Missing boxing presentation module') }
foreach ($entry in $manifest.actors.PSObject.Properties) {
    $actor = $entry.Value
    $source = Join-Path $ProjectRoot $actor.source
    if (-not (Test-Path -LiteralPath $source)) { $errors.Add("Missing official source: $($actor.source)") }
    $actionFrames = [Collections.Generic.HashSet[string]]::new()
    foreach ($action in $actor.actions.PSObject.Properties) {
        foreach ($key in $action.Value) {
            [void]$actionFrames.Add([string]$key)
            if (-not $actor.frames.PSObject.Properties[[string]$key]) { $errors.Add("Missing mapping: $($entry.Name)/$($action.Name)/$key") }
        }
    }
    foreach ($frameEntry in $actor.frames.PSObject.Properties) {
        $frame = $frameEntry.Value
        if (-not $actionFrames.Contains($frameEntry.Name)) { $errors.Add("Unused catalog frame: $($frame.sprite)") }
        [void]$used.Add($frame.sprite)
        $path = Join-Path $ProjectRoot $frame.sprite
        if (-not (Test-Path -LiteralPath $path)) { $errors.Add("Missing frame: $($frame.sprite)"); continue }
        if ($frame.anchor.x -ne 160 -or $frame.anchor.y -ne 210) { $errors.Add("Invalid anchor: $($frame.sprite)") }
        $image = [Drawing.Bitmap]::new($path)
        try {
            if ($image.Width -ne 320 -or $image.Height -ne 224) { $errors.Add("Invalid canvas: $($frame.sprite)") }
            foreach ($point in @(@(0,0),@(319,0),@(0,223),@(319,223))) {
                if ($image.GetPixel($point[0],$point[1]).A -ne 0) { $errors.Add("Nontransparent edge: $($frame.sprite)") }
            }
        } finally { $image.Dispose() }
        $frames++
    }
    if (@($actor.frames.PSObject.Properties).Count -ne $actor.frameCount) { $errors.Add("Wrong frame count: $($entry.Name)") }
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'boxe_assets/v3') -Filter '*.png' -File -Recurse) {
    $rel = [IO.Path]::GetRelativePath($ProjectRoot,$file.FullName).Replace('\','/')
    if (-not $used.Contains($rel)) { $errors.Add("Unused exported PNG: $rel") }
}
foreach ($old in @('zorp_boxe2.0.png','mestre_boxe2.0.png','juiz_boxe2.0.png','boxe_assets/v2')) {
    if (Test-Path -LiteralPath (Join-Path $ProjectRoot $old)) { $errors.Add("Retired boxing file remains: $old") }
}
if ($errors.Count) { throw ($errors -join "`n") }
Write-Output "boxingVersion=3.0 frames=$frames anchors=ok transparency=ok unusedFrames=0 retiredFiles=0 errors=0"
