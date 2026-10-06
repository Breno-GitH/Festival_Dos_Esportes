param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Bands,
    [switch]$WriteGrid
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$image = [System.Drawing.Bitmap]::FromFile((Join-Path $root $Source))
$bandValues = @($Bands -split ',' | ForEach-Object { [int]$_.Trim() })

if ($WriteGrid) {
    $overlay = $image.Clone()
    $graphics = [System.Drawing.Graphics]::FromImage($overlay)
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(145, 220, 20, 60), 1)
    $font = [System.Drawing.Font]::new('Consolas', 9, [System.Drawing.FontStyle]::Bold)
    for ($x = 0; $x -lt $overlay.Width; $x += 50) {
        $graphics.DrawLine($pen, $x, 0, $x, $overlay.Height)
        $graphics.DrawString([string]$x, $font, [System.Drawing.Brushes]::Crimson, $x + 2, 2)
    }
    for ($y = 0; $y -lt $overlay.Height; $y += 50) { $graphics.DrawLine($pen, 0, $y, $overlay.Width, $y) }
    $previewPath = Join-Path $root ('docs\archery_asset_previews\grid_' + [System.IO.Path]::GetFileName($Source))
    $overlay.Save($previewPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $font.Dispose(); $pen.Dispose(); $graphics.Dispose(); $overlay.Dispose()
    Write-Output "Grid preview: $previewPath"
}

for ($bandIndex = 0; $bandIndex -lt $bandValues.Count; $bandIndex += 2) {
    $top = $bandValues[$bandIndex]; $bottom = $bandValues[$bandIndex + 1]
    $active = [bool[]]::new($image.Width)
    for ($x = 0; $x -lt $image.Width; $x++) {
        for ($y = $top; $y -lt $bottom; $y++) {
            $pixel = $image.GetPixel($x, $y)
            if ($pixel.R -lt 245 -or $pixel.G -lt 245 -or $pixel.B -lt 245) { $active[$x] = $true; break }
        }
    }
    $runs = [System.Collections.Generic.List[object]]::new(); $start = -1; $gap = 0
    for ($x = 0; $x -lt $image.Width; $x++) {
        if ($active[$x]) { if ($start -lt 0) { $start = $x }; $gap = 0; continue }
        if ($start -lt 0) { continue }; $gap++
        if ($gap -gt 8) { $runs.Add([pscustomobject]@{ left=$start; right=$x-$gap; width=($x-$gap-$start+1) }); $start = -1; $gap = 0 }
    }
    if ($start -ge 0) { $runs.Add([pscustomobject]@{ left=$start; right=($image.Width-1); width=($image.Width-$start) }) }
    Write-Output ("Band $top-$bottom")
    $runs | Format-Table -AutoSize | Out-String | Write-Output
}
$image.Dispose()
