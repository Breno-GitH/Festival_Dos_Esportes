<#
  Builds a non-runtime, canonical library from the four approved Surf source sheets.
  This never alters a source sheet and deliberately uses per-sprite windows rather
  than applying a grid to a sheet that was drawn with uneven spacing.
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
public static class SurfSpritePixels {
    static bool IsBlack(byte[] data, int offset) {
        return data[offset] <= 7 && data[offset + 1] <= 7 && data[offset + 2] <= 7;
    }
    public static Rectangle ClearConnectedBlackAndGetBounds(Bitmap bitmap) {
        int w = bitmap.Width, h = bitmap.Height;
        var rect = new Rectangle(0, 0, w, h);
        var bits = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = bits.Stride;
        var pixels = new byte[stride * h];
        Marshal.Copy(bits.Scan0, pixels, 0, pixels.Length);
        var seen = new bool[w * h]; var queue = new Queue<int>();
        Action<int,int> enqueue = (x,y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return;
            int index = y * w + x; if (seen[index]) return;
            int offset = y * stride + x * 4; if (!IsBlack(pixels, offset)) return;
            seen[index] = true; queue.Enqueue(index);
        };
        for (int x=0; x<w; x++) { enqueue(x,0); enqueue(x,h-1); }
        for (int y=0; y<h; y++) { enqueue(0,y); enqueue(w-1,y); }
        while (queue.Count > 0) {
            int index=queue.Dequeue(), x=index%w, y=index/w, offset=y*stride+x*4;
            pixels[offset+3]=0; enqueue(x-1,y); enqueue(x+1,y); enqueue(x,y-1); enqueue(x,y+1);
        }
        int left=w, top=h, right=-1, bottom=-1;
        for (int y=0; y<h; y++) for (int x=0; x<w; x++) {
            int offset=y*stride+x*4;
            if (pixels[offset+3] <= 8) continue;
            if (x<left) left=x; if (x>right) right=x; if (y<top) top=y; if (y>bottom) bottom=y;
        }
        Marshal.Copy(pixels,0,bits.Scan0,pixels.Length); bitmap.UnlockBits(bits);
        if (right < left) throw new InvalidOperationException("No visible pixels in a selected sprite window.");
        return Rectangle.FromLTRB(left,top,right+1,bottom+1);
    }
    public static Rectangle KeepDominantAndAttachedGetBounds(Bitmap bitmap, int maxGap) {
        int w=bitmap.Width,h=bitmap.Height; var rect=new Rectangle(0,0,w,h);
        var bits=bitmap.LockBits(rect,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb); int stride=bits.Stride;
        var pixels=new byte[stride*h]; Marshal.Copy(bits.Scan0,pixels,0,pixels.Length);
        var seen=new bool[w*h]; var components=new List<List<int>>(); var boxes=new List<Rectangle>();
        for(int start=0;start<w*h;start++){
            if(seen[start])continue; int sx=start%w,sy=start/w; if(pixels[sy*stride+sx*4+3]<=8){seen[start]=true;continue;}
            var part=new List<int>(); var q=new Queue<int>();q.Enqueue(start);seen[start]=true;int l=sx,r=sx,t=sy,b=sy;
            while(q.Count>0){int i=q.Dequeue(),x=i%w,y=i/w;part.Add(i);l=Math.Min(l,x);r=Math.Max(r,x);t=Math.Min(t,y);b=Math.Max(b,y);
                for(int oy=-1;oy<=1;oy++)for(int ox=-1;ox<=1;ox++){int nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=w||ny>=h)continue;int ni=ny*w+nx;if(seen[ni]||pixels[ny*stride+nx*4+3]<=8)continue;seen[ni]=true;q.Enqueue(ni);}}
            components.Add(part);boxes.Add(Rectangle.FromLTRB(l,t,r+1,b+1));
        }
        int best=-1;for(int i=0;i<components.Count;i++)if(best<0||components[i].Count>components[best].Count)best=i;
        if(best<0)throw new InvalidOperationException("No visible pixels in crop.");
        var keep=new bool[w*h];var baseBox=boxes[best];
        for(int i=0;i<components.Count;i++){
            var box=boxes[i];int dx=Math.Max(0,Math.Max(baseBox.Left-box.Right,box.Left-baseBox.Right));int dy=Math.Max(0,Math.Max(baseBox.Top-box.Bottom,box.Top-baseBox.Bottom));
            if(i!=best && (dx>maxGap || dy>maxGap))continue;foreach(int index in components[i])keep[index]=true;
        }
        int left=w,top=h,right=-1,bottom=-1;for(int y=0;y<h;y++)for(int x=0;x<w;x++){int index=y*w+x,offset=y*stride+x*4;if(!keep[index]){pixels[offset+3]=0;continue;}left=Math.Min(left,x);top=Math.Min(top,y);right=Math.Max(right,x);bottom=Math.Max(bottom,y);}
        Marshal.Copy(pixels,0,bits.Scan0,pixels.Length);bitmap.UnlockBits(bits);return Rectangle.FromLTRB(left,top,right+1,bottom+1);
    }
}
'@

$root = Split-Path -Parent $PSScriptRoot
$outRoot = Join-Path $root 'surf_sprites'
$previewRoot = Join-Path $root 'docs\surf_asset_previews'
New-Item -ItemType Directory -Force -Path $outRoot,$previewRoot | Out-Null

function Set-PixelArtQuality([System.Drawing.Graphics]$Graphics) {
    $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
}
function Round-Up16([int]$Value) { return [int]([Math]::Ceiling($Value / 16.0) * 16) }
function Copy-Bitmap([System.Drawing.Bitmap]$Bitmap) {
    $copy = [System.Drawing.Bitmap]::new($Bitmap.Width,$Bitmap.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($copy); $g.DrawImageUnscaled($Bitmap,0,0); $g.Dispose(); return $copy
}
function Remove-EdgeConnectedBlack([System.Drawing.Bitmap]$Bitmap) {
    # Only background black reached from a crop boundary is removed. Enclosed black
    # outlines, eyes, pupils and shadow details remain opaque.
    $w=$Bitmap.Width; $h=$Bitmap.Height; $seen = New-Object 'bool[,]' $w,$h
    $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
    $enqueue = {
        param([int]$x,[int]$y)
        if($x -lt 0 -or $y -lt 0 -or $x -ge $w -or $y -ge $h -or $seen[$x,$y]) { return }
        $c=$Bitmap.GetPixel($x,$y)
        if($c.R -gt 7 -or $c.G -gt 7 -or $c.B -gt 7) { return }
        $seen[$x,$y]=$true; $queue.Enqueue([System.Drawing.Point]::new($x,$y))
    }
    for($x=0;$x -lt $w;$x++){ & $enqueue $x 0; & $enqueue $x ($h-1) }
    for($y=0;$y -lt $h;$y++){ & $enqueue 0 $y; & $enqueue ($w-1) $y }
    while($queue.Count){
        $p=$queue.Dequeue(); $Bitmap.SetPixel($p.X,$p.Y,[System.Drawing.Color]::FromArgb(0,0,0,0))
        & $enqueue ($p.X-1) $p.Y; & $enqueue ($p.X+1) $p.Y; & $enqueue $p.X ($p.Y-1); & $enqueue $p.X ($p.Y+1)
    }
}
function Get-VisibleBounds([System.Drawing.Bitmap]$Bitmap) {
    $l=$Bitmap.Width; $t=$Bitmap.Height; $r=-1; $b=-1
    for($y=0;$y -lt $Bitmap.Height;$y++) { for($x=0;$x -lt $Bitmap.Width;$x++) {
        if($Bitmap.GetPixel($x,$y).A -gt 8){$l=[Math]::Min($l,$x);$t=[Math]::Min($t,$y);$r=[Math]::Max($r,$x);$b=[Math]::Max($b,$y)}
    }}
    if($r -lt $l){ throw 'No visible pixels in a selected sprite window.' }
    return [System.Drawing.Rectangle]::FromLTRB($l,$t,$r+1,$b+1)
}
function Crop-Window([System.Drawing.Bitmap]$Source,[int]$X,[int]$Y,[int]$W,[int]$H,[bool]$KeepDominant=$false,[int]$DominantGap=4) {
    $window=[System.Drawing.Bitmap]::new($W,$H,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g=[System.Drawing.Graphics]::FromImage($window);$g.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g.DrawImage($Source,[System.Drawing.Rectangle]::new(0,0,$W,$H),[System.Drawing.Rectangle]::new($X,$Y,$W,$H),[System.Drawing.GraphicsUnit]::Pixel);$g.Dispose()
    $bounds=[SurfSpritePixels]::ClearConnectedBlackAndGetBounds($window)
    if($KeepDominant){$bounds=[SurfSpritePixels]::KeepDominantAndAttachedGetBounds($window,$DominantGap)}
    $margin=6
    $expanded=[System.Drawing.Rectangle]::FromLTRB([Math]::Max(0,$bounds.Left-$margin),[Math]::Max(0,$bounds.Top-$margin),[Math]::Min($W,$bounds.Right+$margin),[Math]::Min($H,$bounds.Bottom+$margin))
    $out=$window.Clone($expanded,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb);$window.Dispose();return $out
}
function New-Entry([string]$File,[string]$Source,[string]$Category,[string]$Subtype,[string]$State,[int]$Frame,[string]$CanvasGroup,[string]$AnchorType,[System.Drawing.Bitmap]$Image,[double]$AnchorX,[double]$AnchorY,[string]$Notes) {
    return [pscustomobject]@{file=$File;source=$Source;category=$Category;subtype=$Subtype;state=$State;frame=$Frame;canvasGroup=$CanvasGroup;anchorType=$AnchorType;image=$Image;anchorX=$AnchorX;anchorY=$AnchorY;notes=$Notes}
}
function Save-CropGuide([string]$SourcePath,[string]$Name){
    $source=[System.Drawing.Bitmap]::FromFile($SourcePath);$guide=Copy-Bitmap $source;$g=[System.Drawing.Graphics]::FromImage($guide);$pen=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150,0,255,255),1);$font=[System.Drawing.Font]::new('Consolas',8,[System.Drawing.FontStyle]::Bold)
    for($gx=0;$gx -lt $guide.Width;$gx+=50){$g.DrawLine($pen,$gx,0,$gx,$guide.Height);$g.DrawString([string]$gx,$font,[System.Drawing.Brushes]::Yellow,$gx+2,2)}
    for($gy=0;$gy -lt $guide.Height;$gy+=50){$g.DrawLine($pen,0,$gy,$guide.Width,$gy);$g.DrawString([string]$gy,$font,[System.Drawing.Brushes]::Yellow,2,$gy+2)}
    $guide.Save((Join-Path $previewRoot $Name),[System.Drawing.Imaging.ImageFormat]::Png);$font.Dispose();$pen.Dispose();$g.Dispose();$guide.Dispose();$source.Dispose()
}

$entries = [System.Collections.Generic.List[object]]::new()
$uncertainCrops = @(
    [pscustomobject]@{file='beach/people/beach_person_female_pink_cheer_01.png';region='banhistas_surf top row, x995–1115';reason='The raised hand overlaps the adjacent pose; exporting either silhouette intact would include neighbor pixels.'},
    [pscustomobject]@{file='beach/people/beach_person_female_pink_cheer_02.png';region='banhistas_surf top row, x1120–1242';reason='The pose touches the previous/next blonde pose in the source sheet.'},
    [pscustomobject]@{file='beach/people/beach_person_female_blonde_side_01.png';region='banhistas_surf top row, x1240–1342';reason='The next flower pose overlaps the character outline.'},
    [pscustomobject]@{file='beach/people/beach_person_sit_pink_02.png';region='banhistas_surf seated row, x600–710';reason='Two seated characters overlap at the towel and hair.'},
    [pscustomobject]@{file='beach/people/beach_person_sit_pink_03.png';region='banhistas_surf seated row, x725–850';reason='The coconut pose shares visible pixels with the neighboring seated character.'},
    [pscustomobject]@{file='beach/people/beach_surfer_carry_02.png';region='banhistas_surf surfer row, x720–840';reason='Carried board intersects the neighboring walking pose.'},
    [pscustomobject]@{file='beach/people/beach_surfer_carry_03.png';region='banhistas_surf surfer row, x850–960';reason='Walking pose overlaps adjacent board carrier.'},
    [pscustomobject]@{file='beach/people/beach_surfer_carry_04.png';region='banhistas_surf surfer row, x970–1040';reason='Board carrier is partially occluded by the next character.'},
    [pscustomobject]@{file='beach/decor/beach_umbrella_blue_01.png';region='banhistas_surf decor row, x190–360';reason='The red umbrella edge intrudes into the blue umbrella silhouette.'},
    [pscustomobject]@{file='beach/decor/beach_boards_01.png';region='banhistas_surf decor row, x370–605';reason='Adjacent umbrella pixels overlap the board cluster.'}
)
$uncertainFiles = @($uncertainCrops | ForEach-Object file)

# Repackage the already manually-isolated Zorp and ocean NPC assets. Their source
# manifests are the authoritative per-sprite selection; the library below pads each
# compatible group around a stable anchor without scaling any artwork.
$zorpManifest=Get-Content -Raw (Join-Path $root 'surf_assets\zorp_surf_manifest.json') | ConvertFrom-Json
foreach($frame in $zorpManifest.frames){
    $path=Join-Path $root ('surf_assets\'+$frame.file);$source=[System.Drawing.Bitmap]::FromFile($path);$image=Copy-Bitmap $source;$source.Dispose()
    $file=('zorp/{0}/{1}' -f $frame.category,([System.IO.Path]::GetFileName($frame.file)))
    $entries.Add((New-Entry $file 'surf_assets/source/zorp_surf.png' 'zorp' $frame.category $frame.recommendedState ([int]$frame.frame) ('zorp_'+$frame.category) 'SURF_CONTACT' $image $frame.surfContactAnchorX $frame.surfContactAnchorY $frame.notes))
}
$oceanManifest=Get-Content -Raw (Join-Path $root 'surf_assets\assets_surf_manifest.json') | ConvertFrom-Json
foreach($frame in $oceanManifest.assets){
    $path=Join-Path $root ('surf_assets\'+$frame.file);$source=[System.Drawing.Bitmap]::FromFile($path);$image=Copy-Bitmap $source;$source.Dispose()
    $folder=if($frame.category -eq 'hazards'){'obstacles'}else{'obstacles/'+$frame.category}
    $file=('{0}/{1}' -f $folder,([System.IO.Path]::GetFileName($frame.file)))
    $entries.Add((New-Entry $file 'surf_assets/source/assets_surf.png' ('ocean_'+$frame.category) $frame.subtype $frame.animation ([int]$frame.frame) ('ocean_'+$frame.category) $frame.anchorType $image $frame.contactAnchorX $frame.contactAnchorY $frame.notes))
}

function Add-ManualCrop([System.Drawing.Bitmap]$Sheet,[string]$Source,[string]$File,[string]$Category,[string]$Subtype,[string]$State,[int]$Frame,[string]$CanvasGroup,[string]$AnchorType,[int]$X,[int]$Y,[int]$W,[int]$H,[string]$Notes) {
    if($uncertainFiles -contains $File){ return }
    $keepDominant=($Category -eq 'beach' -and $Subtype -notin @('children','boards')) -or ($Category -eq 'score_sign' -and $Subtype -eq 'digit' -and $Frame -ne 10)
    $dominantGap=if($Category -eq 'score_sign' -and $Subtype -eq 'digit'){-1}else{4}
    $image=Crop-Window $Sheet $X $Y $W $H $keepDominant $dominantGap
    $anchorX=$image.Width/2.0
    $anchorY=if($AnchorType -eq 'CENTER'){$image.Height/2.0}else{$image.Height-6.0}
    $entries.Add((New-Entry $File $Source $Category $Subtype $State $Frame $CanvasGroup $AnchorType $image $anchorX $anchorY $Notes))
}

# banhistas_surf is the beach set requested as "sprite_de_praia...". The windows are
# hand-selected around the visible silhouettes, not inferred from an equal-cell grid.
$beachPath=Join-Path $root 'banhistas_surf.png';$beach=[System.Drawing.Bitmap]::FromFile($beachPath)
Save-CropGuide $beachPath 'banhistas_surf_crop_guide.png'
$people=@(
    @('beach_person_goggles_front_01.png','person','stand',20,80,115,205),@('beach_person_goggles_side_01.png','person','stand',135,80,112,205),@('beach_person_goggles_smile_01.png','person','stand',245,80,115,205),
    @('beach_person_male_cheer_01.png','person','cheer',350,80,120,205),@('beach_person_male_cheer_02.png','person','cheer',470,80,120,205),@('beach_person_male_icecream_01.png','person','stand',590,80,125,205),
    @('beach_person_female_pink_01.png','person','stand',730,80,140,205),@('beach_person_female_pink_02.png','person','stand',870,80,140,205),@('beach_person_female_pink_cheer_01.png','person','cheer',995,80,120,205),
    @('beach_person_female_pink_cheer_02.png','person','cheer',1120,80,122,205),@('beach_person_female_blonde_side_01.png','person','stand',1240,80,102,205),@('beach_person_female_blonde_wave_01.png','person','wave',1345,80,103,205),
    @('beach_person_chair_01.png','person','sit',15,300,145,200),@('beach_person_chair_02.png','person','sit',155,300,145,200),@('beach_person_chair_03.png','person','sit',290,300,155,200),
    @('beach_person_sit_pink_01.png','person','sit',450,300,135,200),@('beach_person_sit_pink_02.png','person','sit',600,300,110,200),@('beach_person_sit_pink_03.png','person','sit',725,300,125,200),
    @('beach_children_sandcastle_01.png','children','play',1000,315,175,180),@('beach_child_cheer_01.png','child','cheer',1160,315,140,180),@('beach_child_play_01.png','child','play',1300,315,148,180),
    @('beach_lifeguard_01.png','lifeguard','stand',15,505,140,220),@('beach_lifeguard_02.png','lifeguard','watch',155,505,140,220),@('beach_lifeguard_03.png','lifeguard','call',285,505,140,220),@('beach_lifeguard_04.png','lifeguard','stand',415,505,145,220),
    @('beach_surfer_carry_01.png','surfer','carry_board',560,515,145,210),@('beach_surfer_carry_02.png','surfer','carry_board',720,515,120,210),@('beach_surfer_carry_03.png','surfer','walk',850,515,110,210),@('beach_surfer_carry_04.png','surfer','carry_board',970,515,70,210),
    @('beach_person_blue_01.png','person','stand',1040,515,145,210),@('beach_person_blue_02.png','person','wave',1180,515,135,210),@('beach_person_blue_03.png','person','cheer',1300,515,148,210),
    @('beach_child_sunglasses_01.png','child','stand',25,735,145,190),@('beach_child_sunglasses_02.png','child','cheer',165,735,145,190),@('beach_child_flower_01.png','child','stand',315,735,145,190),@('beach_person_cheer_01.png','person','cheer',450,735,155,190),
    @('beach_child_sit_01.png','child','sit',720,735,170,190),@('beach_child_sit_02.png','child','sit',885,735,160,190),@('beach_child_confetti_01.png','child','cheer',1050,735,185,190),@('beach_child_confetti_02.png','child','cheer',1230,735,218,190)
)
$number=1;foreach($p in $people){Add-ManualCrop $beach 'banhistas_surf.png' ('beach/people/'+$p[0]) 'beach' $p[1] $p[2] $number 'beach_people' 'BASE' $p[3] $p[4] $p[5] $p[6] 'Hand-isolated from beach sheet; decorative ground/shadow remains attached.';$number++}
$decor=@(
    @('beach_umbrella_red_01.png','umbrella',0,915,190,171),@('beach_umbrella_blue_01.png','umbrella',190,915,170,171),@('beach_boards_01.png','boards',370,910,235,176),@('beach_cooler_01.png','cooler',645,920,190,166),@('beach_towel_01.png','towel',835,935,280,151),@('beach_sign_01.png','sign',1100,900,180,186),@('beach_palm_01.png','palm',1250,895,198,191)
)
$number=1;foreach($d in $decor){Add-ManualCrop $beach 'banhistas_surf.png' ('beach/decor/'+$d[0]) 'beach' $d[1] 'DECORATIVE' $number 'beach_decor' 'BASE' $d[2] $d[3] $d[4] $d[5] 'Decorative beach asset; no gameplay behavior implied.';$number++};$beach.Dispose()

# Score source: three empty hand-held boards, eleven isolated digits and three already
# composed examples. The latter remain examples, never a substitute for the digits.
$scorePath=Join-Path $root 'notas_surf.png';$score=[System.Drawing.Bitmap]::FromFile($scorePath)
Save-CropGuide $scorePath 'notas_surf_crop_guide.png'
$signs=@(
    @('score_sign_left_empty.png','left_empty',10,65,465,385),@('score_sign_double_empty.png','double_empty',485,65,485,385),@('score_sign_right_empty.png','right_empty',985,65,463,385)
)
$number=1;foreach($s in $signs){Add-ManualCrop $score 'notas_surf.png' ('score_signs/plates/'+$s[0]) 'score_sign' 'plate' $s[1] $number 'score_plates' 'BASE' $s[2] $s[3] $s[4] $s[5] 'Empty score board; hand/holder is retained.';$number++}
$digitWindows=@(@(0,45,465,115,190),@(1,180,465,90,190),@(2,280,465,105,190),@(3,395,465,110,190),@(4,515,465,115,190),@(5,640,465,110,190),@(6,760,465,90,190),@(7,885,465,85,190),@(8,1005,465,78,190),@(9,1130,465,94,190),@(10,1245,465,190,190))
foreach($d in $digitWindows){Add-ManualCrop $score 'notas_surf.png' ('score_signs/digits/score_digit_'+$d[0]+'.png') 'score_sign' 'digit' ('DIGIT_'+$d[0]) ([int]$d[0]) 'score_digits' 'CENTER' $d[1] $d[2] $d[3] $d[4] 'Standalone score digit.'}
$examples=@(@('score_sign_example_0.png','EXAMPLE_0',10,680,465,406),@('score_sign_example_7.png','EXAMPLE_7',485,680,485,406),@('score_sign_example_10.png','EXAMPLE_10',975,680,473,406))
$number=1;foreach($e in $examples){Add-ManualCrop $score 'notas_surf.png' ('score_signs/examples/'+$e[0]) 'score_sign' 'example' $e[1] $number 'score_examples' 'BASE' $e[2] $e[3] $e[4] $e[5] 'Precomposed reference sign; retained for results UI only.';$number++};$score.Dispose()

# Pads every compatible group around the same anchor, preserving source scale while
# preventing animation jitter. No source frame is scaled or redrawn.
$manifestEntries=[System.Collections.Generic.List[object]]::new()
foreach($group in ($entries | Group-Object canvasGroup)){
    $maxLeft=0;$maxRight=0;$maxTop=0;$maxBottom=0
    foreach($entry in $group.Group){$maxLeft=[Math]::Max($maxLeft,$entry.anchorX);$maxRight=[Math]::Max($maxRight,$entry.image.Width-$entry.anchorX);$maxTop=[Math]::Max($maxTop,$entry.anchorY);$maxBottom=[Math]::Max($maxBottom,$entry.image.Height-$entry.anchorY)}
    $canvasW=Round-Up16 ([int][Math]::Ceiling($maxLeft+$maxRight+16));$canvasH=Round-Up16 ([int][Math]::Ceiling($maxTop+$maxBottom+16));$targetX=$maxLeft+8;$targetY=$maxTop+8
    foreach($entry in $group.Group){
        $full=Join-Path $outRoot $entry.file;New-Item -ItemType Directory -Force -Path (Split-Path -Parent $full) | Out-Null
        $canvas=[System.Drawing.Bitmap]::new($canvasW,$canvasH,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb);$g=[System.Drawing.Graphics]::FromImage($canvas);Set-PixelArtQuality $g
        $dx=[int][Math]::Round($targetX-$entry.anchorX);$dy=[int][Math]::Round($targetY-$entry.anchorY);$g.DrawImageUnscaled($entry.image,$dx,$dy);$g.Dispose();$canvas.Save($full,[System.Drawing.Imaging.ImageFormat]::Png);$canvas.Dispose()
        $manifestEntries.Add([pscustomobject]@{file=$entry.file;source=$entry.source;category=$entry.category;subtype=$entry.subtype;state=$entry.state;frame=$entry.frame;width=$canvasW;height=$canvasH;anchorX=[int][Math]::Round($targetX);anchorY=[int][Math]::Round($targetY);contactAnchorX=[int][Math]::Round($targetX);contactAnchorY=[int][Math]::Round($targetY);anchorType=$entry.anchorType;canvasGroup=$entry.canvasGroup;notes=$entry.notes})
        $entry.image.Dispose()
    }
}

function Draw-Checker([System.Drawing.Graphics]$G,[int]$OriginX,[int]$OriginY,[int]$Width,[int]$Height){
    for($cy=$OriginY;$cy -lt $OriginY+$Height;$cy+=10){
        for($cx=$OriginX;$cx -lt $OriginX+$Width;$cx+=10){
            $even=((($cx-$OriginX)/10+[Math]::Floor(($cy-$OriginY)/10))%2 -eq 0)
            $brush=if($even){[System.Drawing.Brushes]::DimGray}else{[System.Drawing.Brushes]::Gray}
            $G.FillRectangle($brush,$cx,$cy,10,10)
        }
    }
}
function Save-Preview([string]$Name,[object[]]$PreviewEntries,[string[]]$Sections){
    $tileW=168;$tileH=154;$columns=7;$rows=0;foreach($section in $Sections){$count=@($PreviewEntries|Where-Object{$_.canvasGroup -eq $section}).Count;$rows+=1+[Math]::Ceiling($count/$columns)};$height=[Math]::Max(100,42+$rows*$tileH)
    $preview=[System.Drawing.Bitmap]::new($tileW*$columns,$height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb);$g=[System.Drawing.Graphics]::FromImage($preview);Set-PixelArtQuality $g;$g.Clear([System.Drawing.Color]::FromArgb(255,7,19,35));$title=[System.Drawing.Font]::new('Consolas',15,[System.Drawing.FontStyle]::Bold);$label=[System.Drawing.Font]::new('Consolas',8,[System.Drawing.FontStyle]::Bold);$small=[System.Drawing.Font]::new('Consolas',6);$g.DrawString($Name,$title,[System.Drawing.Brushes]::Aquamarine,10,8);$rowY=38
    foreach($section in $Sections){$subset=@($PreviewEntries|Where-Object{$_.canvasGroup -eq $section}|Sort-Object file);if(!$subset.Count){continue};$g.DrawString($section.ToUpper(),$label,[System.Drawing.Brushes]::Gold,5,$rowY);$rowY+=15;for($i=0;$i -lt $subset.Count;$i++){$x=($i%$columns)*$tileW;$y=$rowY+[Math]::Floor($i/$columns)*$tileH;Draw-Checker $g ($x+4) $y ($tileW-8) 123;$image=[System.Drawing.Bitmap]::FromFile((Join-Path $outRoot $subset[$i].file));$scale=[Math]::Min(1.45,[Math]::Min(132/$image.Width,100/$image.Height));$dw=[int]($image.Width*$scale);$dh=[int]($image.Height*$scale);$g.DrawImage($image,$x+(($tileW-$dw)/2),$y+4,$dw,$dh);$g.DrawString(([System.IO.Path]::GetFileName($subset[$i].file)),$small,[System.Drawing.Brushes]::White,$x+4,$y+108);$image.Dispose()};$rowY += [Math]::Ceiling($subset.Count/$columns)*$tileH+5}
    $preview.Save((Join-Path $previewRoot ($Name.ToLower().Replace(' ','_')+'.png')),[System.Drawing.Imaging.ImageFormat]::Png);$small.Dispose();$label.Dispose();$title.Dispose();$g.Dispose();$preview.Dispose()
}
$all=@($manifestEntries)
Save-Preview 'surf_runtime_sprites_preview' $all @('zorp_glide','zorp_pump','zorp_ascend','zorp_descend','zorp_crest_skim','zorp_takeoff','zorp_aerial','zorp_trick','zorp_reentry','zorp_landing','ocean_swimmers','ocean_surfers','ocean_sharks','ocean_seagulls','ocean_hazards')
Save-Preview 'surf_beach_sprites_preview' $all @('beach_people','beach_decor')
Save-Preview 'surf_score_signs_preview' $all @('score_plates','score_digits','score_examples')

foreach($uncertain in $uncertainCrops){$derivedPath=Join-Path $outRoot $uncertain.file;if(Test-Path -LiteralPath $derivedPath){Remove-Item -LiteralPath $derivedPath -Force}}
$manifest=[ordered]@{assetSet='surf_sprites_library_2026';sources=@('surf_assets/source/zorp_surf.png','surf_assets/source/assets_surf.png','banhistas_surf.png','notas_surf.png');transparency='Only edge-connected black background was made transparent; enclosed black pixel art is retained.';marginPixels=6;uncertainCrops=$uncertainCrops;frames=@($manifestEntries|Sort-Object category,subtype,file)}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $outRoot 'surf_sprites_manifest.json')
$counts=$manifestEntries|Group-Object category|Sort-Object Name|ForEach-Object{"$($_.Name)=$($_.Count)"};Write-Output ('Generated '+$manifestEntries.Count+' sprites. '+($counts -join '; '))
