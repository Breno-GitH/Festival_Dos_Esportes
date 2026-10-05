<#
  Creates the runtime-ready Escalada sprite library from the three new raw sheets.
  Crop windows were selected around visible silhouettes (never an inferred grid).
  The raw source sheets remain untouched.
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
public static class ClimbPixels {
    static bool IsNearBlack(byte[] p,int o){ return p[o]<=8 && p[o+1]<=8 && p[o+2]<=8; }
    public static void ClearEdgeConnectedBlack(Bitmap image) {
        int w=image.Width,h=image.Height; var rect=new Rectangle(0,0,w,h);
        var bits=image.LockBits(rect,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb); int stride=bits.Stride;
        var data=new byte[stride*h]; Marshal.Copy(bits.Scan0,data,0,data.Length);
        var seen=new bool[w*h]; var q=new Queue<int>();
        Action<int,int> add=(x,y)=>{ if(x<0||y<0||x>=w||y>=h)return;int i=y*w+x;if(seen[i]||!IsNearBlack(data,y*stride+x*4))return;seen[i]=true;q.Enqueue(i);};
        for(int x=0;x<w;x++){add(x,0);add(x,h-1);} for(int y=0;y<h;y++){add(0,y);add(w-1,y);}
        while(q.Count>0){int i=q.Dequeue(),x=i%w,y=i/w,o=y*stride+x*4;data[o+3]=0;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
        Marshal.Copy(data,0,bits.Scan0,data.Length); image.UnlockBits(bits);
    }
    public static void KeepDominantAndNearby(Bitmap image, int maxGap) {
        int w=image.Width,h=image.Height; var rect=new Rectangle(0,0,w,h);
        var bits=image.LockBits(rect,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb); int stride=bits.Stride;
        var data=new byte[stride*h]; Marshal.Copy(bits.Scan0,data,0,data.Length);
        var seen=new bool[w*h]; var parts=new List<List<int>>(); var boxes=new List<Rectangle>();
        for(int s=0;s<w*h;s++) { if(seen[s])continue;int sx=s%w,sy=s/w;if(data[sy*stride+sx*4+3]<=8){seen[s]=true;continue;}
            var q=new Queue<int>();var part=new List<int>();q.Enqueue(s);seen[s]=true;int l=sx,r=sx,t=sy,b=sy;
            while(q.Count>0){int i=q.Dequeue(),x=i%w,y=i/w;part.Add(i);l=Math.Min(l,x);r=Math.Max(r,x);t=Math.Min(t,y);b=Math.Max(b,y);
                for(int oy=-1;oy<=1;oy++)for(int ox=-1;ox<=1;ox++){int nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=w||ny>=h)continue;int ni=ny*w+nx;if(seen[ni]||data[ny*stride+nx*4+3]<=8)continue;seen[ni]=true;q.Enqueue(ni);}}
            parts.Add(part);boxes.Add(Rectangle.FromLTRB(l,t,r+1,b+1)); }
        int best=-1;for(int i=0;i<parts.Count;i++)if(best<0||parts[i].Count>parts[best].Count)best=i;
        if(best<0){image.UnlockBits(bits);return;} var baseBox=boxes[best];var keep=new bool[w*h];
        for(int i=0;i<parts.Count;i++){var box=boxes[i];int dx=Math.Max(0,Math.Max(baseBox.Left-box.Right,box.Left-baseBox.Right));int dy=Math.Max(0,Math.Max(baseBox.Top-box.Bottom,box.Top-baseBox.Bottom));if(i!=best&&(dx>maxGap||dy>maxGap))continue;foreach(int p in parts[i])keep[p]=true;}
        for(int y=0;y<h;y++)for(int x=0;x<w;x++){int i=y*w+x;if(!keep[i])data[y*stride+x*4+3]=0;}
        Marshal.Copy(data,0,bits.Scan0,data.Length); image.UnlockBits(bits);
    }
}
'@

$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'climb_assets'
$previewDir = Join-Path $root 'docs\climb_asset_previews'
New-Item -ItemType Directory -Force -Path $output, $previewDir | Out-Null

function Set-PixelArt([System.Drawing.Graphics]$g) {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
}

function Remove-EdgeConnectedBlack([System.Drawing.Bitmap]$image) {
    # The black canvas is background only when it connects to the crop edge.
    # This retains enclosed black outlines and character details.
    [ClimbPixels]::ClearEdgeConnectedBlack($image)
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

function New-Crop([System.Drawing.Bitmap]$sheet, [int]$x, [int]$y, [int]$w, [int]$h, [int]$margin = 6, [bool]$keepDominant = $false) {
    $window = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($window)
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g.DrawImage($sheet, [System.Drawing.Rectangle]::new(0, 0, $w, $h), [System.Drawing.Rectangle]::new($x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    Remove-EdgeConnectedBlack $window
    if ($keepDominant) { [ClimbPixels]::KeepDominantAndNearby($window, 24) }
    $bounds = Get-VisibleBounds $window
    $bounds = [System.Drawing.Rectangle]::FromLTRB(
        [Math]::Max(0, $bounds.Left - $margin), [Math]::Max(0, $bounds.Top - $margin),
        [Math]::Min($w, $bounds.Right + $margin), [Math]::Min($h, $bounds.Bottom + $margin)
    )
    $result = $window.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $window.Dispose()
    return $result
}

function Add-Sprite([System.Collections.Generic.List[object]]$entries, [System.Drawing.Bitmap]$sheet, [string]$source, [string]$file, [string]$category, [string]$subtype, [string]$state, [int]$frame, [string]$group, [string]$anchor, [int]$x, [int]$y, [int]$w, [int]$h, [string]$notes) {
    $image = New-Crop $sheet $x $y $w $h 6 ($category -eq 'obstacle')
    $entries.Add([pscustomobject]@{
        file = $file; source = $source; category = $category; subtype = $subtype; state = $state; frame = $frame
        canvasGroup = $group; anchorType = $anchor; image = $image; notes = $notes
    })
}

function Make-Canvas([System.Drawing.Bitmap]$image, [int]$width, [int]$height, [string]$anchorType) {
    $result = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $anchorX = [int][Math]::Floor($width / 2)
    $anchorY = if ($anchorType -eq 'CENTER') { [int][Math]::Floor($height / 2) } else { $height - 10 }
    $sourceAnchorY = if ($anchorType -eq 'CENTER') { [int][Math]::Floor($image.Height / 2) } else { $image.Height - 6 }
    $g = [System.Drawing.Graphics]::FromImage($result); Set-PixelArt $g
    $g.DrawImageUnscaled($image, $anchorX - [int][Math]::Floor($image.Width / 2), $anchorY - $sourceAnchorY)
    $g.Dispose()
    return [pscustomobject]@{ image = $result; anchorX = $anchorX; anchorY = $anchorY }
}

function Write-Preview([object[]]$manifestFrames, [string]$fileName, [string[]]$groups) {
    $tileW = 176; $tileH = 178; $columns = 7; $rows = 0
    foreach ($group in $groups) { $count = @($manifestFrames | Where-Object canvasGroup -eq $group).Count; if ($count) { $rows += 1 + [Math]::Ceiling($count / $columns) } }
    $preview = [System.Drawing.Bitmap]::new($tileW * $columns, [Math]::Max(90, 38 + $rows * $tileH), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($preview); Set-PixelArt $g; $g.Clear([System.Drawing.Color]::FromArgb(255, 8, 17, 30))
    $title = [System.Drawing.Font]::new('Consolas', 15, [System.Drawing.FontStyle]::Bold)
    $label = [System.Drawing.Font]::new('Consolas', 8, [System.Drawing.FontStyle]::Bold)
    $small = [System.Drawing.Font]::new('Consolas', 7)
    $g.DrawString('ESCALADA — '+$fileName, $title, [System.Drawing.Brushes]::Aquamarine, 8, 7)
    $rowY = 34
    foreach ($group in $groups) {
        $frames = @($manifestFrames | Where-Object canvasGroup -eq $group | Sort-Object file)
        if (!$frames.Count) { continue }
        $g.DrawString($group.ToUpper(), $label, [System.Drawing.Brushes]::Gold, 5, $rowY); $rowY += 15
        for ($i = 0; $i -lt $frames.Count; $i++) {
            $x = ($i % $columns) * $tileW; $y = $rowY + [Math]::Floor($i / $columns) * $tileH
            for ($cy = $y; $cy -lt $y + 127; $cy += 10) { for ($cx = $x + 4; $cx -lt $x + $tileW - 4; $cx += 10) {
                $brush = if (((($cx - $x) / 10 + [Math]::Floor(($cy - $y) / 10)) % 2) -eq 0) { [System.Drawing.Brushes]::DimGray } else { [System.Drawing.Brushes]::Gray }
                $g.FillRectangle($brush, $cx, $cy, 10, 10)
            }}
            $image = [System.Drawing.Bitmap]::FromFile((Join-Path $output $frames[$i].file))
            $scale = [Math]::Min(1.0, [Math]::Min(132 / $image.Width, 112 / $image.Height))
            $drawW = [int]($image.Width * $scale); $drawH = [int]($image.Height * $scale)
            $g.DrawImage($image, $x + [int](($tileW - $drawW) / 2), $y + 4, $drawW, $drawH)
            $g.DrawString(([System.IO.Path]::GetFileName($frames[$i].file)), $small, [System.Drawing.Brushes]::White, $x + 4, $y + 132)
            $image.Dispose()
        }
        $rowY += [Math]::Ceiling($frames.Count / $columns) * $tileH + 3
    }
    $preview.Save((Join-Path $previewDir $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
    $small.Dispose(); $label.Dispose(); $title.Dispose(); $g.Dispose(); $preview.Dispose()
}

$entries = [System.Collections.Generic.List[object]]::new()

# Zorp: selected individual silhouettes, ordered by source rows. The game shows him
# mostly from behind, so back-facing climb poses are explicitly named and prioritized.
$zorp = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'escalada_zorp.png'))
$zorpFrames = @(
    @('zorp/idle_hang/zorp_climb_idle_hang_01.png','idle_hang','IDLE_HANG',1,30,42,145,272),
    @('zorp/idle_hang/zorp_climb_idle_hang_02.png','idle_hang','IDLE_HANG',2,190,42,145,272),
    @('zorp/climb_alternate/zorp_climb_alternate_01.png','climb_alternate','CLIMB',1,365,42,145,272),
    @('zorp/climb_alternate/zorp_climb_alternate_02.png','climb_alternate','CLIMB',2,520,42,145,272),
    @('zorp/climb_alternate/zorp_climb_alternate_03.png','climb_alternate','CLIMB',3,650,42,150,272),
    @('zorp/climb_alternate/zorp_climb_alternate_04.png','climb_alternate','CLIMB',4,795,42,145,272),
    @('zorp/reach/zorp_climb_reach_01.png','reach','REACH',1,920,42,145,272),
    @('zorp/push_up/zorp_climb_push_up_01.png','push_up','PUSH_UP',1,1065,38,175,280),
    @('zorp/reach/zorp_climb_reach_left_01.png','reach_left','REACH_LEFT',1,20,355,200,275),
    @('zorp/reach/zorp_climb_reach_right_01.png','reach_right','REACH_RIGHT',1,210,355,190,275),
    @('zorp/slip/zorp_climb_slip_01.png','slip','SLIP',1,385,355,200,275),
    @('zorp/push_up/zorp_climb_push_up_02.png','push_up','PUSH_UP',2,610,355,190,275),
    @('zorp/push_up/zorp_climb_push_up_03.png','push_up','PUSH_UP',3,790,355,200,275),
    @('zorp/push_up/zorp_climb_push_up_04.png','push_up','PUSH_UP',4,1030,350,220,280),
    @('zorp/fall/zorp_climb_fall_01.png','fall','FALL',1,20,665,185,285),
    @('zorp/fall/zorp_climb_fall_02.png','fall','FALL',2,235,665,190,285),
    @('zorp/stun/zorp_climb_stun_01.png','stun','STUN',1,1015,665,220,285),
    @('zorp/slip/zorp_climb_slip_02.png','slip','SLIP',2,50,955,250,280),
    @('zorp/fall/zorp_climb_fall_05.png','fall','FALL',5,335,955,250,280),
    @('zorp/victory/zorp_climb_victory_01.png','victory','VICTORY',1,670,955,220,280),
    @('zorp/victory/zorp_climb_victory_02.png','victory','VICTORY',2,915,955,220,280)
)
foreach ($f in $zorpFrames) { Add-Sprite $entries $zorp 'escalada_zorp.png' $f[0] 'zorp' $f[1] $f[2] $f[3] 'climb_zorp' 'BASE' $f[4] $f[5] $f[6] $f[7] 'Back-facing climbing frame isolated from the supplied source sheet.' }
$zorp.Dispose()

# Holds/effects: every visible variant is kept. State labels are visual labels, not new gameplay rules.
$holds = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'pedras_efeitos.png'))
$holdRows = @(
    @('pedra_normal','normal',160, @(@(35,145,185,230),@(235,145,185,230),@(435,130,175,245))),
    @('pedra_musgo','moss',145, @(@(640,135,190,245),@(830,135,190,245),@(1025,120,190,270))),
    @('pedra_fragil','fragile',440, @(@(35,425,185,230),@(235,425,185,230),@(435,415,185,245))),
    @('pedra_gelo','ice',425, @(@(630,415,200,245),@(825,415,200,245),@(1020,400,210,275))),
    @('pedra_bonus','bonus',660, @(@(25,650,205,250),@(225,650,205,250),@(425,650,205,250))),
    @('pedra_perigosa','danger',660, @(@(660,650,190,250),@(840,650,190,250),@(1015,640,220,270))),
    @('pedra_escura','dark',930, @(@(35,920,185,245),@(235,920,185,245),@(435,910,185,255))),
    @('pedra_brilhante','shimmer',915, @(@(620,900,220,290),@(820,900,220,290),@(1005,885,240,305)))
)
foreach ($row in $holdRows) { $frame = 1; foreach ($box in $row[3]) {
    Add-Sprite $entries $holds 'pedras_efeitos.png' ('pedras/'+$row[0]+'_'+$frame.ToString('00')+'.png') 'hold' $row[1] ($row[0].ToUpper()) $frame 'climb_holds' 'CENTER' $box[0] $box[1] $box[2] $box[3] 'Climbing hold/effect visual; its gameplay mapping remains controlled by the existing hold type.'
    $frame++
}}
$holds.Dispose()

# Extra climbing props: all sheet rows are exported, including impact and warning artwork.
$extras = [System.Drawing.Bitmap]::FromFile((Join-Path $root 'assets_escalada.png'))
$extraRows = @(
    @('boulder','hazard_boulder',15,@(@(75,10,220,175),@(280,10,220,175),@(470,10,220,175),@(665,10,220,175),@(875,0,330,200))),
    @('coconut','hazard_coconut',190,@(@(85,190,210,145),@(285,190,210,145),@(480,190,210,145),@(680,190,210,145),@(890,185,300,150))),
    @('crate','hazard_crate',340,@(@(80,340,210,140),@(280,340,210,140),@(480,340,210,140),@(675,340,210,140),@(885,330,310,150))),
    @('planter','hazard_planter',485,@(@(80,485,215,145),@(285,485,215,145),@(485,485,215,145),@(680,485,215,145),@(890,475,300,155))),
    @('bucket','hazard_bucket',635,@(@(80,635,210,150),@(285,635,210,150),@(485,635,210,150),@(680,635,210,150),@(890,625,300,160))),
    @('boot','hazard_boot',785,@(@(75,785,215,130),@(280,785,215,130),@(480,785,215,130),@(675,785,215,130),@(885,775,300,140))),
    @('log','hazard_log',1075,@(@(75,1075,215,90),@(280,1075,215,90),@(480,1075,215,90),@(675,1075,215,90),@(880,1065,315,100)))
)
foreach ($row in $extraRows) { $frame = 1; foreach ($box in $row[3]) {
    Add-Sprite $entries $extras 'assets_escalada.png' ('obstaculos/'+$row[0]+'/'+$row[1]+'_'+$frame.ToString('00')+'.png') 'obstacle' $row[0] 'HAZARD_VISUAL' $frame 'climb_obstacles' 'CENTER' $box[0] $box[1] $box[2] $box[3] 'Decorative/hazard sprite from the supplied climbing prop sheet.'
    $frame++
}}
$warnings = @(@('efeitos/climb_warning_01.png','warning',80,1190,110,80),@('efeitos/climb_warning_02.png','warning',210,1190,110,80),@('efeitos/climb_warning_03.png','warning',340,1190,110,80),@('efeitos/climb_dust_01.png','dust',455,1165,165,105),@('efeitos/climb_dust_02.png','dust',615,1165,190,105),@('efeitos/climb_dust_03.png','dust',800,1165,205,105),@('efeitos/climb_dust_04.png','dust',995,1165,230,105))
$frame = 1; foreach ($fx in $warnings) { Add-Sprite $entries $extras 'assets_escalada.png' $fx[0] 'effect' $fx[1] ($fx[1].ToUpper()) $frame 'climb_effects' 'CENTER' $fx[2] $fx[3] $fx[4] $fx[5] 'Warning or impact effect from the supplied climbing prop sheet.'; $frame++ }
$extras.Dispose()

$frames = [System.Collections.Generic.List[object]]::new()
foreach ($entry in $entries) {
    $size = switch ($entry.canvasGroup) { 'climb_zorp' { 288 }; 'climb_holds' { 160 }; 'climb_obstacles' { 224 }; 'climb_effects' { 224 } }
    $padded = Make-Canvas $entry.image $size $size $entry.anchorType
    $target = Join-Path $output $entry.file; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    $padded.image.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $frames.Add([pscustomobject]@{ file=$entry.file; source=$entry.source; category=$entry.category; subtype=$entry.subtype; state=$entry.state; frame=$entry.frame; width=$size; height=$size; anchorX=$padded.anchorX; anchorY=$padded.anchorY; contactAnchorX=$padded.anchorX; contactAnchorY=$padded.anchorY; anchorType=$entry.anchorType; canvasGroup=$entry.canvasGroup; notes=$entry.notes })
    $padded.image.Dispose(); $entry.image.Dispose()
}

$manifest = [ordered]@{
    assetSet = 'climb_assets_2026'; sources = @('escalada_zorp.png','pedras_efeitos.png','assets_escalada.png')
    transparency = 'Only black pixels connected to a selected crop boundary were made transparent; internal black outlines/details are retained.'
    cropMarginPixels = 6; frames = @($frames | Sort-Object category, subtype, file); uncertainCrops = @(
        [ordered]@{ source='escalada_zorp.png'; region='third source row, center/right fall poses'; reason='The two silhouettes touch neighboring artwork in the source; excluded rather than inventing missing pixels or exporting foreign fragments.' },
        [ordered]@{ source='assets_escalada.png'; region='spiked-ball row'; reason='The ball frames overlap the log row in the supplied sheet; excluded until an isolated source is available.' }
    )
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $output 'climb_assets_manifest.json')
Write-Preview @($frames) 'climb_zorp_preview.png' @('climb_zorp')
Write-Preview @($frames) 'climb_holds_preview.png' @('climb_holds')
Write-Preview @($frames) 'climb_obstacles_preview.png' @('climb_obstacles','climb_effects')
$counts = $frames | Group-Object category | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Count)" }
Write-Output ("Generated $($frames.Count) sprites. " + ($counts -join '; '))
