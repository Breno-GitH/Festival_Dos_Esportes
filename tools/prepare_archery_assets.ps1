<#
  Builds the runtime-ready library for the Arquearia raw sheets.
  Crop windows isolate authored visual groups only; the final bounds are detected
  from visible pixels after the connected white sheet background is removed.
  The five raw source PNGs are never modified or removed.
#>
param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class ArcheryPixels {
    static bool IsNearWhite(byte[] p, int o) { return p[o] >= 248 && p[o + 1] >= 248 && p[o + 2] >= 248; }
    public static void ClearEdgeConnectedWhite(Bitmap image) {
        int w = image.Width, h = image.Height; var rect = new Rectangle(0, 0, w, h);
        var bits = image.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb); int stride = bits.Stride;
        var data = new byte[stride * h]; Marshal.Copy(bits.Scan0, data, 0, data.Length);
        var seen = new bool[w * h]; var queue = new Queue<int>();
        Action<int,int> add = (x,y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return;
            int i = y * w + x;
            if (seen[i] || !IsNearWhite(data, y * stride + x * 4)) return;
            seen[i] = true; queue.Enqueue(i);
        };
        for (int x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
        for (int y = 0; y < h; y++) { add(0, y); add(w - 1, y); }
        while (queue.Count > 0) {
            int i = queue.Dequeue(), x = i % w, y = i / w, offset = y * stride + x * 4;
            data[offset + 3] = 0;
            add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
        }
        Marshal.Copy(data, 0, bits.Scan0, data.Length); image.UnlockBits(bits);
    }
}
'@

$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'archery_assets'
$previewDir = Join-Path $root 'docs\archery_asset_previews'
New-Item -ItemType Directory -Force -Path $output, $previewDir | Out-Null

function Set-PixelArt([System.Drawing.Graphics]$g) {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
}

function Get-VisibleBounds([System.Drawing.Bitmap]$image) {
    $left = $image.Width; $top = $image.Height; $right = -1; $bottom = -1
    for ($y = 0; $y -lt $image.Height; $y++) {
        for ($x = 0; $x -lt $image.Width; $x++) {
            if ($image.GetPixel($x, $y).A -gt 8) {
                $left = [Math]::Min($left, $x); $top = [Math]::Min($top, $y)
                $right = [Math]::Max($right, $x); $bottom = [Math]::Max($bottom, $y)
            }
        }
    }
    if ($right -lt $left) { throw 'Crop contains no visible pixels.' }
    return [System.Drawing.Rectangle]::FromLTRB($left, $top, $right + 1, $bottom + 1)
}

function New-Crop([System.Drawing.Bitmap]$sheet, [int]$x, [int]$y, [int]$w, [int]$h, [int]$margin = 6) {
    if ($x -lt 0 -or $y -lt 0 -or ($x + $w) -gt $sheet.Width -or ($y + $h) -gt $sheet.Height) {
        throw "Crop outside source bounds: $x,$y $w x $h"
    }
    $window = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($window)
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g.DrawImage($sheet, [System.Drawing.Rectangle]::new(0, 0, $w, $h), [System.Drawing.Rectangle]::new($x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    [ArcheryPixels]::ClearEdgeConnectedWhite($window)
    $bounds = Get-VisibleBounds $window
    $bounds = [System.Drawing.Rectangle]::FromLTRB(
        [Math]::Max(0, $bounds.Left - $margin), [Math]::Max(0, $bounds.Top - $margin),
        [Math]::Min($w, $bounds.Right + $margin), [Math]::Min($h, $bounds.Bottom + $margin)
    )
    $result = $window.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $window.Dispose()
    return $result
}

function Make-Canvas([System.Drawing.Bitmap]$image, [int]$width, [int]$height, [string]$anchorType) {
    $result = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $anchorX = [int][Math]::Floor($width / 2)
    $anchorY = switch ($anchorType) {
        'CENTER' { [int][Math]::Floor($height / 2) }
        'BOTTOM_CENTER' { $height - 12 }
        default { [int][Math]::Floor($height / 2) }
    }
    $sourceAnchorY = if ($anchorType -eq 'BOTTOM_CENTER') { $image.Height - 6 } else { [int][Math]::Floor($image.Height / 2) }
    $g = [System.Drawing.Graphics]::FromImage($result); Set-PixelArt $g
    $g.DrawImageUnscaled($image, $anchorX - [int][Math]::Floor($image.Width / 2), $anchorY - $sourceAnchorY)
    $g.Dispose()
    return [pscustomobject]@{ image = $result; anchorX = $anchorX; anchorY = $anchorY }
}

function Add-Frame([System.Collections.Generic.List[object]]$entries, [System.Drawing.Bitmap]$sheet, [string]$source, [string]$file, [string]$category, [string]$subtype, [string]$state, [int]$frame, [string]$group, [string]$anchor, [int]$x, [int]$y, [int]$w, [int]$h, [string]$notes) {
    $entries.Add([pscustomobject]@{
        file = $file; source = $source; category = $category; subtype = $subtype; state = $state; frame = $frame
        canvasGroup = $group; anchorType = $anchor; image = (New-Crop $sheet $x $y $w $h 6); notes = $notes
    })
}

function Add-RowFrames([System.Collections.Generic.List[object]]$entries, [System.Drawing.Bitmap]$sheet, [string]$source, [string]$folder, [string]$prefix, [string]$category, [string]$subtype, [string]$state, [string]$group, [string]$anchor, [object[]]$boxes, [string]$notes) {
    $frame = 1
    foreach ($box in $boxes) {
        Add-Frame $entries $sheet $source ($folder + '/' + $prefix + '_' + $frame.ToString('00') + '.png') $category $subtype $state $frame $group $anchor $box[0] $box[1] $box[2] $box[3] $notes
        $frame++
    }
}

function Write-Preview([object[]]$frames, [string]$fileName, [string[]]$groups) {
    $tileW = 178; $tileH = 174; $columns = 7; $rows = 0
    foreach ($group in $groups) { $count = @($frames | Where-Object canvasGroup -eq $group).Count; if ($count) { $rows += 1 + [Math]::Ceiling($count / $columns) } }
    $preview = [System.Drawing.Bitmap]::new($tileW * $columns, [Math]::Max(100, 42 + $rows * $tileH), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($preview); Set-PixelArt $g; $g.Clear([System.Drawing.Color]::FromArgb(255, 10, 18, 32))
    $title = [System.Drawing.Font]::new('Consolas', 15, [System.Drawing.FontStyle]::Bold)
    $label = [System.Drawing.Font]::new('Consolas', 8, [System.Drawing.FontStyle]::Bold)
    $small = [System.Drawing.Font]::new('Consolas', 7)
    $g.DrawString('ARQUEARIA - ' + $fileName, $title, [System.Drawing.Brushes]::Aquamarine, 8, 7)
    $rowY = 37
    foreach ($group in $groups) {
        $groupFrames = @($frames | Where-Object canvasGroup -eq $group | Sort-Object file)
        if (!$groupFrames.Count) { continue }
        $g.DrawString($group.ToUpper(), $label, [System.Drawing.Brushes]::Gold, 5, $rowY); $rowY += 15
        for ($i = 0; $i -lt $groupFrames.Count; $i++) {
            $x = ($i % $columns) * $tileW; $y = $rowY + [Math]::Floor($i / $columns) * $tileH
            for ($cy = $y; $cy -lt $y + 126; $cy += 10) { for ($cx = $x + 4; $cx -lt $x + $tileW - 4; $cx += 10) {
                $brush = if (((($cx - $x) / 10 + [Math]::Floor(($cy - $y) / 10)) % 2) -eq 0) { [System.Drawing.Brushes]::DimGray } else { [System.Drawing.Brushes]::Gray }
                $g.FillRectangle($brush, $cx, $cy, 10, 10)
            }}
            $image = [System.Drawing.Bitmap]::FromFile((Join-Path $output $groupFrames[$i].file))
            $scale = [Math]::Min(1.0, [Math]::Min(144 / $image.Width, 114 / $image.Height))
            $drawW = [int]($image.Width * $scale); $drawH = [int]($image.Height * $scale)
            $g.DrawImage($image, $x + [int](($tileW - $drawW) / 2), $y + 4, $drawW, $drawH)
            $g.DrawString(([System.IO.Path]::GetFileName($groupFrames[$i].file)), $small, [System.Drawing.Brushes]::White, $x + 4, $y + 132)
            $image.Dispose()
        }
        $rowY += [Math]::Ceiling($groupFrames.Count / $columns) * $tileH + 3
    }
    $preview.Save((Join-Path $previewDir $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
    $small.Dispose(); $label.Dispose(); $title.Dispose(); $g.Dispose(); $preview.Dispose()
}

$entries = [System.Collections.Generic.List[object]]::new()

# Character sheets use the authored rows: windows only locate visual groups, then New-Crop detects the final silhouette.
$characterRows = @(
    @('idle_back','IDLE_BACK',@(@(12,75,96,178),@(112,75,110,178),@(220,75,108,178),@(330,75,108,178))),
    @('ready_stance_back','READY_STANCE_BACK',@(@(445,72,126,185),@(572,72,118,185),@(695,72,115,185),@(815,72,110,185))),
    @('walk_down_back','WALK_DOWN_BACK',@(@(945,72,110,188),@(1065,72,110,188),@(1195,72,110,188),@(1328,72,110,188))),
    @('raise_bow_back','RAISE_BOW_BACK',@(@(5,332,108,202),@(115,332,108,202),@(224,332,108,202),@(336,332,112,202))),
    @('draw_bowstring_back','DRAW_BOWSTRING_BACK',@(@(475,328,112,208),@(595,328,116,208),@(715,328,120,208),@(835,328,112,208))),
    @('aim_back','AIM_BACK',@(@(980,324,115,214),@(1100,324,115,214),@(1218,324,112,214),@(1335,324,105,214))),
    @('release_shot_back','RELEASE_SHOT_BACK',@(@(12,620,103,210),@(117,620,105,210),@(224,620,106,210),@(332,620,98,210))),
    @('recovery_back','RECOVERY_BACK',@(@(425,620,100,210),@(525,620,100,210),@(625,620,100,210),@(725,620,110,210))),
    @('hit_reaction_back','HIT_REACTION_BACK',@(@(835,620,110,210),@(945,620,110,210),@(1055,620,90,210))),
    @('miss_reaction_back','MISS_REACTION_BACK',@(@(1142,620,93,210),@(1235,620,100,210),@(1335,620,105,210))),
    @('victory_back','VICTORY_BACK',@(@(12,890,96,175),@(112,890,112,175),@(225,890,160,175),@(385,890,125,175),@(510,890,140,175),@(650,890,140,175)))
)
foreach ($character in @(@('zorp_arqueiro.png','zorp','zorp_archer'), @('mestre_arqueiro.png','master','master_archer'))) {
    $sheet = [System.Drawing.Bitmap]::FromFile((Join-Path $root $character[0]))
    foreach ($row in $characterRows) {
        Add-RowFrames $entries $sheet $character[0] ($character[1] + '/' + $row[0]) ($character[2] + '_' + $row[0]) 'character' $character[1] $row[1] $character[1] 'BOTTOM_CENTER' $row[2] 'Back-facing archer frame isolated from the supplied sheet.'
    }
    $sheet.Dispose()
}

$targets = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'alvos_arquearia.png'))
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/static' 'target_small_idle' 'target' 'small' 'IDLE' 'targets_static' 'BOTTOM_CENTER' @(@(20,160,92,135),@(122,160,92,135),@(225,160,92,135),@(327,160,92,135)) 'Small static target.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/static' 'target_medium_idle' 'target' 'medium' 'IDLE' 'targets_static' 'BOTTOM_CENTER' @(@(440,145,118,155),@(558,145,118,155),@(676,145,118,155),@(794,145,118,155)) 'Medium static target.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/static' 'target_large_idle' 'target' 'large' 'IDLE' 'targets_static' 'BOTTOM_CENTER' @(@(915,135,140,175),@(1055,135,120,175),@(1175,135,145,175),@(1320,135,120,175)) 'Large static target.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/bonus' 'target_golden_bonus' 'target' 'golden' 'BONUS' 'targets_static' 'BOTTOM_CENTER' @(@(15,395,120,165),@(135,395,110,165),@(245,395,120,165),@(365,395,125,165)) 'Golden bonus target.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/hit' 'target_hit' 'target' 'hit' 'HIT' 'targets_static' 'BOTTOM_CENTER' @(@(500,395,100,165),@(605,395,105,165),@(720,395,110,165),@(835,395,115,165)) 'Successive authored target-hit state.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/destroyed' 'target_destroyed' 'target' 'destroyed' 'DESTROYED' 'targets_static' 'BOTTOM_CENTER' @(@(970,395,140,165),@(1110,395,150,165),@(1265,395,170,165)) 'Destroyed target or support aftermath.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/moving' 'target_side_moving' 'target' 'side_moving' 'MOVING_SIDE' 'targets_moving' 'BOTTOM_CENTER' @(@(18,650,190,150),@(205,650,190,150),@(392,650,190,150),@(579,650,190,150)) 'Moving side-target snapshot with its authored local rail segment.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'targets/popup' 'target_popup' 'target' 'popup' 'POPUP' 'targets_moving' 'BOTTOM_CENTER' @(@(780,650,132,150),@(910,650,132,150),@(1040,650,132,150),@(1170,650,132,150),@(1300,650,132,150)) 'Pop-up target sequence including hidden and emerging states.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'props/target_stands' 'target_stand' 'prop' 'target_stand' 'IDLE' 'props' 'BOTTOM_CENTER' @(@(25,875,118,178),@(145,875,118,178),@(265,875,118,178),@(375,875,108,178)) 'Wooden target stand.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'props/hay' 'hay_bale_support' 'prop' 'hay_bale' 'IDLE' 'props' 'BOTTOM_CENTER' @(@(490,880,100,165),@(600,880,130,165),@(735,880,95,165)) 'Hay-bale target support.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'props/signs' 'lane_marker' 'prop' 'lane_marker' 'IDLE' 'props' 'BOTTOM_CENTER' @(@(845,880,70,165),@(922,880,75,165),@(997,880,70,165),@(1072,880,68,165)) 'Lane-marker sign.'
Add-RowFrames $entries $targets 'alvos_arquearia.png' 'props/wind' 'wind_flag' 'prop' 'wind_flag' 'IDLE' 'props' 'BOTTOM_CENTER' @(@(1155,880,85,165),@(1240,880,95,165),@(1335,880,105,165)) 'Wind flag visual state.'
$targets.Dispose()

$assets = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'assets_arquearia.png'))
$arrowRows = @(
    @('arrow_up','UP',@(@(74,110,100,170),@(194,110,100,170),@(314,110,100,170))),
    @('arrow_up_left','UP_LEFT',@(@(548,110,120,170),@(670,110,120,170),@(792,110,120,170))),
    @('arrow_up_right','UP_RIGHT',@(@(1020,110,110,170),@(1140,110,110,170),@(1265,110,110,170))),
    @('arrow_fast_up','FAST_UP',@(@(74,370,100,190),@(194,370,100,190),@(314,370,100,190))),
    @('arrow_fast_up_left','FAST_UP_LEFT',@(@(548,370,120,190),@(670,370,120,190),@(792,370,120,190))),
    @('arrow_fast_up_right','FAST_UP_RIGHT',@(@(1000,370,145,190),@(1145,370,115,190),@(1260,370,155,190))),
    @('arrow_launch','LAUNCH',@(@(24,670,112,165),@(145,670,112,165),@(266,670,112,165),@(387,670,112,165)))
)
foreach ($row in $arrowRows) { Add-RowFrames $entries $assets 'assets_arquearia.png' 'arrows' $row[0] 'arrow' $row[0] $row[1] 'arrows' 'CENTER' $row[2] 'Arrow trajectory or launch frame.' }
Add-RowFrames $entries $assets 'assets_arquearia.png' 'effects/arrow_impact' 'arrow_impact' 'effect' 'arrow_impact' 'IMPACT' 'effects' 'CENTER' @(@(520,670,112,165),@(642,670,112,165),@(764,670,112,165),@(886,670,112,165)) 'Arrow impact effect.'
Add-RowFrames $entries $assets 'assets_arquearia.png' 'effects/bullseye' 'bullseye_hit' 'effect' 'bullseye' 'BULLSEYE' 'effects' 'CENTER' @(@(1015,670,85,165),@(1100,670,90,165),@(1190,670,110,165),@(1300,670,140,165)) 'Bullseye impact effect.'
Add-RowFrames $entries $assets 'assets_arquearia.png' 'effects/wood_hit' 'wood_hit' 'effect' 'wood_hit' 'IMPACT' 'effects' 'CENTER' @(@(25,915,112,138),@(146,915,112,138),@(267,915,112,138),@(388,915,112,138)) 'Wood impact effect.'
Add-RowFrames $entries $assets 'assets_arquearia.png' 'effects/stone_hit' 'stone_hit' 'effect' 'stone_hit' 'IMPACT' 'effects' 'CENTER' @(@(500,915,125,138),@(625,915,110,138),@(735,915,115,138),@(850,915,80,138)) 'Stone impact effect.'
Add-RowFrames $entries $assets 'assets_arquearia.png' 'effects/score' 'score_hit' 'effect' 'score_hit' 'SCORE' 'effects' 'CENTER' @(@(980,915,120,138),@(1100,915,100,138),@(1200,915,110,138),@(1310,915,130,138)) 'Score or reward feedback effect.'
$assets.Dispose()

$frames = [System.Collections.Generic.List[object]]::new()
foreach ($entry in $entries) {
    $size = switch ($entry.canvasGroup) {
        'zorp' { 192 }; 'master' { 192 }; 'targets_static' { 192 }; 'targets_moving' { 224 }; 'props' { 192 }; 'arrows' { 160 }; 'effects' { 160 }
        default { 192 }
    }
    $padded = Make-Canvas $entry.image $size $size $entry.anchorType
    $target = Join-Path $output $entry.file; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    $padded.image.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $frames.Add([pscustomobject]@{ file=$entry.file; source=$entry.source; category=$entry.category; subtype=$entry.subtype; state=$entry.state; frame=$entry.frame; width=$size; height=$size; anchorX=$padded.anchorX; anchorY=$padded.anchorY; contactAnchorX=$padded.anchorX; contactAnchorY=$padded.anchorY; anchorType=$entry.anchorType; canvasGroup=$entry.canvasGroup; notes=$entry.notes })
    $padded.image.Dispose(); $entry.image.Dispose()
}

# The arena is an intentionally opaque full-background art piece; it is copied separately from transparent runtime sprites.
$arenaSource = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'arena_Arquearia.png'))
$arenaTarget = Join-Path $output 'arena\archery_arena.png'; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $arenaTarget) | Out-Null
$arenaSource.Save($arenaTarget, [System.Drawing.Imaging.ImageFormat]::Png)
$frames.Add([pscustomobject]@{ file='arena/archery_arena.png'; source='arena_Arquearia.png'; category='arena'; subtype='background'; state='FULL'; frame=1; width=$arenaSource.Width; height=$arenaSource.Height; anchorX=[int]($arenaSource.Width/2); anchorY=($arenaSource.Height - 1); contactAnchorX=[int]($arenaSource.Width/2); contactAnchorY=($arenaSource.Height - 1); anchorType='BOTTOM_CENTER'; canvasGroup='arena'; notes='Full authored arena background; intentionally opaque.' })
$arenaSource.Dispose()

$manifest = [ordered]@{
    assetSet = 'archery_assets_2026'; sources = @('arena_Arquearia.png','zorp_arqueiro.png','mestre_arqueiro.png','alvos_arquearia.png','assets_arquearia.png')
    transparency = 'For sprite crops, only near-white pixels connected to the selected crop edge were made transparent. Enclosed white artwork and light sprite details remain intact.'
    cropMarginPixels = 6; frames = @($frames | Sort-Object category, subtype, file)
    uncertainCrops = @(
        [ordered]@{ source='alvos_arquearia.png'; region='moving side-target rail'; reason='The rail is continuous across the source sheet. Four local snapshots retain each target with its immediate authored support instead of inventing separation pixels.' }
    )
}
$manifestJson = $manifest | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText((Join-Path $output 'archery_assets_manifest.json'), $manifestJson, [System.Text.UTF8Encoding]::new($false))
$manifestScript = "window.ARCHERY_ASSET_MANIFEST = $manifestJson;`r`n"
[System.IO.File]::WriteAllText((Join-Path $output 'archery_assets_manifest.js'), $manifestScript, [System.Text.UTF8Encoding]::new($false))
Write-Preview @($frames) 'archery_characters_preview.png' @('zorp','master')
Write-Preview @($frames) 'archery_targets_preview.png' @('targets_static','targets_moving','props')
Write-Preview @($frames) 'archery_projectiles_preview.png' @('arrows','effects')
$counts = $frames | Group-Object category | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Count)" }
Write-Output ("Generated $($frames.Count) assets. " + ($counts -join '; '))
