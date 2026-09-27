param(
    [switch]$RepairDefeatedOnly,
    [switch]$RefreshPreviewOnly
)

Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies ([System.Drawing.Bitmap].Assembly.Location) @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class BasketballAssetCleaner {
    private sealed class Component {
        public readonly List<int> Pixels = new List<int>();
        public int MinX = int.MaxValue, MinY = int.MaxValue, MaxX = -1, MaxY = -1;
        public void Add(int index, int x, int y) {
            Pixels.Add(index);
            MinX = Math.Min(MinX, x); MinY = Math.Min(MinY, y);
            MaxX = Math.Max(MaxX, x); MaxY = Math.Max(MaxY, y);
        }
    }

    private static int BoxDistance(Component a, Component b) {
        int dx = a.MaxX < b.MinX ? b.MinX - a.MaxX : (b.MaxX < a.MinX ? a.MinX - b.MaxX : 0);
        int dy = a.MaxY < b.MinY ? b.MinY - a.MaxY : (b.MaxY < a.MinY ? a.MinY - b.MaxY : 0);
        return Math.Max(dx, dy);
    }

    public static Bitmap KeepSubject(Bitmap input, int alphaThreshold, int proximity) {
        int width = input.Width, height = input.Height, count = width * height;
        var colors = new Color[count];
        var visible = new bool[count];
        for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) {
            int i = y * width + x;
            colors[i] = input.GetPixel(x, y);
            visible[i] = colors[i].A >= alphaThreshold;
        }
        var seen = new bool[count];
        var components = new List<Component>();
        int[] dx = {-1,0,1,-1,1,-1,0,1};
        int[] dy = {-1,-1,-1,0,0,1,1,1};
        for (int start = 0; start < count; start++) {
            if (!visible[start] || seen[start]) continue;
            var component = new Component();
            var queue = new Queue<int>(); queue.Enqueue(start); seen[start] = true;
            while (queue.Count > 0) {
                int current = queue.Dequeue(), x = current % width, y = current / width;
                component.Add(current, x, y);
                for (int n = 0; n < 8; n++) {
                    int nx = x + dx[n], ny = y + dy[n];
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    int next = ny * width + nx;
                    if (visible[next] && !seen[next]) { seen[next] = true; queue.Enqueue(next); }
                }
            }
            components.Add(component);
        }
        var result = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        if (components.Count == 0) return result;
        Component main = components[0];
        foreach (var component in components) if (component.Pixels.Count > main.Pixels.Count) main = component;
        foreach (var component in components) {
            if (component != main && (component.Pixels.Count < 3 || BoxDistance(component, main) > proximity)) continue;
            foreach (int i in component.Pixels) result.SetPixel(i % width, i / width, colors[i]);
        }
        return result;
    }
}
'@

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exportRoot = Join-Path $root 'basketball_assets\exported'
$source = @{
    zorp = Join-Path $root 'ZorpBasquete.png'
    master = Join-Path $root 'MestreBasquete.png'
    hoops = Join-Path $root 'skate_sprites\Aros_Basquete.png'
    ball = Join-Path $root 'skate_sprites\Bola_Basquete.png'
    arena = Join-Path $root 'skate_sprites\Arena_Basquete.png'
}

foreach ($path in $source.Values) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Fonte ausente: $path" }
}

function Ensure-Directory([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

function Save-Crop {
    param(
        [System.Drawing.Image]$Sheet,
        [int]$X, [int]$Y, [int]$Width, [int]$Height,
        [string]$Destination,
        [int]$Padding = 8,
        [int]$CanvasWidth = 0,
        [int]$CanvasHeight = 0,
        [switch]$CleanSubject
    )

    Ensure-Directory (Split-Path -Parent $Destination)
    if ($CanvasWidth -le 0) { $CanvasWidth = $Width + ($Padding * 2) }
    if ($CanvasHeight -le 0) { $CanvasHeight = $Height + ($Padding * 2) }
    $canvas = New-Object System.Drawing.Bitmap $CanvasWidth, $CanvasHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $destinationX = [int](($CanvasWidth - $Width) / 2)
    $destinationY = $CanvasHeight - $Padding - $Height
    $destinationRect = New-Object System.Drawing.Rectangle $destinationX, $destinationY, $Width, $Height
    $sourceRect = New-Object System.Drawing.Rectangle $X, $Y, $Width, $Height
    $graphics.DrawImage($Sheet, $destinationRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    if ($CleanSubject) {
        $clean = [BasketballAssetCleaner]::KeepSubject($canvas, 24, 0)
        $canvas.Dispose()
        $canvas = $clean
    }
    $canvas.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
}

function New-CharacterFrames {
    param([string]$Character, [string]$SheetPath, [string]$Prefix)

    # These rectangles are deliberately hand-authored from the visible figures.
    # Each omits the presentation-card frame, label and ordinal badge.
    $states = @(
        @{ state='idle'; rects=@(@(45,45,130,194), @(190,45,130,194)) },
        @{ state='run'; rects=@(@(409,46,120,193), @(551,46,120,193), @(693,46,120,193), @(835,46,120,193), @(977,46,120,193), @(1119,46,100,193)) },
        @{ state='defense_shuffle'; rects=@(@(25,340,110,172), @(135,340,110,172), @(245,340,110,172), @(355,340,110,172)) },
        @{ state='jump'; rects=@(@(480,337,108,178), @(588,337,108,178), @(696,337,108,178)) },
        @{ state='shoot'; rects=@(@(822,337,106,178), @(928,337,106,178), @(1034,337,106,178), @(1140,337,106,178)) },
        @{ state='pump_fake'; rects=@(@(24,615,135,192), @(159,615,135,192)) },
        @{ state='layup_dunk'; rects=@(@(312,615,132,192), @(444,615,132,192), @(576,615,132,192), @(708,615,132,192)) },
        @{ state='steal'; rects=@(@(860,630,120,177), @(995,630,110,177), @(1123,630,105,177)) },
        @{ state='block'; rects=@(@(22,896,130,195), @(152,896,130,195), @(282,896,112,195)) },
        @{ state='hit'; rects=@(@(428,908,120,183), @(573,908,112,183), @(705,908,128,183)) },
        @{ state='victory'; rects=@(@(852,896,130,195), @(982,896,130,195), @(1112,896,130,195)) },
        @{ state='defeated'; rects=@(@(418,1170,140,76), @(558,1170,140,76), @(698,1170,140,76)) }
    )

    $sheet = [System.Drawing.Image]::FromFile($SheetPath)
    $entries = @()
    foreach ($stateData in $states) {
        $state = $stateData.state
        $stateCanvasWidth = (($stateData.rects | ForEach-Object { $_[2] } | Measure-Object -Maximum).Maximum + 16)
        $stateCanvasHeight = (($stateData.rects | ForEach-Object { $_[3] } | Measure-Object -Maximum).Maximum + 16)
        $index = 0
        foreach ($rect in $stateData.rects) {
            $index++
            $number = $index.ToString('00')
            $fileName = "${Prefix}_${state}_${number}.png"
            $relative = "${Character}/${state}/${fileName}"
            $path = Join-Path $exportRoot $relative
            Save-Crop -Sheet $sheet -X $rect[0] -Y $rect[1] -Width $rect[2] -Height $rect[3] -Destination $path -CanvasWidth $stateCanvasWidth -CanvasHeight $stateCanvasHeight -CleanSubject
            $bitmap = [System.Drawing.Image]::FromFile($path)
            $entry = [ordered]@{
                category = 'character'
                character = $Character
                animation = $state
                direction = 'original_lateral'
                frame = $index
                file = $relative.Replace('\', '/')
                width = $bitmap.Width
                height = $bitmap.Height
                anchor = [ordered]@{ x = [int]($bitmap.Width / 2); y = $bitmap.Height - 8; reference = 'bottom-center' }
                ballAnchor = $null
                observation = 'Manual figure crop; ball remains an independent entity.'
            }
            $bitmap.Dispose()
            $entries += [PSCustomObject]$entry
        }
    }
    $sheet.Dispose()
    return $entries
}

function Set-BallAnchors([object[]]$Entries, [string]$Character) {
    # Coordinates are relative to the exported canvas, not an embedded ball.
    $anchors = @{
        'shoot_01' = @(88,80); 'shoot_02' = @(82,72); 'shoot_03' = @(95,28); 'shoot_04' = @(88,30)
        'pump_fake_01' = @(98,70); 'pump_fake_02' = @(85,36)
        'layup_dunk_01' = @(98,100); 'layup_dunk_02' = @(98,43); 'layup_dunk_03' = @(98,31); 'layup_dunk_04' = @(105,18)
    }
    foreach ($entry in $Entries | Where-Object { $_.character -eq $Character }) {
        $key = '{0}_{1}' -f $entry.animation, $entry.frame.ToString('00')
        if ($anchors.ContainsKey($key)) {
            $entry.ballAnchor = [ordered]@{ x = $anchors[$key][0]; y = $anchors[$key][1]; confidence = 'approximate'; note = 'Estimated hand point for the future BALL entity; no ball pixel was combined with the character.' }
        }
    }
}

function New-BallFrames {
    $sheet = [System.Drawing.Image]::FromFile($source.ball)
    $rects = @(@(20,220,400,400), @(430,220,400,400), @(825,220,400,400), @(15,700,400,400), @(430,650,400,400), @(825,700,400,400))
    $entries = @()
    for ($i = 0; $i -lt $rects.Count; $i++) {
        $fileName = 'ball_spin_{0}.png' -f ($i + 1).ToString('00')
        $relative = "basketball/ball/$fileName"
        $path = Join-Path $exportRoot $relative
        $r = $rects[$i]
        Save-Crop -Sheet $sheet -X $r[0] -Y $r[1] -Width $r[2] -Height $r[3] -Destination $path
        $entries += [PSCustomObject][ordered]@{
            category = 'basketball'; character = $null; animation = 'spin'; direction = $null; frame = $i + 1
            file = $relative.Replace('\', '/'); width = 416; height = 416
            anchor = [ordered]@{ x = 208; y = 208; reference = 'center' }
            ballAnchor = $null; observation = 'Visual rotation for the independent BALL entity.'
        }
    }
    $sheet.Dispose()
    return $entries
}

function New-HoopFrames {
    $sheet = [System.Drawing.Image]::FromFile($source.hoops)
    $frames = @(
        @{ file='hoop_left_idle.png'; animation='idle'; side='left'; rect=@(15,25,585,605) },
        @{ file='hoop_right_idle.png'; animation='idle'; side='right'; rect=@(670,25,585,605) },
        @{ file='hoop_left_net_motion.png'; animation='net_motion'; side='left'; rect=@(15,630,585,605) },
        @{ file='hoop_right_net_motion.png'; animation='net_motion'; side='right'; rect=@(670,630,585,605) }
    )
    $entries = @()
    foreach ($frame in $frames) {
        $relative = "basketball/hoops/$($frame.file)"
        $path = Join-Path $exportRoot $relative
        $r = $frame.rect
        Save-Crop -Sheet $sheet -X $r[0] -Y $r[1] -Width $r[2] -Height $r[3] -Destination $path
        $entries += [PSCustomObject][ordered]@{
            category = 'hoop'; character = $null; animation = $frame.animation; direction = $frame.side; frame = 1
            file = $relative.Replace('\', '/'); width = 601; height = 621
            anchor = [ordered]@{ x = 300; y = 613; reference = 'bottom-center' }
            ballAnchor = $null; observation = 'Visual hoop kept separate for future backboard, rim and scoring-zone physics.'
        }
    }
    $sheet.Dispose()
    return $entries
}

function New-Preview([object[]]$Entries) {
    $path = Join-Path $exportRoot 'basketball_assets_preview.png'
    $canvas = New-Object System.Drawing.Bitmap 2200, 2450, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 10, 14, 30))
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $fontTitle = New-Object System.Drawing.Font 'Consolas', 22, ([System.Drawing.FontStyle]::Bold)
    $fontLabel = New-Object System.Drawing.Font 'Consolas', 11, ([System.Drawing.FontStyle]::Regular)
    $white = [System.Drawing.Brushes]::White
    $cyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 63, 224, 255))
    $orange = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 172, 68))

    function Draw-Group([string]$Title, [object[]]$GroupEntries, [int]$OriginX, [int]$OriginY, [int]$Columns, [int]$CellWidth, [int]$CellHeight, [System.Drawing.Brush]$Brush) {
        $g.DrawString($Title, $fontTitle, $Brush, $OriginX, $OriginY)
        for ($i = 0; $i -lt $GroupEntries.Count; $i++) {
            $entry = $GroupEntries[$i]
            $column = $i % $Columns
            $row = [math]::Floor($i / $Columns)
            $left = $OriginX + ($column * $CellWidth)
            $top = $OriginY + 36 + ($row * $CellHeight)
            $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 18, 25, 48))), $left, $top, $CellWidth - 8, $CellHeight - 8)
            $image = [System.Drawing.Image]::FromFile((Join-Path $exportRoot $entry.file))
            $scale = [math]::Min(($CellWidth - 20) / $image.Width, ($CellHeight - 36) / $image.Height)
            $width = [int]($image.Width * $scale)
            $height = [int]($image.Height * $scale)
            $drawX = $left + [int](($CellWidth - 8 - $width) / 2)
            $drawY = $top + 4 + [int](($CellHeight - 38 - $height) / 2)
            $g.DrawImage($image, $drawX, $drawY, $width, $height)
            $label = '{0}_{1:00}' -f $entry.animation, $entry.frame
            $g.DrawString($label, $fontLabel, $white, $left + 4, $top + $CellHeight - 30)
            $image.Dispose()
        }
    }

    Draw-Group -Title 'ZORP - RECORTES FINAIS' -GroupEntries ($Entries | Where-Object { $_.character -eq 'zorp_basket' }) -OriginX 30 -OriginY 20 -Columns 10 -CellWidth 105 -CellHeight 150 -Brush $cyan
    Draw-Group -Title 'MESTRE - RECORTES FINAIS' -GroupEntries ($Entries | Where-Object { $_.character -eq 'master_basket' }) -OriginX 1130 -OriginY 20 -Columns 10 -CellWidth 105 -CellHeight 150 -Brush $orange
    Draw-Group -Title 'BOLA - ENTIDADE INDEPENDENTE' -GroupEntries ($Entries | Where-Object { $_.category -eq 'basketball' }) -OriginX 30 -OriginY 690 -Columns 6 -CellWidth 170 -CellHeight 185 -Brush $cyan
    Draw-Group -Title 'AROS - ENTIDADES SEPARADAS' -GroupEntries ($Entries | Where-Object { $_.category -eq 'hoop' }) -OriginX 1130 -OriginY 690 -Columns 2 -CellWidth 500 -CellHeight 400 -Brush $orange
    $g.DrawString('ARENA - BACKGROUND PRESERVADO', $fontTitle, $cyan, 30, 1540)
    $arena = [System.Drawing.Image]::FromFile((Join-Path $exportRoot 'basketball/arena/arena_basketball_background.png'))
    $arenaWidth = 1600; $arenaHeight = [int]($arena.Height * ($arenaWidth / $arena.Width))
    $g.DrawImage($arena, 30, 1580, $arenaWidth, $arenaHeight)
    $arena.Dispose()
    $g.DrawString('Bola nao foi integrada aos personagens. Pontos ballAnchor estao documentados no manifesto.', $fontLabel, $white, 30, 2430)
    $g.Dispose(); $fontTitle.Dispose(); $fontLabel.Dispose(); $cyan.Dispose(); $orange.Dispose()
    $canvas.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
}

function Clear-PanelResidue {
    param(
        [string]$Path,
        [int]$StartX = 120,
        [switch]$ClearBottom
    )

    $loaded = [System.Drawing.Bitmap]::FromFile($Path)
    $bitmap = New-Object System.Drawing.Bitmap $loaded
    $loaded.Dispose()
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.FillRectangle([System.Drawing.Brushes]::Transparent, $StartX, 0, $bitmap.Width - $StartX, $bitmap.Height)
    if ($ClearBottom) {
        $graphics.FillRectangle([System.Drawing.Brushes]::Transparent, 0, 81, $bitmap.Width, $bitmap.Height - 81)
    }
    $graphics.Dispose()
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}

function Repair-DefeatedFrames {
    param(
        [string]$Character,
        [string]$SheetPath,
        [string]$Prefix,
        [switch]$MasterPanel,
        [int]$PanelStartX = 120
    )

    # The original bottom panel keeps ordinal badges directly beside the
    # defeated poses. The shared export canvas is retained, while the badge
    # strip is explicitly cleared after the character-only crop.
    $sheet = [System.Drawing.Image]::FromFile($SheetPath)
    $rects = @(@(418,1170,140,76), @(558,1170,140,76), @(698,1170,140,76))
    for ($index = 0; $index -lt $rects.Count; $index++) {
        $number = ($index + 1).ToString('00')
        $destination = Join-Path $exportRoot "$Character\defeated\${Prefix}_defeated_${number}.png"
        $rect = $rects[$index]
        Save-Crop -Sheet $sheet -X $rect[0] -Y $rect[1] -Width $rect[2] -Height $rect[3] -Destination $destination -CanvasWidth 156 -CanvasHeight 92 -CleanSubject
        Clear-PanelResidue -Path $destination -StartX $PanelStartX -ClearBottom:$MasterPanel
    }
    $sheet.Dispose()
}

if ($RepairDefeatedOnly) {
    Repair-DefeatedFrames -Character 'zorp_basket' -SheetPath $source.zorp -Prefix 'zorp_basket'
    Repair-DefeatedFrames -Character 'master_basket' -SheetPath $source.master -Prefix 'master_basket' -MasterPanel -PanelStartX 110
    Write-Output 'Corrigidos somente os seis frames defeated de basquete.'
    return
}

if ($RefreshPreviewOnly) {
    $existingManifest = Get-Content -Raw (Join-Path $exportRoot 'basketball_assets_manifest.json') | ConvertFrom-Json
    New-Preview -Entries $existingManifest.assets
    Write-Output 'Preview de basquete atualizado sem alterar frames ou manifesto.'
    return
}

Ensure-Directory $exportRoot
$entries = @()
$zorpEntries = New-CharacterFrames -Character 'zorp_basket' -SheetPath $source.zorp -Prefix 'zorp_basket'
$masterEntries = New-CharacterFrames -Character 'master_basket' -SheetPath $source.master -Prefix 'master_basket'
Set-BallAnchors -Entries $zorpEntries -Character 'zorp_basket'
Set-BallAnchors -Entries $masterEntries -Character 'master_basket'
$entries += $zorpEntries
$entries += $masterEntries
$entries += New-BallFrames
$entries += New-HoopFrames

$arenaRelative = 'basketball/arena/arena_basketball_background.png'
$arenaDestination = Join-Path $exportRoot $arenaRelative
Ensure-Directory (Split-Path -Parent $arenaDestination)
Copy-Item -LiteralPath $source.arena -Destination $arenaDestination -Force
$arenaImage = [System.Drawing.Image]::FromFile($arenaDestination)
$entries += [PSCustomObject][ordered]@{
    category = 'arena'; character = $null; animation = 'background'; direction = $null; frame = 1
    file = $arenaRelative; width = $arenaImage.Width; height = $arenaImage.Height
    anchor = [ordered]@{ x = [int]($arenaImage.Width / 2); y = $arenaImage.Height; reference = 'bottom-center' }
    ballAnchor = $null; observation = 'Single background preserved; playable hoops will render as separate entities.'
}
$arenaImage.Dispose()

$manifest = [ordered]@{
    schemaVersion = 1
    sourceFiles = @(
        'ZorpBasquete.png', 'MestreBasquete.png', 'skate_sprites/Arena_Basquete.png',
        'skate_sprites/Aros_Basquete.png', 'skate_sprites/Bola_Basquete.png'
    )
    notes = @(
        'Source files remain unchanged.',
        'Ball is an independent entity and was never composed into character PNGs.',
        'Opposite directions should use renderer-controlled horizontal flip when necessary.'
    )
    assets = $entries
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $exportRoot 'basketball_assets_manifest.json') -Encoding utf8
New-Preview -Entries $entries
Write-Output "Exportados $($entries.Count) assets para $exportRoot"
