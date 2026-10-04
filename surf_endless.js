/* Surf 9.4.4 — parede de quebra, lip espesso e whitewater integrado. */
(function () {
    'use strict';

    const query = new URLSearchParams(location.search);
    const SCENE = 'JOGO_SURF';
    const W = 450, H = 300;
    const SURF_FINISH_DISTANCE = 32000;
    const WORLD_PROJECTION_SCALE = .60;
    const LAST_CHANCE_TUBE_DURATION = 5.5;
    const WHALE_ENABLED = false;
    let resultActionPressed=false;
    window.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(!event.repeat&&(key===' '||key==='enter'||key==='r'))resultActionPressed=true;});
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    const mix = (a, b, t) => {
        const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
        const c = s => Math.round(lerp((x >> s) & 255, (y >> s) & 255, t)).toString(16).padStart(2, '0');
        return `#${c(16)}${c(8)}${c(0)}`;
    };

    class SeededRandom {
        constructor(seed = 0x5a17c0de) { this.state = seed >>> 0; }
        next() { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 4294967296; }
        range(a, b) { return lerp(a, b, this.next()); }
        pick(list) { return list[Math.floor(this.next() * list.length) % list.length]; }
    }

    class ObjectPool {
        constructor(factory, reset) { this.factory = factory; this.resetter = reset; this.free = []; this.created = 0; }
        take(data) { const item = this.free.pop() || (this.created++, this.factory()); this.resetter(item, data); return item; }
        release(item) { this.free.push(item); }
    }

    const PRESETS = {
        gentle:    { height:.55, steep:.54, energy:.72, crest:.48, break:.10, tube:0, hazard:.05, collectible:.45 },
        long:      { height:.78, steep:.75, energy:.94, crest:.64, break:.18, tube:0, hazard:.12, collectible:.56 },
        steep:     { height:1.05, steep:1.12, energy:1.20, crest:.94, break:.28, tube:0, hazard:.18, collectible:.60 },
        fast:      { height:.91, steep:.97, energy:1.25, crest:.88, break:.52, tube:0, hazard:.30, collectible:.45 },
        barrel:    { height:1.12, steep:1.13, energy:1.18, crest:1.25, break:.68, tube:1, hazard:.08, collectible:.72 },
        giant:     { height:1.48, steep:1.20, energy:1.48, crest:1.38, break:.48, tube:.18, hazard:.24, collectible:.58 },
        technical: { height:1.08, steep:1.08, energy:1.32, crest:1.12, break:.62, tube:.30, hazard:.45, collectible:.52 }
    };
    const PACING = ['CALM', 'BUILD', 'CHALLENGE', 'REWARD', 'RECOVERY'];
    const SWIMMER_IDS = ['swimmer_male_01', 'swimmer_female_01', 'swimmer_goggles_01'];
    const SURFER_IDS = ['surfer_male_01', 'surfer_female_01', 'surfer_green_01'];
    const BUOY_IDS = ['buoy_red', 'buoy_warning', 'buoy_yellow'];
    const PATTERN_LIBRARY = {
        clean:       {pace:['CALM','RECOVERY'], hazards:[], coins:[{at:.30,face:.60},{at:.40,face:.56},{at:.50,face:.52},{at:.60,face:.48}]},
        low_block:   {pace:['BUILD','CHALLENGE'], hazards:[{at:.50,face:.78,type:'buoy',severity:'minor',radius:.105}], coins:[{at:.26,face:.68},{at:.34,face:.55},{at:.42,face:.40},{at:.50,face:.25}]},
        high_block:  {pace:['BUILD','CHALLENGE'], hazards:[{at:.52,face:.24,type:'surfer',severity:'minor',radius:.11,motion:'drift',amplitude:.06,speed:.75}], coins:[{at:.24,face:.34},{at:.34,face:.49},{at:.44,face:.65},{at:.54,face:.78}]},
        high_low:    {pace:['CHALLENGE'], hazards:[{at:.36,face:.47,type:'beach_ball',severity:'minor',radius:.105}], coins:[{at:.27,face:.25},{at:.37,face:.18},{at:.27,face:.72},{at:.37,face:.82}]},
        s_curve:     {pace:['CHALLENGE'], hazards:[{at:.27,face:.77,type:'foam',severity:'minor',radius:.12},{at:.50,face:.25,type:'swimmer',severity:'minor',radius:.105,motion:'drift',amplitude:.045,speed:.55},{at:.73,face:.76,type:'buoy',severity:'minor',radius:.10}], coins:[{at:.20,face:.56},{at:.36,face:.32},{at:.48,face:.52},{at:.62,face:.74}]},
        pressure:    {pace:['CHALLENGE'], hazards:[{at:.31,face:.38,type:'log',severity:'major',radius:.10,motion:'cross',amplitude:.18,speed:1.45},{at:.66,face:.66,type:'buoy',severity:'minor',radius:.105}], coins:[{at:.24,face:.76},{at:.38,face:.82},{at:.52,face:.48},{at:.66,face:.27}]},
        coastal:     {pace:['CHALLENGE'], hazards:[{at:.42,face:.80,type:'wood_crate',severity:'major',radius:.13},{at:.70,face:.33,type:'barrel',severity:'minor',radius:.10}], coins:[{at:.25,face:.35},{at:.37,face:.25},{at:.52,face:.46}]},
        shark_read:  {pace:['CHALLENGE'], hazards:[{at:.55,face:.58,type:'shark',severity:'major',radius:.105,motion:'jump',amplitude:.12,speed:1.1,telegraph:true}], coins:[{at:.28,face:.25},{at:.39,face:.18},{at:.50,face:.22}]},
        aerial_line: {pace:['BUILD','REWARD'], hazards:[{at:.32,face:.79,type:'foam',severity:'minor',radius:.11},{at:.72,face:.12,air:58,type:'bird',severity:'minor',radius:.12,motion:'air_drift',amplitude:13,speed:.75,telegraph:true}], coins:[{at:.18,face:.77},{at:.28,face:.61},{at:.38,face:.39},{at:.48,face:.17},{at:.56,face:.10,air:24},{at:.62,face:.10,air:49},{at:.68,face:.10,air:76,star:true},{at:.74,face:.10,air:52},{at:.80,face:.10,air:27}]},
        risk_routes: {pace:['REWARD'], hazards:[{at:.50,face:.51,type:'surfer',severity:'minor',radius:.11,motion:'drift',amplitude:.08,speed:.7}], coins:[{at:.28,face:.77},{at:.38,face:.82},{at:.48,face:.78},{at:.30,face:.27},{at:.40,face:.18,star:true},{at:.50,face:.24}]},
        aerial_clear: {pace:['CALM','RECOVERY'], hazards:[{at:.24,face:.75,type:'foam',severity:'minor',radius:.105}], coins:[{at:.20,face:.69},{at:.30,face:.49},{at:.40,face:.28},{at:.49,face:.11,air:22},{at:.59,face:.11,air:46},{at:.69,face:.11,air:24}]},
        aerial_coins: {pace:['BUILD','REWARD'], hazards:[], coins:[{at:.18,face:.73},{at:.27,face:.57},{at:.36,face:.37},{at:.45,face:.16},{at:.53,face:.10,air:27},{at:.61,face:.10,air:54},{at:.69,face:.10,air:79,star:true},{at:.77,face:.10,air:52},{at:.85,face:.10,air:25}]},
        aerial_gull_low: {pace:['BUILD','CHALLENGE'], hazards:[{at:.63,face:.10,air:30,type:'bird',severity:'minor',radius:.105,motion:'air_drift',amplitude:9,speed:.80,telegraph:true}], coins:[{at:.22,face:.75},{at:.34,face:.48},{at:.46,face:.20},{at:.58,face:.10,air:65,star:true},{at:.72,face:.10,air:72}]},
        aerial_gull_mid: {pace:['CHALLENGE'], hazards:[{at:.62,face:.10,air:58,type:'bird',severity:'minor',radius:.11,motion:'air_drift',amplitude:12,speed:.92,telegraph:true}], coins:[{at:.20,face:.76},{at:.32,face:.52},{at:.44,face:.24},{at:.54,face:.10,air:25},{at:.70,face:.10,air:88,star:true}]},
        aerial_gull_high: {pace:['CHALLENGE','REWARD'], hazards:[{at:.66,face:.10,air:88,type:'bird',severity:'minor',radius:.11,motion:'air_drift',amplitude:10,speed:.88,telegraph:true}], coins:[{at:.20,face:.72},{at:.32,face:.43},{at:.44,face:.16},{at:.55,face:.10,air:34},{at:.69,face:.10,air:55,star:true}]},
        aerial_gap: {pace:['BUILD','REWARD'], hazards:[{at:.42,face:.78,type:'wood_crate',severity:'major',radius:.12},{at:.60,face:.48,type:'surfer',severity:'minor',radius:.10,motion:'drift',amplitude:.05,speed:.72}], coins:[{at:.20,face:.72},{at:.29,face:.51},{at:.38,face:.27},{at:.47,face:.10,air:28},{at:.57,face:.10,air:55},{at:.68,face:.10,air:30}]},
        aerial_risk: {pace:['CHALLENGE','REWARD'], hazards:[{at:.60,face:.10,air:52,type:'bird',severity:'minor',radius:.11,motion:'air_drift',amplitude:15,speed:1.05,telegraph:true},{at:.70,face:.76,type:'buoy',severity:'minor',radius:.10}], coins:[{at:.18,face:.76},{at:.29,face:.52},{at:.40,face:.23},{at:.51,face:.10,air:42},{at:.62,face:.10,air:84,star:true},{at:.73,face:.10,air:42}]},
        gull_slalom: {pace:['CHALLENGE'], hazards:[{at:.39,face:.10,air:30,type:'bird',severity:'minor',radius:.095,motion:'air_drift',amplitude:8,speed:.90,telegraph:true},{at:.60,face:.10,air:72,type:'bird',severity:'minor',radius:.095,motion:'air_drift',amplitude:9,speed:1.02,telegraph:true},{at:.80,face:.10,air:42,type:'bird',severity:'minor',radius:.095,motion:'air_drift',amplitude:7,speed:1.12,telegraph:true}], coins:[{at:.22,face:.72},{at:.32,face:.42},{at:.48,face:.10,air:65},{at:.70,face:.10,air:28},{at:.87,face:.10,air:68,star:true}]},
        air_risk_wave_safe: {pace:['BUILD','REWARD'], hazards:[{at:.55,face:.10,air:48,type:'bird',severity:'minor',radius:.11,motion:'air_drift',amplitude:10,speed:.82,telegraph:true}], coins:[{at:.25,face:.70},{at:.38,face:.62},{at:.51,face:.57},{at:.36,face:.15,air:30},{at:.48,face:.10,air:58,star:true},{at:.64,face:.10,air:75}]},
        wave_risk_air_safe: {pace:['CHALLENGE','REWARD'], hazards:[{at:.37,face:.72,type:'buoy',severity:'minor',radius:.10},{at:.58,face:.43,type:'swimmer',severity:'minor',radius:.10,motion:'drift',amplitude:.04,speed:.55},{at:.77,face:.23,type:'surfer',severity:'minor',radius:.10,motion:'drift',amplitude:.05,speed:.72}], coins:[{at:.20,face:.73},{at:.31,face:.46},{at:.42,face:.19},{at:.53,face:.10,air:35},{at:.66,face:.10,air:62,star:true},{at:.79,face:.10,air:34}]},
        reentry_challenge: {pace:['CHALLENGE'], hazards:[{at:.30,face:.77,type:'foam',severity:'minor',radius:.11},{at:.76,face:.20,type:'surfer',severity:'minor',radius:.105,motion:'drift',amplitude:.055,speed:.8}], coins:[{at:.21,face:.70},{at:.35,face:.42},{at:.49,face:.13,air:35},{at:.61,face:.10,air:64,star:true},{at:.72,face:.18},{at:.82,face:.37}]},
        surf_or_fly: {pace:['BUILD','CHALLENGE','REWARD'], hazards:[{at:.48,face:.50,type:'barrel',severity:'minor',radius:.11},{at:.72,face:.10,air:62,type:'bird',severity:'minor',radius:.105,motion:'air_drift',amplitude:11,speed:.88,telegraph:true}], coins:[{at:.24,face:.74},{at:.36,face:.69},{at:.50,face:.72},{at:.26,face:.31},{at:.39,face:.15},{at:.54,face:.10,air:35},{at:.66,face:.10,air:78,star:true}]}
    };

    class EndlessDirector {
        constructor(seed, slice) {
            this.rng = new SeededRandom(seed);
            this.slice = slice;
            this.segments = [];
            this.generated = 0;
            this.recycled = 0;
            this.validationCorrections = 0;
            this.patternsGenerated = 0;
            this.lastPreset = '';
            this.lastPattern = '';
            this.barrelStreak = 0;
            this.generatedHazardTypes = new Set();
            this.generatedCharacters = new Set();
            this.segmentPool = new ObjectPool(() => ({}), (o, d) => Object.assign(o, d));
            this.hazardPool = new ObjectPool(() => ({}), (o, d) => Object.assign(o, d));
            this.collectiblePool = new ObjectPool(() => ({}), (o, d) => Object.assign(o, d));
            this.ensure(0);
        }
        difficulty(distance) { return Math.log1p(Math.max(0, distance) / 900); }
        allowed(distance) {
            if (this.slice === 1) return distance < 500 ? ['gentle'] : distance < 1600 ? ['gentle', 'long'] : ['gentle', 'long', 'steep'];
            if (distance < 500) return ['gentle', 'long'];
            if (distance < 1200) return ['gentle', 'long', 'steep'];
            if (distance < 2200) return ['long', 'steep', 'fast', 'barrel'];
            if (distance < 3200) return ['long', 'steep', 'fast', 'barrel', 'giant'];
            return Object.keys(PRESETS);
        }
        choosePreset(distance, pacing) {
            let choices = this.allowed(distance).filter(id => id !== this.lastPreset || id === 'gentle');
            if (this.barrelStreak >= 1) choices = choices.filter(id => id !== 'barrel');
            if (pacing === 'CALM' || pacing === 'RECOVERY') choices = choices.filter(id => ['gentle', 'long'].includes(id));
            if (pacing === 'CHALLENGE' && distance > 1000) choices = choices.filter(id => !['gentle'].includes(id));
            if (pacing === 'REWARD' && distance > 1100 && choices.includes('barrel') && this.rng.next() < .45) return 'barrel';
            return this.rng.pick(choices.length ? choices : ['long']);
        }
        choosePattern(segment) {
            const remaining=SURF_FINISH_DISTANCE-segment.start;
            if(remaining<=1050&&remaining>-3500)return 'clean';
            if(remaining<=2600&&remaining>-3500)return this.rng.pick(['aerial_clear','aerial_coins','clean']);
            const opening=['low_block','aerial_clear','high_block','aerial_coins','high_low','surf_or_fly','shark_read','s_curve','wave_risk_air_safe','gull_slalom','coastal','pressure','risk_routes','reentry_challenge'];
            if(this.generated<opening.length)return opening[this.generated];
            let choices=Object.keys(PATTERN_LIBRARY).filter(id=>PATTERN_LIBRARY[id].pace.includes(segment.pacing));
            if(segment.difficulty<.55)choices=choices.filter(id=>!['pressure','coastal','shark_read','s_curve','gull_slalom','aerial_risk','reentry_challenge','wave_risk_air_safe'].includes(id));
            else if(segment.difficulty<1.10)choices=choices.filter(id=>!['pressure','shark_read','gull_slalom'].includes(id));
            if(this.lastPattern)choices=choices.filter(id=>id!==this.lastPattern);
            return this.rng.pick(choices.length?choices:['clean']);
        }
        ensure(playerProgress) {
            let end = this.segments.length ? this.segments[this.segments.length - 1].end : 0;
            while (end < playerProgress + 5200) {
                const pacing = PACING[this.generated % PACING.length];
                const difficulty = this.difficulty(end);
                const id = this.choosePreset(end, pacing);
                const base = PRESETS[id];
                // At runner speeds a chunk is one readable decision beat, not a long
                // empty biome. Later chunks can be slightly longer because their
                // patterns contain more internal decisions and still need fair look-ahead.
                const length = this.generated === 0 ? 1000 : Math.round(this.rng.range(980, 1280) + Math.min(250, difficulty * 70));
                const segment = this.segmentPool.take({
                    uid: this.generated + 1, id, pacing, start:end, end:end + length, length,
                    height:base.height * (1 + Math.min(.28, difficulty * .045)),
                    steep:base.steep * (1 + Math.min(.24, difficulty * .035)),
                    energy:base.energy * (1 + Math.min(.25, difficulty * .04)),
                    crest:base.crest, break:base.break, tube:base.tube,
                    hazards:[], collectibles:[], weather:false, difficulty
                });
                this.populate(segment, base);
                this.validate(segment);
                this.segments.push(segment);
                this.generated++;
                this.barrelStreak = id === 'barrel' ? this.barrelStreak + 1 : 0;
                this.lastPreset = id;
                end = segment.end;
            }
            while (this.segments.length > 2 && this.segments[1].end < playerProgress - 1400) {
                const old = this.segments.shift();
                old.hazards.forEach(x => this.hazardPool.release(x));
                old.collectibles.forEach(x => this.collectiblePool.release(x));
                old.hazards.length = 0; old.collectibles.length = 0;
                this.segmentPool.release(old); this.recycled++;
            }
        }
        populate(segment, base) {
            const patternId=this.choosePattern(segment),pattern=PATTERN_LIBRARY[patternId];
            segment.pattern=patternId;segment.routeOptions=2;this.lastPattern=patternId;this.patternsGenerated++;
            if(this.slice>=2||this.generated>0){
                for(const spec of pattern.hazards){
                    const progress=segment.start+segment.length*spec.at,baseFace=spec.face;
                    const characterId = spec.type === 'swimmer' ? this.rng.pick(SWIMMER_IDS) : spec.type === 'surfer' ? this.rng.pick(SURFER_IDS) : spec.type === 'buoy' ? this.rng.pick(BUOY_IDS) : spec.type === 'shark' ? 'shark_01' : spec.type === 'bird' ? 'seagull_01' : spec.type;
                    this.generatedHazardTypes.add(spec.type);this.generatedCharacters.add(characterId);
                    segment.hazards.push(this.hazardPool.take({progress,face:baseFace,baseFace,currentFace:baseFace,air:spec.air||0,currentAir:spec.air||0,type:spec.type,characterId,severity:spec.severity,radius:spec.radius||.105,core:(spec.radius||.105)*.42,motion:spec.motion||'',amplitude:spec.amplitude||0,motionSpeed:spec.speed||0,phase:this.rng.range(0,Math.PI*2),telegraph:!!spec.telegraph,hit:false,passed:false}));
                }
            }
            for(const spec of pattern.coins){segment.collectibles.push(this.collectiblePool.take({progress:segment.start+segment.length*spec.at,face:spec.face,air:spec.air||0,type:spec.star?'star':'coin',taken:false}));}
            segment.weather=segment.difficulty>1.35&&segment.pacing==='CHALLENGE'&&this.rng.next()<.30;
        }
        validate(segment) {
            segment.hazards.sort((a,b) => a.progress-b.progress);
            for (let i=0;i<segment.hazards.length;i++) {
                const hazard=segment.hazards[i];
                if (hazard.progress-segment.start<220) { hazard.progress=segment.start+220; this.validationCorrections++; }
                if (i>0 && hazard.progress-segment.hazards[i-1].progress<185) { hazard.progress=segment.hazards[i-1].progress+185; this.validationCorrections++; }
                hazard.progress=Math.min(hazard.progress,segment.end-160);
                hazard.face=hazard.baseFace=hazard.currentFace=clamp(hazard.face,.16,.88);
                const highOpen=hazard.face-hazard.radius>.14,lowOpen=hazard.face+hazard.radius<.90;
                if(!highOpen&&!lowOpen){hazard.face=hazard.baseFace=hazard.currentFace=.52;this.validationCorrections++;}
            }
            segment.routeOptions=segment.hazards.length?2:3;
        }
        current(progress) {
            this.ensure(progress);
            let index=this.segments.findIndex(s=>progress>=s.start&&progress<s.end);
            if(index<0)index=0;
            const segment=this.segments[index], next=this.segments[index+1]||segment;
            const phase=clamp((progress-segment.start)/segment.length,0,1);
            const blend=smooth(clamp((phase-.72)/.28,0,1));
            const profile={...segment};
            for(const key of ['height','steep','energy','crest','break','tube'])profile[key]=lerp(segment[key],next[key],blend);
            if(this.slice===1)profile.tube=0;
            profile.tubeAmount=profile.tube*smooth(clamp((phase-.16)/.20,0,1))*smooth(clamp((.88-phase)/.18,0,1));
            return {segment,next,phase,blend,profile,index};
        }
        activeCounts(){return {segments:this.segments.length,hazards:this.segments.reduce((n,s)=>n+s.hazards.length,0),collectibles:this.segments.reduce((n,s)=>n+s.collectibles.length,0),patterns:this.patternsGenerated};}
        clearForFinale(progress){
            for(const segment of this.segments){
                for(const hazard of segment.hazards)if(!hazard.hit&&hazard.progress>progress-80)hazard.hit=true;
                for(const item of segment.collectibles)if(!item.taken&&item.progress>progress-80)item.taken=true;
            }
        }
    }

    const COLOR_PHASES = [
        {at:0, name:'DAY', sky:'#79dcf2', horizon:'#c2f4e7', deep:'#063d68', mid:'#087b9e', light:'#1bc3bc', hi:'#a8ffe3', foam:'#efffe9'},
        {at:.30, name:'AFTERNOON', sky:'#71cde5', horizon:'#ffd19a', deep:'#0a3b66', mid:'#117494', light:'#2bb7ae', hi:'#b7f2cf', foam:'#fff5da'},
        {at:.48, name:'SUNSET', sky:'#d6758d', horizon:'#ffc16c', deep:'#182d59', mid:'#1b5e7d', light:'#319d98', hi:'#f2d28d', foam:'#fff0d3'},
        {at:.68, name:'NIGHT', sky:'#14234b', horizon:'#596985', deep:'#06152f', mid:'#0a3e61', light:'#117985', hi:'#7bcbd0', foam:'#d9f6ed'},
        {at:.88, name:'DAWN', sky:'#765e92', horizon:'#f4a675', deep:'#112348', mid:'#155875', light:'#238f91', hi:'#c4d8bd', foam:'#ecf6df'},
        {at:1, name:'DAY', sky:'#79dcf2', horizon:'#c2f4e7', deep:'#063d68', mid:'#087b9e', light:'#1bc3bc', hi:'#a8ffe3', foam:'#efffe9'}
    ];

    const SURF_VISUAL={
        horizon:{islandScroll:.018,waterScroll:.034,boatScroll:.022,hazeAlpha:.22,farWaveCount:7},
        water:{depthStops:[.05,.34,.71,1],patternAlpha:.34,flowLineCount:9,patchCount:13},
        foam:{chaseStart:80,chaseReach:7,speckCount:34,crestJitter:2.8,wallBaseX:88,wallDepth:.88,wallBulges:18,wallAmplitude:4.6,lipReach:60},
        tube:{archWidth:128,archHeight:74,openingRadiusX:28,openingRadiusY:43},
        parallax:{sky:.006,islands:.018,ocean:.034,decor:.022,beach:.72}
    };

    class BeachBackdrop {
        constructor(assets) {
            this.assets=assets;this.byName=null;this.visible=0;this.peopleVisible=0;this.drawCalls=0;this.whaleVisible=false;this.boatsVisible=0;
            this.beachTopY=Math.round(H*.76);this.shorelineY=this.beachTopY+18;this.tileWidth=190;this.parallax=SURF_VISUAL.parallax.beach;
            this.presets={
                BEACH_EMPTY:[],
                BEACH_FAMILY:[
                    {x:35,file:'beach_umbrella_red_01.png',scale:.205,motion:'sway'},
                    {x:75,file:'beach_person_chair_01.png',scale:.14,person:true},
                    {x:116,file:'beach_child_play_01.png',scale:.14,person:true,motion:'play'},
                    {x:151,file:'beach_children_sandcastle_01.png',scale:.135,person:true,motion:'play'}
                ],
                BEACH_SURFERS:[
                    {x:36,file:'beach_towel_01.png',scale:.18},
                    {x:84,file:'beach_surfer_carry_01.png',scale:.145,person:true,motion:'walk'},
                    {x:139,file:'beach_child_sunglasses_01.png',alt:'beach_child_sunglasses_02.png',scale:.14,person:true,motion:'alternate'}
                ],
                BEACH_LIFEGUARD:[
                    {x:32,file:'beach_sign_01.png',scale:.18},
                    {x:86,file:'beach_lifeguard_01.png',scale:.145,person:true,motion:'watch'},
                    {x:137,file:'beach_cooler_01.png',scale:.18}
                ],
                BEACH_UMBRELLAS:[
                    {x:28,file:'beach_umbrella_red_01.png',scale:.215,motion:'sway'},
                    {x:79,file:'beach_person_female_pink_01.png',alt:'beach_person_female_pink_02.png',scale:.14,person:true,motion:'alternate'},
                    {x:126,file:'beach_child_sit_02.png',scale:.135,person:true},
                    {x:161,file:'beach_towel_01.png',scale:.17}
                ],
                BEACH_CHEERING:[
                    {x:43,file:'beach_person_male_cheer_01.png',alt:'beach_person_male_cheer_02.png',scale:.145,person:true,motion:'alternate'},
                    {x:93,file:'beach_child_confetti_01.png',alt:'beach_child_confetti_02.png',scale:.14,person:true,motion:'alternate'},
                    {x:145,file:'beach_person_cheer_01.png',scale:.145,person:true,motion:'cheer'}
                ],
                BEACH_PALMS:[
                    {x:32,file:'beach_palm_01.png',scale:.245,motion:'sway'},
                    {x:92,file:'beach_child_flower_01.png',scale:.14,person:true,motion:'play'},
                    {x:151,file:'beach_palm_01.png',scale:.215,motion:'sway',flip:true}
                ]
            };
            this.presetSequence=['BEACH_EMPTY','BEACH_FAMILY','BEACH_EMPTY','BEACH_SURFERS','BEACH_PALMS','BEACH_EMPTY','BEACH_LIFEGUARD','BEACH_UMBRELLAS','BEACH_EMPTY','BEACH_CHEERING','BEACH_PALMS'];
        }
        prepare(){
            if(this.byName||!this.assets||!this.assets.ready)return !!this.byName;
            this.byName=new Map();
            for(const entry of this.assets.sequence('beach'))this.byName.set(entry.file.split('/').pop(),entry);
            return true;
        }
        drawDistant(ctx,p,distance,time,forceWhale=false){
            const skyWater=ctx.createLinearGradient(0,68,0,116);skyWater.addColorStop(0,mix(p.horizon,p.sky,.46));skyWater.addColorStop(.46,p.horizon);skyWater.addColorStop(1,mix(p.mid,p.horizon,.58));ctx.fillStyle=skyWater;ctx.fillRect(0,68,W,50);
            const farScroll=(distance*SURF_VISUAL.parallax.islands)%760;
            const islands=[{x:12,w:102,h:13,shade:.72},{x:143,w:154,h:22,shade:.61},{x:352,w:128,h:16,shade:.76},{x:559,w:158,h:25,shade:.62},{x:775,w:96,h:12,shade:.8}];
            for(let layer=0;layer<2;layer++){
                ctx.fillStyle=mix(p.horizon,p.deep,layer?.37:.24);ctx.globalAlpha=layer?.35:.22;
                for(const island of islands){const x=island.x-farScroll*(layer?1:.62),y=91+layer*4,base=y+island.h*.16;for(const dx of [0,760]){ctx.beginPath();ctx.moveTo(x+dx,base);ctx.bezierCurveTo(x+dx+island.w*.18,y-island.h*.38,x+dx+island.w*.30,y-island.h,x+dx+island.w*.50,y-island.h*.72);ctx.bezierCurveTo(x+dx+island.w*.67,y-island.h*.34,x+dx+island.w*.82,y-island.h*.84,x+dx+island.w,y);ctx.lineTo(x+dx+island.w,y+5);ctx.lineTo(x+dx,y+5);ctx.closePath();ctx.fill();}}
            }
            ctx.globalAlpha=1;
            // Haze softens the join between island silhouettes and open water.
            const haze=ctx.createLinearGradient(0,84,0,109);haze.addColorStop(0,'rgba(255,255,255,0)');haze.addColorStop(.48,`rgba(238,255,245,${SURF_VISUAL.horizon.hazeAlpha})`);haze.addColorStop(1,'rgba(190,242,236,.06)');ctx.fillStyle=haze;ctx.fillRect(0,82,W,28);
            this.drawDistantSwells(ctx,p,distance,time);this.drawBoats(ctx,p,distance,time);this.drawDistantBirds(ctx,p,distance,time);this.drawWhale(ctx,p,time,forceWhale);
        }
        drawDistantSwells(ctx,p,distance,time){
            ctx.save();ctx.lineCap='round';
            for(let layer=0;layer<3;layer++){const y0=91+layer*5,scroll=distance*(SURF_VISUAL.parallax.ocean*(.56+layer*.28)),amp=1.6+layer*.65;ctx.globalAlpha=.14+layer*.055;ctx.strokeStyle=layer===0?p.hi:mix(p.mid,p.horizon,.48+layer*.08);ctx.lineWidth=layer===0?1:2;for(let i=0;i<SURF_VISUAL.horizon.farWaveCount;i++){const x=((i*83-scroll)%560+560)%560-55,phase=i*1.61+time*(.34+layer*.08);ctx.beginPath();ctx.moveTo(x,y0+Math.sin(phase)*amp);ctx.bezierCurveTo(x+12,y0-amp-Math.sin(phase*.7)*.6,x+26,y0-amp*.65+Math.cos(phase)*.8,x+44+i%3*5,y0+Math.sin(phase+1)*amp*.48);ctx.stroke();}}
            ctx.globalAlpha=1;ctx.restore();
        }
        drawBoats(ctx,p,distance,time){
            const scroll=distance*SURF_VISUAL.parallax.boatScroll,boats=[{x:36,y:96,type:0,s:.78},{x:212,y:102,type:1,s:.62},{x:478,y:94,type:2,s:.72},{x:692,y:100,type:0,s:.55}];this.boatsVisible=0;ctx.save();ctx.globalAlpha=p.name==='NIGHT'?.42:.50;
            for(const boat of boats){const x=((boat.x-scroll)%760+760)%760-110,y=boat.y+Math.sin(time*.55+boat.x)*.8;if(x<-40||x>W+40)continue;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(boat.s,boat.s);ctx.fillStyle=mix(p.deep,p.horizon,.32);ctx.beginPath();ctx.moveTo(-10,1);ctx.lineTo(11,1);ctx.lineTo(7,5);ctx.lineTo(-7,5);ctx.closePath();ctx.fill();ctx.strokeStyle=mix(p.deep,p.horizon,.35);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-12);ctx.stroke();if(boat.type===0){ctx.fillStyle=mix(p.foam,p.horizon,.32);ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,-1);ctx.lineTo(7,-1);ctx.closePath();ctx.fill();}else if(boat.type===1){ctx.fillStyle=mix(p.hi,p.horizon,.45);ctx.beginPath();ctx.moveTo(-1,-9);ctx.lineTo(-1,-1);ctx.lineTo(-6,-1);ctx.closePath();ctx.fill();}else{ctx.fillStyle=mix(p.deep,p.horizon,.24);ctx.fillRect(-3,-3,7,3);ctx.fillStyle=mix(p.hi,p.horizon,.55);ctx.fillRect(-1,-7,2,4);}ctx.restore();this.boatsVisible++;}
            ctx.restore();
        }
        drawDistantBirds(ctx,p,distance,time){
            ctx.save();ctx.globalAlpha=.34;ctx.strokeStyle=mix(p.deep,p.horizon,.24);ctx.lineWidth=1;for(let i=0;i<4;i++){const x=((i*149-distance*.045+time*3)%530+530)%530-35,y=78+(i%3)*6+Math.sin(time*.8+i)*1.5,wing=2+Math.sin(time*3+i)*.8;ctx.beginPath();ctx.moveTo(x-wing,y);ctx.quadraticCurveTo(x,y-wing,x+wing,y);ctx.stroke();}ctx.restore();
        }
        drawWhale(ctx,p,time,force=false){
            const cycle=(time+13)%119,active=force||cycle<5.2;this.whaleVisible=active;if(!active)return;
            const t=force?2.35:cycle,arc=clamp(Math.sin((t-.8)*Math.PI/2.5),0,1),breach=t>1.3&&t<3.55,x=326+Math.sin(t*.42)*10,y=100-arc*(breach?11:3),alpha=p.name==='NIGHT'?.32:.43;
            ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=mix(p.deep,p.horizon,.27);ctx.translate(Math.round(x),Math.round(y));ctx.rotate(breach?Math.sin(t*1.2)*.12:0);ctx.beginPath();ctx.ellipse(0,0,17,4.1,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-20,-5);ctx.lineTo(-19,2);ctx.lineTo(-15,3);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(2,2);ctx.lineTo(8,6);ctx.lineTo(-3,4);ctx.closePath();ctx.fill();ctx.restore();
            if(t>3.25||force){const splash=force?1:clamp((t-3.25)/1.3,0,1);ctx.save();ctx.globalAlpha=alpha*.7*splash;ctx.strokeStyle=mix(p.foam,p.horizon,.42);ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,103,7+splash*10,1+splash*2,0,Math.PI,Math.PI*2);ctx.stroke();ctx.fillStyle=p.hi;for(let i=0;i<5;i++)ctx.fillRect(Math.round(x-9+i*4),102-Math.abs(2-i%3)*splash,1,1);ctx.restore();}
        }
        drawShore(ctx,p,distance,time){
            const top=this.beachTopY,shore=this.shorelineY;
            ctx.fillStyle=mix(p.light,p.hi,.35);ctx.beginPath();ctx.moveTo(0,top);
            for(let x=0;x<=W;x+=18)ctx.lineTo(x,top+Math.sin(x*.063+time*1.1)*2);
            ctx.lineTo(W,shore+6);ctx.lineTo(0,shore+6);ctx.closePath();ctx.fill();
            ctx.globalAlpha=.76;ctx.strokeStyle=p.foam;ctx.lineWidth=3;ctx.beginPath();
            for(let x=0;x<=W;x+=12){const y=shore-5+Math.sin(x*.052+time*1.6)*2;if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
            ctx.globalAlpha=1;ctx.fillStyle=mix('#e8bf70',p.horizon,.18);ctx.beginPath();ctx.moveTo(0,shore);
            for(let x=0;x<=W;x+=16)ctx.lineTo(x,shore+Math.sin(x*.047-time*.34)*2);
            ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
            ctx.globalAlpha=.24;ctx.fillStyle='#fff2bc';const sandScroll=(distance*.32)%74;
            for(let i=-1;i<8;i++)ctx.fillRect(Math.round(i*74-sandScroll),shore+16+(i%3)*10,20+i%2*7,2);
            ctx.globalAlpha=1;
        }
        drawProps(ctx,p,distance,time){
            this.visible=0;this.peopleVisible=0;this.drawCalls=0;if(!this.prepare())return;
            const scroll=distance*this.parallax,start=Math.floor(scroll/this.tileWidth),night=p.name==='NIGHT';ctx.imageSmoothingEnabled=false;
            for(let tile=start-1;tile<=start+Math.ceil(W/this.tileWidth)+1;tile++){
                const presetName=this.presetSequence[((tile%this.presetSequence.length)+this.presetSequence.length)%this.presetSequence.length],items=this.presets[presetName],tileX=tile*this.tileWidth-scroll;
                for(let i=0;i<items.length;i++){
                    const item=items[i],x=tileX+item.x;if(x<-58||x>W+58)continue;
                    const frame=item.alt&&Math.floor(time*2+tile+i)%2?item.alt:item.file,entry=this.byName.get(frame);if(!entry)continue;
                    const phase=tile*.71+i*.83,bob=['cheer','play','alternate','walk'].includes(item.motion)?Math.round(Math.sin(time*(item.motion==='cheer'?5:2.4)+phase)):0;
                    ctx.save();ctx.translate(Math.round(x),H-9+bob);if(item.flip)ctx.scale(-1,1);ctx.globalAlpha=night?.72:.92;
                    if(item.motion==='sway')ctx.rotate(Math.sin(time*.72+phase)*.014);
                    this.assets.drawAtContact(ctx,entry,0,0,item.scale);ctx.restore();this.visible++;this.drawCalls++;if(item.person)this.peopleVisible++;
                }
            }
            ctx.globalAlpha=1;
        }
        drawCelebration(ctx,p,time,intensity){
            this.celebrationVisible=0;if(intensity<=0||!this.prepare())return;
            const crowd=[
                {x:34,file:'beach_person_male_cheer_01.png',alt:'beach_person_male_cheer_02.png',scale:.15},
                {x:92,file:'beach_child_confetti_01.png',alt:'beach_child_confetti_02.png',scale:.145},
                {x:358,file:'beach_person_cheer_01.png',scale:.15},
                {x:415,file:'beach_child_confetti_01.png',alt:'beach_child_confetti_02.png',scale:.14}
            ];
            for(let i=0;i<crowd.length;i++){
                const item=crowd[i],file=item.alt&&Math.floor(time*4+i)%2?item.alt:item.file,entry=this.byName.get(file);if(!entry)continue;
                const bob=Math.round(Math.abs(Math.sin(time*5.4+i))*2*intensity);ctx.save();ctx.translate(item.x,H-8-bob);ctx.globalAlpha=.72+intensity*.25;this.assets.drawAtContact(ctx,entry,0,0,item.scale);ctx.restore();this.celebrationVisible++;
            }
            ctx.save();ctx.globalAlpha=.35+intensity*.55;const colors=['#fff4a8','#ff8d79','#74f2dc','#ffffff'];
            for(let i=0;i<20;i++){const x=(i*61+Math.floor(time*52))%W,y=this.beachTopY+7+((i*29+Math.floor(time*34))%58);ctx.fillStyle=colors[i%colors.length];ctx.fillRect(x,y,1+i%2,1+i%3===0?2:1);}
            ctx.restore();
        }
        drawForeground(ctx,p,distance,time,celebration=0){this.drawShore(ctx,p,distance,time);this.drawProps(ctx,p,distance,time);this.drawCelebration(ctx,p,time,celebration);}
        diagnostics(){return{loaded:this.byName?this.byName.size:0,beachTopY:this.beachTopY,screenPercent:+((H-this.beachTopY)/H*100).toFixed(1),presets:Object.keys(this.presets),parallax:this.parallax,visible:this.visible,peopleVisible:this.peopleVisible,drawCalls:this.drawCalls,whaleVisible:this.whaleVisible,boatsVisible:this.boatsVisible,celebrationVisible:this.celebrationVisible||0};}
    }

    class EndlessRenderer {
        constructor(assets) {
            this.trail=[]; this.spray=[]; this.rain=[];
            this.beach=new BeachBackdrop(assets);
            this.pattern=document.createElement('canvas');this.pattern.width=96;this.pattern.height=96;
            const p=this.pattern.getContext('2d');p.imageSmoothingEnabled=false;
            const rng=new SeededRandom(4815);
            for(let i=0;i<44;i++){const x=Math.floor(rng.range(0,96)),y=Math.floor(rng.range(0,96)),w=Math.floor(rng.range(4,18));p.fillStyle=i%4?'rgba(176,255,236,.12)':'rgba(0,28,60,.16)';p.fillRect(x,y,w,1);if(i%5===0){p.fillStyle='rgba(210,255,242,.10)';p.fillRect(x+2,y+1,Math.max(2,w-5),1);}}
            this.facePatches=[];for(let i=0;i<SURF_VISUAL.water.patchCount;i++)this.facePatches.push({x:rng.range(-20,W+20),face:rng.range(.16,.88),w:rng.range(14,48),h:rng.range(2,8),phase:rng.range(0,Math.PI*2),tone:i%3});
        }
        palette(distance) {
            const phase=(distance%8000)/8000;
            let a=COLOR_PHASES[0],b=COLOR_PHASES[1];
            for(let i=0;i<COLOR_PHASES.length-1;i++)if(phase>=COLOR_PHASES[i].at&&phase<=COLOR_PHASES[i+1].at){a=COLOR_PHASES[i];b=COLOR_PHASES[i+1];break;}
            const t=smooth(clamp((phase-a.at)/(b.at-a.at||1),0,1)),out={name:t<.5?a.name:b.name};
            for(const key of ['sky','horizon','deep','mid','light','hi','foam'])out[key]=mix(a[key],b[key],t);
            return out;
        }
        // The curve describes the *bounds* and crest of a wave, never a rail that the
        // board must follow.  The playable face is the large continuous area below it.
        curve(profile,time){
            const wobble=Math.sin(time*.82)*2.1+Math.sin(time*1.71)*.8;
            const visualHeight=clamp(profile.height,.50,1.75);
            return {
                crestY:112-visualHeight*13+wobble,
                lowerY:this.beach.beachTopY-5,
                lipStrength:profile.crest,
                facePulse:Math.sin(time*1.18)*1.7, time
            };
        }
        crestY(curve,x,time=curve.time||0){return curve.crestY+Math.sin(x*.045+time*2.1)*2.8+Math.sin(x*.018-time*1.25)*1.8+Math.sin(x*.091-time*3.1)*.72;}
        faceY(curve,verticalPosition,x=205){
            const t=clamp(verticalPosition,0,1);
            // A slight ease gives the lower face visual weight, without turning it into
            // a diagonal floor.  Every x shares the same broad vertical face.
            return lerp(this.crestY(curve,x),curve.lowerY,t*.76+t*t*.24)+Math.sin(x*.028+curve.time*1.45+t*8)*1.35;
        }
        sample(curve,t,x=205){const y=this.faceY(curve,t,x),dy=this.faceY(curve,clamp(t+.01,0,1),x)-y;return{x,y,tx:1,ty:dy,nx:-dy,ny:1,angle:Math.atan2(dy,.01)};}
        wallEdgeX(u,front,time,amount,offset=0){
            const lipBulge=25*Math.exp(-Math.pow((u-.15)/.16,2)),fallingFace=-32*Math.pow(u,.94);
            const swell=Math.sin(u*15.5+time*.76)*SURF_VISUAL.foam.wallAmplitude*(.45+amount*.55)+Math.sin(u*31-time*.48)*1.35;
            return front-13+lipBulge+fallingFace+swell+offset;
        }
        path(curve,time){
            const path=new Path2D();
            path.moveTo(0,H);path.lineTo(0,this.crestY(curve,0,time)+7);
            const steps=36;for(let i=0;i<=steps;i++){const x=i/steps*W,y=this.crestY(curve,x,time)+5+Math.sin(i*1.63+time*2.2)*1.3;if(i===steps)path.lineTo(x,y);else{const nx=(i+1)/steps*W,ny=this.crestY(curve,nx,time)+5+Math.sin((i+1)*1.63+time*2.2)*1.3;path.quadraticCurveTo((x+nx)*.5,(y+ny)*.5,nx,ny);}}
            path.lineTo(W,H);path.closePath();return path;
        }
        background(ctx,p,distance,weather,time=0,forceWhale=false){
            const sky=ctx.createLinearGradient(0,0,0,112);sky.addColorStop(0,p.sky);sky.addColorStop(.72,mix(p.sky,p.horizon,.54));sky.addColorStop(1,p.horizon);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
            ctx.globalAlpha=.12;ctx.fillStyle='#ffffff';for(let i=0;i<6;i++){const x=((i*119-distance*SURF_VISUAL.parallax.sky)%620+620)%620-70,y=18+(i%3)*14+Math.sin(time*.18+i)*.7;ctx.fillRect(x,y,34+i%2*15,2);ctx.fillRect(x+7,y-3,18,3);}ctx.globalAlpha=1;
            if(p.name==='NIGHT'){ctx.fillStyle='#fffbd3';for(let i=0;i<20;i++)ctx.fillRect((i*47+19)%W,10+(i*31)%70,1,1);ctx.beginPath();ctx.arc(383,36,11,0,Math.PI*2);ctx.fill();}
            else{ctx.fillStyle='#fff0aa';ctx.beginPath();ctx.arc(378,38,14,0,Math.PI*2);ctx.fill();}
            this.beach.drawDistant(ctx,p,distance,time,forceWhale);
            if(weather){ctx.fillStyle='rgba(16,28,45,.28)';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(190,225,232,.55)';for(let i=0;i<38;i++){const x=(i*53+distance*.6)%W,y=(i*37+distance*.9)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+10);ctx.stroke();}}
        }
        beachForeground(ctx,p,distance,time,celebration=0){this.beach.drawForeground(ctx,p,distance,time,celebration);canvas.dataset.surfBeachDiagnostics=JSON.stringify(this.beach.diagnostics());}
        drawFaceRibbon(ctx,curve,{face,color,alpha,width,amp,phase},time,speed){
            ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();const drift=time*(.9+speed*.002)+phase,steps=24;for(let i=0;i<=steps;i++){const x=i/steps*W,edge=this.faceY(curve,face,x)+Math.sin(i*.57+drift)*amp+Math.sin(i*.21-drift*.7+phase)*amp*.42;if(!i)ctx.moveTo(x,edge);else ctx.lineTo(x,edge);}for(let i=steps;i>=0;i--){const x=i/steps*W,edge=this.faceY(curve,face,x)+width+Math.sin(i*.49-drift*1.2+phase)*amp*.64+Math.sin(i*.19+drift)*amp*.25;ctx.lineTo(x,edge);}ctx.closePath();ctx.fill();ctx.restore();
        }
        wave(ctx,profile,curve,p,distance,time,speed=290){
            const path=this.path(curve,time),flow=clamp((speed-190)/300,0,1);ctx.save();ctx.clip(path);
            const depth=ctx.createLinearGradient(0,curve.crestY,0,curve.lowerY);depth.addColorStop(0,mix(p.light,p.hi,.42));depth.addColorStop(.18,p.light);depth.addColorStop(.48,p.mid);depth.addColorStop(.79,p.deep);depth.addColorStop(1,mix(p.deep,'#032644',.22));ctx.fillStyle=depth;ctx.fillRect(0,curve.crestY-12,W,H);
            const underside=ctx.createLinearGradient(0,curve.crestY,0,curve.lowerY);underside.addColorStop(0,'rgba(255,255,255,.13)');underside.addColorStop(.22,'rgba(108,244,226,.08)');underside.addColorStop(.62,'rgba(0,28,59,.02)');underside.addColorStop(1,'rgba(0,12,38,.28)');ctx.fillStyle=underside;ctx.fillRect(0,curve.crestY,W,H);
            this.drawFaceRibbon(ctx,curve,{face:.78,color:p.deep,alpha:.33,width:curve.lowerY-curve.crestY,amp:3.5,phase:1.3},time,speed);
            this.drawFaceRibbon(ctx,curve,{face:.55,color:p.mid,alpha:.30,width:16+flow*3,amp:5,phase:2.1},time,speed);
            this.drawFaceRibbon(ctx,curve,{face:.34,color:p.light,alpha:.30,width:12,amp:4,phase:4.8},time,speed);
            this.drawFaceRibbon(ctx,curve,{face:.16,color:p.hi,alpha:.18,width:6,amp:3,phase:.4},time,speed);
            // Cached dapple pattern adds grain without drawing a visible scanline grid.
            const pattern=ctx.createPattern(this.pattern,'repeat');ctx.save();ctx.translate(-(distance*(.20+flow*.18))%96,(distance*.028)%96);ctx.globalAlpha=SURF_VISUAL.water.patternAlpha;ctx.fillStyle=pattern;ctx.fillRect(-96,curve.crestY,W+192,H);ctx.restore();
            for(const patch of this.facePatches){const x=((patch.x-distance*(.035+flow*.026))%(W+70)+W+70)%(W+70)-35,y=this.faceY(curve,patch.face,x)+Math.sin(time*1.3+patch.phase)*3;ctx.globalAlpha=patch.tone===0?.12:patch.tone===1?.08:.06;ctx.fillStyle=patch.tone===1?p.deep:p.hi;ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),patch.w*(1+flow*.18),patch.h,Math.sin(patch.phase)*.08,0,Math.PI*2);ctx.fill();}
            // A small set of curved highlights follows the water's forward flow.
            ctx.lineCap='round';for(let i=0;i<SURF_VISUAL.water.flowLineCount;i++){const base=((i*.113+distance*.000065)% .82)+.08,x0=((i*59-distance*(.11+flow*.08))%590+590)%590-70,face=base;ctx.globalAlpha=.13+flow*.08+(i%4===0?.06:0);ctx.strokeStyle=i%4===0?p.hi:mix(p.light,p.hi,.48);ctx.lineWidth=i%4===0?2:1;ctx.beginPath();for(let k=0;k<5;k++){const x=x0+k*(17+flow*7),f=clamp(face+Math.sin(k*.9+i*1.7+time*.55)*.015,0,1),y=this.faceY(curve,f,x)+Math.sin(k*.75+i+time*1.1)*1.8;if(k===0)ctx.moveTo(x,y);else ctx.quadraticCurveTo(x-4,y-2,x,y);}ctx.stroke();}
            // Broken light on the shoulder, restrained so the playable face stays calm.
            ctx.globalAlpha=.20;ctx.fillStyle=mix(p.hi,p.horizon,.32);for(let i=0;i<6;i++){const x=((i*89-distance*(.14+flow*.1))%520+520)%520-30,y=this.faceY(curve,.09+i*.026,x)+Math.sin(time*1.5+i)*2;ctx.fillRect(Math.round(x),Math.round(y),11+i%3*4,1);}
            ctx.restore();return path;
        }
        whitewater(ctx,curve,profile,p,time,playerX,chaseGap=70){
            const chase=1-clamp((chaseGap-SURF_VISUAL.foam.chaseReach)/(SURF_VISUAL.foam.chaseStart-SURF_VISUAL.foam.chaseReach),0,1),surge=Math.pow(chase,.88),tube=clamp(profile.tubeAmount||0,0,1),amount=clamp(.26+profile.break*.18+surge*.45+tube*.13,0,.98);
            const front=lerp(SURF_VISUAL.foam.wallBaseX,playerX-14,surge),top=this.crestY(curve,front,time)-2,bottom=curve.lowerY-7,depth=bottom-top;
            this.whitewaterFront=front;this.breakFrontX=front;this.whitewaterAmount=amount;this.whitewaterChase=chase;
            const edgeAt=(u,offset=0)=>this.wallEdgeX(u,front,time,amount,offset);
            // A dark blue shoulder sits just outside the foam, giving the breaker a wall.
            ctx.save();ctx.globalAlpha=.38+surge*.18;ctx.strokeStyle=mix(p.deep,p.mid,.38);ctx.lineWidth=17+surge*11;ctx.lineCap='round';ctx.beginPath();
            for(let i=0;i<=22;i++){const u=i/22,x=edgeAt(u,9),y=top+depth*u;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.restore();

            // Three nested silhouettes build the breaker from backwash to its bright front.
            for(let layer=0;layer<3;layer++){
                const offset=layer===0?-27:layer===1?-12:0,alpha=layer===0?.48:layer===1?.72:.95;
                ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(-18,top-8);
                for(let i=0;i<=28;i++){const u=i/28;ctx.lineTo(edgeAt(u,offset),top+depth*u);}
                ctx.lineTo(-18,bottom+7);ctx.closePath();
                if(layer===0){ctx.fillStyle=mix(p.mid,p.hi,.56);}
                else if(layer===1){const backwash=ctx.createLinearGradient(0,top,0,bottom);backwash.addColorStop(0,mix(p.foam,p.hi,.10));backwash.addColorStop(.34,mix(p.hi,p.light,.20));backwash.addColorStop(1,mix(p.mid,p.deep,.12));ctx.fillStyle=backwash;}
                else{const foamBody=ctx.createLinearGradient(0,top,0,bottom);foamBody.addColorStop(0,mix(p.foam,p.hi,.04));foamBody.addColorStop(.26,mix(p.foam,p.hi,.20));foamBody.addColorStop(.64,mix(p.hi,p.light,.24));foamBody.addColorStop(1,mix(p.light,p.mid,.42));ctx.fillStyle=foamBody;}
                ctx.fill();ctx.restore();
            }

            // Broken streaks flow through the whitewater instead of forming a cotton cloud.
            ctx.save();ctx.lineCap='round';for(let i=0;i<13;i++){
                const u=.12+(i%7)*.115, y=top+depth*u+Math.sin(time*.9+i*1.8)*3;
                const x=edgeAt(u,-14-(i%4)*9)-12, len=8+(i%5)*4+surge*7;
                ctx.globalAlpha=.22+(i%3)*.08;ctx.strokeStyle=i%4===0?p.foam:mix(p.foam,p.hi,.28);ctx.lineWidth=i%5===0?2:1;
                ctx.beginPath();ctx.moveTo(Math.round(x-len),Math.round(y+2));ctx.quadraticCurveTo(Math.round(x-len*.45),Math.round(y-2),Math.round(x),Math.round(y));ctx.stroke();
            }
            // Uneven foam lobes attach to the falling lip; their motion is slow and seeded.
            for(let i=0;i<SURF_VISUAL.foam.wallBulges;i++){
                const u=((i*.6180339+time*.018)%1),x=edgeAt(u,2+Math.sin(i*2.11+time*.65)*(4+surge*5)),y=top+depth*u,r=1.6+(i%4)*.85+surge*1.25;
                ctx.globalAlpha=.60+(i%3)*.11;ctx.fillStyle=i%4===0?mix(p.foam,p.hi,.18):p.foam;
                ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),r*1.65,r*.82,Math.sin(i*1.4)*.22,0,Math.PI*2);ctx.fill();
                if(i%3===0){ctx.globalAlpha=.58;ctx.fillStyle=p.hi;ctx.fillRect(Math.round(x-r*2.2),Math.round(y+1),Math.round(r*1.7),1);}
            }
            ctx.restore();

            // Spray lifts above the hook; danger broadens the plume toward the surfer.
            ctx.save();ctx.fillStyle=p.foam;for(let i=0;i<20;i++){
                const u=(i*29.7+time*3.1)%91/91,x=front-22+Math.sin(i*2.7+time*.92)*(7+surge*14)+u*8;
                const y=top-3-Math.abs(Math.sin(i*1.73+time*1.15))*(4+amount*11),size=i%6===0?2:1;
                ctx.globalAlpha=.36+surge*.35;ctx.fillRect(Math.round(x),Math.round(y),size,i%4===0?2:1);
            }ctx.restore();
        }
        crest(ctx,curve,p,time,profile){
            const strength=clamp(profile.crest*.42+profile.break*.3,0,1.4),chase=this.whitewaterChase||0,tube=clamp(profile.tubeAmount||0,0,1),curl=clamp(profile.break*.48+chase*.18+tube*.24,0,.72);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
            // Keep the far crest readable, reserving thickness for the active breaking section.
            const layers=[{color:p.mid,width:8+strength*2,alpha:.16},{color:p.hi,width:4.5+strength,alpha:.48},{color:p.foam,width:2+strength*.35,alpha:.72}];
            for(let layer=0;layer<layers.length;layer++){const spec=layers[layer];ctx.globalAlpha=spec.alpha;ctx.strokeStyle=spec.color;ctx.lineWidth=spec.width;ctx.beginPath();for(let i=0;i<=40;i++){const x=i/40*W,jitter=Math.sin(i*1.32+time*(1.4+layer*.16))*SURF_VISUAL.foam.crestJitter*.58+Math.sin(i*.29-time*.8)*1.1,y=this.crestY(curve,x,time)-layer*1.1+jitter;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
            // Thick, asymmetric overhang where the foam front falls down the wave wall.
            const lipX=clamp(this.breakFrontX||SURF_VISUAL.foam.wallBaseX,24,W-28),lipY=this.crestY(curve,lipX,time),reach=SURF_VISUAL.foam.lipReach*(.54+curl*.48),lipGrad=ctx.createLinearGradient(lipX-reach,lipY-3,lipX+14,lipY+22);
            lipGrad.addColorStop(0,mix(p.hi,p.light,.35));lipGrad.addColorStop(.46,mix(p.hi,p.foam,.30));lipGrad.addColorStop(1,mix(p.mid,p.deep,.28));
            ctx.globalAlpha=.84;ctx.fillStyle=lipGrad;ctx.beginPath();ctx.moveTo(lipX-reach,lipY-3);ctx.bezierCurveTo(lipX-reach*.56,lipY-11-curl*5,lipX-12,lipY-2,lipX+12+curl*8,lipY+11+curl*8);ctx.bezierCurveTo(lipX+21+curl*11,lipY+18+curl*9,lipX+13,lipY+24+curl*7,lipX+3,lipY+17+curl*5);ctx.bezierCurveTo(lipX-15,lipY+7,lipX-reach*.50,lipY+4,lipX-reach,lipY+8);ctx.closePath();ctx.fill();
            ctx.globalAlpha=.95;ctx.strokeStyle=mix(p.hi,p.foam,.40);ctx.lineWidth=2.4+curl*2.3;ctx.beginPath();ctx.moveTo(lipX-reach,lipY-2);ctx.bezierCurveTo(lipX-reach*.56,lipY-10-curl*5,lipX-12,lipY-2,lipX+12+curl*8,lipY+11+curl*8);ctx.stroke();
            ctx.globalAlpha=.82;ctx.fillStyle=p.foam;for(let i=0;i<12;i++){const u=i/11,x=lipX-reach+u*(reach+12),y=lipY-2+u*(12+curl*7)+Math.sin(i*2.2+time*.9)*2,r=i%4===0?2:1;ctx.fillRect(Math.round(x),Math.round(y),r,i%3===0?2:1);}
            ctx.globalAlpha=.72;ctx.fillStyle=p.foam;for(let i=0;i<32;i++){const x=((i*31-time*(7+profile.energy*3))%500+500)%500-25,edge=this.crestY(curve,x,time),spray=Math.abs(Math.sin(i*2.17+time*2.6))*(2+strength*4),w=i%7===0?4:1+i%2;ctx.fillRect(Math.round(x),Math.round(edge-3-spray),w,i%5===0?2:1);if(i%5===0){ctx.globalAlpha=.31;ctx.fillRect(Math.round(x-4),Math.round(edge+3),3+i%4,1);ctx.globalAlpha=.72;}}
            ctx.restore();}
        addTrail(point,momentum,vertical){this.trail.push({x:point.x,y:point.y,life:1,size:clamp(2+momentum*.22+Math.abs(vertical)*70,2,6)});if(this.trail.length>72)this.trail.shift();}
        addSpray(point,count,dir=-1,color){for(let i=0;i<Math.min(10,count);i++)this.spray.push({x:point.x,y:point.y,vx:dir*(.5+i*.16)+Math.sin(i*2.7)*.5,vy:-.8-i*.18,life:1,size:1+i%3,color});if(this.spray.length>128)this.spray.splice(0,this.spray.length-128);}
        update(speed=100){for(const x of this.trail){x.life-=.022;x.x-=speed*.0035;}this.trail=this.trail.filter(x=>x.life>0);for(const x of this.spray){x.x+=x.vx-speed*.0015;x.y+=x.vy;x.vy+=.035;x.life-=.032;}this.spray=this.spray.filter(x=>x.life>0);}
        effects(ctx,p,energy){for(const x of this.trail){ctx.globalAlpha=x.life*.65;ctx.fillStyle=energy?p.foam:p.hi;ctx.fillRect(x.x-x.size*.5,x.y,Math.max(1,x.size*x.life),2);}for(const x of this.spray){ctx.globalAlpha=x.life;ctx.fillStyle=x.color||p.foam;ctx.fillRect(x.x,x.y,x.size,x.size);}ctx.globalAlpha=1;}
        tubeBack(ctx,path,profile,p,time){const a=profile.tubeAmount;if(a<=.03)return;ctx.save();ctx.clip(path);const shade=ctx.createLinearGradient(0,64,0,H);shade.addColorStop(0,`rgba(5,24,54,${.10+a*.14})`);shade.addColorStop(.34,`rgba(3,18,46,${.04+a*.19})`);shade.addColorStop(1,`rgba(3,15,42,${a*.14})`);ctx.fillStyle=shade;ctx.fillRect(0,50,W,H);ctx.globalAlpha=.20+a*.23;ctx.strokeStyle=mix(p.deep,p.hi,.44);ctx.lineWidth=2;for(let i=0;i<5;i++){const y=104+i*21;ctx.beginPath();ctx.moveTo(0,y+Math.sin(time+i)*3);ctx.bezierCurveTo(W*.36,y-15-a*7,W*.66,y+9,W,y-5+Math.sin(time*.8+i)*3);ctx.stroke();}ctx.restore();}
        tubeFront(ctx,profile,p,point,time,pressure,captureAmount=0,captureTime=0,danger=0){
            const a=Math.max(profile.tubeAmount,captureAmount);if(a<=.03)return;const close=clamp(a,0,1),w=SURF_VISUAL.tube.archWidth*(.55+close*.45),h=SURF_VISUAL.tube.archHeight*(.50+close*.5),x=point.x,y=point.y-13,warning=clamp(danger/1.28,0,1),exitProgress=captureAmount>0?smooth(clamp((captureTime-(LAST_CHANCE_TUBE_DURATION-1.05))/1.05,0,1)):0,openX=SURF_VISUAL.tube.openingRadiusX*(.55+exitProgress*1.3),openY=SURF_VISUAL.tube.openingRadiusY*(.55+exitProgress*.6);
            ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
            const curl=()=>{ctx.beginPath();ctx.moveTo(x-w*.63,y+14);ctx.bezierCurveTo(x-w*.57,y-h*.20,x-w*.52,y-h*.73,x-w*.18,y-h*.94);ctx.bezierCurveTo(x+w*.06,y-h*1.04,x+w*.37,y-h*.78,x+w*.47,y-h*.39);ctx.bezierCurveTo(x+w*.54,y-h*.15,x+w*.62,y-h*.12,x+w*.65,y-h*.24);ctx.lineTo(x+w*.49,y-h*.29);ctx.bezierCurveTo(x+w*.44,y-h*.17,x+w*.42,y-h*.28,x+w*.34,y-h*.44);ctx.bezierCurveTo(x+w*.21,y-h*.70,x+w*.03,y-h*.77,x-w*.12,y-h*.78);ctx.bezierCurveTo(x-w*.38,y-h*.73,x-w*.49,y-h*.36,x-w*.50,y+7);ctx.closePath();};
            const lip=ctx.createLinearGradient(x,y-h,x,y+15);lip.addColorStop(0,mix(p.mid,p.hi,.18));lip.addColorStop(.52,mix(p.deep,p.mid,.62));lip.addColorStop(1,p.deep);ctx.globalAlpha=.88;ctx.fillStyle=lip;curl();ctx.fill();
            // One broken illuminated edge keeps the curl reading as water, not nested rings.
            ctx.globalAlpha=.76;ctx.strokeStyle=mix(p.hi,p.foam,.56);ctx.lineWidth=3.2+close*1.4;ctx.beginPath();ctx.moveTo(x-w*.61,y+8);ctx.bezierCurveTo(x-w*.56,y-h*.28,x-w*.45,y-h*.78,x-w*.16,y-h*.94);ctx.bezierCurveTo(x+w*.08,y-h*1.03,x+w*.36,y-h*.76,x+w*.48,y-h*.39);ctx.bezierCurveTo(x+w*.54,y-h*.19,x+w*.61,y-h*.13,x+w*.65,y-h*.24);ctx.stroke();
            ctx.globalAlpha=.54+warning*.18;ctx.fillStyle=p.foam;for(let i=0;i<13;i++){const t=i/12,px=x-w*.60+t*w*1.22,py=y-h*(.06+.72*Math.sin(t*Math.PI*.82))+Math.sin(i*2.3+time*3)*2,r=1+i%3;ctx.fillRect(Math.round(px),Math.round(py),r,i%4===0?2:1);}
            // The bright exit sits ahead of Zorp, asymmetrical and partly hidden by the curling lip.
            const exitX=x+w*.58,exitY=y-h*.23;ctx.globalAlpha=.55+exitProgress*.32-warning*.18;const mouth=ctx.createRadialGradient(exitX,exitY,2,exitX,exitY,openX*1.8);mouth.addColorStop(0,mix(p.foam,p.horizon,.2));mouth.addColorStop(.48,mix(p.light,p.hi,.42));mouth.addColorStop(1,'rgba(73,203,205,0)');ctx.fillStyle=mouth;ctx.beginPath();ctx.ellipse(exitX,exitY,openX*1.85,openY*.83,-.23,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.42;ctx.strokeStyle=p.hi;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(exitX,exitY,openX*.83,openY*.47,-.23,Math.PI*1.05,Math.PI*1.92);ctx.stroke();
            if(pressure>.25||warning>.05){ctx.globalAlpha=.20+Math.max(pressure,warning)*.3;ctx.fillStyle=p.foam;for(let i=0;i<10;i++){const px=x-w*.55+i*7+Math.sin(i*2+time*4)*4,py=y-2+Math.sin(i*1.7+time*3)*8+warning*4;ctx.fillRect(Math.round(px),Math.round(py),i%3===0?3:2,1+i%2);}}
            ctx.restore();
        }
    }

    class EndlessSurfGame {
        constructor(assets) {
            this.assets=assets;
            this.slice=clamp(Number(query.get('surfSlice'))||2,1,2);
            this.qa=query.get('surfQa')==='1';this.qaSpeed=clamp(Number(query.get('surfQaSpeed'))||1,1,64);this.qaMode=(query.get('surfQaMode')||'rhythm').toLowerCase();
            this.longQa=query.get('surfLongQa')==='1';this.debug=query.get('surfDebug')==='1';this.energyOrbs=query.get('surfEnergy')==='1';
            // A deliberately clean, stable Long Wave for visual / controls QA.  It does
            // not alter the endless director; it only bypasses its visible content.
            this.cleanWaveQa=query.get('surfWaveQa')==='1';this.qaPose=(query.get('surfPose')||'').toLowerCase();this.qaTrick=(query.get('surfTrick')||'a').toLowerCase();this.freezeQa=query.get('surfFreeze')==='1';this.finaleQaAt=clamp(Number(query.get('surfFinaleAt'))||0,0,7.7);
            this.runnerQa=query.get('surfRunnerQa')==='1';this.qaScenario=(query.get('surfQaScenario')||'').toLowerCase();this.noObjectsQa=query.get('surfQaNoObjects')==='1';this.storyQa=query.get('surfStoryQa')==='1';this.finaleQa=query.get('surfFinaleQa')==='1';this.assetCycleQa=query.get('surfAssetCycle')==='1';this.worldAssetQa=query.get('surfAssetWorldQa')==='1';this.beachQa=query.get('surfBeachQa')==='1';this.visualDebug=query.get('surfVisualDebug')==='1';this.visualEvent=(query.get('surfVisualEvent')||'').toLowerCase();this.visualQaState=(query.get('surfVisualState')||'').toUpperCase();this.stressFrames=clamp(Number(query.get('surfStressFrames'))||108000,1800,108000);
            const scoreQaValues=(query.get('surfScoreQa')||'').split(',').map(value=>Number(value.trim())).filter(Number.isFinite);this.scoreQaJudges=scoreQaValues.length===3?scoreQaValues.map(value=>clamp(Math.round(value),0,10)):null;this.scoreQaVictory=query.get('surfScoreVictory')==='1'||!!(this.scoreQaJudges&&this.scoreQaJudges.every(value=>value===10));
            this.qaProgress=clamp(Number(query.get('surfQaProgress'))||0,0,100);this.qaStartTime=clamp(Number(query.get('surfQaTime'))||0,0,600);
            this.seed=Number(query.get('surfSeed'))||0x5a17c0de;this.renderer=new EndlessRenderer(assets);this.previous={};this.reset(true);
        }
        reset(showIntro=true){
            this.director=new EndlessDirector(this.seed,this.slice);this.state=showIntro&&!this.cleanWaveQa&&!this.runnerQa&&!this.qaProgress&&!this.finaleQa?'INTRO':'PLAYING';this.time=this.qaStartTime;this.frame=0;this.distance=this.qaProgress?SURF_FINISH_DISTANCE*(this.qaProgress/100):0;this.score=0;this.combo=1;this.bestDistance=Number(localStorage.getItem('zorpSurfBestDistance')||0);this.bestScore=Number(localStorage.getItem('zorpSurfBestScore')||0);this.forwardSpeed=this.runnerSpeedAt(this.time);this.failure='';this.storyMilestone=false;this.storyBanner=0;this.waveBanner=110;this.lastSegment=0;this.tubePressure=0;this.energyTimer=0;this.energyShield=0;this.result=null;this.resultDelay=0;this.resultShownAt=0;this.finaleTime=0;this.finalePhase='';this.finaleLandingDone=false;this.finaleImpact=0;this.finaleCelebration=0;this.playerControlEnabled=true;
            this.chaseGap=72;this.chaserState='SAFE';this.playerProgress=0;this.chaserProgress=-360;this.lastMinorHit=-999;this.stumble=0;this.speedBoost=0;this.hitFeedback=0;this.hitLabel='';this.tubeRescueAvailable=true;this.tubeCapture=false;this.tubeCaptureTime=0;this.tubeDangerTimer=0;this.tubeSafeCenter=.52;this.tubeSafeWidth=.36;this.tubeWarning='SAFE';this.tubeExitFlash=0;this.qaHitStage=0;
            this.player={verticalPosition:.58,verticalVelocity:.002,lastVerticalVelocity:.002,momentum:5.3,lastMomentum:5.3,boardAngle:0,air:0,airVelocity:0,rotation:0,state:'SURF',visualState:'glide',visualTimer:0,trickKind:'',trickCooldown:0,airEntryMomentum:0,landingTimer:0,takeoffTimer:0,contactFrames:90,weakHop:false};
            this.qaSegment={uid:0,id:'long',pacing:'LONG WAVE QA',start:0,end:Infinity,length:Infinity,difficulty:0,weather:false};
            if(this.qaPose){const pose={low:.84,mid:.55,high:.22,skim:.115,air:.08,landing:.18}[this.qaPose];if(pose!==undefined){this.player.verticalPosition=pose;this.player.verticalVelocity=this.qaPose==='air'?-.008:.002;if(this.qaPose==='air'){this.player.air=62;this.player.airVelocity=.8;this.player.state='AIR';this.player.visualState='aerial';}else if(this.qaPose==='landing'){this.player.landingTimer=999;this.player.visualState='landing';}}}
            const officialPose=new Set(['glide','pump','ascend','descend','crest_skim','takeoff','aerial','trick','reentry','landing']);
            if(officialPose.has(this.qaPose)){
                this.player.visualState=this.qaPose;this.player.trickKind=['a','d','w','s'].includes(this.qaTrick)?this.qaTrick:'a';
                if(['takeoff','aerial','trick','reentry'].includes(this.qaPose)){this.player.air=62;this.player.airVelocity=this.qaPose==='reentry'?-1.2:1.2;this.player.state='AIR';this.player.takeoffTimer=this.qaPose==='takeoff'?999:0;this.player.trickCooldown=this.qaPose==='trick'?999:0;}
                else{this.player.verticalPosition=this.qaPose==='crest_skim'?.11:.52;this.player.verticalVelocity=this.qaPose==='ascend'?-.004:this.qaPose==='descend'?.005:.001;this.player.landingTimer=this.qaPose==='landing'?999:0;}
            }
            this.stats={bottomTurns:0,aerials:0,weakHops:0,tricks:0,landings:0,perfectLandings:0,badLandings:0,tubes:0,tubeFrames:0,tubeCaptures:0,tubeEscapes:0,tubeFailures:0,pressureEvents:0,coins:0,airCollectibles:0,airHazardsDodged:0,maxAir:0,hazardsHit:0,minorHits:0,majorHits:0,lightCollisions:0,seriousCollisions:0,wipeouts:0,nearMisses:0,patternsSeen:0,decisions:0,recoveries:0,maxDangerFrames:0,finaleLandings:0};
            if(this.qa&&this.freezeQa){const states={SAFE:72,PRESSURE:44,DANGER:14};if(states[this.visualQaState]!==undefined){this.chaseGap=states[this.visualQaState];this.chaserState=this.visualQaState;}if(this.visualQaState==='TUBE'){this.tubeCapture=true;this.tubeCaptureTime=2.15;this.tubeDangerTimer=.54;this.tubeSafeCenter=.50;this.tubeSafeWidth=.30;this.tubeWarning='WARNING';this.chaseGap=4;this.chaserState='TUBE_CAPTURE';}}
            if(this.scoreQaJudges){const avg=this.scoreQaJudges.reduce((sum,value)=>sum+value,0)/3,progress=clamp(avg/10,0,1);this.state=this.scoreQaVictory?'COMPLETE':'FAIL';this.resultDelay=0;this.resultShownAt=-120;this.distance=Math.round(SURF_FINISH_DISTANCE*progress);this.result={victory:this.scoreQaVictory,distance:this.distance,score:Math.round(avg*1000),bestDistance:this.bestDistance,bestScore:this.bestScore,judges:this.scoreQaJudges.slice(),progress};}
            this.renderer.trail.length=0;this.renderer.spray.length=0;this.lastDrawAt=0;this.fps=0;this.syncKeys();
            if(this.finaleQa&&!this.scoreQaJudges){this.distance=SURF_FINISH_DISTANCE;this.playerProgress=this.distance;this.director.ensure(this.distance);this.startFinale();if(this.freezeQa&&this.finaleQaAt>0){const frames=Math.round(this.finaleQaAt*60);for(let i=0;i<frames&&this.state==='FINALE';i++)this.updateFinale();this.finaleTime=this.finaleQaAt;}}
            if(localStorage.getItem('zorpSurfMedal')==='1'){try{if(typeof insignias!=='undefined')insignias.surf=true;}catch(error){/* script principal pode ainda estar inicializando */}}
            const hint=document.getElementById('hint-text');if(hint)hint.textContent='SEGURE [ESPAÇO/W] PARA SUBIR • NO AR: [ESPAÇO] SUSTENTA • [A/D/W/S] TRICKS • [P] DEBUG';
        }
        pressed(k){return !!keys[k]&&!this.previous[k];}
        syncKeys(){for(const k of ['space','enter','w','a','d','s','r','escape','p'])this.previous[k]=!!keys[k];}
        runnerSpeedAt(seconds,distance=this.distance){
            let timed;if(seconds<=30)timed=lerp(220,292,seconds/30);else if(seconds<=60)timed=lerp(292,332,(seconds-30)/30);else if(seconds<=120)timed=lerp(332,374,(seconds-60)/60);else timed=374+Math.min(30,Math.log1p((seconds-120)/45)*15);
            const distanceDifficulty=Math.min(28,Math.log1p(Math.max(0,distance)/2400)*9.5);return timed+distanceDifficulty;
        }
        profile(){
            if(!this.cleanWaveQa)return this.director.current(this.distance);
            const profile={...PRESETS.long,tube:0,tubeAmount:0,hazards:0,collectible:0};
            return {segment:this.qaSegment,next:this.qaSegment,phase:0,blend:0,profile,index:0};
        }
        update(){
            this.frame++;const resultActionEdge=resultActionPressed;resultActionPressed=false;if(this.pressed('p'))this.debug=!this.debug;
            if(this.pressed('escape')){currentScene='ILHA_SURF';player.x=225;player.y=150;this.syncKeys();return;}
            if(this.state==='INTRO'){if(this.qa||this.pressed('space')||this.pressed('w'))this.state='PLAYING';this.syncKeys();return;}
            if(this.state==='FAIL'){if(this.resultDelay>0)this.resultDelay--;else if(!this.qa&&(resultActionEdge||this.pressed('space')||this.pressed('enter')||this.pressed('r')))this.reset(false);this.syncKeys();return;}
            if(this.state==='COMPLETE'){if(!this.qa&&(resultActionEdge||this.pressed('space')||this.pressed('enter'))){currentScene='ILHA_SURF';player.x=225;player.y=150;}this.syncKeys();return;}
            if(this.state==='FINALE'){if(!(this.finaleQa&&this.freezeQa))this.updateFinale();this.syncKeys();return;}
            if(this.state!=='PLAYING'){this.syncKeys();return;}
            if(this.freezeQa){this.syncKeys();return;}
            if(this.qa)this.qaInput();
            this.time+=1/60;const current=this.profile(),profile=current.profile,p=this.player,hold=!!(keys.space||keys.w);p.lastMomentum=p.momentum;
            if(p.air<=0)this.updateSurface(profile,hold);else this.updateAir(profile);
            const descent=Math.max(0,p.verticalVelocity)*1650,ascent=Math.max(0,-p.verticalVelocity)*175,crestStall=hold&&p.verticalPosition<.18?8:0,difficulty=this.cleanWaveQa?0:this.director.difficulty(this.distance),runnerBase=this.runnerSpeedAt(this.time,this.distance),tubeLaunch=this.tubeCapture?54:0;
            const targetSpeed=clamp(runnerBase+(p.momentum-5.3)*8.4+descent-ascent-crestStall+this.speedBoost+tubeLaunch-(this.stumble>0?72:0),165,465);
            this.forwardSpeed=lerp(this.forwardSpeed,targetSpeed,.15);this.distance+=this.forwardSpeed/60;this.playerProgress=this.distance;
            if(!this.cleanWaveQa)this.score+=(this.forwardSpeed/60)*(.7+this.combo*.12)*(this.energyTimer>0?2:1);
            this.director.ensure(this.distance);if(!this.cleanWaveQa)this.updateObjects(current);if(this.state!=='PLAYING'){this.syncKeys();return;}this.updateChaser(difficulty,current);if(this.state!=='PLAYING'){this.syncKeys();return;}this.updateTube(profile);this.updatePlayerVisual(hold);if(this.assetCycleQa)this.updateAssetCycleQa();
            if(this.qaScenario==='minor'&&this.time>5&&this.qaHitStage===0){this.minorHit('QA MINOR');this.qaHitStage=1;}
            if(this.qaScenario==='double'&&this.time>5&&this.qaHitStage===0){this.minorHit('QA MINOR 1');this.qaHitStage=1;}else if(this.qaScenario==='double'&&this.time>6.2&&this.qaHitStage===1){this.minorHit('QA MINOR 2');this.qaHitStage=2;}
            if(this.qaScenario==='major'&&this.time>5&&this.qaHitStage===0){this.qaHitStage=1;this.majorHit('QA MAJOR');}
            if(['tube_success','tube_failure','tube_second'].includes(this.qaScenario)&&this.time>.75&&this.qaHitStage===0){this.qaHitStage=1;this.startLastChanceTube();}
            if(this.qaScenario==='tube_second'&&this.qaHitStage===2&&!this.tubeCapture){this.qaHitStage=3;this.chaseGap=0;this.handleChaserCatch('QA SECOND CAPTURE');}
            if(this.qaScenario==='checkpoint'&&this.time>.25&&this.qaHitStage===0&&this.qaProgress<100){this.qaHitStage=1;this.wipeout(`QA ${this.qaProgress}%`);this.resultDelay=0;this.resultShownAt=this.frame;this.syncKeys();return;}
            if(this.distance>=SURF_FINISH_DISTANCE&&!this.longQa&&!this.tubeCapture){this.startFinale();this.syncKeys();return;}
            if(this.storyBanner>0)this.storyBanner--;if(this.energyTimer>0)this.energyTimer--;if(this.stumble>0)this.stumble--;if(this.hitFeedback>0)this.hitFeedback--;this.tubeExitFlash=Math.max(0,this.tubeExitFlash-.025);this.speedBoost=lerp(this.speedBoost,0,.025);
            const point=this.playerPoint(current);this.renderer.addTrail(point,p.momentum,p.verticalVelocity);if(this.frame%2===0)this.renderer.addSpray(point,1+Math.round(Math.abs(p.verticalVelocity)*95),-1,this.energyTimer>0?'#ffe86b':null);this.renderer.update(this.forwardSpeed);
            if(current.segment.uid!==this.lastSegment){this.lastSegment=current.segment.uid;this.waveBanner=70;this.stats.patternsSeen++;this.stats.decisions++;}else if(this.waveBanner>0)this.waveBanner--;
            this.syncKeys();
        }
        updateSurface(profile,hold){
            const p=this.player;
            p.contactFrames=Math.min(180,p.contactFrames+1);
            p.lastVerticalVelocity=p.verticalVelocity;
            const gravity=.00036+profile.steep*.00010;
            // Holding applies a force; it never directly moves the board.  Momentum
            // amplifies the force, which lets the same input create short or long arcs.
            const holdForce=hold?(.00060+p.momentum*.000058+Math.max(0,p.verticalVelocity)*.026):0;
            p.verticalVelocity=(p.verticalVelocity+gravity-holdForce)*.990;
            const lowerStart=.79,lowerDepth=Math.max(0,(p.verticalPosition-lowerStart)/.16);
            // The base curves motion upward progressively rather than behaving as an
            // invisible wall.  At speed this becomes the naturally satisfying bottom turn.
            if(lowerDepth>0)p.verticalVelocity-=(.00016+p.momentum*.000024)*lowerDepth*lowerDepth*6;
            const down=Math.max(0,p.verticalVelocity),up=Math.max(0,-p.verticalVelocity);
            p.momentum+=down*(11.5+profile.energy*8.2)-up*(1.62+profile.steep*.78)-.0032;
            if(hold&&p.verticalPosition<.20)p.momentum-=.0048;
            p.momentum=clamp(p.momentum,2.6,11.2);p.verticalPosition+=p.verticalVelocity;
            p.boardAngle=lerp(p.boardAngle,clamp(p.verticalVelocity*17,-.35,.35),.24);
            if(p.lastVerticalVelocity>.0007&&p.verticalVelocity<=0&&p.verticalPosition>.45){this.stats.bottomTurns++;if(!this.cleanWaveQa)this.score+=55*this.combo;this.renderer.addSpray(this.playerPoint(),8,-1);}
            if(p.verticalPosition>.95){p.verticalPosition=.95;p.verticalVelocity=Math.min(p.verticalVelocity,.004);p.momentum=Math.max(2.6,p.momentum-.025);}
            const crest=.075;
            if(p.verticalPosition<crest){
                const settled=p.contactFrames>=36,strongTakeoff=p.verticalVelocity<-.0047&&p.momentum>4.9,weakTakeoff=p.verticalVelocity<-.00365&&p.momentum>4.05;
                if(settled&&(strongTakeoff||weakTakeoff)){
                    p.weakHop=!strongTakeoff;p.contactFrames=0;p.verticalPosition=crest;p.air=.1;p.airVelocity=strongTakeoff?clamp(2.1+p.momentum*.47+Math.abs(p.verticalVelocity)*145,4.3,9.4):clamp(1.8+p.momentum*.25,2.7,4.2);p.airEntryMomentum=p.momentum;p.state='AIR';p.visualState='takeoff';p.takeoffTimer=15;this.stats.aerials++;if(p.weakHop)this.stats.weakHops++;if(!this.cleanWaveQa)this.score+=(p.weakHop?35:90)*p.momentum*this.combo;this.renderer.addSpray(this.playerPoint(),strongTakeoff?10:6,1);
                }else{p.verticalPosition=crest;p.verticalVelocity=Math.abs(p.verticalVelocity)*.34+.0009;p.momentum*=.987;}
            }
            if(p.air<=0)p.state=p.verticalVelocity<-.001?'ASCEND':p.verticalVelocity>.002?'DESCEND':'SURF';
        }
        updateAir(){
            const p=this.player,airControl=!!keys.space;
            p.air+=p.airVelocity;p.airVelocity-=airControl?.205:.265;p.rotation*=airControl?.972:.988;p.trickCooldown=Math.max(0,p.trickCooldown-1);p.takeoffTimer=Math.max(0,p.takeoffTimer-1);this.stats.maxAir=Math.max(this.stats.maxAir,p.air);
            for(const k of ['a','d','w','s'])if(this.pressed(k)&&p.trickCooldown<=0){p.trickCooldown=12;p.rotation+=(k==='a'?-1:1)*.18;p.trickKind=k;p.visualState='trick';this.stats.tricks++;this.score+=(k==='w'?260:k==='s'?220:180)*this.combo;this.combo=clamp(this.combo+.22,1,5);}
            if(p.air<=0&&p.airVelocity<0){
                p.air=0;const quality=Math.abs(p.rotation);if(quality>1.72){this.majorHit('LANDING MUITO FORTE');return;}
                p.verticalPosition=clamp(.24+p.momentum*.014,.24,.38);p.verticalVelocity=.0024;p.contactFrames=0;p.state='LANDING';p.visualState='landing';p.landingTimer=16;this.stats.landings++;
                if(quality<.34){p.momentum=clamp(p.momentum+.75,2.6,10.5);this.forwardSpeed+=12;this.speedBoost=Math.max(this.speedBoost,12);this.chaseGap+=7;this.stats.perfectLandings++;if(!this.cleanWaveQa)this.score+=240*this.combo;}
                else if(quality<.90){p.momentum=clamp(p.momentum+.25,2.6,10.5);this.chaseGap+=3;if(!this.cleanWaveQa)this.score+=150*this.combo;}
                else{p.momentum*=.64;this.forwardSpeed*=.72;this.chaseGap-=13;this.stats.badLandings++;this.combo=Math.max(1,this.combo-.65);}
                if(p.airEntryMomentum>7.4&&!this.cleanWaveQa){this.energyTimer=300;this.energyShield=1;}this.renderer.addSpray(this.playerPoint(),10,-1);p.rotation=0;
            }
        }
        updatePlayerVisual(hold){
            const p=this.player;
            if(p.air>0){
                if(p.takeoffTimer>0)p.visualState='takeoff';
                else if(p.trickCooldown>0&&p.trickKind)p.visualState='trick';
                else p.visualState=p.airVelocity<-.30?'reentry':'aerial';
                return;
            }
            if(p.landingTimer>0){p.landingTimer--;p.visualState='landing';return;}
            if(p.verticalPosition<.145){p.visualState='crest_skim';return;}
            const momentumGain=p.momentum-p.lastMomentum;
            if(hold&&p.verticalVelocity>.0028&&momentumGain>.008){p.visualState='pump';return;}
            if(p.verticalVelocity<-.001)p.visualState='ascend';
            else if(p.verticalVelocity>.002)p.visualState='descend';
            else p.visualState='glide';
        }
        updateAssetCycleQa(){const poses=['glide','pump','ascend','descend','crest_skim','takeoff','aerial','trick:a','trick:d','trick:w','trick:s','reentry','landing'],token=poses[Math.floor(this.frame/64)%poses.length],parts=token.split(':');this.player.visualState=parts[0];if(parts[1])this.player.trickKind=parts[1];}
        updateChaser(difficulty,current){
            if(this.cleanWaveQa)return;
            if(this.tubeCapture){this.updateLastChanceTube();return;}
            const previous=this.chaserState,p=this.player,challenge=current&&current.segment&&current.segment.pacing==='CHALLENGE'?8:0,fast=current&&current.segment&&['fast','technical'].includes(current.segment.id)?7:0,expected=this.runnerSpeedAt(this.time)-18+difficulty*2.2+challenge+fast;
            const performance=(this.forwardSpeed-expected)/Math.max(100,expected),descentBonus=Math.max(0,p.verticalVelocity)*.65,momentumBonus=Math.max(0,p.momentum-6)*.0035;
            const patternPressure=current&&current.segment&&current.segment.pattern==='pressure'?.006:0;
            this.chaseGap+=(performance*.086+descentBonus+momentumBonus-(p.momentum<3.8?.011:0)-difficulty*.00105-patternPressure-(this.stumble>0?.022:0));
            const maxGap=clamp(86-difficulty*3,59,86);this.chaseGap=clamp(this.chaseGap,-2,maxGap);
            this.chaserState=this.chaseGap>58?'SAFE':this.chaseGap>28?'PRESSURE':this.chaseGap>8?'DANGER':'CAUGHT';
            if((this.chaserState==='PRESSURE'&&previous==='SAFE')||(this.chaserState==='DANGER'&&previous!=='DANGER'))this.stats.pressureEvents++;
            if(previous==='DANGER'&&this.chaserState==='PRESSURE'||previous==='PRESSURE'&&this.chaserState==='SAFE')this.stats.recoveries++;
            if(this.chaserState==='DANGER'||this.chaserState==='CAUGHT')this.stats.maxDangerFrames++;
            this.chaserProgress=this.distance-this.chaseGap*6;
            if(this.chaserState==='CAUGHT'&&!this.longQa)this.handleChaserCatch('WHITEWATER ALCANÇOU ZORP');
        }
        handleChaserCatch(reason){
            if(this.tubeCapture||this.state!=='PLAYING')return;
            if(this.tubeRescueAvailable){this.startLastChanceTube();return;}
            this.chaserState='CAUGHT';this.wipeout(reason==='WHITEWATER ALCANÇOU ZORP'?'WHITEWATER PEGOU ZORP NOVAMENTE':reason);
        }
        startLastChanceTube(){
            if(!this.tubeRescueAvailable||this.tubeCapture)return;this.tubeRescueAvailable=false;this.tubeCapture=true;this.tubeCaptureTime=0;this.tubeDangerTimer=0;this.tubeSafeCenter=clamp(this.player.verticalPosition,.34,.68);this.tubeSafeWidth=.40;this.tubeWarning='SAFE';this.chaserState='TUBE_CAPTURE';this.chaseGap=4;this.player.state='TUBE_CAPTURE';this.stats.tubeCaptures++;this.hitFeedback=55;this.hitLabel='LAST CHANCE TUBE!';this.renderer.addSpray(this.playerPoint(),10,-1,'#ffffff');
        }
        updateLastChanceTube(){
            const p=this.player;this.tubeCaptureTime+=1/60;const t=this.tubeCaptureTime,phase=clamp(t/LAST_CHANCE_TUBE_DURATION,0,1),wave=Math.sin(t*1.72)*.14+Math.sin(t*.69+1.2)*.045;
            this.tubeSafeCenter=clamp(.50+wave,.27,.73);this.tubeSafeWidth=.40-smooth(clamp(Math.sin(phase*Math.PI),0,1))*.13+Math.max(0,phase-.82)*.34;
            const outside=Math.max(0,Math.abs(p.verticalPosition-this.tubeSafeCenter)-this.tubeSafeWidth*.5),weak=p.momentum<3.15;
            if(outside>0||weak)this.tubeDangerTimer+=1/60*(1+(outside*8)+(weak?.45:0));else this.tubeDangerTimer=Math.max(0,this.tubeDangerTimer-1/42);
            this.tubeWarning=this.tubeDangerTimer>.95?'CRITICAL':this.tubeDangerTimer>.32?'WARNING':'SAFE';this.chaserState='TUBE_CAPTURE';this.chaseGap=4;this.chaserProgress=this.distance-24;this.tubePressure=clamp(this.tubeDangerTimer/1.28,0,1);this.stats.tubeFrames++;this.score+=(1.3+p.momentum*.08)*this.combo;
            if(this.tubeWarning==='SAFE')p.momentum=clamp(p.momentum+.012,2.6,11.2);
            if(this.tubeDangerTimer>=1.28){this.stats.tubeFailures++;this.tubeCapture=false;this.wipeout('TUBE WIPEOUT');return;}
            if(t>=LAST_CHANCE_TUBE_DURATION)this.finishLastChanceTube();
        }
        finishLastChanceTube(){
            if(!this.tubeCapture)return;this.tubeCapture=false;this.tubeCaptureTime=0;this.tubeDangerTimer=0;this.tubeWarning='ESCAPED';this.tubePressure=0;this.chaseGap=38;this.chaserState='PRESSURE';this.player.state='SURF';this.player.momentum=clamp(this.player.momentum+1.15,2.6,11.2);this.speedBoost=Math.max(this.speedBoost,32);this.forwardSpeed+=24;this.tubeExitFlash=1;this.stats.tubes++;this.stats.tubeEscapes++;this.stats.recoveries++;this.score+=1200*this.combo;this.hitFeedback=62;this.hitLabel='ESCAPOU DO TUBO!';const point=this.playerPoint();this.renderer.addSpray(point,10,-1,'#ffffff');this.renderer.addSpray(point,10,1,'#fff6c5');if(this.qaScenario==='tube_second')this.qaHitStage=2;
        }
        minorHit(reason='TROPEÇO'){
            if(this.state!=='PLAYING')return;const p=this.player,rapid=this.time-this.lastMinorHit<3.2;
            p.momentum=Math.max(2.6,p.momentum-3.4);p.verticalVelocity*=.38;p.boardAngle+=p.verticalPosition>.5?-.15:.15;this.forwardSpeed=Math.max(105,this.forwardSpeed*.62);this.speedBoost=0;this.stumble=48;this.hitFeedback=42;this.hitLabel=reason;this.chaseGap-=rapid?38:28;this.combo=1;this.lastMinorHit=this.time;this.stats.hazardsHit++;this.stats.minorHits++;this.stats.lightCollisions++;this.renderer.addSpray(this.playerPoint(),10,-1,'#dffdf7');this.renderer.addSpray(this.playerPoint(),8,1,'#ffffff');
            if(this.chaseGap<=1&&!this.longQa)this.handleChaserCatch(rapid?'DOIS ERROS SEGUIDOS':reason);
        }
        majorHit(reason='COLISÃO GRAVE'){
            if(this.state!=='PLAYING')return;this.stats.hazardsHit++;this.stats.majorHits++;this.stats.seriousCollisions++;this.wipeout(reason);
        }
        updateObjects(current){
            if(this.cleanWaveQa||this.noObjectsQa)return;const p=this.player,hitWindow=Math.max(30,this.forwardSpeed*.23);
            for(const segment of this.director.segments){
                for(const item of segment.collectibles){if(item.taken)continue;const delta=item.progress-this.distance,verticalDelta=item.air>0?Math.abs(item.air-p.air)/100:Math.abs(item.face-p.verticalPosition),collectWindow=item.air>0?Math.max(50,this.forwardSpeed*.22):35;if(Math.abs(delta)<collectWindow&&verticalDelta<(item.air>0?.30:.11)){item.taken=true;this.stats.coins++;if(item.air>0)this.stats.airCollectibles++;this.score+=item.type==='star'?420:90;this.combo=clamp(this.combo+.06,1,5);}}
                for(const hazard of segment.hazards){
                    if(hazard.hit)continue;const wave=hazard.motionSpeed?Math.sin(this.time*hazard.motionSpeed+hazard.phase):0;
                    hazard.currentFace=clamp(hazard.baseFace+(hazard.motion==='jump'?-Math.abs(wave):wave)*hazard.amplitude,.10,.90);hazard.currentAir=hazard.air>0?Math.max(14,hazard.air+(hazard.motion==='air_drift'?wave*hazard.amplitude:0)):0;
                    const delta=hazard.progress-this.distance,verticalDelta=hazard.currentAir>0?Math.abs(hazard.currentAir-p.air)/100:Math.abs(hazard.currentFace-p.verticalPosition);
                    if(delta<-55){hazard.hit=true;if(!hazard.passed&&verticalDelta<hazard.radius+.075){this.stats.nearMisses++;if(hazard.currentAir>0)this.stats.airHazardsDodged++;this.score+=70;this.chaseGap+=1.3;}continue;}
                    const airborneSafe=p.air>18&&!['shark','log','bird'].includes(hazard.type);
                    if(!airborneSafe&&Math.abs(delta)<hitWindow&&verticalDelta<hazard.radius){
                        hazard.hit=true;if(this.longQa)continue;
                        const central=verticalDelta<hazard.core,strongBuoy=hazard.type==='buoy'&&central&&this.forwardSpeed>172;
                        if(hazard.currentAir>0&&hazard.type==='bird'){p.rotation+=p.verticalPosition>.5?-.82:.82;p.airVelocity-=1.05;p.trickCooldown=0;p.trickKind='';}
                        if(hazard.severity==='major'||strongBuoy)this.majorHit(hazard.type==='shark'?'TUBARÃO!':hazard.type==='log'?'IMPACTO NO TRONCO':hazard.type==='wood_crate'?'IMPACTO NA CAIXA':'IMPACTO FORTE');else this.minorHit(hazard.type==='foam'?'ESPUMA PESADA':hazard.type==='bird'?'CHOQUE NO AR':'TROPEÇO');
                    }
                }
            }
        }
        updateTube(profile){if(this.tubeCapture)return;const amount=profile.tubeAmount;if(amount>.18){this.stats.tubeFrames++;this.player.state='TUBE';this.tubePressure=clamp((34-this.chaseGap)/34,0,1);this.score+=amount*1.1*this.combo;}else{if(this.tubePressure>.15&&this.player.state==='TUBE'){this.stats.tubes++;this.score+=600*this.combo;}this.tubePressure=Math.max(0,this.tubePressure-.018);}}
        qaInput(){
            const wasHold=!!(keys.space||keys.w);keys.a=keys.d=keys.s=false;
            if(this.tubeCapture){if(this.qaScenario==='tube_failure'){keys.space=keys.w=false;return;}const f=this.player.verticalPosition,v=this.player.verticalVelocity,target=this.tubeSafeCenter;keys.space=keys.w=f>target+.015||(v>0&&f>target-.065);return;}
            if(this.qaMode==='idle'){keys.space=keys.w=false;return;}
            if(this.player.air>0){keys.space=this.player.airVelocity>0&&this.player.air<95;const k=['a','d','w','s'][Math.floor(this.time*2)%4];keys[k]=true;return;}
            const f=this.player.verticalPosition,v=this.player.verticalVelocity;keys.space=keys.w=f>.80||(v>0&&f>.72);if(f<.19&&v<0)keys.space=keys.w=false;
            if(this.qaMode==='conservative'){keys.space=keys.w=f>.68||(v>0&&f>.60);if(f<.34&&v<0)keys.space=keys.w=false;}
            else if(this.qaMode==='aggressive'){keys.space=keys.w=wasHold?!(f<.09&&v<0):(f>.86&&v>0);}
            else if(this.qaMode==='spam'){keys.space=keys.w=f>.24||v>0;if(f<.08&&v<0)keys.space=keys.w=false;}
            let closest=null;if(!this.noObjectsQa)for(const seg of this.director.segments)for(const h of seg.hazards){const d=h.progress-this.distance;if(!h.hit&&d>0&&d<900&&(!closest||d<closest.d))closest={h,d};}
            if(closest){const hazardFace=closest.h.currentFace??closest.h.face,target=closest.h.type==='shark'?.84:(hazardFace>.52?.24:.80);keys.space=keys.w=f>target||(f>target-.08&&v>0);}
        }
        playerPoint(current=this.profile()){
            const curve=this.renderer.curve(current.profile,this.time),p=this.player;
            const x=180+clamp((this.forwardSpeed-130)*.08,-8,12);
            // The camera follows part of a jump.  Air physics remains unchanged; this
            // only keeps a tall pixel sprite readable instead of clipping it above HUD.
            const airVisual=p.air*.72,airCamera=p.air>0?(this.state==='FINALE'?Math.min(50,12+p.air*.34):Math.min(18,5+p.air*.10)):0;
            return {x,y:this.renderer.faceY(curve,p.verticalPosition,x)-airVisual+airCamera,curve};
        }
        judgeScores(distance=this.distance){
            const progress=clamp(distance/SURF_FINISH_DISTANCE,0,1);
            if(progress<=.10)return [0,0,0];
            const skill=(this.stats.perfectLandings+this.stats.aerials*.20+this.stats.tricks*.28+this.stats.nearMisses*.18-this.stats.minorHits*1.35-this.stats.badLandings*1.15)/Math.max(6,this.time/8);
            const base=clamp(Math.round(progress*9.25+clamp(skill,-.45,.45)),1,9);
            const offsets=progress>=.90?[0,0,-1]:progress>=.65?[0,1,-1]:[0,1,0];
            return offsets.map(offset=>clamp(base+offset,0,9));
        }
        startFinale(){
            if(this.state!=='PLAYING')return;
            this.state='FINALE';this.playerControlEnabled=false;this.finaleTime=0;this.finalePhase='CLEAR_RUNWAY';this.finaleLandingDone=false;this.finaleImpact=0;this.finaleCelebration=0;this.storyMilestone=true;this.director.clearForFinale(this.distance);this.stumble=0;this.speedBoost=0;this.failure='';this.chaserState='SAFE';this.chaseGap=Math.max(this.chaseGap,92);localStorage.setItem('zorpSurfStoryMilestone','1');
        }
        updateFinale(){
            this.time+=1/60;this.finaleTime+=1/60;const p=this.player,t=this.finaleTime;
            const speedTarget=t<1.65?415:t<2.65?432:t<5.30?372:t<6.20?342:318;this.forwardSpeed=lerp(this.forwardSpeed,speedTarget,.065);this.distance+=this.forwardSpeed/60;this.playerProgress=this.distance;this.chaseGap=lerp(this.chaseGap,128,.07);this.chaserProgress=this.distance-this.chaseGap*6;this.finaleImpact=Math.max(0,this.finaleImpact-.045);
            if(t<.55){
                this.finalePhase='CLEAR_RUNWAY';p.air=0;p.rotation=lerp(p.rotation,0,.18);p.verticalPosition=lerp(p.verticalPosition,.58,.08);p.verticalVelocity=.002;p.momentum=clamp(p.momentum+.025,5.3,8.5);p.visualState='glide';
            }else if(t<1.65){
                this.finalePhase='POWER_DROP';p.air=0;p.verticalPosition=lerp(p.verticalPosition,.87,.075);p.verticalVelocity=.0075;p.momentum=clamp(p.momentum+.09,5.3,11.4);p.visualState=t<.82?'pump':'descend';
            }else if(t<2.65){
                this.finalePhase='CREST_ATTACK';const u=smooth((t-1.65)/1.0);p.air=0;p.verticalPosition=lerp(.87,.055,u);p.verticalVelocity=lerp(-.006,-.0105,u);p.momentum=11.4;p.boardAngle=lerp(p.boardAngle,-.12,.15);p.visualState=u>.84?'takeoff':'ascend';p.takeoffTimer=14;
            }else if(t<5.30){
                this.finalePhase=t<2.98?'TAKEOFF':t<4.72?'SIGNATURE_TRICK':'REENTRY';const u=clamp((t-2.65)/2.65,0,1);p.verticalPosition=.055;p.air=Math.sin(u*Math.PI)*112;p.airVelocity=Math.cos(u*Math.PI)*7.2;p.rotation=Math.sin(u*Math.PI*2)*.72+Math.sin(u*Math.PI)*.18;p.trickKind='w';p.visualState=u<.12?'takeoff':u<.28?'aerial':u<.76?'trick':'reentry';
            }else{
                p.air=0;p.rotation=lerp(p.rotation,0,.30);p.boardAngle=lerp(p.boardAngle,0,.24);p.verticalPosition=lerp(p.verticalPosition,.19,.24);p.verticalVelocity=.0008;p.momentum=10.8;
                if(!this.finaleLandingDone){this.finaleLandingDone=true;this.finaleImpact=1;this.finalePhase='PERFECT_LANDING';p.visualState='landing';p.landingTimer=42;this.stats.landings++;this.stats.perfectLandings++;this.stats.finaleLandings++;const impactPoint=this.playerPoint();this.renderer.addSpray(impactPoint,10,-1,'#ffffff');this.renderer.addSpray(impactPoint,10,1,'#fff6c5');}
                else if(t<6.35){this.finalePhase='LANDING_HOLD';p.visualState=p.landingTimer-->0?'landing':'pump';}
                else{this.finalePhase='VICTORY_GLIDE';this.finaleCelebration=smooth(clamp((t-6.35)/.55,0,1));p.visualState=Math.sin(t*5.5)>0?'pump':'glide';}
            }
            const point=this.playerPoint();this.renderer.addTrail(point,p.momentum,p.verticalVelocity);if(this.frame%2===0)this.renderer.addSpray(point,this.finalePhase==='PERFECT_LANDING'||this.finalePhase==='LANDING_HOLD'?6:this.finalePhase==='POWER_DROP'||this.finalePhase==='CREST_ATTACK'?3:2,-1,'#fff6c5');this.renderer.update(this.forwardSpeed);
            if(t>=7.75)this.completeSurf();
        }
        completeSurf(){
            if(this.state==='COMPLETE')return;
            this.state='COMPLETE';this.resultShownAt=this.frame;this.finalePhase='JUDGES';this.player.visualState='glide';this.player.air=0;this.distance=Math.max(this.distance,SURF_FINISH_DISTANCE);const d=Math.round(this.distance),s=Math.round(this.score+5000);this.bestDistance=Math.max(this.bestDistance,d);this.bestScore=Math.max(this.bestScore,s);localStorage.setItem('zorpSurfBestDistance',String(this.bestDistance));localStorage.setItem('zorpSurfBestScore',String(this.bestScore));localStorage.setItem('zorpSurfMedal','1');
            try{if(typeof insignias!=='undefined')insignias.surf=true;}catch(error){console.warn('[Surf] Medalha persistida; registro visual indisponível.',error);}
            this.result={victory:true,distance:d,score:s,bestDistance:this.bestDistance,bestScore:this.bestScore,judges:[10,10,10],progress:1};
        }
        wipeout(reason){if(this.state!=='PLAYING')return;this.state='FAIL';this.resultDelay=30;this.resultShownAt=this.frame+this.resultDelay;this.failure=reason;this.stats.wipeouts++;this.player.visualState='reentry';this.renderer.addSpray(this.playerPoint(),18,-1);const d=Math.round(this.distance),s=Math.round(this.score),judges=this.judgeScores(d);this.bestDistance=Math.max(this.bestDistance,d);this.bestScore=Math.max(this.bestScore,s);localStorage.setItem('zorpSurfBestDistance',String(this.bestDistance));localStorage.setItem('zorpSurfBestScore',String(this.bestScore));this.result={victory:false,distance:d,score:s,bestDistance:this.bestDistance,bestScore:this.bestScore,judges,progress:clamp(d/SURF_FINISH_DISTANCE,0,1)};}
        draw(){
            const now=performance.now();if(this.lastDrawAt){const instant=1000/Math.max(1,now-this.lastDrawAt);this.fps=this.fps?lerp(this.fps,instant,.08):instant;}this.lastDrawAt=now;
            const current=this.profile(),profile=current.profile,palette=this.renderer.palette(this.cleanWaveQa||this.slice===1?0:this.distance),curve=this.renderer.curve(profile,this.time),weather=!this.cleanWaveQa&&this.slice>=2&&current.segment.weather;
            ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);ctx.save();const impactShake=Math.max(this.finaleImpact,this.hitFeedback/70,this.tubeCapture&&this.tubeWarning==='CRITICAL'?.72:0);if(impactShake>0)ctx.translate(Math.round(Math.sin(this.frame*2.4)*impactShake*3),Math.round(Math.cos(this.frame*1.7)*impactShake*2));
            const finaleWhale=this.state==='FINALE'&&this.finaleTime>6.15,captureVisual=this.tubeCapture?this.tubeCaptureVisualAmount():0,visualProfile=captureVisual>0?{...profile,tubeAmount:Math.max(profile.tubeAmount,captureVisual),crest:profile.crest+captureVisual*.34}:profile;if(this.tubeCapture){const zoom=1.018+captureVisual*.012;ctx.translate(W*.5,H*.5);ctx.scale(zoom,zoom);ctx.translate(-W*.5,-H*.5);}
            this.renderer.background(ctx,palette,this.distance,weather,this.time,this.visualEvent==='whale'||finaleWhale);const path=this.renderer.wave(ctx,visualProfile,curve,palette,this.distance,this.time,this.forwardSpeed);this.renderer.tubeBack(ctx,path,visualProfile,palette,this.time);this.renderer.beachForeground(ctx,palette,this.distance,this.time,this.state==='FINALE'?this.finaleCelebration:0);this.drawWorldObjects(curve);const point=this.playerPoint(current);this.renderer.whitewater(ctx,curve,visualProfile,palette,this.time,point.x,this.state==='FINALE'?128:this.chaseGap);this.renderer.effects(ctx,palette,this.energyTimer>0);this.drawFinaleBackFx(point,palette);this.drawPlayer(point);this.renderer.tubeFront(ctx,visualProfile,palette,point,this.time,this.tubePressure,captureVisual,this.tubeCaptureTime,this.tubeDangerTimer);this.drawTubeCaptureFx(point,palette,curve,captureVisual);this.renderer.crest(ctx,curve,palette,this.time,visualProfile);this.drawFinaleFrontFx(point,palette);if(this.worldAssetQa)this.drawWorldAssetQa();if(this.visualDebug)this.drawVisualDebug(curve,point);ctx.restore();
            this.drawHud(current,palette);if(!this.assets||!this.assets.ready)this.overlay(this.assets&&this.assets.failed?'ERRO NOS ASSETS':'CARREGANDO SURF','Sprites oficiais do Surf',this.assets&&this.assets.failed?`${this.assets.failed} arquivo(s) com erro`:'Aguarde um instante','');if(this.debug)this.drawDebug(current,point);ctx.restore();canvas.dataset.surfEndlessDiagnostics=JSON.stringify(this.diagnostics());canvas.dataset.surfVisualDiagnostics=JSON.stringify({layers:['sky','distant_islands','distant_ocean','main_wave','zorp_gameplay','shoreline','beach_foreground'],parallax:SURF_VISUAL.parallax,whitewaterFront:this.renderer.whitewaterFront??null,visualDebug:this.visualDebug,visualEvent:this.visualEvent||null});
        }
        tubeCaptureVisualAmount(){
            if(!this.tubeCapture)return 0;const t=this.tubeCaptureTime,entry=smooth(clamp(t/.62,0,1)),exit=1-smooth(clamp((t-(LAST_CHANCE_TUBE_DURATION-.88))/.88,0,1));return entry*(.38+exit*.62);
        }
        drawTubeCaptureFx(point,palette,curve,amount){
            if(!this.tubeCapture&&this.tubeExitFlash<=0){canvas.dataset.surfTubeDiagnostics=JSON.stringify({active:false,escaped:this.tubeWarning==='ESCAPED',warning:this.tubeWarning,rescueAvailable:this.tubeRescueAvailable});return;}ctx.save();
            if(this.tubeCapture){
                const danger=clamp(this.tubeDangerTimer/1.28,0,1),top=this.renderer.crestY(curve,0,this.time),bottom=curve.lowerY,openingX=point.x+82,openingY=point.y-41,escape=smooth(clamp((this.tubeCaptureTime-(LAST_CHANCE_TUBE_DURATION-1.05))/1.05,0,1)),squeeze=.08+danger*.16;
                // Frame edges darken like the wave is curling over the camera; leave a broad central opening for play readability.
                const edge=ctx.createLinearGradient(0,top-8,0,bottom+4);edge.addColorStop(0,`rgba(3,20,48,${.10+amount*.10})`);edge.addColorStop(.48,`rgba(4,23,50,${squeeze})`);edge.addColorStop(1,`rgba(3,18,43,${.11+danger*.12})`);ctx.globalAlpha=.76;ctx.fillStyle=edge;ctx.fillRect(0,top-8,W,bottom-top+16);
                ctx.globalAlpha=.28+amount*.20;ctx.strokeStyle=palette.hi;ctx.lineWidth=2;for(let i=0;i<5;i++){const y=top+16+i*23+Math.sin(this.time*2+i)*2;ctx.beginPath();ctx.moveTo(-8,y);ctx.bezierCurveTo(point.x-85,y-7,point.x-34,y+4,point.x+10,y-3);ctx.stroke();}
                const mouth=ctx.createRadialGradient(openingX,openingY,2,openingX,openingY,52+escape*45);mouth.addColorStop(0,`rgba(255,248,208,${.30+escape*.48})`);mouth.addColorStop(.35,`rgba(168,247,230,${.20+escape*.27})`);mouth.addColorStop(1,'rgba(86,208,202,0)');ctx.globalAlpha=.9;ctx.fillStyle=mouth;ctx.beginPath();ctx.ellipse(openingX,openingY,22+escape*27,33+escape*15,-.18,0,Math.PI*2);ctx.fill();
                // The rear break pushes forward as the safe line is missed.
                const rearX=point.x-58+danger*39;ctx.globalAlpha=.28+danger*.42;ctx.fillStyle=palette.foam;for(let i=0;i<20;i++){const x=rearX+Math.sin(i*2.1+this.time*3)*12,y=point.y-37+i*3.8+Math.cos(i*1.3+this.time*2)*5,r=1+i%3+danger*1.8;ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),r*1.6,r*.7,Math.sin(i+this.time)*.3,0,Math.PI*2);ctx.fill();}
                if(danger>.68){ctx.globalAlpha=(danger-.68)*.45;ctx.fillStyle=palette.deep;ctx.beginPath();ctx.ellipse(point.x,point.y,32,23,0,0,Math.PI*2);ctx.fill();}
                canvas.dataset.surfTubeDiagnostics=JSON.stringify({active:true,time:+this.tubeCaptureTime.toFixed(2),duration:LAST_CHANCE_TUBE_DURATION,warning:this.tubeWarning,danger:+this.tubeDangerTimer.toFixed(2),safeCenter:+this.tubeSafeCenter.toFixed(3),safeWidth:+this.tubeSafeWidth.toFixed(3),visualAmount:+amount.toFixed(2),opening:+(1-danger*.35+escape*.65).toFixed(2),rescueAvailable:this.tubeRescueAvailable});
            }else if(this.tubeExitFlash>0){ctx.globalAlpha=this.tubeExitFlash*.36;ctx.fillStyle='#fff9d6';ctx.fillRect(0,0,W,H);canvas.dataset.surfTubeDiagnostics=JSON.stringify({active:false,escaped:true,exitFlash:+this.tubeExitFlash.toFixed(2),rescueAvailable:this.tubeRescueAvailable});}
            ctx.restore();
        }
        drawVisualDebug(curve,point){
            const front=this.renderer.breakFrontX||SURF_VISUAL.foam.wallBaseX,top=this.renderer.crestY(curve,front,this.time)-2,depth=curve.lowerY-top;
            ctx.save();ctx.strokeStyle='rgba(255,255,255,.50)';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(0,curve.crestY);ctx.lineTo(W,curve.crestY);ctx.stroke();ctx.setLineDash([]);
            ctx.strokeStyle='#fff16b';ctx.beginPath();for(let i=0;i<=36;i++){const x=i/36*W,y=this.renderer.crestY(curve,x,this.time);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
            ctx.strokeStyle='#ff7870';ctx.beginPath();ctx.moveTo(front,top);ctx.lineTo(front,curve.lowerY);ctx.stroke();
            ctx.strokeStyle='#73f4d8';ctx.beginPath();for(let i=0;i<=22;i++){const u=i/22,x=this.renderer.wallEdgeX(u,front,this.time,this.renderer.whitewaterAmount||0),y=top+depth*u;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
            ctx.strokeStyle='#89dfff';ctx.lineWidth=2;ctx.beginPath();const lipY=this.renderer.crestY(curve,front,this.time);ctx.moveTo(front-SURF_VISUAL.foam.lipReach,lipY);ctx.quadraticCurveTo(front-13,lipY-7,front+16,lipY+15);ctx.stroke();
            ctx.strokeStyle='#c888ff';ctx.lineWidth=1;if(this.tubeCapture||this.tubePressure>.08){ctx.beginPath();ctx.ellipse(point.x+82,point.y-41,28,43,-.18,0,Math.PI*2);ctx.stroke();}
            ctx.strokeStyle='#8cf5e5';ctx.beginPath();ctx.moveTo(point.x,point.y);ctx.lineTo(point.x+25,point.y);ctx.stroke();
            ctx.fillStyle='rgba(2,17,35,.87)';ctx.fillRect(7,159,194,70);ctx.fillStyle='#f5fff3';ctx.font='7px monospace';ctx.fillText('SURF VISUAL DEBUG',13,170);ctx.fillText('amarelo crest • vermelho foam front',13,181);ctx.fillText('verde wave wall • ciano lip',13,192);ctx.fillText('roxo tube opening • Zorp contact',13,203);ctx.fillText(`chase ${this.chaserState}  gap ${this.chaseGap.toFixed(1)}  foam ${this.renderer.whitewaterAmount.toFixed(2)}`,13,216);ctx.restore();
        }
        drawFinaleBackFx(point,palette){
            if(this.state!=='FINALE')return;const t=this.finaleTime,charge=clamp((t-.45)/2.05,0,1);
            if(t<2.72){ctx.save();ctx.globalAlpha=.10+charge*.32;for(let i=0;i<12;i++){const y=78+i*13+Math.sin(i*1.8+t*5)*4,x=((i*79-this.distance*.48)%520+520)%520-40;ctx.fillStyle=i%3?palette.hi:'#fff1a5';ctx.fillRect(Math.round(x),Math.round(y),18+charge*34+i%4*5,1+i%2);}ctx.restore();}
            if(t>=2.65&&t<5.30){const airPulse=Math.sin(clamp((t-2.65)/2.65,0,1)*Math.PI);ctx.save();ctx.globalAlpha=.15+airPulse*.30;ctx.strokeStyle='#fff2a0';for(let r=18;r<=42;r+=8){ctx.lineWidth=2;ctx.beginPath();ctx.arc(point.x,point.y,r+airPulse*4,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=.35;ctx.fillStyle=palette.foam;for(let i=0;i<10;i++){const a=i*Math.PI*.2+t*.35,rad=26+i%3*8;ctx.fillRect(Math.round(point.x+Math.cos(a)*rad),Math.round(point.y+Math.sin(a)*rad),2,2);}ctx.restore();}
        }
        drawFinaleFrontFx(point,palette){
            if(this.state!=='FINALE')return;const impact=this.finaleImpact;
            if(impact>0){ctx.save();ctx.globalAlpha=impact;ctx.strokeStyle='#ffffff';ctx.lineWidth=2+impact*4;ctx.beginPath();ctx.ellipse(point.x,point.y+2,18+(1-impact)*42,4+(1-impact)*9,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=palette.foam;for(let i=0;i<18;i++){const side=i%2?-1:1,x=point.x+side*(7+i*2.2),y=point.y-3-Math.sin(i*.8)*9*(impact);ctx.fillRect(Math.round(x),Math.round(y),2+i%3,2+i%2);}ctx.restore();}
            if(this.finaleCelebration>0){ctx.save();ctx.textAlign='center';ctx.globalAlpha=this.finaleCelebration;ctx.fillStyle='rgba(2,20,38,.72)';ctx.fillRect(144,76,162,24);ctx.strokeStyle='#ffe57c';ctx.strokeRect(148,80,154,16);ctx.fillStyle='#fff3aa';ctx.font='bold 11px monospace';ctx.fillText('PERFECT FINISH!',225,92);ctx.restore();}
            canvas.dataset.surfFinaleDiagnostics=JSON.stringify({time:+this.finaleTime.toFixed(2),phase:this.finalePhase,impact:+this.finaleImpact.toFixed(2),celebration:+this.finaleCelebration.toFixed(2),air:+this.player.air.toFixed(1),momentum:+this.player.momentum.toFixed(2),speed:+this.forwardSpeed.toFixed(1),chaseGap:+this.chaseGap.toFixed(1),hazardsVisible:0});
        }
        drawWorldObjects(curve){
            if(this.cleanWaveQa||this.noObjectsQa||this.state==='FINALE')return;
            const scale=WORLD_PROJECTION_SCALE;
            for(const segment of this.director.segments){
                for(const item of segment.collectibles){if(item.taken)continue;const x=180+(item.progress-this.distance)*scale;if(x<-30||x>480)continue;const q=this.renderer.sample(curve,item.face,x),y=item.air>0?this.renderer.crestY(curve,x)-item.air*.72:q.y;this.drawCollectible(item,x,y);}
                for(const hazard of segment.hazards){if(hazard.hit)continue;const delta=hazard.progress-this.distance,x=180+delta*scale;if(x<-45||x>505)continue;const face=hazard.currentFace??hazard.face,q=this.renderer.sample(curve,face,x),y=hazard.currentAir>0?this.renderer.crestY(curve,x)-hazard.currentAir*.72:q.y;this.drawHazard(hazard,x,y,delta);}
            }
        }
        drawCollectible(item,x,y){ctx.save();ctx.translate(Math.round(x),Math.round(y-8));ctx.fillStyle=item.type==='star'?'#fff29a':'#ffd64d';ctx.strokeStyle=item.type==='star'?'#f28c52':'#b96b35';ctx.lineWidth=2;ctx.beginPath();if(item.type==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?3.5:7;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();}else ctx.arc(0,0,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff4b5';ctx.fillRect(-2,-3,2,4);ctx.restore();}
        drawHazard(hazard,x,y,delta){
            if(hazard.type==='foam'){ctx.save();ctx.fillStyle='rgba(224,255,248,.78)';for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(x-12+i*4,y-3+Math.sin(i*2)*3,3+i%2,0,Math.PI*2);ctx.fill();}ctx.restore();}
            else{const visual=this.hazardVisual(hazard,delta);if(visual.entry)this.assets.drawAtContact(ctx,visual.entry,x,y,visual.scale);}
            if(this.debug)this.drawHazardHitbox(hazard,x,y);
        }
        hazardVisual(hazard,delta){
            if(!this.assets||!this.assets.ready)return {entry:null,scale:1};const tick=Math.floor(this.frame/9);
            if(hazard.type==='swimmer'){const motion=Math.sin(this.time*hazard.motionSpeed+hazard.phase),animation=delta>330?'idle':delta<115?'panic':motion<-.72?'back':'swim',seq=this.assets.sequence('swimmers',{characterId:hazard.characterId,animation});return {entry:seq[tick%Math.max(1,seq.length)]||null,scale:.19};}
            if(hazard.type==='surfer'){const motion=Math.sin(this.time*hazard.motionSpeed+hazard.phase),animation=Math.abs(motion)>.78?'carve':motion>.28?'surf_back':motion<-.28?'surf_front':'surf_side';return {entry:this.assets.pick('surfers',hazard.characterId,animation,tick),scale:.20};}
            if(hazard.type==='shark'){const animation=hazard.telegraph&&delta>260?'fin':hazard.motion==='jump'&&delta<185?'jump':delta<45?'attack_visual':'swim';return {entry:this.assets.pick('sharks','shark_01',animation,tick),scale:animation==='jump'?.22:.19};}
            if(hazard.type==='bird'){const prefix=hazard.motion==='air_drift'&&Math.sin(this.time*hazard.motionSpeed+hazard.phase)<-.45?'dive_':delta>120&&delta<190?'front_':'fly_',seq=this.assets.sequence('seagulls',{characterId:'seagull_01'}).filter(entry=>entry.animation.startsWith(prefix));return {entry:seq[tick%Math.max(1,seq.length)]||null,scale:.22};}
            const id=hazard.type==='buoy'?hazard.characterId:hazard.type;return {entry:this.assets.pick('hazards',id,'idle',tick),scale:hazard.type==='wood_crate'?.17:hazard.type==='log'?.19:.15};
        }
        drawHazardHitbox(hazard,x,y){const r=Math.max(5,hazard.radius*72);ctx.save();ctx.strokeStyle=hazard.severity==='major'?'#ff5575':'#ffe568';ctx.lineWidth=1;ctx.setLineDash([3,2]);ctx.beginPath();ctx.ellipse(x,y-r*.45,r,r*.62,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
        drawWorldAssetQa(){if(!this.assets||!this.assets.ready)return;const entries=this.assets.entries.filter(entry=>entry.set==='world');ctx.save();ctx.fillStyle='rgba(2,14,31,.90)';ctx.fillRect(4,46,442,246);ctx.font='6px monospace';for(let i=0;i<entries.length;i++){const entry=entries[i],col=i%10,row=Math.floor(i/10),x=26+col*44,y=84+row*42,scale=Math.min(.20,34/entry.width,28/entry.height);this.assets.drawAtContact(ctx,entry,x,y,scale);ctx.fillStyle='#dffdf7';ctx.fillText(entry.category.slice(0,4),x-13,y+8);}ctx.restore();}
        drawPlayer(point){
            const p=this.player;if(!this.assets||!this.assets.ready)return;let seq=this.assets.zorp(p.visualState)||[];
            if(p.visualState==='trick'){const all=this.assets.zorp('trick'),ranges={a:[0,2],d:[2,4],w:[4,7],s:[7,10]},range=ranges[p.trickKind]||[0,all.length];seq=all.slice(range[0],Math.min(range[1],all.length));}
            if(!seq.length)return;const frameRate=['takeoff','landing','reentry'].includes(p.visualState)?5:7,entry=seq[Math.floor(this.frame/frameRate)%seq.length],scale=.36,stumbleWave=this.stumble>0?Math.sin(this.frame*.72)*Math.min(.16,this.stumble*.004):0,stumbleLift=this.stumble>0?Math.abs(Math.sin(this.frame*.45))*2:0;
            ctx.save();ctx.translate(point.x,point.y-stumbleLift);ctx.rotate(p.boardAngle+p.rotation*.12+stumbleWave);ctx.translate(-point.x,-point.y);this.assets.drawAtContact(ctx,entry,point.x,point.y,scale);ctx.restore();
            if(p.air<=0){ctx.globalAlpha=.24;ctx.fillStyle=this.energyTimer>0?'#ffe86b':'#b8fff0';ctx.beginPath();ctx.ellipse(point.x,point.y+2,12+p.momentum,2.5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
        }
        drawHud(current,palette){
            ctx.fillStyle='rgba(3,20,39,.74)';ctx.fillRect(7,7,170,39);if(!this.runnerQa)ctx.fillRect(292,7,151,35);ctx.font='9px monospace';ctx.fillStyle='#effff6';ctx.fillText(`DIST ${Math.floor(this.distance)}m / ${SURF_FINISH_DISTANCE}m`,14,19);ctx.fillText(`BEST ${this.bestDistance}m`,14,31);ctx.fillStyle='rgba(255,255,255,.20)';ctx.fillRect(14,36,151,3);ctx.fillStyle='#6cebd3';ctx.fillRect(14,36,151*clamp(this.distance/SURF_FINISH_DISTANCE,0,1),3);
            if(!this.runnerQa){ctx.fillStyle='#effff6';ctx.fillText(`SCORE ${Math.floor(this.score)}`,300,19);ctx.fillText(`BEST ${this.bestScore}`,300,30);}if(this.energyTimer>0&&!this.runnerQa){ctx.fillStyle='#ffe86b';ctx.fillText(`ZORP ENERGY ${Math.ceil(this.energyTimer/60)}s`,180,18);}
            if(this.waveBanner>0&&!this.cleanWaveQa&&this.state==='PLAYING'){const label=(current.segment.pattern||current.segment.id).replaceAll('_',' ').toUpperCase();ctx.globalAlpha=clamp(this.waveBanner/20,0,1);ctx.fillStyle='rgba(2,19,36,.65)';ctx.fillRect(172,25,116,20);ctx.fillStyle=palette.foam;ctx.textAlign='center';ctx.fillText(label,230,38);ctx.textAlign='left';ctx.globalAlpha=1;}
            if(this.hitFeedback>0&&this.state==='PLAYING'){const a=clamp(this.hitFeedback/20,0,1),tubeMessage=this.tubeCapture||this.hitLabel.includes('TUBO');ctx.globalAlpha=a;ctx.fillStyle=tubeMessage?'rgba(4,30,43,.84)':'rgba(54,17,28,.80)';ctx.fillRect(137,54,176,21);ctx.strokeStyle=tubeMessage?'#9df8eb':'#ff9a86';ctx.strokeRect(140,57,170,15);ctx.fillStyle=tubeMessage?'#effff7':'#fff2d7';ctx.textAlign='center';ctx.fillText(this.hitLabel,225,68);ctx.textAlign='left';ctx.globalAlpha=1;}
            if(this.state==='INTRO')this.overlay('ZORP — SURF STORY','SEGURE [ESPAÇO/W] PARA SUBIR','SOLTE PARA DESCER • NO AR: A/D/W/S',`CHEGUE A ${SURF_FINISH_DISTANCE}m`);
            else if(this.state==='FINALE'){const labels={CLEAR_RUNWAY:'RETA FINAL',POWER_DROP:'IMPULSO FINAL',CREST_ATTACK:'ATACAR A CRISTA',TAKEOFF:'TAKEOFF!',SIGNATURE_TRICK:'MEGA TRICK!',REENTRY:'REENTRY',PERFECT_LANDING:'PERFECT LANDING!',LANDING_HOLD:'PERFECT LANDING!',VICTORY_GLIDE:'CELEBRAÇÃO'};ctx.fillStyle='rgba(3,20,39,.70)';ctx.fillRect(306,52,138,20);ctx.strokeStyle=this.finalePhase==='PERFECT_LANDING'||this.finalePhase==='LANDING_HOLD'?'#ffe56b':'#89f4dc';ctx.strokeRect(309,55,132,14);ctx.fillStyle=this.finalePhase==='PERFECT_LANDING'||this.finalePhase==='LANDING_HOLD'?'#fff19a':'#fff4bd';ctx.textAlign='center';ctx.fillText(labels[this.finalePhase]||'SURF FINALE',375,65);ctx.textAlign='left';}
            else if(this.state==='FAIL'){if(this.resultDelay>0)this.overlay('WIPEOUT',this.failure,'OS JURADOS ESTÃO DECIDINDO...','');else this.drawJudgeResult(false);}
            else if(this.state==='COMPLETE')this.drawJudgeResult(true);
        }
        drawJudgeResult(victory){
            const result=this.result||{judges:victory?[10,10,10]:[0,0,0],distance:Math.round(this.distance),bestDistance:this.bestDistance};
            const elapsed=Math.max(0,this.frame-this.resultShownAt),plateKinds=['left_empty','double_empty','right_empty'],plateX=[92,225,358],plateFiles=[],digitFiles=[];let visibleSigns=0;
            ctx.fillStyle='rgba(2,14,31,.92)';ctx.fillRect(20,45,410,230);ctx.strokeStyle=victory?'#ffe56b':'#89f4dc';ctx.lineWidth=2;ctx.strokeRect(25,50,400,220);ctx.textAlign='center';ctx.fillStyle=victory?'#fff19a':'#effff8';ctx.font='bold 16px monospace';ctx.fillText(victory?'SURF COMPLETE!':'NOTAS DA RUN',225,74);
            for(let i=0;i<3;i++){
                const local=clamp((elapsed-i*14)/22,0,1),ease=1-Math.pow(1-local,3),bounce=local>=1?Math.sin((elapsed-i*14-22)*.18)*1.5*Math.exp(-Math.max(0,elapsed-i*14-22)*.055):0;
                if(local<=0)continue;
                visibleSigns++;const x=plateX[i],contactY=202+(1-ease)*72+bounce,plate=this.assets&&this.assets.scorePlate(plateKinds[i]),digit=this.assets&&this.assets.scoreDigit(result.judges[i]);
                if(plate){plateFiles.push(plate.file);ctx.save();ctx.globalAlpha=clamp(local*1.45,0,1);this.assets.drawAtContact(ctx,plate,x,contactY,.255);ctx.restore();}
                const digitLocal=clamp((elapsed-i*14-8)/12,0,1),digitPop=1+Math.sin(digitLocal*Math.PI)*.16;
                if(digit&&digitLocal>0){digitFiles.push(digit.file);ctx.save();ctx.globalAlpha=digitLocal;ctx.translate(x,140);ctx.scale(digitPop,digitPop);this.assets.drawAtContact(ctx,digit,0,0,.255);ctx.restore();}
            }
            if(elapsed>=58){const average=(result.judges.reduce((sum,value)=>sum+value,0)/3).toFixed(1).replace('.0','');ctx.globalAlpha=clamp((elapsed-58)/16,0,1);ctx.font='bold 10px monospace';ctx.fillStyle=victory?'#fff19a':'#effff8';ctx.fillText(`MÉDIA ${average}  •  DISTANCE ${result.distance}m`,225,229);ctx.font='9px monospace';ctx.fillStyle='#b8e9e4';ctx.fillText(`BEST ${result.bestDistance}m  •  SCORE ${Math.round(result.score||0)}`,225,244);ctx.fillStyle=victory?'#ffe56b':'#6cebd3';ctx.fillText(victory?'[ESPAÇO/ENTER] VOLTAR À ILHA':'[ESPAÇO/ENTER] TENTAR NOVAMENTE',225,261);ctx.globalAlpha=1;}
            ctx.textAlign='left';canvas.dataset.surfScoreDiagnostics=JSON.stringify({judges:result.judges.slice(),average:+(result.judges.reduce((sum,value)=>sum+value,0)/3).toFixed(2),visibleSigns,plateFiles,digitFiles,elapsedFrames:elapsed});
        }
        overlay(title,a,b,c){ctx.fillStyle='rgba(2,14,31,.84)';ctx.fillRect(43,79,364,141);ctx.strokeStyle='#89f4dc';ctx.strokeRect(48,84,354,131);ctx.textAlign='center';ctx.fillStyle='#fff4bd';ctx.font='bold 17px monospace';ctx.fillText(title,225,113);ctx.font='10px monospace';ctx.fillStyle='#effff8';ctx.fillText(a,225,143);ctx.fillText(b,225,162);ctx.fillStyle='#6cebd3';ctx.fillText(c,225,193);ctx.textAlign='left';}
        drawDebug(current,point){const counts=this.director.activeCounts(),pattern=current.segment.pattern||'clean',dpm=this.time>0?this.stats.decisions/(this.time/60):0;ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(7,191,259,102);ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText(`dist ${this.distance.toFixed(1)} speed ${this.forwardSpeed.toFixed(1)} diff ${current.segment.difficulty.toFixed(2)}`,12,204);ctx.fillText(`chunk ${current.segment.uid} ${current.segment.id}/${pattern}/${current.segment.pacing}`,12,216);ctx.fillText(`face ${this.player.verticalPosition.toFixed(3)} vel ${this.player.verticalVelocity.toFixed(4)} mom ${this.player.momentum.toFixed(2)}`,12,228);ctx.fillText(`chaser ${this.chaserState} gap ${this.chaseGap.toFixed(1)} stumble ${this.stumble}`,12,240);ctx.fillText(`active S/H/C/P ${counts.segments}/${counts.hazards}/${counts.collectibles}/${counts.patterns}`,12,252);ctx.fillText(`decisions/min ${dpm.toFixed(1)} routes ${current.segment.routeOptions||0}`,12,264);ctx.fillText(`pools S/H/C ${this.director.segmentPool.free.length}/${this.director.hazardPool.free.length}/${this.director.collectiblePool.free.length}`,12,276);ctx.fillText(`validator ${this.director.validationCorrections} fps ${(this.fps||0).toFixed(1)}`,12,288);ctx.strokeStyle='#ffef75';ctx.beginPath();ctx.moveTo(point.x,point.y);ctx.lineTo(point.x+18,point.y);ctx.stroke();}
        diagnostics(){const c=this.profile(),counts=this.director.activeCounts(),p=this.player,dpm=this.time>0?this.stats.decisions/(this.time/60):0,visibleWorld=(W-180)/WORLD_PROJECTION_SCALE,visibleLeadSeconds=+(visibleWorld/Math.max(1,this.forwardSpeed)).toFixed(2),curve=this.renderer.curve(c.profile,this.time),faceHeight=curve.lowerY-curve.crestY,values=[this.distance,this.forwardSpeed,p.verticalPosition,p.verticalVelocity,p.momentum,p.air,this.score,this.chaseGap,this.playerProgress,this.chaserProgress,faceHeight,this.tubeDangerTimer,this.tubeSafeCenter,this.tubeSafeWidth],assetDiagnostics=this.assets?this.assets.diagnostics():null;return{version:'9.4.1_visual_polish',slice:this.slice,cleanWaveQa:this.cleanWaveQa,runnerQa:this.runnerQa,qaScenario:this.qaScenario,qaProgress:this.qaProgress,qaStartTime:this.qaStartTime,state:this.state,time:+this.time.toFixed(1),distance:+this.distance.toFixed(1),bestDistance:this.bestDistance,score:Math.round(this.score),bestScore:this.bestScore,fps:+(this.fps||0).toFixed(1),difficulty:+c.segment.difficulty.toFixed(3),segment:{uid:c.segment.uid,id:c.segment.id,pattern:c.segment.pattern||'clean',pacing:c.segment.pacing,phase:+c.phase.toFixed(2),weather:c.segment.weather,tube:+c.profile.tubeAmount.toFixed(2),routeOptions:c.segment.routeOptions||0},wave:{crestY:+curve.crestY.toFixed(1),lowerY:+curve.lowerY.toFixed(1),faceHeight:+faceHeight.toFixed(1),facePercent:+(faceHeight/H*100).toFixed(1),airSpacePercent:+(curve.crestY/H*100).toFixed(1)},player:{verticalPosition:+p.verticalPosition.toFixed(3),verticalVelocity:+p.verticalVelocity.toFixed(5),momentum:+p.momentum.toFixed(2),forwardSpeed:+this.forwardSpeed.toFixed(2),air:+p.air.toFixed(1),airborne:p.air>0,visualState:p.visualState,stumble:this.stumble,contactFrames:p.contactFrames,weakHop:p.weakHop},chaser:{state:this.chaserState,gap:+this.chaseGap.toFixed(2),playerProgress:+this.playerProgress.toFixed(1),chaserProgress:+this.chaserProgress.toFixed(1),recoverable:this.chaserState!=='CAUGHT',tubeRescueAvailable:this.tubeRescueAvailable,tubeCapture:this.tubeCapture,tubeTime:+this.tubeCaptureTime.toFixed(2),tubeDuration:LAST_CHANCE_TUBE_DURATION,tubeDanger:+this.tubeDangerTimer.toFixed(2),tubeWarning:this.tubeWarning,tubeSafeCenter:+this.tubeSafeCenter.toFixed(3),tubeSafeWidth:+this.tubeSafeWidth.toFixed(3)},pacing:{decisionsPerMinute:+dpm.toFixed(1),visibleLeadSeconds,screenTraversalSeconds:visibleLeadSeconds,projectionScale:WORLD_PROJECTION_SCALE,pattern:c.segment.pattern||'clean'},visual:{composition:['sky','distant_islands','distant_ocean','main_wave','zorp_gameplay','shoreline','beach_foreground'],parallax:SURF_VISUAL.parallax,whitewaterFront:+(this.renderer.whitewaterFront||0).toFixed(1),whitewaterAmount:+(this.renderer.whitewaterAmount||0).toFixed(2),whitewaterChase:+(this.renderer.whitewaterChase||0).toFixed(2),boatsVisible:this.renderer.beach.boatsVisible,whaleVisible:this.renderer.beach.whaleVisible,visualDebug:this.visualDebug},energy:{active:this.energyTimer>0,seconds:+(this.energyTimer/60).toFixed(1),shield:this.energyShield},story:{milestone:this.storyMilestone,target:SURF_FINISH_DISTANCE,progress:+clamp(this.distance/SURF_FINISH_DISTANCE,0,1).toFixed(3),finalePhase:this.finalePhase,finaleTime:+this.finaleTime.toFixed(2),finaleImpact:+this.finaleImpact.toFixed(2),finaleCelebration:+this.finaleCelebration.toFixed(2),playerControlEnabled:this.playerControlEnabled,medalEarned:localStorage.getItem('zorpSurfMedal')==='1',whaleEnabled:WHALE_ENABLED,result:this.result},stats:{...this.stats},generation:{generated:this.director.generated,recycled:this.director.recycled,validationCorrections:this.director.validationCorrections,patternsGenerated:this.director.patternsGenerated,hazardTypes:[...this.director.generatedHazardTypes].sort(),characterIds:[...this.director.generatedCharacters].sort(),active:counts,pools:{segments:this.director.segmentPool.free.length,hazards:this.director.hazardPool.free.length,collectibles:this.director.collectiblePool.free.length},created:{segments:this.director.segmentPool.created,hazards:this.director.hazardPool.created,collectibles:this.director.collectiblePool.created}},assets:assetDiagnostics,assetsReady:!!(assetDiagnostics&&assetDiagnostics.ready),assetFailures:assetDiagnostics?assetDiagnostics.failed:null,invalidDrawCalls:assetDiagnostics?assetDiagnostics.invalidDrawCalls:null,hasNaN:values.some(v=>!Number.isFinite(v)),fallbacks:{chase:false,legacy:false}};}
        qaJudges(){
            const originalDistance=this.distance,originalTime=this.time,results={};
            for(const pct of [5,25,50,75,95]){this.distance=SURF_FINISH_DISTANCE*pct/100;this.time=Math.max(1,110*pct/100);results[pct]=this.judgeScores(this.distance);}
            this.distance=originalDistance;this.time=originalTime;return results;
        }
        qaSetProgress(percent){this.distance=SURF_FINISH_DISTANCE*clamp(percent,0,100)/100;this.playerProgress=this.distance;this.director.ensure(this.distance);return this.diagnostics();}
        qaForceWipeout(percent){this.reset(false);this.distance=SURF_FINISH_DISTANCE*clamp(percent,0,99.9)/100;this.playerProgress=this.distance;this.time=Math.max(1,110*percent/100);this.director.ensure(this.distance);this.wipeout(`QA ${percent}%`);this.resultDelay=0;this.resultShownAt=this.frame;return this.result;}
        runStoryTest(mode='rhythm'){
            this.qa=true;this.qaMode=mode;this.qaProgress=0;this.qaStartTime=0;this.longQa=false;this.noObjectsQa=false;this.reset(false);let frames=0;
            while(frames<12000&&this.state!=='FAIL'&&this.state!=='COMPLETE'){this.update();frames++;}
            this.storyQaReport={mode,frames,outcome:this.state,...this.diagnostics()};canvas.dataset.surfStoryQaDiagnostics=JSON.stringify(this.storyQaReport);return this.storyQaReport;
        }
        runStressTest(frames=108000){const heapStart=performance.memory?performance.memory.usedJSHeapSize:null;this.longQa=true;this.qa=true;this.qaMode='rhythm';this.qaProgress=0;this.reset(false);for(let i=0;i<frames;i++){if(this.state==='FAIL'){this.state='PLAYING';this.player.verticalPosition=.58;this.player.verticalVelocity=.002;this.player.momentum=6;}this.update();}const heapEnd=performance.memory?performance.memory.usedJSHeapSize:null;this.state='STRESS_COMPLETE';this.stressReport={simulatedMinutes:frames/3600,distance:+this.distance.toFixed(1),heapDeltaMB:heapStart!==null?+((heapEnd-heapStart)/1048576).toFixed(2):null,...this.diagnostics()};canvas.dataset.surfStressDiagnostics=JSON.stringify(this.stressReport);return this.stressReport;}
    }

    const game=new EndlessSurfGame(window.surfAssets);
    window.surfEndlessGame=game;window.surfMinigame=game;window.resetSurfMinigame=show=>game.reset(show);window.updateSurfMinigame=()=>{for(let i=0;i<(game.qa?game.qaSpeed:1);i++)game.update();};window.drawSurfMinigame=()=>game.draw();window.getSurfDiagnostics=()=>game.diagnostics();window.surfEndlessQA={diagnostics:()=>game.diagnostics(),stress:frames=>game.runStressTest(frames),story:mode=>game.runStoryTest(mode),judges:()=>game.qaJudges(),setProgress:percent=>game.qaSetProgress(percent),wipeoutAt:percent=>game.qaForceWipeout(percent),finale:()=>{game.qaSetProgress(100);game.startFinale();return game.diagnostics();},assets:()=>window.surfAssets&&window.surfAssets.diagnostics()};
    if((game.qa||game.longQa||game.cleanWaveQa||game.storyQa||game.finaleQa||game.scoreQaJudges)&&typeof currentScene!=='undefined'){currentScene=SCENE;game.reset(true);if(game.longQa)setTimeout(()=>game.runStressTest(game.stressFrames),0);else if(game.storyQa)setTimeout(()=>game.runStoryTest(game.qaMode),0);}
})();
