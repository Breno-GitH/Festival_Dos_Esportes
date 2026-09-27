param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$outputRoot = Join-Path $ProjectRoot 'corrida_sprites\exported'
if (Test-Path $outputRoot) { Remove-Item -LiteralPath $outputRoot -Recurse -Force }
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$sources = @{
    zorp         = @{ file = 'Zorp_Corrida.png'; source = 'Zorp_Corrida.png' }
    mestre       = @{ file = 'Mestre_Corrida.png'; source = 'Mestre_Corrida.png' }
    competitors  = @{ file = 'Competidores_Corrida.png'; source = 'Competidores_Corrida.png' }
    obstacles    = @{ file = 'Obstaculos_Corrida.png'; source = 'Obstaculos_Corrida.png' }
}
foreach ($key in $sources.Keys) {
    $sources[$key].bitmap = [System.Drawing.Bitmap]::FromFile((Join-Path $ProjectRoot $sources[$key].file))
}

$frames = [System.Collections.Generic.List[object]]::new()

function Add-Frame {
    param(
        [string]$SourceKey, [string]$Entity, [string]$Animation, [string]$Direction,
        [int]$Frame, [string]$RelativeDirectory,
        [int]$X, [int]$Y, [int]$Width, [int]$Height,
        [string]$Section, [string]$Notes = ''
    )
    $frames.Add([pscustomobject]@{
        sourceKey = $SourceKey; entity = $Entity; animation = $Animation; direction = $Direction
        frame = $Frame; relativeDirectory = $RelativeDirectory.Replace('\', '/')
        x = $X; y = $Y; w = $Width; h = $Height; section = $Section; notes = $Notes
    })
}

function Add-Hero {
    param([string]$Entity, [string]$SourceKey)
    $base = $Entity
    $idle = @{
        right = @(@(42,58,96,155), @(138,58,96,155));
        left  = @(@(262,58,96,155), @(354,58,96,155));
        up    = @(@(42,244,100,165), @(142,244,100,165));
        down  = @(@(262,244,100,165), @(362,244,100,165));
    }
    foreach ($direction in $idle.Keys) {
        $index = 1
        foreach ($box in $idle[$direction]) {
            Add-Frame $SourceKey $Entity 'idle' $direction $index "$base/idle/$direction" $box[0] $box[1] $box[2] $box[3] $Entity
            $index++
        }
    }
    # The directional badges sit immediately left of the first running pose.
    # Start that first reviewed region after the badge; the remaining columns do
    # not overlap any sheet annotation.
    $runX = @(562, 660, 772, 884, 996, 1108)
    $runY = @{ right = 55; left = 205; up = 345; down = 495 }
    foreach ($direction in $runY.Keys) {
        for ($i = 0; $i -lt $runX.Count; $i++) {
            $runWidth = if ($i -eq 0) { 94 } else { 108 }
            Add-Frame $SourceKey $Entity "run_$direction" $direction ($i + 1) "$base/run_$direction" $runX[$i] $runY[$direction] $runWidth 150 $Entity
        }
    }
    $stepX = @{ in = @(14,106,198); out = @(292,384,476) }
    foreach ($type in $stepX.Keys) {
        for ($i = 0; $i -lt $stepX[$type].Count; $i++) {
            Add-Frame $SourceKey $Entity "sidestep_$type" '' ($i + 1) "$base/sidestep/$type" $stepX[$type][$i] 766 92 164 $Entity
        }
    }
    # These poses are intentionally close together in the source illustration.
    # The boundaries below are the visual midpoints between silhouettes, rather
    # than a uniform grid, preventing a neighbouring runner from leaking in.
    $jumpRight = @(@(542,83),@(625,85),@(710,94),@(804,95))
    $jumpLeft = @(@(925,80),@(1005,80),@(1085,75),@(1160,85))
    foreach ($direction in @('right','left')) {
        $boxes = if ($direction -eq 'right') { $jumpRight } else { $jumpLeft }
        for ($i = 0; $i -lt $boxes.Count; $i++) {
            $box = $boxes[$i]
            Add-Frame $SourceKey $Entity 'jump' $direction ($i + 1) "$base/jump/$direction" $box[0] 758 $box[1] 126 $Entity
        }
    }
    foreach ($direction in @('up','down')) {
        $offsets = if ($direction -eq 'up') { @(548,654,760) } else { @(918,1016,1114) }
        for ($i = 0; $i -lt $offsets.Count; $i++) {
            Add-Frame $SourceKey $Entity 'jump' $direction ($i + 1) "$base/jump/$direction" $offsets[$i] 916 98 123 $Entity
        }
    }
    foreach ($entry in @(
        @{ animation='hit';      folder="$base/hit";      xs=@(16,126,236,346); y=1078; w=110; h=166 },
        @{ animation='victory';  folder="$base/victory";  xs=@(468,568,668,768); y=1078; w=100; h=166 },
        @{ animation='defeated'; folder="$base/defeated"; xs=@(916,1016,1116);   y=1078; w=100; h=166 }
    )) {
        for ($i = 0; $i -lt $entry.xs.Count; $i++) {
            Add-Frame $SourceKey $Entity $entry.animation '' ($i + 1) $entry.folder $entry.xs[$i] $entry.y $entry.w $entry.h $Entity
        }
    }
}

Add-Hero 'zorp' 'zorp'
Add-Hero 'mestre' 'mestre'

function Add-Competitor {
    param([string]$Id, [string]$Band, [int]$Column)
    $baseX = $Column * 310
    $layout = @{
        robot   = @{ idleY=16; runY=165; upY=262; hitY=352; idleH=145; runH=96; upH=108; hitH=88 }
        human   = @{ idleY=462; runY=590; upY=698; hitY=792; idleH=138; runH=106; upH=104; hitH=78 }
        monster = @{ idleY=880; runY=1002; upY=1102; hitY=1180; idleH=126; runH=104; upH=86; hitH=74 }
    }[$Band]
    $portraitCells = @(@(28,79),@(107,77),@(184,78),@(262,78))
    for ($i = 0; $i -lt 4; $i++) {
        $cell = $portraitCells[$i]
        Add-Frame 'competitors' $Id 'idle' '' ($i + 1) "competitors/$Id/idle" ($baseX + $cell[0]) $layout.idleY $cell[1] $layout.idleH 'competitors' 'Directional-ready pose from source sheet.'
    }
    for ($i = 0; $i -lt 6; $i++) {
        Add-Frame 'competitors' $Id 'run_right' 'right' ($i + 1) "competitors/$Id/run_right" ($baseX + 20 + $i * 50) $layout.runY 50 $layout.runH 'competitors'
    }
    for ($i = 0; $i -lt 4; $i++) {
        $cell = $portraitCells[$i]
        Add-Frame 'competitors' $Id 'run_up' 'up' ($i + 1) "competitors/$Id/run_up" ($baseX + $cell[0]) $layout.upY $cell[1] $layout.upH 'competitors'
    }
    for ($i = 0; $i -lt 4; $i++) {
        $cell = $portraitCells[$i]
        Add-Frame 'competitors' $Id 'hit' '' ($i + 1) "competitors/$Id/hit" ($baseX + $cell[0]) $layout.hitY $cell[1] $layout.hitH 'competitors'
    }
}

@('robot_blue','robot_orange','robot_pink','robot_green') | ForEach-Object -Begin { $i = 0 } -Process { Add-Competitor $_ 'robot' $i; $i++ }
@('human_01','human_02','human_03','human_04') | ForEach-Object -Begin { $i = 0 } -Process { Add-Competitor $_ 'human' $i; $i++ }
@('monster_red','monster_blue','monster_purple','monster_ram') | ForEach-Object -Begin { $i = 0 } -Process { Add-Competitor $_ 'monster' $i; $i++ }

function Add-ObstacleSet {
    param([string]$Category, [string]$Name, [array]$Boxes, [string]$Animation = 'idle')
    $index = 1
    foreach ($box in $Boxes) {
        Add-Frame 'obstacles' $Name $Animation '' $index "obstacles/$Category" $box[0] $box[1] $box[2] $box[3] 'obstacles'
        $index++
    }
}

Add-ObstacleSet 'fixed/hurdles' 'hurdles' @(
    @(24,76,120,122), @(145,76,120,122), @(266,76,120,122), @(382,112,98,88),
    @(24,202,120,122), @(145,202,120,122), @(266,202,120,122), @(382,238,98,88)
) 'hurdle'
Add-ObstacleSet 'fixed/water' 'water' @(@(482,76,202,146), @(682,76,202,146), @(502,205,202,145)) 'water'
Add-ObstacleSet 'fixed/cones' 'cones' @(
    @(920,72,78,124), @(996,72,78,124), @(1072,72,86,124), @(1152,72,90,124),
    @(910,195,132,112), @(1040,195,128,112), @(1166,195,84,112)
) 'cone'
Add-ObstacleSet 'fixed/barricades' 'barricades' @(@(20,1124,125,110), @(138,1124,125,110), @(255,1124,105,110)) 'barricade'
Add-ObstacleSet 'fixed/starting_blocks' 'starting_blocks' @(@(680,1124,108,110), @(784,1124,108,110), @(888,1124,108,110)) 'starting_block'

Add-ObstacleSet 'mobile/slow_runner' 'slow_runner' @(
    @(20,382,100,160), @(118,382,100,160), @(216,382,100,160), @(314,382,100,160), @(412,382,100,160),
    @(20,532,100,170), @(118,532,100,170), @(216,532,100,170), @(314,532,100,170), @(412,532,100,170)
) 'run'
Add-ObstacleSet 'mobile/zigzag_runner' 'zigzag_runner' @(
    @(510,382,88,160), @(596,382,88,160), @(682,382,88,160), @(768,382,88,160), @(854,382,88,160),
    @(510,532,88,170), @(596,532,88,170), @(682,532,88,170), @(768,532,88,170), @(854,532,88,170)
) 'run'
Add-ObstacleSet 'mobile/equipment_cart' 'equipment_cart' @(@(900,382,112,158), @(1010,382,112,158), @(1120,382,112,158), @(900,532,112,160), @(1010,532,112,160), @(1120,532,112,160)) 'move'
Add-ObstacleSet 'mobile/judge' 'judge' @(@(18,760,100,162), @(116,760,100,162), @(214,760,100,162), @(312,760,100,162), @(410,760,100,162)) 'walk'
Add-ObstacleSet 'mobile/rolling_equipment' 'rolling_equipment' @(@(370,1124,102,110), @(470,1124,102,110), @(570,1124,102,110)) 'move'
Add-ObstacleSet 'mobile/maintenance_robot' 'maintenance_robot' @(@(970,1124,92,110), @(1062,1124,92,110), @(1154,1124,92,110)) 'move'

Add-ObstacleSet 'scenic/bottles' 'bottles' @(@(600,770,80,132), @(678,770,80,132), @(756,770,80,132), @(834,770,100,132)) 'idle'
Add-ObstacleSet 'scenic/sponges' 'sponges' @(@(980,780,86,118), @(1064,780,86,118), @(1148,780,86,118)) 'idle'
Add-ObstacleSet 'scenic/pigeons' 'pigeons' @(@(20,942,92,112), @(112,942,92,112), @(204,942,92,112), @(296,942,92,112), @(386,942,102,112), @(484,942,102,112)) 'flap'
Add-ObstacleSet 'scenic/caution_tape' 'caution_tape' @(@(646,936,76,112), @(718,936,140,112), @(852,936,140,112), @(990,936,104,112), @(1092,936,132,112)) 'idle'

function Get-AlphaBounds {
    param([System.Drawing.Bitmap]$Bitmap, [object]$Frame)
    $left = [Math]::Max(0, $Frame.x); $top = [Math]::Max(0, $Frame.y)
    $right = [Math]::Min($Bitmap.Width - 1, $Frame.x + $Frame.w - 1)
    $bottom = [Math]::Min($Bitmap.Height - 1, $Frame.y + $Frame.h - 1)
    $minX = $right; $minY = $bottom; $maxX = $left; $maxY = $top; $found = $false
    for ($y = $top; $y -le $bottom; $y++) {
        for ($x = $left; $x -le $right; $x++) {
            if ($Bitmap.GetPixel($x, $y).A -gt 0) {
                $found = $true
                if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if (-not $found) { return $null }
    # Two transparent pixels of safety stay inside the reviewed candidate cell.
    $minX = [Math]::Max($left, $minX - 2); $minY = [Math]::Max($top, $minY - 2)
    $maxX = [Math]::Min($right, $maxX + 2); $maxY = [Math]::Min($bottom, $maxY + 2)
    return [pscustomobject]@{ x=$minX; y=$minY; w=$maxX-$minX+1; h=$maxY-$minY+1 }
}

function Get-PrimaryAlphaComponent {
    param([System.Drawing.Bitmap]$Bitmap, [object]$Frame)
    # Several animation rows on the supplied competitor sheet were painted close
    # together. A component mask keeps the actual pose and rejects an adjacent
    # silhouette that happens to intrude into the reviewed rectangle.
    $left = [Math]::Max(0, $Frame.x); $top = [Math]::Max(0, $Frame.y)
    $right = [Math]::Min($Bitmap.Width - 1, $Frame.x + $Frame.w - 1)
    $bottom = [Math]::Min($Bitmap.Height - 1, $Frame.y + $Frame.h - 1)
    $w = $right - $left + 1; $h = $bottom - $top + 1
    $visited = [bool[]]::new($w * $h)
    $components = [System.Collections.Generic.List[object]]::new()
    for ($localY = 0; $localY -lt $h; $localY++) {
        for ($localX = 0; $localX -lt $w; $localX++) {
            $startIndex = $localY * $w + $localX
            if ($visited[$startIndex] -or $Bitmap.GetPixel($left + $localX, $top + $localY).A -eq 0) { continue }
            $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
            $pixels = [System.Collections.Generic.List[System.Drawing.Point]]::new()
            $queue.Enqueue([System.Drawing.Point]::new($localX, $localY)); $visited[$startIndex] = $true
            $minX = $left + $localX; $maxX = $minX; $minY = $top + $localY; $maxY = $minY
            while ($queue.Count -gt 0) {
                $point = $queue.Dequeue(); $absoluteX = $left + $point.X; $absoluteY = $top + $point.Y
                $pixels.Add([System.Drawing.Point]::new($absoluteX, $absoluteY))
                if ($absoluteX -lt $minX) { $minX = $absoluteX }; if ($absoluteX -gt $maxX) { $maxX = $absoluteX }
                if ($absoluteY -lt $minY) { $minY = $absoluteY }; if ($absoluteY -gt $maxY) { $maxY = $absoluteY }
                for ($dy = -1; $dy -le 1; $dy++) {
                    for ($dx = -1; $dx -le 1; $dx++) {
                        if ($dx -eq 0 -and $dy -eq 0) { continue }
                        $nextX = $point.X + $dx; $nextY = $point.Y + $dy
                        if ($nextX -lt 0 -or $nextY -lt 0 -or $nextX -ge $w -or $nextY -ge $h) { continue }
                        $nextIndex = $nextY * $w + $nextX
                        if ($visited[$nextIndex]) { continue }
                        if ($Bitmap.GetPixel($left + $nextX, $top + $nextY).A -eq 0) { continue }
                        $visited[$nextIndex] = $true; $queue.Enqueue([System.Drawing.Point]::new($nextX, $nextY))
                    }
                }
            }
            $components.Add([pscustomobject]@{ pixels=$pixels; x=$minX; y=$minY; w=$maxX-$minX+1; h=$maxY-$minY+1 })
        }
    }
    if ($components.Count -eq 0) { return $null }
    return $components | Sort-Object { $_.pixels.Count } -Descending | Select-Object -First 1
}

$prepared = [System.Collections.Generic.List[object]]::new()
foreach ($frame in $frames) {
    $bounds = Get-AlphaBounds $sources[$frame.sourceKey].bitmap $frame
    if ($null -eq $bounds) { Write-Warning "Empty candidate skipped: $($frame.entity) $($frame.animation) #$($frame.frame)"; continue }
    $mask = $null
    if ($frame.sourceKey -eq 'competitors' -or (($frame.entity -eq 'zorp' -or $frame.entity -eq 'mestre') -and $frame.animation -eq 'jump')) {
        $mask = Get-PrimaryAlphaComponent $sources[$frame.sourceKey].bitmap $frame
        if ($null -ne $mask) { $bounds = [pscustomobject]@{ x=$mask.x; y=$mask.y; w=$mask.w; h=$mask.h } }
    }
    $prepared.Add([pscustomobject]@{ frame=$frame; bounds=$bounds; mask=$mask; group="$($frame.relativeDirectory)" })
}

$manifestFrames = [System.Collections.Generic.List[object]]::new()
foreach ($group in ($prepared | Group-Object group)) {
    $maxW = ($group.Group | ForEach-Object { $_.bounds.w } | Measure-Object -Maximum).Maximum
    $maxH = ($group.Group | ForEach-Object { $_.bounds.h } | Measure-Object -Maximum).Maximum
    $margin = 4
    $canvasW = [int]$maxW + $margin * 2
    $canvasH = [int]$maxH + $margin * 2
    $directory = Join-Path $outputRoot $group.Name
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    foreach ($item in $group.Group) {
        $frame = $item.frame; $bounds = $item.bounds
        $canvas = [System.Drawing.Bitmap]::new($canvasW, $canvasH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $destX = [int][Math]::Floor(($canvasW - $bounds.w) / 2)
        $destY = $canvasH - $margin - $bounds.h
        $source = $sources[$frame.sourceKey].bitmap
        if ($null -eq $item.mask) {
            $graphics.DrawImage($source, [System.Drawing.Rectangle]::new($destX, $destY, $bounds.w, $bounds.h), $bounds.x, $bounds.y, $bounds.w, $bounds.h, [System.Drawing.GraphicsUnit]::Pixel)
        } else {
            # Copy only the selected connected silhouette, preserving source alpha.
            foreach ($pixel in $item.mask.pixels) { $canvas.SetPixel($destX + $pixel.X - $bounds.x, $destY + $pixel.Y - $bounds.y, $source.GetPixel($pixel.X, $pixel.Y)) }
        }
        $graphics.Dispose()
        $fileName = 'frame_{0:d2}.png' -f $frame.frame
        $absoluteFile = Join-Path $directory $fileName
        $canvas.Save($absoluteFile, [System.Drawing.Imaging.ImageFormat]::Png)
        $canvas.Dispose()
        $relativeFile = (Join-Path $frame.relativeDirectory $fileName).Replace('\', '/')
        $manifestFrames.Add([ordered]@{
            object = $frame.entity
            animation = $frame.animation
            direction = if ([string]::IsNullOrWhiteSpace($frame.direction)) { $null } else { $frame.direction }
            frame = $frame.frame
            file = $relativeFile
            width = $canvasW
            height = $canvasH
            anchor = @{ x = 0.5; y = 1.0; name = 'bottom-center' }
            source = $sources[$frame.sourceKey].source
            sourceRect = @{ x=$bounds.x; y=$bounds.y; width=$bounds.w; height=$bounds.h }
            notes = $frame.notes
        })
    }
}

$manifest = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    outputRoot = 'corrida_sprites/exported'
    sources = @('Zorp_Corrida.png','Mestre_Corrida.png','Competidores_Corrida.png','Obstaculos_Corrida.png')
    processing = @{
        transparency = 'Original sheets retain native alpha; no black-background keying was applied.'
        cropMethod = 'Manually reviewed candidate regions, then alpha-tight bounds with a 2px internal safety margin.'
        overlapHandling = 'Closely composed hero-jump and competitor poses use the largest connected alpha silhouette from their reviewed region, preventing adjacent-pose fragments from being exported.'
        alignment = 'Canvas shared by animation/direction; visual content horizontally centered and bottom-aligned with a 4px pad.'
    }
    auditNotes = @(
        'Competidores_Corrida contains authored idle, right-running, up-running, and hit poses for each competitor.',
        'No distinct left-running or down-running competitor source poses were present; they were not fabricated or exported.',
        'Titles, direction labels, and explanatory sheet UI were intentionally excluded from all frame candidates.'
    )
    frames = $manifestFrames
}
$manifestPath = Join-Path $outputRoot 'corrida_sprites_manifest.json'
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

# Preview: one contact sheet per requested asset family, all using final exported PNGs.
$sections = @('zorp','mestre','competitors','obstacles')
$sectionFrames = @{}
foreach ($section in $sections) { $sectionFrames[$section] = @($manifestFrames | Where-Object { $_.file.StartsWith("$section/") }) }
$columns = 18; $cellW = 124; $cellH = 112; $headerH = 34; $padding = 18
$previewWidth = $padding * 2 + $columns * $cellW
$previewHeight = $padding
foreach ($section in $sections) { $previewHeight += $headerH + [Math]::Ceiling($sectionFrames[$section].Count / $columns) * $cellH + $padding }
$preview = [System.Drawing.Bitmap]::new($previewWidth, [int]$previewHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$previewG = [System.Drawing.Graphics]::FromImage($preview)
$previewG.Clear([System.Drawing.Color]::FromArgb(255, 14, 20, 32))
$previewG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$titleFont = [System.Drawing.Font]::new('Arial', 15, [System.Drawing.FontStyle]::Bold)
$labelFont = [System.Drawing.Font]::new('Arial', 7, [System.Drawing.FontStyle]::Regular)
$sectionColors = @{ zorp=[System.Drawing.Color]::FromArgb(255,105,255,130); mestre=[System.Drawing.Color]::FromArgb(255,255,186,66); competitors=[System.Drawing.Color]::FromArgb(255,108,210,255); obstacles=[System.Drawing.Color]::FromArgb(255,255,120,120) }
$cursorY = $padding
foreach ($section in $sections) {
    $previewG.FillRectangle([System.Drawing.SolidBrush]::new($sectionColors[$section]), 0, $cursorY, $previewWidth, $headerH)
    $previewG.DrawString($section.ToUpperInvariant(), $titleFont, [System.Drawing.Brushes]::Black, $padding, $cursorY + 7)
    $cursorY += $headerH
    $index = 0
    foreach ($frame in $sectionFrames[$section]) {
        $col = $index % $columns; $row = [Math]::Floor($index / $columns)
        $tileX = $padding + $col * $cellW; $tileY = $cursorY + $row * $cellH
        $previewG.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 26, 35, 53)), $tileX, $tileY, $cellW - 5, $cellH - 5)
        $image = [System.Drawing.Image]::FromFile((Join-Path $outputRoot $frame.file))
        $scale = [Math]::Min(72 / $image.Width, 72 / $image.Height)
        $displayW = [int][Math]::Max(1, [Math]::Round($image.Width * $scale)); $displayH = [int][Math]::Max(1, [Math]::Round($image.Height * $scale))
        $displayX = $tileX + [int](($cellW - 5 - $displayW) / 2); $displayY = $tileY + 78 - $displayH
        $previewG.DrawImage($image, $displayX, $displayY, $displayW, $displayH)
        $image.Dispose()
        $label = "$($frame.object) $($frame.animation) #$('{0:d2}' -f $frame.frame)"
        $previewG.DrawString($label, $labelFont, [System.Drawing.Brushes]::White, $tileX + 3, $tileY + 82)
        $index++
    }
    $cursorY += [Math]::Ceiling($sectionFrames[$section].Count / $columns) * $cellH + $padding
}
$previewG.Dispose(); $titleFont.Dispose(); $labelFont.Dispose()
$preview.Save((Join-Path $outputRoot 'corrida_sprites_preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$preview.Dispose()

foreach ($key in $sources.Keys) { $sources[$key].bitmap.Dispose() }
$summary = [ordered]@{
    exported = $manifestFrames.Count
    zorp = @($manifestFrames | Where-Object { $_.object -eq 'zorp' }).Count
    mestre = @($manifestFrames | Where-Object { $_.object -eq 'mestre' }).Count
    competitors = @($manifestFrames | Where-Object { $_.file.StartsWith('competitors/') }).Count
    obstacles = @($manifestFrames | Where-Object { $_.file.StartsWith('obstacles/') }).Count
    manifest = $manifestPath
    preview = (Join-Path $outputRoot 'corrida_sprites_preview.png')
}
$summary | ConvertTo-Json
