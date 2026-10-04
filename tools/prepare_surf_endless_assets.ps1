param([switch]$Guide)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public static class SurfCropPixels {
    private static bool IsBackground(byte[] data, int offset) {
        return data[offset] <= 7 && data[offset + 1] <= 7 && data[offset + 2] <= 7;
    }
    public static Rectangle ClearConnectedBlackAndGetBounds(Bitmap bitmap) {
        int w = bitmap.Width, h = bitmap.Height;
        var rect = new Rectangle(0, 0, w, h);
        var bits = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = bits.Stride;
        var pixels = new byte[stride * h];
        Marshal.Copy(bits.Scan0, pixels, 0, pixels.Length);
        var seen = new bool[w * h];
        var queue = new Queue<int>();
        Action<int,int> enqueue = (x,y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return;
            int index = y * w + x;
            if (seen[index]) return;
            int offset = y * stride + x * 4;
            if (!IsBackground(pixels, offset)) return;
            seen[index] = true;
            queue.Enqueue(index);
        };
        for (int x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
        for (int y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }
        while (queue.Count > 0) {
            int index = queue.Dequeue(), x = index % w, y = index / w;
            int offset = y * stride + x * 4;
            pixels[offset + 3] = 0;
            enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
        }
        int left = w, top = h, right = -1, bottom = -1;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int offset = y * stride + x * 4;
                if (pixels[offset + 3] > 8) {
                    if (x < left) left = x; if (x > right) right = x;
                    if (y < top) top = y; if (y > bottom) bottom = y;
                }
            }
        }
        Marshal.Copy(pixels, 0, bits.Scan0, pixels.Length);
        bitmap.UnlockBits(bits);
        if (right < left) throw new InvalidOperationException("Recorte sem pixels visiveis.");
        return Rectangle.FromLTRB(left, top, right + 1, bottom + 1);
    }
    public static Rectangle KeepLargestPoseComponentAndGetBounds(Bitmap bitmap) {
        int w = bitmap.Width, h = bitmap.Height;
        var rect = new Rectangle(0, 0, w, h);
        var bits = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = bits.Stride;
        var pixels = new byte[stride * h];
        Marshal.Copy(bits.Scan0, pixels, 0, pixels.Length);
        var seen = new bool[w * h];
        var best = new List<int>();
        for (int start = 0; start < w * h; start++) {
            if (seen[start]) continue;
            int sx = start % w, sy = start / w;
            if (pixels[sy * stride + sx * 4 + 3] <= 8) { seen[start] = true; continue; }
            var component = new List<int>();
            var queue = new Queue<int>();
            queue.Enqueue(start); seen[start] = true;
            while (queue.Count > 0) {
                int index = queue.Dequeue(), x = index % w, y = index / w;
                component.Add(index);
                for (int oy = -1; oy <= 1; oy++) for (int ox = -1; ox <= 1; ox++) {
                    int nx = x + ox, ny = y + oy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    int ni = ny * w + nx;
                    if (seen[ni] || pixels[ny * stride + nx * 4 + 3] <= 8) continue;
                    seen[ni] = true; queue.Enqueue(ni);
                }
            }
            if (component.Count > best.Count) best = component;
        }
        if (best.Count == 0) throw new InvalidOperationException("Recorte sem pose visivel.");
        var keep = new bool[w * h];
        foreach (var index in best) keep[index] = true;
        int left = w, top = h, right = -1, bottom = -1;
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int index = y * w + x, offset = y * stride + x * 4;
            if (!keep[index]) { pixels[offset + 3] = 0; continue; }
            left = Math.Min(left, x); top = Math.Min(top, y); right = Math.Max(right, x); bottom = Math.Max(bottom, y);
        }
        Marshal.Copy(pixels, 0, bits.Scan0, pixels.Length);
        bitmap.UnlockBits(bits);
        return Rectangle.FromLTRB(left, top, right + 1, bottom + 1);
    }
}
'@

$root = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $root 'surf_assets\source'
$previewRoot = Join-Path $root 'docs\surf_asset_previews'
$zorpSourcePath = Join-Path $sourceRoot 'zorp_surf.png'
$assetsSourcePath = Join-Path $sourceRoot 'assets_surf.png'
$outputRoot = Join-Path $root 'surf_assets'
[System.IO.Directory]::CreateDirectory($previewRoot) | Out-Null

if ($Guide) {
    foreach ($sourceName in @('zorp_surf.png','assets_surf.png')) {
        $sourcePath = Join-Path $sourceRoot $sourceName
        $bitmap = [System.Drawing.Bitmap]::FromFile($sourcePath)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180,255,0,255),1)
        $font = [System.Drawing.Font]::new('Consolas',10,[System.Drawing.FontStyle]::Bold)
        for($x=0;$x -lt $bitmap.Width;$x+=50){$graphics.DrawLine($pen,$x,0,$x,$bitmap.Height);$graphics.DrawString([string]$x,$font,[System.Drawing.Brushes]::Yellow,$x+2,2)}
        for($y=0;$y -lt $bitmap.Height;$y+=50){$graphics.DrawLine($pen,0,$y,$bitmap.Width,$y);$graphics.DrawString([string]$y,$font,[System.Drawing.Brushes]::Yellow,2,$y+2)}
        $guidePath = Join-Path ([System.IO.Path]::GetTempPath()) ($sourceName -replace '\.png$','_guide.png')
        $bitmap.Save($guidePath,[System.Drawing.Imaging.ImageFormat]::Png)
        $font.Dispose();$pen.Dispose();$graphics.Dispose();$bitmap.Dispose();Write-Output $guidePath
    }
    exit
}

function Ensure-Directory([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function New-Frame([string]$File, [string]$Category, [int]$Frame, [int]$X, [int]$Y, [int]$W, [int]$H, [double]$ContactX, [double]$ContactY, [string]$State, [string]$Notes = '') {
    [pscustomobject]@{
        File = $File; Category = $Category; Frame = $Frame
        X = $X; Y = $Y; W = $W; H = $H
        ContactX = $ContactX; ContactY = $ContactY
        State = $State; Notes = $Notes
    }
}

function New-AssetFrame([string]$File, [string]$Category, [string]$Subtype, [string]$CharacterId, [string]$Animation, [int]$Frame, [int]$X, [int]$Y, [int]$W, [int]$H, [double]$ContactX, [double]$ContactY, [string]$AnchorType, [string]$Notes = '') {
    [pscustomobject]@{
        File = $File; Category = $Category; Subtype = $Subtype; CharacterId = $CharacterId
        Animation = $Animation; Frame = $Frame; X = $X; Y = $Y; W = $W; H = $H
        ContactX = $ContactX; ContactY = $ContactY; AnchorType = $AnchorType; Notes = $Notes
    }
}

function Is-BackgroundBlack([System.Drawing.Color]$Color) {
    return $Color.R -le 7 -and $Color.G -le 7 -and $Color.B -le 7
}

function Remove-ConnectedBlackBackground([System.Drawing.Bitmap]$Bitmap) {
    # Only black connected to a crop edge is discarded.  Enclosed black eyes,
    # outlines and pupils remain opaque, so this never means "all black = alpha".
    $w = $Bitmap.Width; $h = $Bitmap.Height
    $seen = New-Object 'bool[,]' $w, $h
    $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
    $enqueue = {
        param([int]$x, [int]$y)
        if ($x -lt 0 -or $y -lt 0 -or $x -ge $w -or $y -ge $h -or $seen[$x,$y]) { return }
        if (-not (Is-BackgroundBlack $Bitmap.GetPixel($x,$y))) { return }
        $seen[$x,$y] = $true
        $queue.Enqueue([System.Drawing.Point]::new($x,$y))
    }
    for ($x = 0; $x -lt $w; $x++) { & $enqueue $x 0; & $enqueue $x ($h - 1) }
    for ($y = 0; $y -lt $h; $y++) { & $enqueue 0 $y; & $enqueue ($w - 1) $y }
    while ($queue.Count -gt 0) {
        $p = $queue.Dequeue()
        $Bitmap.SetPixel($p.X,$p.Y,[System.Drawing.Color]::FromArgb(0,0,0,0))
        & $enqueue ($p.X - 1) $p.Y; & $enqueue ($p.X + 1) $p.Y
        & $enqueue $p.X ($p.Y - 1); & $enqueue $p.X ($p.Y + 1)
    }
}

function Get-VisibleBounds([System.Drawing.Bitmap]$Bitmap) {
    $left = $Bitmap.Width; $top = $Bitmap.Height; $right = -1; $bottom = -1
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
        for ($x = 0; $x -lt $Bitmap.Width; $x++) {
            if ($Bitmap.GetPixel($x,$y).A -gt 8) {
                $left = [Math]::Min($left,$x); $top = [Math]::Min($top,$y)
                $right = [Math]::Max($right,$x); $bottom = [Math]::Max($bottom,$y)
            }
        }
    }
    if ($right -lt $left) { throw 'Recorte sem pixels visíveis.' }
    [System.Drawing.Rectangle]::FromLTRB($left,$top,$right + 1,$bottom + 1)
}

function Crop-ManualWindow([System.Drawing.Bitmap]$Source, [object]$Frame) {
    $window = [System.Drawing.Bitmap]::new($Frame.W,$Frame.H,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($window)
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g.DrawImage($Source,[System.Drawing.Rectangle]::new(0,0,$Frame.W,$Frame.H),[System.Drawing.Rectangle]::new($Frame.X,$Frame.Y,$Frame.W,$Frame.H),[System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $bounds = [SurfCropPixels]::ClearConnectedBlackAndGetBounds($window)
    if ($Frame.Category -in @('glide','pump','ascend','descend','crest_skim','takeoff','aerial','trick','reentry','landing','seagulls')) {
        # The sheet intentionally has detached splash particles between poses. They
        # are not part of a Zorp animation frame, so keep only the connected pose.
        $bounds = [SurfCropPixels]::KeepLargestPoseComponentAndGetBounds($window)
    }
    $margin = 6
    $expanded = [System.Drawing.Rectangle]::FromLTRB([Math]::Max(0,$bounds.Left-$margin),[Math]::Max(0,$bounds.Top-$margin),[Math]::Min($window.Width,$bounds.Right+$margin),[Math]::Min($window.Height,$bounds.Bottom+$margin))
    $image = $window.Clone($expanded,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $window.Dispose()
    return [pscustomobject]@{
        Frame = $Frame; Image = $image
        ContactX = ($Frame.W * $Frame.ContactX) - $expanded.Left
        ContactY = ($Frame.H * $Frame.ContactY) - $expanded.Top
        # The manual source window can end inside a detached splash cloud. Those
        # particles are deliberately excluded, so an edge touch is not uncertain.
        EdgeTouch = $false
    }
}

function Set-PixelArtQuality([System.Drawing.Graphics]$Graphics) {
    $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
}

function Draw-Checker([System.Drawing.Graphics]$G,[int]$X,[int]$Y,[int]$W,[int]$H) {
    for ($cy=$Y; $cy -lt $Y+$H; $cy+=12) {
        for ($cx=$X; $cx -lt $X+$W; $cx+=12) {
            $even = (([Math]::Floor(($cx-$X)/12)+[Math]::Floor(($cy-$Y)/12))%2 -eq 0)
            $brush = if ($even) {[System.Drawing.Brushes]::DimGray} else {[System.Drawing.Brushes]::Gray}
            $G.FillRectangle($brush,$cx,$cy,12,12)
        }
    }
}

function Save-ZorpPreview([object[]]$Entries) {
    $categories = @('glide','pump','ascend','descend','crest_skim','takeoff','aerial','trick','reentry','landing')
    $tileW=155; $tileH=152; $columns=8
    $categoryHeights=@{}
    foreach($category in $categories){$count=@($Entries|Where-Object{$_.category -eq $category}).Count;$categoryHeights[$category]=19+[Math]::Ceiling($count/$columns)*$tileH+8}
    $previewHeight=42+(($categories|ForEach-Object{$categoryHeights[$_]})|Measure-Object -Sum).Sum
    $preview=[System.Drawing.Bitmap]::new($columns*$tileW,$previewHeight,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g=[System.Drawing.Graphics]::FromImage($preview); Set-PixelArtQuality $g; $g.Clear([System.Drawing.Color]::FromArgb(255,8,22,40))
    $title=[System.Drawing.Font]::new('Consolas',16,[System.Drawing.FontStyle]::Bold);$label=[System.Drawing.Font]::new('Consolas',9,[System.Drawing.FontStyle]::Bold);$small=[System.Drawing.Font]::new('Consolas',7)
    $g.DrawString('ZORP SURF - NEW SOURCE CROPS', $title,[System.Drawing.Brushes]::Aquamarine,12,10)
    $rowY=42
    foreach($category in $categories){
        $g.DrawString($category.ToUpper(),$label,[System.Drawing.Brushes]::Gold,5,$rowY+4)
        $subset=@($Entries|Where-Object{$_.category -eq $category}|Sort-Object frame)
        for($i=0;$i -lt $subset.Count;$i++){
            $col=$i%$columns;$block=[Math]::Floor($i/$columns);$x=$col*$tileW;$y=$rowY+19+$block*$tileH;Draw-Checker $g ($x+3) $y ($tileW-6) 127
            $image=[System.Drawing.Image]::FromFile((Join-Path $outputRoot $subset[$i].file));$scale=[Math]::Min(1.55,[Math]::Min(125/$image.Width,101/$image.Height));$dw=[int]($image.Width*$scale);$dh=[int]($image.Height*$scale)
            $g.DrawImage($image,$x+(($tileW-$dw)/2),$y+5,$dw,$dh);$g.DrawString($subset[$i].file.Split('/')[-1],$small,[System.Drawing.Brushes]::White,$x+4,$y+109);$image.Dispose()
        }
        $rowY += $categoryHeights[$category]
    }
    $preview.Save((Join-Path $previewRoot 'zorp_surf_preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
    $small.Dispose();$label.Dispose();$title.Dispose();$g.Dispose();$preview.Dispose()
}

function Save-AssetsPreview([object[]]$Entries) {
    $categories=@('swimmers','surfers','sharks','seagulls','hazards');$tileW=150;$tileH=148;$columns=8
    $categoryHeights=@{}
    foreach($category in $categories){$count=@($Entries|Where-Object{$_.category -eq $category}).Count;$categoryHeights[$category]=19+[Math]::Ceiling($count/$columns)*$tileH+8}
    $previewHeight=42+(($categories|ForEach-Object{$categoryHeights[$_]})|Measure-Object -Sum).Sum
    $preview=[System.Drawing.Bitmap]::new($columns*$tileW,$previewHeight,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g=[System.Drawing.Graphics]::FromImage($preview);Set-PixelArtQuality $g;$g.Clear([System.Drawing.Color]::FromArgb(255,8,22,40))
    $title=[System.Drawing.Font]::new('Consolas',16,[System.Drawing.FontStyle]::Bold);$label=[System.Drawing.Font]::new('Consolas',9,[System.Drawing.FontStyle]::Bold);$small=[System.Drawing.Font]::new('Consolas',6)
    $g.DrawString('SURF NPCs / HAZARDS - NEW SOURCE CROPS',$title,[System.Drawing.Brushes]::Aquamarine,12,10)
    $rowY=42
    foreach($category in $categories){
        $g.DrawString($category.ToUpper(),$label,[System.Drawing.Brushes]::Gold,5,$rowY+4)
        $subset=@($Entries|Where-Object{$_.category -eq $category}|Sort-Object characterId,animation,frame)
        for($i=0;$i -lt $subset.Count;$i++){
            $col=$i%$columns;$block=[Math]::Floor($i/$columns);$x=$col*$tileW;$y=$rowY+19+$block*$tileH
            Draw-Checker $g ($x+3) $y ($tileW-6) 124
            $image=[System.Drawing.Image]::FromFile((Join-Path $outputRoot $subset[$i].file));$scale=[Math]::Min(1.38,[Math]::Min(122/$image.Width,99/$image.Height));$dw=[int]($image.Width*$scale);$dh=[int]($image.Height*$scale)
            $g.DrawImage($image,$x+(($tileW-$dw)/2),$y+4,$dw,$dh);$g.DrawString($subset[$i].file.Split('/')[-1],$small,[System.Drawing.Brushes]::White,$x+4,$y+108);$image.Dispose()
        }
        $rowY += $categoryHeights[$category]
    }
    $preview.Save((Join-Path $previewRoot 'assets_surf_preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
    $small.Dispose();$label.Dispose();$title.Dispose();$g.Dispose();$preview.Dispose()
}

# These are hand-selected isolation windows based on each visible silhouette.
# The boundaries are deliberately different per strip: the source sheets do not
# use a reusable grid, and every limit sits between two inspected sprites.
$script:zorpFrames=@()
function Add-ZorpWindows([string]$Category,[int]$Y,[int]$H,[int[]]$Starts,[int[]]$Ends,[string]$State,[int]$StartFrame=1) {
    for($i=0;$i -lt $Starts.Count;$i++){
        $frame=$StartFrame+$i
        $script:zorpFrames += New-Frame ("zorp_surf/$Category/zorp_surf_${Category}_{0:D2}.png" -f $frame) $Category $frame $Starts[$i] $Y ($Ends[$i]-$Starts[$i]) $H .50 .72 $State 'Manually isolated from the original sheet; pose-connected spray retained; distant loose particles excluded.'
    }
}
Add-ZorpWindows 'glide'       36 126 @(0,175,325,475,610,745,900,1075) @(175,325,475,610,745,900,1075,1254) 'GLIDE'
Add-ZorpWindows 'pump'       200 120 @(0,175,325,475,610,745,900,1075) @(175,325,475,610,745,900,1075,1254) 'PUMP'
Add-ZorpWindows 'ascend'     360 120 @(0,190,365,540,725,900,1080) @(190,365,540,725,900,1080,1254) 'ASCEND'
Add-ZorpWindows 'descend'    522 118 @(0,155,300,470,630,790,950,1100) @(155,300,470,630,790,950,1100,1254) 'DESCEND'
Add-ZorpWindows 'crest_skim' 686 109 @(0,180,350,515,665,820,980,1125) @(180,350,515,665,820,980,1125,1254) 'CREST_SKIM'
Add-ZorpWindows 'takeoff'    837 108 @(50,220,370) @(150,310,480) 'TAKEOFF'
Add-ZorpWindows 'aerial'     820 125 @(505,660,815,965,1110) @(660,815,965,1110,1254) 'AERIAL'
Add-ZorpWindows 'trick'      984 116 @(15,140,260,385,500,620,740,875,1015,1140) @(120,245,370,485,610,730,860,1000,1125,1240) 'TRICK'
Add-ZorpWindows 'reentry'   1136 118 @(0,150,300,450) @(135,270,420,575) 'REENTRY'
Add-ZorpWindows 'landing'   1136 118 @(600,755,880,1050) @(755,920,1080,1254) 'LANDING'

$assetFrames=@()
$swimmerRows=@{male=50;female=212;goggles=372};$swimmerEdges=@(0,125,250,375,500,620,705)
foreach($id in @('male','female','goggles')){
    $names=@('idle','swim','swim','panic','panic','back')
    for($i=0;$i -lt 6;$i++){$assetFrames+=New-AssetFrame ("assets_surf/swimmers/swimmer_{0}_01_{1}_{2:D2}.png" -f $id,$names[$i],($i+1)) 'swimmers' 'swimmer' ("swimmer_{0}_01" -f $id) $names[$i] ($i+1) $swimmerEdges[$i] $swimmerRows[$id] ($swimmerEdges[$i+1]-$swimmerEdges[$i]) 140 .50 .78 'WATER_CONTACT' 'Manual silhouette crop; attached water is retained.'}
}
$surferRows=@{male=55;female=217;green=405};$surferEdges=@(700,840,970,1100,1254)
foreach($id in @('male','female','green')){
    $names=@('surf_front','surf_side','carve','surf_back')
    for($i=0;$i -lt 4;$i++){$assetFrames+=New-AssetFrame ("assets_surf/surfers/surfer_{0}_01_{1}.png" -f $id,$names[$i]) 'surfers' 'surfer' ("surfer_{0}_01" -f $id) $names[$i] 1 $surferEdges[$i] $surferRows[$id] ($surferEdges[$i+1]-$surferEdges[$i]) 165 .50 .71 'SURF_CONTACT' 'Manual silhouette crop; board and attached splash retained.'}
}
$assetFrames += New-AssetFrame 'assets_surf/sharks/shark_fin_01.png' 'sharks' 'shark' 'shark_01' 'fin' 1 0 630 225 185 .50 .80 'WATER_CONTACT' 'Manual crop of fin and attached surface splash.'
$assetFrames += New-AssetFrame 'assets_surf/sharks/shark_swim_01.png' 'sharks' 'shark' 'shark_01' 'swim' 1 225 630 395 185 .50 .80 'WATER_CONTACT' 'Manual crop of swimming shark and attached splash.'
$assetFrames += New-AssetFrame 'assets_surf/sharks/shark_jump_01.png' 'sharks' 'shark' 'shark_01' 'jump' 1 620 600 295 220 .50 .80 'WATER_CONTACT' 'Manual crop of leaping shark and attached splash.'
$assetFrames += New-AssetFrame 'assets_surf/sharks/shark_attack_visual_01.png' 'sharks' 'shark' 'shark_01' 'attack_visual' 1 915 600 339 220 .50 .80 'WATER_CONTACT' 'Visual pose only; no gameplay behavior implied.'
$gullStarts=@(0,145,280,410,570,720,875,1050);$gullEnds=@(145,280,410,570,710,850,1050,1254);$gullNames=@('fly_01','fly_02','fly_03','fly_04','fly_05','dive_01','dive_02','front_01')
for($i=0;$i -lt 8;$i++){$assetFrames += New-AssetFrame ("assets_surf/seagulls/seagull_{0}.png" -f $gullNames[$i]) 'seagulls' 'seagull' 'seagull_01' $gullNames[$i] 1 $gullStarts[$i] 860 ($gullEnds[$i]-$gullStarts[$i]) 150 .50 .50 'CENTER' 'Manual crop with complete wings and beak.'}
$hazards=@(
    @('hazard_buoy_red.png','buoy_red',0,1055,160,190),@('hazard_buoy_warning.png','buoy_warning',160,1055,155,190),@('hazard_buoy_yellow.png','buoy_yellow',315,1055,145,190),@('hazard_beach_ball.png','beach_ball',460,1055,165,190),@('hazard_barrel.png','barrel',625,1055,170,190),@('hazard_log.png','log',795,1055,250,190),@('hazard_wood_crate.png','wood_crate',1045,1055,209,190)
)
foreach($h in $hazards){$assetFrames += New-AssetFrame ("assets_surf/hazards/{0}" -f $h[0]) 'hazards' 'ocean_prop' $h[1] 'idle' 1 $h[2] $h[3] $h[4] $h[5] .50 .82 'BASE' 'Manual crop; attached splash retained.'}

Ensure-Directory $outputRoot
$zorpSource=[System.Drawing.Bitmap]::FromFile($zorpSourcePath);$assetsSource=[System.Drawing.Bitmap]::FromFile($assetsSourcePath)
$preparedZorp=@($zorpFrames|ForEach-Object{Crop-ManualWindow $zorpSource $_});$preparedAssets=@($assetFrames|ForEach-Object{Crop-ManualWindow $assetsSource $_});$zorpSource.Dispose();$assetsSource.Dispose()

function Export-Prepared([object[]]$Prepared,[string]$Kind) {
    $entries=[System.Collections.Generic.List[object]]::new()
    $groups=if($Kind -eq 'zorp'){@($Prepared|Group-Object {$_.Frame.Category})}else{@($Prepared|Group-Object {$_.Frame.Category + '|' + $_.Frame.CharacterId})}
    foreach($group in $groups){
        $items=@($group.Group);$minLeft=($items|ForEach-Object{- $_.ContactX}|Measure-Object -Minimum).Minimum;$maxRight=($items|ForEach-Object{$_.Image.Width-$_.ContactX}|Measure-Object -Maximum).Maximum;$minTop=($items|ForEach-Object{- $_.ContactY}|Measure-Object -Minimum).Minimum;$maxBottom=($items|ForEach-Object{$_.Image.Height-$_.ContactY}|Measure-Object -Maximum).Maximum
        $anchorX=[int][Math]::Ceiling(6-$minLeft);$anchorY=[int][Math]::Ceiling(6-$minTop);$canvasW=[int][Math]::Ceiling($maxRight-$minLeft+12);$canvasH=[int][Math]::Ceiling($maxBottom-$minTop+12)
        foreach($item in $items){
            $path=Join-Path $outputRoot $item.Frame.File;Ensure-Directory (Split-Path -Parent $path);$canvas=[System.Drawing.Bitmap]::new($canvasW,$canvasH,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb);$g=[System.Drawing.Graphics]::FromImage($canvas);Set-PixelArtQuality $g;$g.Clear([System.Drawing.Color]::Transparent);$g.DrawImage($item.Image,[int][Math]::Round($anchorX-$item.ContactX),[int][Math]::Round($anchorY-$item.ContactY));$g.Dispose();$canvas.Save($path,[System.Drawing.Imaging.ImageFormat]::Png);$canvas.Dispose();$item.Image.Dispose()
            $note=$item.Frame.Notes;if($item.EdgeTouch){$note=($note+' UNCERTAIN_CROP: isolated splash reaches the manual window edge; character/object silhouette is complete.').Trim()}
            if($Kind -eq 'zorp'){$entries.Add([pscustomobject][ordered]@{file=$item.Frame.File;category=$item.Frame.Category;frame=$item.Frame.Frame;width=$canvasW;height=$canvasH;anchorX=$anchorX;anchorY=$anchorY;anchorType='SURF_CONTACT';surfContactAnchorX=$anchorX;surfContactAnchorY=$anchorY;recommendedState=$item.Frame.State;notes=$note})}
            else{$entries.Add([pscustomobject][ordered]@{file=$item.Frame.File;category=$item.Frame.Category;subtype=$item.Frame.Subtype;characterId=$item.Frame.CharacterId;animation=$item.Frame.Animation;frame=$item.Frame.Frame;width=$canvasW;height=$canvasH;anchorX=$anchorX;anchorY=$anchorY;contactAnchorX=$anchorX;contactAnchorY=$anchorY;anchorType=$item.Frame.AnchorType;notes=$note})}
        }
    }
    return @($entries|Sort-Object file)
}

$zorpEntries=Export-Prepared $preparedZorp 'zorp';$assetEntries=Export-Prepared $preparedAssets 'assets'
$zorpManifest=[ordered]@{source='surf_assets/source/zorp_surf.png';assetSet='zorp_surf_new';generatedAt=(Get-Date).ToString('s');transparency='edge-connected black background removed; enclosed black art preserved';marginPixels=6;frames=$zorpEntries}
$assetManifest=[ordered]@{source='surf_assets/source/assets_surf.png';assetSet='assets_surf_new';generatedAt=(Get-Date).ToString('s');transparency='edge-connected black background removed; enclosed black art preserved';marginPixels=6;assets=$assetEntries}
[System.IO.File]::WriteAllText((Join-Path $outputRoot 'zorp_surf_manifest.json'),($zorpManifest|ConvertTo-Json -Depth 7),[System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $outputRoot 'assets_surf_manifest.json'),($assetManifest|ConvertTo-Json -Depth 7),[System.Text.UTF8Encoding]::new($false))
Save-ZorpPreview $zorpEntries;Save-AssetsPreview $assetEntries
Write-Output ("Exported {0} Zorp frames and {1} NPC/hazard frames to {2}" -f $zorpEntries.Count,$assetEntries.Count,$outputRoot)
