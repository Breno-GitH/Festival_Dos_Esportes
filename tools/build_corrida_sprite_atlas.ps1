param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$root = Join-Path $ProjectRoot 'corrida_sprites\runtime'
New-Item -ItemType Directory -Path $root -Force | Out-Null
$sources = @{
    zorp = [System.Drawing.Bitmap]::FromFile((Join-Path $ProjectRoot 'Zorp_Corrida.png'))
    mestre = [System.Drawing.Bitmap]::FromFile((Join-Path $ProjectRoot 'Mestre_Corrida.png'))
    competitors = [System.Drawing.Bitmap]::FromFile((Join-Path $ProjectRoot 'Competidores_Corrida.png'))
    obstacles = [System.Drawing.Bitmap]::FromFile((Join-Path $ProjectRoot 'Obstaculos_Corrida.png'))
}
$frames = [System.Collections.Generic.List[object]]::new()

function Add-Pose {
    param([string]$Id, [string]$Action, [string]$Direction, [int]$Index,
          [string]$Sheet, [int]$X, [int]$Y, [int]$W, [int]$H)
    $frames.Add([pscustomobject]@{ id=$Id; action=$Action; direction=$Direction;
        index=$Index; sheet=$Sheet; x=$X; y=$Y; w=$W; h=$H })
}

# These are reviewed pose neighbourhoods, never assumed to be an even grid.
# The visible alpha is measured again inside each neighbourhood below.
foreach ($id in @('zorp', 'mestre')) {
    foreach ($direction in @('RIGHT','LEFT','UP','DOWN')) {
        $idle = @{
            RIGHT=@(@(42,58,96,155),@(138,58,96,155));
            LEFT=@(@(262,58,96,155),@(354,58,96,155));
            UP=@(@(42,244,100,165),@(142,244,100,165));
            DOWN=@(@(262,244,100,165),@(362,244,100,165))
        }[$direction]
        for ($i=0; $i -lt $idle.Count; $i++) {
            $b=$idle[$i]; Add-Pose $id 'READY' $direction $i $id $b[0] $b[1] $b[2] $b[3]
        }
        $runY=@{RIGHT=56;LEFT=206;UP=350;DOWN=498}[$direction]
        $runX=@(562,660,772,884,996,1108)
        for ($i=0; $i -lt 6; $i++) {
            Add-Pose $id 'RUN' $direction $i $id $runX[$i] $runY $(if($i -eq 0){94}else{108}) 148
        }
    }
    # The jump drawings touch their neighbours. Use the first and last whole
    # poses of each row, with independent artwork bounds rather than cells.
    $jump=@{
        RIGHT=@(@(520,751,108,119),@(783,762,90,108));
        LEFT=@(@(895,751,103,119),@(1138,762,96,108));
        UP=@(@(548,913,98,127),@(757,913,98,127));
        DOWN=@(@(917,913,98,127),@(1112,913,110,127))
    }
    foreach($direction in $jump.Keys){
        $selected=$(if($direction -eq 'RIGHT' -and $id -eq 'zorp'){1}else{0})
        $b=$jump[$direction][$selected]
        Add-Pose $id 'JUMP' $direction 0 $id $b[0] $b[1] $b[2] $b[3]
    }
    foreach($entry in @(
        @{action='SIDESTEP_IN'; rects=@(@(14,770,92,160),@(196,770,92,160))},
        @{action='SIDESTEP_OUT';rects=@(@(292,770,92,160),@(474,770,92,160))},
        @{action='STUMBLE';    rects=@(@(16,1080,110,162),@(347,1080,110,162))},
        @{action='VICTORY';    rects=@(@(468,1080,100,162),@(770,1080,100,162))},
        @{action='DEFEATED';   rects=@(@(916,1080,100,162),@(1116,1080,100,162))}
    )){
        for($i=0;$i -lt $entry.rects.Count;$i++){
            $b=$entry.rects[$i]; Add-Pose $id $entry.action '' $i $id $b[0] $b[1] $b[2] $b[3]
        }
    }
}

$families=@(
    @{name='robot';   ids=@('robot_blue','robot_orange','robot_pink','robot_green'); top=0; up=260; hit=355; topH=165; upH=92; hitH=90},
    @{name='human';   ids=@('human_01','human_02','human_03','human_04'); top=449; up=699; hit=791; topH=145; upH=85; hitH=88},
    @{name='monster'; ids=@('monster_red','monster_blue','monster_purple','monster_ram'); top=890; up=1106; hit=1181; topH=132; upH=74; hitH=73}
)
foreach($family in $families){
    for($col=0;$col -lt 4;$col++){
        $id=$family.ids[$col]; $base=$col*310
        # Larger authored poses are deliberately selected for horizontal
        # movement. The six tiny middle-row poses in the original sheet
        # overlap one another and cannot be cropped as intact individuals.
        $firstX=$base+$(if($col -eq 0){19}else{32})
        $firstW=$(if($col -eq 0){99}else{108})
        $singleHorizontal=$id -in @('robot_orange','human_02','monster_purple')
        $secondX=$base+$(if($col -eq 0){117}else{144})
        $secondW=$(if($col -eq 0){83}else{84})
        Add-Pose $id 'RUN' 'RIGHT' 0 'competitors' $firstX $family.top $firstW $family.topH
        if(-not $singleHorizontal){
            Add-Pose $id 'RUN' 'RIGHT' 1 'competitors' $secondX $family.top $secondW $family.topH
        }
        Add-Pose $id 'READY' 'RIGHT' 0 'competitors' $firstX $family.top $firstW $family.topH
        if($family.name -eq 'monster'){
            # This row has a front-facing first pose followed by three backs.
            Add-Pose $id 'RUN' 'DOWN' 0 'competitors' ($base+27) $family.up 79 $family.upH
            Add-Pose $id 'READY' 'DOWN' 0 'competitors' ($base+27) $family.up 79 $family.upH
            if($id -eq 'monster_purple'){
                # The purple monster has no authored back view in this row.
                # Reuse its intact front view instead of displaying a neighbour.
                Add-Pose $id 'RUN' 'UP' 0 'competitors' ($base+27) $family.up 79 $family.upH
            }elseif($id -eq 'monster_blue'){
                Add-Pose $id 'RUN' 'UP' 0 'competitors' ($base+112) $family.up 60 $family.upH
                Add-Pose $id 'RUN' 'UP' 1 'competitors' ($base+247) $family.up 58 $family.upH
            }else{
                Add-Pose $id 'RUN' 'UP' 0 'competitors' ($base+105) $family.up 67 $family.upH
                Add-Pose $id 'RUN' 'UP' 1 'competitors' ($base+240) $family.up 66 $family.upH
            }
        }else{
            Add-Pose $id 'RUN' 'UP' 0 'competitors' ($base+27) $family.up 79 $family.upH
            if($id -ne 'human_02'){
                Add-Pose $id 'RUN' 'UP' 1 'competitors' ($base+107) $family.up 78 $family.upH
            }
        }
        Add-Pose $id 'STUMBLE' '' 0 'competitors' ($base+$(if($col -eq 0){18}else{30})) $family.hit $(if($col -eq 0){110}else{122}) $family.hitH
    }
}

# Mobile non-ranking runners in the obstacle sheet are also visible during a
# race. Keep their body and accessories together; other obstacle art is not
# part of this character-only pass.
Add-Pose 'mobile_backmarker' 'RUN' 'RIGHT' 0 'obstacles' 25 383 94 166
Add-Pose 'mobile_zigzag' 'RUN' 'RIGHT' 0 'obstacles' 514 383 87 166
Add-Pose 'mobile_judge' 'RUN' 'RIGHT' 0 'obstacles' 18 764 116 160
Add-Pose 'mobile_maintenance_robot' 'RUN' 'RIGHT' 0 'obstacles' 930 1120 130 123

$canvasW=148; $canvasH=174; $columns=12
$rows=[int][Math]::Ceiling($frames.Count/$columns)
$atlas=[System.Drawing.Bitmap]::new($canvasW*$columns,$canvasH*$rows,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics=[System.Drawing.Graphics]::FromImage($atlas)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
$manifest=[ordered]@{version=1; canvas=@{width=$canvasW;height=$canvasH;anchor='bottom-center'}; frames=@{}; aliases=@{}; audit=@()}
$edgeCases=[System.Collections.Generic.List[object]]::new()

function Get-MainAlphaComponent {
    param([System.Drawing.Bitmap]$Bitmap,[int]$Left,[int]$Top,[int]$Right,[int]$Bottom)
    $width=$Right-$Left+1;$height=$Bottom-$Top+1
    $visited=[bool[]]::new($width*$height)
    $best=$null
    for($ly=0;$ly -lt $height;$ly++){
        for($lx=0;$lx -lt $width;$lx++){
            $index=$ly*$width+$lx
            if($visited[$index] -or $Bitmap.GetPixel($Left+$lx,$Top+$ly).A -eq 0){continue}
            $queue=[System.Collections.Generic.Queue[int]]::new()
            $pixels=[System.Collections.Generic.List[int]]::new()
            $queue.Enqueue($index);$visited[$index]=$true
            $minX=$Right;$maxX=$Left;$minY=$Bottom;$maxY=$Top
            while($queue.Count -gt 0){
                $current=$queue.Dequeue();$cx=$current%$width;$cy=[int][Math]::Floor($current/$width)
                $ax=$Left+$cx;$ay=$Top+$cy
                $pixels.Add($current)
                if($ax -lt $minX){$minX=$ax};if($ax -gt $maxX){$maxX=$ax}
                if($ay -lt $minY){$minY=$ay};if($ay -gt $maxY){$maxY=$ay}
                for($dy=-1;$dy -le 1;$dy++){
                    for($dx=-1;$dx -le 1;$dx++){
                        if($dx -eq 0 -and $dy -eq 0){continue}
                        $nx=$cx+$dx;$ny=$cy+$dy
                        if($nx -lt 0 -or $ny -lt 0 -or $nx -ge $width -or $ny -ge $height){continue}
                        $next=$ny*$width+$nx
                        if($visited[$next] -or $Bitmap.GetPixel($Left+$nx,$Top+$ny).A -eq 0){continue}
                        $visited[$next]=$true;$queue.Enqueue($next)
                    }
                }
            }
            if($null -eq $best -or $pixels.Count -gt $best.pixels.Count){
                $best=[pscustomobject]@{pixels=$pixels;left=$Left;top=$Top;stride=$width;
                    x=$minX;y=$minY;w=$maxX-$minX+1;h=$maxY-$minY+1}
            }
        }
    }
    return $best
}

for($n=0;$n -lt $frames.Count;$n++){
    $f=$frames[$n]; $source=$sources[$f.sheet]
    $x0=[Math]::Max(0,$f.x); $y0=[Math]::Max(0,$f.y)
    $x1=[Math]::Min($source.Width-1,$f.x+$f.w-1); $y1=[Math]::Min($source.Height-1,$f.y+$f.h-1)
    $component=$null
    if(($f.sheet -eq 'competitors' -and $f.action -ne 'STUMBLE') -or
       ($f.id -in @('mobile_backmarker','mobile_zigzag')) -or
       ($f.sheet -ne 'competitors' -and $f.action -in @('JUMP','READY'))){
        $component=Get-MainAlphaComponent $source $x0 $y0 $x1 $y1
    }
    $minX=$x1; $minY=$y1; $maxX=$x0; $maxY=$y0; $found=$false
    if($null -ne $component){
        $found=$true;$minX=$component.x;$minY=$component.y
        $maxX=$component.x+$component.w-1;$maxY=$component.y+$component.h-1
    }else{
        for($y=$y0;$y -le $y1;$y++){
            for($x=$x0;$x -le $x1;$x++){
                if($source.GetPixel($x,$y).A -lt 10){continue}
                $found=$true
                if($x -lt $minX){$minX=$x}; if($x -gt $maxX){$maxX=$x}
                if($y -lt $minY){$minY=$y}; if($y -gt $maxY){$maxY=$y}
            }
        }
    }
    if(-not $found){throw "Empty crop: $($f.id) $($f.action) $($f.direction) $($f.index)"}
    if($minX -le $x0+1 -or $maxX -ge $x1-1 -or $minY -le $y0+1 -or $maxY -ge $y1-1){
        $edgeCases.Add("$($f.id)/$($f.action)/$($f.direction)/$($f.index)")
    }
    $minX=[Math]::Max($x0,$minX-2);$maxX=[Math]::Min($x1,$maxX+2)
    $minY=[Math]::Max($y0,$minY-2);$maxY=[Math]::Min($y1,$maxY+2)
    $cropW=$maxX-$minX+1;$cropH=$maxY-$minY+1
    $desiredH=$(if($f.sheet -in @('competitors','obstacles')){141}else{154})
    $scale=[Math]::Min($desiredH/$cropH,($canvasW-12)/$cropW)
    $drawW=[int][Math]::Max(1,[Math]::Round($cropW*$scale))
    $drawH=[int][Math]::Max(1,[Math]::Round($cropH*$scale))
    $tileX=($n%$columns)*$canvasW;$tileY=[int][Math]::Floor($n/$columns)*$canvasH
    $drawX=$tileX+[int][Math]::Floor(($canvasW-$drawW)/2)
    $drawY=$tileY+$canvasH-7-$drawH
    if($null -ne $component){
        $isolated=[System.Drawing.Bitmap]::new($cropW,$cropH,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        foreach($point in $component.pixels){
            $px=$component.left+($point%$component.stride)
            $py=$component.top+[int][Math]::Floor($point/$component.stride)
            $isolated.SetPixel($px-$minX,$py-$minY,$source.GetPixel($px,$py))
        }
        $graphics.DrawImage($isolated,[System.Drawing.Rectangle]::new($drawX,$drawY,$drawW,$drawH))
        $isolated.Dispose()
    }else{
        $graphics.DrawImage($source,[System.Drawing.Rectangle]::new($drawX,$drawY,$drawW,$drawH),
            $minX,$minY,$cropW,$cropH,[System.Drawing.GraphicsUnit]::Pixel)
    }
    $key="$($f.id)/$($f.action)/$($f.direction)"
    if(-not $manifest.frames.Contains($key)){$manifest.frames[$key]=@()}
    $manifest.frames[$key]+=@([ordered]@{x=$tileX;y=$tileY;w=$canvasW;h=$canvasH;
        source=$f.sheet; sourceRect=@($minX,$minY,$cropW,$cropH); index=$f.index})
}
$graphics.Dispose()
$atlas.Save((Join-Path $root 'corrida_runners_atlas.png'),[System.Drawing.Imaging.ImageFormat]::Png)

# Left is a horizontal reflection of the supplied right artwork; the source
# provides no separate competitor-left or competitor-down running sequence.
foreach($family in $families){foreach($id in $family.ids){
    $manifest.aliases["$id/RUN/LEFT"]=[ordered]@{key="$id/RUN/RIGHT";flipX=$true}
    if(-not $manifest.frames.Contains("$id/RUN/DOWN")){
        $manifest.aliases["$id/RUN/DOWN"]=[ordered]@{key="$id/READY/RIGHT";flipX=$false}
    }
    $manifest.aliases["$id/READY/LEFT"]=[ordered]@{key="$id/READY/RIGHT";flipX=$true}
    $manifest.aliases["$id/READY/UP"]=[ordered]@{key="$id/RUN/UP";flipX=$false}
    if(-not $manifest.frames.Contains("$id/READY/DOWN")){
        $manifest.aliases["$id/READY/DOWN"]=[ordered]@{key="$id/READY/RIGHT";flipX=$false}
    }
}}
$manifest.audit=@(
    'Visible alpha bounds inside individually reviewed pose neighbourhoods; 2 px internal safety margin; connected pose silhouette removes adjacent fragments.',
    'Native transparent alpha preserved, including black outlines, eyes and dark clothing.',
    'Every frame has a 148x174 bottom-center canvas and a 7 px foot pad.',
    'The tightly overlapping six-pose competitor sprint row is not used: intact large authored poses are used for horizontal movement.',
    'Where alternate large poses overlap, a single complete source pose is retained rather than animating clipped fragments.',
    'Mobile backmarker, zigzag runner, judge and maintenance robot use the same normalized atlas and feet anchor.',
    'Competitor LEFT mirrors RIGHT. Monster DOWN uses its authored front pose; robots/humans DOWN reuse the nearest authored three-quarter pose. Purple monster has no separate back view.'
)
$json=$manifest|ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Join-Path $root 'corrida_runners_manifest.js'),"window.CorridaSpriteManifest = $json;",[System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $root 'corrida_runners_manifest.json'),$json,[System.Text.UTF8Encoding]::new($false))

$preview=[System.Drawing.Bitmap]::new(1320,1040,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$p=[System.Drawing.Graphics]::FromImage($preview)
$p.Clear([System.Drawing.Color]::FromArgb(255,18,30,42))
$p.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$font=[System.Drawing.Font]::new('Arial',10,[System.Drawing.FontStyle]::Bold)
$ids=@('zorp','mestre','robot_blue','robot_orange','human_02','human_03','monster_blue','monster_purple')
$poses=@(@('RUN','RIGHT'),@('RUN','LEFT'),@('RUN','UP'),@('RUN','DOWN'))
for($row=0;$row -lt $ids.Count;$row++){
    $p.DrawString($ids[$row],$font,[System.Drawing.Brushes]::White,12,16+$row*125)
    for($col=0;$col -lt 4;$col++){
        $key="$($ids[$row])/$($poses[$col][0])/$($poses[$col][1])"
        $flip=$false
        if($manifest.aliases.Contains($key)){$flip=$manifest.aliases[$key].flipX;$key=$manifest.aliases[$key].key}
        $entry=$manifest.frames[$key][0]
        $dest=[System.Drawing.Rectangle]::new(150+$col*286,24+$row*125,92,98)
        $tile=$atlas.Clone([System.Drawing.Rectangle]::new($entry.x,$entry.y,$entry.w,$entry.h),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        if($flip){$tile.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)}
        $p.DrawImage($tile,$dest)
        $tile.Dispose()
        $footX=$dest.X+[int]($dest.Width/2);$footY=$dest.Bottom
        $p.DrawLine([System.Drawing.Pens]::LightGreen,$footX-5,$footY,$footX+5,$footY)
        $p.DrawLine([System.Drawing.Pens]::LightGreen,$footX,$footY-5,$footX,$footY+5)
        $p.DrawString($poses[$col][1],$font,[System.Drawing.Brushes]::LightBlue,245+$col*286,65+$row*125)
    }
}
$p.Dispose();$font.Dispose()
$preview.Save((Join-Path $root 'corrida_runners_preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$preview.Dispose()

$actionsPreview=[System.Drawing.Bitmap]::new(1480,1040,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$ap=[System.Drawing.Graphics]::FromImage($actionsPreview)
$ap.Clear([System.Drawing.Color]::FromArgb(255,18,30,42))
$ap.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$smallFont=[System.Drawing.Font]::new('Arial',8)
for($row=0;$row -lt $ids.Count;$row++){
    $id=$ids[$row]
    $ap.DrawString($id,$smallFont,[System.Drawing.Brushes]::White,8,10+$row*126)
    $requests=if($id -eq 'zorp' -or $id -eq 'mestre'){
        @(@('READY','RIGHT',0),@('RUN','RIGHT',0),@('RUN','RIGHT',1),
          @('RUN','UP',0),@('JUMP','RIGHT',0),@('JUMP','RIGHT',1),
          @('STUMBLE','',0),@('VICTORY','',0))
    }else{
        @(@('READY','RIGHT',0),@('RUN','RIGHT',0),@('RUN','RIGHT',1),
          @('RUN','UP',0),@('RUN','UP',1),@('RUN','DOWN',0),
          @('STUMBLE','',0),@('RUN','LEFT',0))
    }
    for($col=0;$col -lt $requests.Count;$col++){
        $request=$requests[$col];$key="$id/$($request[0])/$($request[1])";$flip=$false
        if($manifest.aliases.Contains($key)){$flip=$manifest.aliases[$key].flipX;$key=$manifest.aliases[$key].key}
        $sequence=$manifest.frames[$key];if($null -eq $sequence){continue}
        $index=[Math]::Min([int]$request[2],$sequence.Count-1)
        $entry=$sequence[$index]
        $tile=$atlas.Clone([System.Drawing.Rectangle]::new($entry.x,$entry.y,$entry.w,$entry.h),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        if($flip){$tile.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)}
        $dx=138+$col*166;$dy=15+$row*126
        $ap.DrawImage($tile,[System.Drawing.Rectangle]::new($dx,$dy,88,98))
        $tile.Dispose()
        $ap.DrawLine([System.Drawing.Pens]::LightGreen,$dx+39,$dy+98,$dx+49,$dy+98)
        $ap.DrawString("$($request[0]) $($request[1]) $index",$smallFont,[System.Drawing.Brushes]::LightBlue,$dx+87,$dy+53)
    }
}
$ap.Dispose();$smallFont.Dispose()
$actionsPreview.Save((Join-Path $root 'corrida_runners_actions_preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$actionsPreview.Dispose()
$mobilePreview=[System.Drawing.Bitmap]::new(760,195,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mp=[System.Drawing.Graphics]::FromImage($mobilePreview)
$mp.Clear([System.Drawing.Color]::FromArgb(255,18,30,42))
$mobileFont=[System.Drawing.Font]::new('Arial',10)
$mobileIds=@('mobile_backmarker','mobile_zigzag','mobile_judge','mobile_maintenance_robot')
for($i=0;$i -lt $mobileIds.Count;$i++){
    $id=$mobileIds[$i];$entry=$manifest.frames["$id/RUN/RIGHT"][0]
    $mp.DrawImage($atlas,[System.Drawing.Rectangle]::new(20+$i*185,15,120,145),
        [System.Drawing.Rectangle]::new($entry.x,$entry.y,$entry.w,$entry.h),[System.Drawing.GraphicsUnit]::Pixel)
    $mp.DrawString($id,$mobileFont,[System.Drawing.Brushes]::White,10+$i*185,165)
}
$mp.Dispose();$mobileFont.Dispose()
$mobilePreview.Save((Join-Path $root 'corrida_mobile_preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$mobilePreview.Dispose();$atlas.Dispose()
foreach($source in $sources.Values){$source.Dispose()}
Write-Output "Frames: $($frames.Count); canvas: ${canvasW}x${canvasH}; edge-reviewed candidates: $($edgeCases.Count)"
Write-Output "Edge candidates: $($edgeCases -join ', ')"
Write-Output (Join-Path $root 'corrida_runners_preview.png')
