[CmdletBinding()]
param(
    [string]$ProjectRoot = '.'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$OutputRoot = Join-Path $ProjectRoot 'boxe_assets'
$CanvasWidth = 256
$CanvasHeight = 192
$AnchorX = 128
$AnchorY = 184
$Margin = 6

function New-Directory([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        [void](New-Item -ItemType Directory -Path $Path -Force)
    }
}

function Get-SuggestedDuration([string]$Animation) {
    switch ($Animation) {
        'idle' { return 160 }
        'walk' { return 110 }
        'step_back' { return 110 }
        'jab' { return 80 }
        'cross' { return 90 }
        'hook' { return 95 }
        'uppercut' { return 100 }
        'block' { return 130 }
        'dodge' { return 105 }
        'hurt' { return 115 }
        'knockdown' { return 145 }
        'victory' { return 160 }
        default { return 120 }
    }
}

function Get-AlphaBounds([System.Drawing.Bitmap]$Bitmap) {
    $minX = $Bitmap.Width
    $minY = $Bitmap.Height
    $maxX = -1
    $maxY = -1
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
        for ($x = 0; $x -lt $Bitmap.Width; $x++) {
            if ($Bitmap.GetPixel($x, $y).A -gt 0) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($maxX -lt 0) { throw 'Frame vazio encontrado durante a extração.' }
    return [pscustomobject]@{
        x = $minX
        y = $minY
        width = $maxX - $minX + 1
        height = $maxY - $minY + 1
        maxX = $maxX
        maxY = $maxY
    }
}

function Get-VisibleBounds(
    [System.Drawing.Bitmap]$Source,
    [bool[]]$ColorMask,
    [int]$X1,
    [int]$Y1,
    [int]$X2,
    [int]$Y2
) {
    $minX = $X2
    $minY = $Y2
    $maxX = -1
    $maxY = -1
    for ($y = $Y1; $y -le $Y2; $y++) {
        for ($x = $X1; $x -le $X2; $x++) {
            if ($ColorMask[$y * $Source.Width + $x]) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($maxX -lt 0) {
        throw "Nenhum sprite visível na janela ${X1},${Y1}-${X2},${Y2}."
    }
    return [pscustomobject]@{
        x = $minX
        y = $minY
        width = $maxX - $minX + 1
        height = $maxY - $minY + 1
        maxX = $maxX
        maxY = $maxY
    }
}

function Export-Frame(
    [System.Drawing.Bitmap]$Source,
    [bool[]]$ColorMask,
    [bool[]]$NearColorMask,
    [hashtable]$Slot,
    [string]$OutputPath
) {
    $sourceBounds = Get-VisibleBounds -Source $Source -ColorMask $ColorMask -X1 $Slot.x1 -Y1 $Slot.y1 -X2 $Slot.x2 -Y2 $Slot.y2
    $copyX1 = [Math]::Max(0, $sourceBounds.x - $Margin)
    $copyY1 = [Math]::Max(0, $sourceBounds.y - $Margin)
    $copyX2 = [Math]::Min($Source.Width - 1, $sourceBounds.maxX + $Margin)
    $copyY2 = [Math]::Min($Source.Height - 1, $sourceBounds.maxY + $Margin)

    $frame = [System.Drawing.Bitmap]::new($CanvasWidth, $CanvasHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $destX = [int][Math]::Round($AnchorX - (($sourceBounds.x + $sourceBounds.maxX) / 2.0))
    $destY = $AnchorY - $sourceBounds.maxY

    for ($sy = $copyY1; $sy -le $copyY2; $sy++) {
        for ($sx = $copyX1; $sx -le $copyX2; $sx++) {
            $dx = $sx + $destX
            $dy = $sy + $destY
            if ($dx -lt 0 -or $dx -ge $CanvasWidth -or $dy -lt 0 -or $dy -ge $CanvasHeight) { continue }
            $index = $sy * $Source.Width + $sx
            $pixel = $Source.GetPixel($sx, $sy)
            if ($ColorMask[$index] -or $NearColorMask[$index]) {
                $frame.SetPixel($dx, $dy, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
            }
        }
    }

    $alphaBounds = Get-AlphaBounds $frame
    $frame.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $frame.Dispose()
    return [pscustomobject]@{
        sourceBoundingBox = [pscustomobject]@{ x = $sourceBounds.x; y = $sourceBounds.y; width = $sourceBounds.width; height = $sourceBounds.height }
        boundingBox = [pscustomobject]@{ x = $alphaBounds.x; y = $alphaBounds.y; width = $alphaBounds.width; height = $alphaBounds.height }
    }
}

function New-Preview(
    [string]$PreviewPath,
    [string]$Title,
    [object[]]$Animations
) {
    $labelWidth = 170
    $cellWidth = 270
    $cellHeight = 210
    $headerHeight = 54
    $width = $labelWidth + 4 * $cellWidth + 24
    $height = $headerHeight + $Animations.Count * $cellHeight + 20
    $preview = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($preview)
    $graphics.Clear([System.Drawing.Color]::FromArgb(24, 30, 38))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $titleFont = [System.Drawing.Font]::new('Consolas', 20, [System.Drawing.FontStyle]::Bold)
    $labelFont = [System.Drawing.Font]::new('Consolas', 12, [System.Drawing.FontStyle]::Bold)
    $smallFont = [System.Drawing.Font]::new('Consolas', 9)
    $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(205, 220, 232))
    $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(85, 125, 140, 155), 1)
    $anchorPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(190, 241, 92, 67), 1)

    $graphics.DrawString($Title, $titleFont, $whiteBrush, 16, 14)
    $graphics.DrawString('Canvas 256x192  |  anchor: bottom-center (128,184)', $smallFont, $mutedBrush, 430, 24)

    for ($row = 0; $row -lt $Animations.Count; $row++) {
        $animation = $Animations[$row]
        $top = $headerHeight + $row * $cellHeight
        $graphics.DrawString($animation.name.ToUpperInvariant(), $labelFont, $whiteBrush, 14, $top + 88)
        $graphics.DrawString("$($animation.frames.Count) frames", $smallFont, $mutedBrush, 14, $top + 108)

        for ($col = 0; $col -lt 4; $col++) {
            $left = $labelWidth + $col * $cellWidth
            $cellRect = [System.Drawing.Rectangle]::new($left, $top + 5, 256, 192)
            $cellColor = if (($row + $col) % 2 -eq 0) { [System.Drawing.Color]::FromArgb(83, 96, 112) } else { [System.Drawing.Color]::FromArgb(72, 84, 99) }
            $graphics.FillRectangle([System.Drawing.SolidBrush]::new($cellColor), $cellRect)
            $graphics.DrawRectangle($gridPen, $cellRect)
            $graphics.DrawLine($anchorPen, $left + 4, $top + 5 + $AnchorY, $left + 252, $top + 5 + $AnchorY)
            if ($col -lt $animation.frames.Count) {
                $frame = [System.Drawing.Image]::FromFile((Join-Path $OutputRoot $animation.frames[$col].file))
                $graphics.DrawImage($frame, $left, $top + 5, 256, 192)
                $frame.Dispose()
                $graphics.DrawString(('{0:D2}' -f ($col + 1)), $smallFont, $mutedBrush, $left + 6, $top + 9)
            }
        }
    }

    $preview.Save($PreviewPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $anchorPen.Dispose(); $gridPen.Dispose(); $mutedBrush.Dispose(); $whiteBrush.Dispose()
    $smallFont.Dispose(); $labelFont.Dispose(); $titleFont.Dispose(); $graphics.Dispose(); $preview.Dispose()
}

New-Directory $OutputRoot
New-Directory (Join-Path $OutputRoot 'previews')
New-Directory (Join-Path $OutputRoot 'arena')

$animationDefinitions = @(
    [pscustomobject]@{ name = 'idle'; count = 4; layout = 'four' },
    [pscustomobject]@{ name = 'walk'; count = 4; layout = 'four' },
    [pscustomobject]@{ name = 'step_back'; count = 4; layout = 'four' },
    [pscustomobject]@{ name = 'jab'; count = 3; layout = 'three' },
    [pscustomobject]@{ name = 'cross'; count = 3; layout = 'three' },
    [pscustomobject]@{ name = 'hook'; count = 3; layout = 'three' },
    [pscustomobject]@{ name = 'uppercut'; count = 3; layout = 'three' },
    [pscustomobject]@{ name = 'block'; count = 2; layout = 'two' },
    [pscustomobject]@{ name = 'dodge'; count = 2; layout = 'two' },
    [pscustomobject]@{ name = 'hurt'; count = 3; layout = 'three' },
    [pscustomobject]@{ name = 'knockdown'; count = 4; layout = 'knockdown' },
    [pscustomobject]@{ name = 'victory'; count = 3; layout = 'three' }
)

$slotsByLayout = @{
    four = @(
        @{ x1 = 190; x2 = 309 }, @{ x1 = 310; x2 = 432 }, @{ x1 = 433; x2 = 555 }, @{ x1 = 556; x2 = 700 }
    )
    three = @(
        @{ x1 = 190; x2 = 322 }, @{ x1 = 323; x2 = 492 }, @{ x1 = 493; x2 = 675 }
    )
    two = @(
        @{ x1 = 190; x2 = 335 }, @{ x1 = 336; x2 = 540 }
    )
    knockdown = @(
        @{ x1 = 190; x2 = 360 }, @{ x1 = 361; x2 = 555 }, @{ x1 = 556; x2 = 780 }, @{ x1 = 781; x2 = 1040 }
    )
}

$sheets = @(
    [pscustomobject]@{
        id = 'zorp'; source = 'zorp_boxer.png'; folder = 'zorp'; prefix = 'zorp'
        yRanges = @(@(0,112),@(113,221),@(222,329),@(330,432),@(433,540),@(541,646),@(647,754),@(755,856),@(857,939),@(940,1037),@(1038,1123),@(1124,1248))
    },
    [pscustomobject]@{
        id = 'master'; source = 'mestre_boxer.png'; folder = 'master'; prefix = 'master'
        yRanges = @(@(0,114),@(115,224),@(225,339),@(340,445),@(446,551),@(552,665),@(666,764),@(765,863),@(864,947),@(948,1040),@(1041,1122),@(1123,1248))
    }
)

$manifestSummaries = @()
foreach ($sheet in $sheets) {
    $sourcePath = Join-Path $ProjectRoot $sheet.source
    if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Sheet não encontrada: $sourcePath" }
    $source = [System.Drawing.Bitmap]::new($sourcePath)
    $colorMask = [bool[]]::new($source.Width * $source.Height)
    for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
            $pixel = $source.GetPixel($x, $y)
            $colorMask[$y * $source.Width + $x] = ($pixel.R -gt 8 -or $pixel.G -gt 8 -or $pixel.B -gt 8)
        }
    }
    # Dilatação única da arte visível: preto junto ao desenho segue opaco; preto distante vira transparência.
    $nearColorMask = [bool[]]::new($source.Width * $source.Height)
    for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
            if (-not $colorMask[$y * $source.Width + $x]) { continue }
            for ($ny = [Math]::Max(0, $y - 2); $ny -le [Math]::Min($source.Height - 1, $y + 2); $ny++) {
                for ($nx = [Math]::Max(0, $x - 2); $nx -le [Math]::Min($source.Width - 1, $x + 2); $nx++) {
                    $nearColorMask[$ny * $source.Width + $nx] = $true
                }
            }
        }
    }

    $characterRoot = Join-Path $OutputRoot $sheet.folder
    New-Directory $characterRoot
    $animations = @()
    $frameTotal = 0
    for ($row = 0; $row -lt $animationDefinitions.Count; $row++) {
        $definition = $animationDefinitions[$row]
        $animationDirectory = Join-Path $characterRoot $definition.name
        New-Directory $animationDirectory
        $frames = @()
        $slots = $slotsByLayout[$definition.layout]
        for ($frameIndex = 0; $frameIndex -lt $definition.count; $frameIndex++) {
            $slot = @{
                x1 = $slots[$frameIndex].x1; x2 = $slots[$frameIndex].x2
                y1 = $sheet.yRanges[$row][0]; y2 = $sheet.yRanges[$row][1]
            }
            # As legendas de duas linhas terminam muito perto do primeiro frame nestes casos.
            # Ajustamos somente o limite esquerdo dessas duas células, sem tocar na arte visível.
            if (($sheet.id -eq 'master' -and $row -eq 0 -and $frameIndex -eq 0) -or
                ($sheet.id -eq 'zorp' -and $row -eq 10 -and $frameIndex -eq 0)) {
                $slot.x1 = 205
            }
            $fileName = '{0}_{1}_{2:D2}.png' -f $sheet.prefix, $definition.name, ($frameIndex + 1)
            $outputPath = Join-Path $animationDirectory $fileName
            $result = Export-Frame -Source $source -ColorMask $colorMask -NearColorMask $nearColorMask -Slot $slot -OutputPath $outputPath
            $relativeFile = ('{0}/{1}/{2}' -f $sheet.folder, $definition.name, $fileName)
            $frames += [pscustomobject]@{
                index = $frameIndex + 1
                file = $relativeFile
                durationMs = Get-SuggestedDuration $definition.name
                sourceBoundingBox = $result.sourceBoundingBox
                boundingBox = $result.boundingBox
            }
            $frameTotal++
        }
        $anchorType = if ($definition.name -eq 'knockdown') { 'floor_center' } else { 'bottom_center' }
        $animations += [pscustomobject]@{
            name = $definition.name
            frameCount = $definition.count
            suggestedDurationMs = Get-SuggestedDuration $definition.name
            canvas = [pscustomobject]@{ width = $CanvasWidth; height = $CanvasHeight }
            anchor = [pscustomobject]@{ type = $anchorType; x = $AnchorX; y = $AnchorY }
            frames = $frames
        }
    }

    $manifest = [pscustomobject]@{
        schemaVersion = 1
        generatedFrom = $sheet.source
        character = $sheet.id
        extractionMethod = 'safe-black-background-removal: colored pixels remain opaque; black pixels are retained only within two pixels of visible art to preserve contours and interior details'
        canvas = [pscustomobject]@{ width = $CanvasWidth; height = $CanvasHeight }
        defaultAnchor = [pscustomobject]@{ type = 'bottom_center'; x = $AnchorX; y = $AnchorY }
        frameTotal = $frameTotal
        animations = $animations
    }
    $manifestName = if ($sheet.id -eq 'zorp') { 'boxe_zorp_manifest.json' } else { 'boxe_master_manifest.json' }
    $manifestPath = Join-Path $OutputRoot $manifestName
    $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $manifestPath -Encoding utf8
    New-Preview -PreviewPath (Join-Path $OutputRoot ("previews/boxe_{0}_preview.png" -f $sheet.id)) -Title ("BOXE - {0}" -f $sheet.id.ToUpperInvariant()) -Animations $animations
    $manifestSummaries += [pscustomobject]@{ character = $sheet.id; frames = $frameTotal; manifest = $manifestName }
    $source.Dispose()
}

Copy-Item -LiteralPath (Join-Path $ProjectRoot 'boxe_arena.png') -Destination (Join-Path $OutputRoot 'arena/boxe_arena.png') -Force
$arena = [System.Drawing.Image]::FromFile((Join-Path $ProjectRoot 'boxe_arena.png'))
$arenaWidth = $arena.Width
$arenaHeight = $arena.Height
[pscustomobject]@{
    schemaVersion = 1
    kind = 'background'
    generatedFrom = 'boxe_arena.png'
    file = 'arena/boxe_arena.png'
    width = $arenaWidth
    height = $arenaHeight
    cropRequired = $false
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $OutputRoot 'boxe_arena_manifest.json') -Encoding utf8
$arena.Dispose()

$oldRuntimeAssets = @()
$scriptPath = Join-Path $ProjectRoot 'script.js'
$lineNumber = 0
Get-Content -LiteralPath $scriptPath | ForEach-Object {
    $lineNumber++
    foreach ($match in [regex]::Matches($_, '(?:Arena_Boxe|zorp_boxe_[A-Za-z0-9_]+|mestre_boxe_[A-Za-z0-9_]+)\.png')) {
        $oldRuntimeAssets += [pscustomobject]@{
            classification = 'OLD_BOXING_ASSET'
            file = $match.Value
            reference = "script.js:$lineNumber"
            plannedAction = 'replace during the future Boxing integration; do not delete until zero runtime references remain'
        }
    }
}
$oldRuntimeAssets = @($oldRuntimeAssets | Sort-Object file, reference -Unique)
[pscustomobject]@{
    schemaVersion = 1
    purpose = 'Audit-only list of currently referenced Boxing assets that the prepared set will replace in the next implementation phase.'
    assets = $oldRuntimeAssets
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputRoot 'boxe_old_asset_audit.json') -Encoding utf8

Write-Output ("Prepared Boxing assets: Zorp={0} frames; Master={1} frames; canvas={2}x{3}; arena={4}x{5}" -f $manifestSummaries[0].frames, $manifestSummaries[1].frames, $CanvasWidth, $CanvasHeight, $arenaWidth, $arenaHeight)
