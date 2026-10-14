(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateProceduralTrack = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
    "use strict";

    const RAMP_PROFILES = Object.freeze({
        SMALL_KICKER: Object.freeze({ height: 48, launchStrength: 72, curve: "ease-in" }),
        MEDIUM_KICKER: Object.freeze({ height: 78, launchStrength: 105, curve: "ease-in" }),
        LONG_BANK: Object.freeze({ height: 90, launchStrength: 18, curve: "linear" }),
        CURVED_RAMP: Object.freeze({ height: 112, launchStrength: 135, curve: "ease-in" }),
        BIG_LAUNCH: Object.freeze({ height: 150, launchStrength: 185, curve: "ease-in" })
    });

    const point = (x, y) => Object.freeze({ x, y });
    const segment = (a, b) => Object.freeze([a, b]);
    const freezePoints = points => Object.freeze(points.map(p => Array.isArray(p)
        ? point(Number(p[0]), Number(p[1]))
        : point(Number(p.x), Number(p.y))));
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function sampleCurve(x, y, length, height, profile, samples = 12) {
        const points = [];
        for (let index = 0; index <= samples; index++) {
            const t = index / samples;
            const lift = profile === "linear" ? t : t * t;
            points.push({ x: x + length * t, y: y - height * lift });
        }
        return freezePoints(points);
    }

    function launchSurface(x, y, length, height, samples = 40) {
        // A tangent-continuous approach, sampled once for BOTH drawing and collision.
        return sampleCurve(x, y, length, height, "ease-in", samples);
    }

    function smoothRampSurface(authored) {
        const knots=freezePoints(authored), slopes=knots.slice(1).map((p,i)=>(p.y-knots[i].y)/(p.x-knots[i].x));
        const tangents=knots.map((_,i)=>!i?slopes[0]:i===knots.length-1?slopes.at(-1)
            :slopes[i-1]*slopes[i]<=0?0:2*slopes[i-1]*slopes[i]/(slopes[i-1]+slopes[i]));
        const points=[];
        for(let i=1;i<knots.length;i++){
            const a=knots[i-1],b=knots[i],dx=b.x-a.x;
            for(let j=0;j<8;j++){
                const t=j/8,t2=t*t,t3=t2*t;
                points.push(point(a.x+dx*t,(2*t3-3*t2+1)*a.y+(t3-2*t2+t)*dx*tangents[i-1]
                    +(-2*t3+3*t2)*b.y+(t3-t2)*dx*tangents[i]));
            }
        }
        points.push(knots.at(-1));return Object.freeze(points);
    }

    function safeSegments(points) {
        return Object.freeze(points.slice(1).map((p, index) => segment(points[index], p)));
    }

    function createBuilder(options = {}) {
        const groundSegments = [];
        const gaps = [];
        const ramps = [];
        const rails = [];
        const decor = [];
        const visuals = [];
        const checkpoints = [];
        const transfers = [];
        const playLine = [];
        const obstacles = [];
        const spawnX = Number(options.spawnX) || 80;
        const defaultGroundY = Number(options.groundY) || 250;
        let finish = { id: "procedural-finish", x: 3200, label: "TEST FINISH" };

        function addGround({ id, x, length, y = defaultGroundY, endY = y, depth = 95 }) {
            const top = segment(point(x, y), point(x + length, endY));
            const ground = Object.freeze({ id, kind: "ground", startX: x, endX: x + length,
                startY: y, endY, depth,
                collisionRegions: Object.freeze({ SAFE_TOP: Object.freeze([top]) }) });
            groundSegments.push(ground);
            visuals.push(ground);
            return ground;
        }

        function addGap({ id, leftEdge, rightEdge, edgeY = defaultGroundY, rightEdgeY = edgeY, fatal = true, label = "GAP" }) {
            const gap = Object.freeze({ id, kind: "gap", startX: leftEdge, endX: rightEdge,
                width: rightEdge - leftEdge, edgeY, rightEdgeY, fatal, label, collisionRole: "FATAL_AREA",
                collisionRegions: Object.freeze({ FATAL_AREA: fatal ? Object.freeze({
                    left: leftEdge, right: rightEdge, top: edgeY, bottom: Infinity
                }) : null }) });
            gaps.push(gap);
            visuals.push(gap);
            return gap;
        }

        function addRamp({ id, type = "SMALL_KICKER", x, length, startY = defaultGroundY,
            height, baseY = startY, launchStrength, autoLaunch = false, samples = 12, name,
            surfacePoints: authoredSurface, specialAir = null }) {
            const profile = RAMP_PROFILES[type];
            if (!profile && !authoredSurface) throw new Error(`Unknown procedural ramp type: ${type}`);
            const surfacePoints = authoredSurface ? (type === "CURVED_RAMP" && authoredSurface.length > 2
                ? smoothRampSurface(authoredSurface) : freezePoints(authoredSurface))
                : sampleCurve(x, startY, length, Number(height ?? profile.height), profile.curve, samples);
            const startX = surfacePoints[0].x;
            const endX = surfacePoints.at(-1).x;
            const actualBaseY = Number.isFinite(baseY) ? baseY : Math.max(...surfacePoints.map(p => p.y));
            const strength = Number(launchStrength ?? profile?.launchStrength ?? 0);
            const ramp = Object.freeze({
                id, name: name || type.replaceAll("_", " "), kind: type.toLowerCase(),
                primitiveType: "ramp", procedural: true,
                startX, endX, takeoffX: endX,
                surfacePoints, collisionSurface: surfacePoints, baseY: actualBaseY,
                launchStrength: strength, launchImpulse: strength, autoLaunch,
                ...(specialAir ? { specialAir: Object.freeze({ ...specialAir }) } : {}),
                collisionEnabled: true,
                collisionRegions: Object.freeze({
                    SAFE_TOP: surfacePoints,
                    DANGEROUS_SIDE: Object.freeze({ type: "RAMP_BODY", left: startX, right: endX,
                        top: Math.min(...surfacePoints.map(p => p.y)), bottom: actualBaseY,
                        surfacePoints, rampId: id })
                })
            });
            ramps.push(ramp);
            visuals.push(ramp);
            return ramp;
        }

        function railPath({ x, y, length, angle = 0, curve = 0, samples = 14 }) {
            const slope = Math.tan(angle * Math.PI / 180);
            const points = [];
            for (let index = 0; index <= samples; index++) {
                const t = index / samples;
                points.push({ x: x + length * t, y: y + slope * length * t + curve * 4 * t * (1 - t) });
            }
            return freezePoints(points);
        }

        function samplePath(path, x) {
            for (let index = 1; index < path.length; index++) {
                const a = path[index - 1], b = path[index];
                if (x < a.x || x > b.x || b.x === a.x) continue;
                const t = (x - a.x) / (b.x - a.x);
                return a.y + (b.y - a.y) * t;
            }
            return path.at(-1).y;
        }

        function addRail({ id, x, y, length, angle = 0, curve = 0, supportSpacing = 100,
            supportY = defaultGroundY, type, required = false, name, grindPath: authoredPath }) {
            const grindPath = authoredPath ? freezePoints(authoredPath)
                : railPath({ x, y, length, angle, curve });
            const railX = grindPath[0].x;
            const railEndX = grindPath.at(-1).x;
            const railLength = railEndX - railX;
            const supports = [];
            const spacing = clamp(Number(supportSpacing) || 100, 50, 180);
            for (let sx = railX + Math.min(26, railLength * .15); sx < railEndX - 8; sx += spacing) {
                const topY = samplePath(grindPath, sx);
                const bottomY = typeof supportY === "function" ? supportY(sx) : supportY;
                if (Number.isFinite(bottomY) && bottomY > topY + 6) supports.push(Object.freeze({ x: sx, topY, bottomY }));
            }
            if (!supports.length && Number.isFinite(supportY)) {
                const sx = railX + railLength / 2;
                supports.push(Object.freeze({ x: sx, topY: samplePath(grindPath, sx), bottomY: supportY }));
            }
            const resolvedType = type || (Math.abs(curve) > 1 ? "curved" : angle > 1 ? "descending" : angle < -1 ? "ascending" : "horizontal");
            const rail = Object.freeze({ id, name: name || id, type: resolvedType, required,
                primitiveType: "rail", procedural: true, points: grindPath, grindPath,
                x: railX, y: grindPath[0].y, startX: railX, endX: railEndX, length: railLength,
                supports: Object.freeze(supports), supportSpacing: spacing,
                collisionRegions: Object.freeze({ GRINDABLE: grindPath,
                    GRINDABLE_TOP: grindPath, DECORATION: null }) });
            rails.push(rail);
            visuals.push(rail);
            return rail;
        }

        function addPlatform({ id, x, y, width, baseY = defaultGroundY, grindable = false,
            dangerousSide = true, supportSpacing = 105, trickable = false, name,
            primitiveType = "platform", grindRailId }) {
            const top = freezePoints([{ x, y }, { x: x + width, y }]);
            const collisionObject = Object.freeze({ id, type: primitiveType, primitiveType,
                collisionRegions: Object.freeze({
                    SAFE_TOP: Object.freeze([segment(top[0], top[1])]),
                    GRINDABLE: grindable ? top : Object.freeze([]),
                    GRINDABLE_TOP: grindable ? top : Object.freeze([]),
                    DANGEROUS_SIDE: dangerousSide ? Object.freeze({ left: x, right: x + width,
                        top: y + 3, bottom: baseY }) : null,
                    DANGEROUS_STAIR_FALL: null, DECORATION: null
                }) });
            const item = Object.freeze({ id, type: "procedural", primitiveType, x, y,
                width, height: baseY - y, baseY, supportSpacing, trickable, name: name || id, collisionObject });
            decor.push(item); visuals.push(item);
            if (grindable) addRail({ id: grindRailId || `${id}-edge`, x, y, length: width, supportY: baseY,
                supportSpacing, type: "ledge", name: `${name || id} EDGE` });
            return item;
        }

        function addBench({ id, x, groundY = defaultGroundY, width = 170, height = 42,
            grindable = true, name, grindRailId }) {
            const y = groundY - height;
            const top = freezePoints([{ x, y }, { x: x + width, y }]);
            const collisionObject = Object.freeze({ id, type: "bench", primitiveType: "bench",
                collisionRegions: Object.freeze({
                    SAFE_TOP: Object.freeze([segment(top[0], top[1])]),
                    GRINDABLE: grindable ? top : Object.freeze([]),
                    GRINDABLE_TOP: grindable ? top : Object.freeze([]),
                    DANGEROUS_SIDE: Object.freeze({ left: x + 4, right: x + width - 4,
                        top: y + 4, bottom: groundY - 2 }),
                    DANGEROUS_STAIR_FALL: null, DECORATION: null
                }) });
            const item = Object.freeze({ id, type: "procedural", primitiveType: "bench", x, y, width,
                height, baseY: groundY, trickable: true, name: name || id, collisionObject });
            decor.push(item); visuals.push(item);
            if (grindable) addRail({ id: grindRailId || `${id}-top`, x, y, length: width, supportY: groundY,
                supportSpacing: Math.max(60, width - 34), type: "ledge", name: `${name || id} TOP` });
            return item;
        }

        function addLedge({ id, x, groundY = defaultGroundY, width = 190, height = 48,
            grindable = true, name, grindRailId }) {
            const item = addPlatform({ id, x, y: groundY - height, width, baseY: groundY,
                grindable, dangerousSide: true, supportSpacing: width, trickable: true, name,
                primitiveType: "ledge", grindRailId });
            return item;
        }

        function addStairs({ id, x, topY, steps = 7, stepWidth = 28, stepHeight = 10,
            direction = "down", fatal = false, handrail = true, railHeight = 42,
            railStartOffset = 22, safeGrindRailId = null, name }) {
            const sign = direction === "down" ? 1 : -1;
            const treads = [], dangerSegments = [];
            for (let index = 0; index < steps; index++) {
                const left = x + index * stepWidth;
                const right = left + stepWidth;
                const y = topY + sign * index * stepHeight;
                const a = point(left, y), b = point(right, y);
                treads.push(segment(a, b));
                dangerSegments.push(Object.freeze({ left, right, top: y, bottom: topY + sign * steps * stepHeight + 8 }));
            }
            const baseY = topY + sign * steps * stepHeight;
            const fatalArea = fatal ? Object.freeze({ type: "STAIR_SEGMENTS",
                segments: Object.freeze(dangerSegments) }) : null;
            const collisionObject = Object.freeze({ id, type: "stairs", primitiveType: "stairs",
                safeGrindRailId: safeGrindRailId || (handrail ? `${id}-handrail` : null),
                collisionRegions: Object.freeze({
                    SAFE_TOP: fatal ? Object.freeze([]) : Object.freeze(treads),
                    GRINDABLE_TOP: Object.freeze([]), DANGEROUS_SIDE: null,
                    DANGEROUS_STAIR_FALL: fatalArea, FATAL_AREA: fatalArea, DECORATION: null
                }) });
            const item = Object.freeze({ id, type: "procedural", primitiveType: "stairs", x, y: topY,
                width: steps * stepWidth, height: Math.abs(steps * stepHeight), baseY,
                steps, stepWidth, stepHeight, direction, fatalStairs: fatal,
                treads: Object.freeze(treads), name: name || id, collisionObject });
            decor.push(item); visuals.push(item);
            if (handrail) {
                const railX = x - railStartOffset;
                const railY = topY - railHeight;
                addRail({ id: `${id}-handrail`, x: railX, y: railY,
                    length: steps * stepWidth + railStartOffset, angle: Math.atan2(sign * steps * stepHeight,
                        steps * stepWidth + railStartOffset) * 180 / Math.PI,
                    supportSpacing: stepWidth * 2,
                    supportY: sx => {
                        const local = clamp(Math.floor((sx - x) / stepWidth), 0, steps - 1);
                        return topY + sign * local * stepHeight;
                    }, type: direction === "down" ? "descending" : "ascending",
                    required: fatal, name: `${name || id} HANDRAIL` });
            }
            return item;
        }

        function addSupport({ id, x, topY, bottomY, width = 14 }) {
            const item = Object.freeze({ id, type: "procedural", primitiveType: "support", x,
                y: topY, width, height: bottomY - topY, topY, bottomY, collisionDisabled: true });
            decor.push(item); visuals.push(item);
            return item;
        }

        function addTransfer(from, to, options = {}) {
            const transfer = Object.freeze({ from, to, jump: options.jump || "normal",
                exitOffset: Number(options.exitOffset) || 12, required: options.required === true });
            transfers.push(transfer);
            return transfer;
        }

        function addPlayInput(x, action) { playLine.push(Object.freeze({ x, action })); }
        function addCheckpoint(x, label = "CHECKPOINT", id = `procedural-checkpoint-${checkpoints.length + 1}`) {
            checkpoints.push(Object.freeze({ id, x, label }));
        }
        function setFinish(x, label = "TEST FINISH", id = "procedural-finish") {
            finish = Object.freeze({ id, x, label });
        }

        function build(extra = {}) {
            function groundHeightAt(x) {
                for (const ramp of ramps) {
                    if (x < ramp.startX || x > ramp.endX) continue;
                    for (let i = 1; i < ramp.surfacePoints.length; i++) {
                        const a = ramp.surfacePoints[i - 1], b = ramp.surfacePoints[i];
                        if (x < a.x || x > b.x) continue;
                        return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
                    }
                }
                const ground = groundSegments.find(s => x >= s.startX && x <= s.endX);
                if (!ground) return null;
                return ground.startY + (ground.endY - ground.startY)
                    * (x - ground.startX) / Math.max(1, ground.endX - ground.startX);
            }
            const estimateDurationSeconds = extra.estimateDurationSeconds
                || (() => (finish.x - spawnX) / 230);
            const course = {
                id: extra.id || "procedural-skate-sandbox", name: extra.name || "PROCEDURAL SANDBOX",
                procedural: true, isTestCourse: extra.isTestCourse ?? true,
                isProceduralSandbox: extra.isProceduralSandbox ?? true,
                official: extra.official === true, spawnX,
                builtThroughX: finish.x, projectedFullLength: finish.x - spawnX, finish,
                groundSegments: Object.freeze([...groundSegments]), gaps: Object.freeze([...gaps]),
                ramps: Object.freeze([...ramps]), rails: Object.freeze([...rails]),
                decor: Object.freeze([...decor]), visuals: Object.freeze([...visuals]),
                obstacles: Object.freeze([...obstacles]), checkpoints: Object.freeze([...checkpoints]),
                transfers: Object.freeze([...transfers]), playLine: Object.freeze([...playLine].sort((a, b) => a.x - b.x)),
                forwardSpeedAt: extra.forwardSpeedAt || (() => 230), groundHeightAt,
                groundHeightForAir: extra.groundHeightForAir
                    || (x => groundHeightAt(x) ?? defaultGroundY),
                sectionAt: extra.sectionAt || (() => ({ name: "PROCEDURAL SANDBOX" })),
                sections: Object.freeze([...(extra.sections || [])]),
                cues: Object.freeze([...(extra.cues || [])]),
                downhill: extra.downhill || null,
                checkpoint: checkpoints[0] || null,
                estimateDurationSeconds
            };
            return Object.freeze(course);
        }

        return Object.freeze({ addGround, addGap, addRamp, addRail, addStairs, addBench,
            addLedge, addPlatform, addSupport, addTransfer, addPlayInput, addCheckpoint,
            setFinish, build });
    }

    function trace(ctx, points) {
        ctx.beginPath();
        points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    }

    function draw(ctx, course, startX, endX, viewBottom, clock = 0, lighting = null) {
        const visible = item => (item.endX ?? ((item.x || 0) + (item.width || 0))) >= startX - 40
            && (item.startX ?? item.x ?? 0) <= endX + 40;
        const palette = { concrete: "#40515b", concreteLight: "#71828a", face: "#253741",
            shadow: "#14232e", steel: "#495c69", steelLight: "#91a4ae", rail: "#65efff",
            cyan: "#65efff", safe: "#6d9290", launch: "#ffb94d", danger: "#ff477d" };
        if(lighting){
            const daylight=1-lighting.neon;
            palette.face=`rgb(${Math.round(37+daylight*35)},${Math.round(55+daylight*34)},${Math.round(65+daylight*29)})`;
            palette.concreteLight=`rgb(${Math.round(113+daylight*32)},${Math.round(130+daylight*27)},${Math.round(138+daylight*22)})`;
        }
        const line = (a, b, color, width = 2) => {
            ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        };
        const pathLine = (points, color, width, offset = 0) => {
            ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
            points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y + offset) : ctx.moveTo(p.x, p.y + offset));
            ctx.stroke();
        };
        const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, Math.max(0, h)); };
        const bolts = (x, y, w) => { rect(x + 3, y + 2, 3, 3, palette.steelLight); rect(x + w - 6, y + 2, 3, 3, palette.steelLight); };
        const joints = (left, right, yAt, depth, spacing = 110) => {
            const first = left + Math.max(0, Math.floor((startX - left) / spacing)) * spacing;
            for (let x = first; x < Math.min(right, endX + spacing); x += spacing) {
                const y = yAt(x);
                line({x,y:y+20},{x,y:y+depth}, "rgba(10,21,31,.45)", 2);
                line({x:x+2,y:y+20},{x:x+2,y:y+depth}, "rgba(154,176,182,.12)", 1);
            }
        };
        const hazardLip = (x, y, side) => {
            rect(x - (side < 0 ? 32 : 0), y + 5, 32, 9, palette.danger);
            for (let i = 0; i < 4; i++) rect(x - (side < 0 ? 30 : -2) + i * 8, y + 5, 4, 9, "#263039");
            line({x,y:y+3},{x,y:y+35},palette.danger,3);
        };
        const stripes=(x,y,width,height)=>{
            rect(x,y,width,height,"#242b31");
            ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();
            ctx.strokeStyle="#f2bd53";ctx.lineWidth=5;
            for(let i=-height;i<width+height;i+=12){ctx.beginPath();ctx.moveTo(x+i,y+height);ctx.lineTo(x+i+height,y);ctx.stroke();}
            ctx.restore();
        };
        const warning=(x,baseY,low=false)=>{
            // Roadside symbols are decoration only and stay below the skating line.
            const y=baseY+(low?25:-65);
            line({x,y:y+25},{x,y:baseY+42},"#687985",4);
            rect(x-10,baseY+37,20,5,"#495b66");
            ctx.beginPath();ctx.moveTo(x,y-22);ctx.lineTo(x-22,y+15);ctx.lineTo(x+22,y+15);ctx.closePath();
            ctx.fillStyle="#172730";ctx.fill();ctx.strokeStyle="#ffc462";ctx.lineWidth=3;ctx.stroke();
            line({x:x-8,y:y+4},{x:x+5,y:y+4},"#f5d99b",3);
            line({x:x+5,y:y+4},{x:x+5,y:y+12},palette.danger,3);
            line({x:x+11,y:y-6},{x:x+11,y:y+7},palette.danger,3);
            rect(x+7,y+5,8,3,palette.danger);
            ctx.globalAlpha=.65+.3*Math.sin(clock*5+x);
            rect(x-4,y-27,8,5,"#ffd66b");ctx.globalAlpha=1;
        };
        ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "butt";

        // Recessed walls and distant structures. Never interpreted as standing surfaces.
        for (const gap of course.gaps.filter(visible)) {
            const rightY = gap.rightEdgeY ?? gap.edgeY;
            const deepY = Math.max(gap.edgeY, rightY) + 550;
            const gradient = ctx.createLinearGradient(0, Math.min(gap.edgeY,rightY), 0, deepY);
            gradient.addColorStop(0, "#0b1724");
            gradient.addColorStop(.55, gap.fatal ? "#41152e" : "#08111b");
            gradient.addColorStop(1, "#02070f");
            rect(gap.startX, Math.max(gap.edgeY,rightY), gap.width, Math.max(viewBottom,deepY)-Math.max(gap.edgeY,rightY), gradient);
            rect(gap.startX, gap.edgeY + 9, 19, deepY-gap.edgeY, "#293b48");
            rect(gap.endX - 21, rightY + 9, 21, deepY-rightY, "#344955");
            line({x:gap.startX+19,y:gap.edgeY+20},{x:gap.startX+19,y:deepY},"#111e2b",5);
            line({x:gap.endX-23,y:rightY+20},{x:gap.endX-23,y:deepY},"#111e2b",5);
            for (let y = Math.max(gap.edgeY,rightY)+55; y < Math.min(viewBottom,deepY); y += 65) {
                line({x:gap.startX+2,y},{x:gap.startX+18,y},"#53616b",2);
                line({x:gap.endX-20,y},{x:gap.endX-3,y},"#53616b",2);
            }
            if (gap.width > 250) {
                // A sagging service cable is deep inside the chasm, behind the skating plane.
                ctx.strokeStyle="#24333e"; ctx.lineWidth=3; ctx.beginPath();
                ctx.moveTo(gap.startX+18,gap.edgeY+125);
                ctx.quadraticCurveTo((gap.startX+gap.endX)/2,Math.max(gap.edgeY,rightY)+330,gap.endX-20,rightY+125);ctx.stroke();
                for (let x = gap.startX+85; x < gap.endX-50; x += 240) {
                    const base = Math.max(gap.edgeY,rightY)+320+(Math.floor(x/240)%3)*35;
                    rect(x,base,32,Math.max(viewBottom,deepY)-base,"#111e29");
                    line({x:x+3,y:base},{x:x+25,y:base+9},"#30404b",4);
                }
            }
        }

        for (const ground of course.groundSegments.filter(visible)) {
            const points=[{x:ground.startX,y:ground.startY},{x:ground.endX,y:ground.endY}];
            const bottom=Math.max(viewBottom,ground.startY+ground.depth,ground.endY+ground.depth);
            ctx.fillStyle=palette.face; trace(ctx,points);ctx.lineTo(ground.endX,bottom);ctx.lineTo(ground.startX,bottom);ctx.closePath();ctx.fill();
            pathLine(points,"#162630",26,16); pathLine(points,palette.concreteLight,12,7);
            pathLine(points,"#a7b7bb",3,1); pathLine(points,palette.safe,2,14);
            const yAt=x=>ground.startY+(ground.endY-ground.startY)*(x-ground.startX)/(ground.endX-ground.startX);
            joints(ground.startX,ground.endX,yAt,ground.depth,125);
            for (let x=ground.startX+Math.max(0,Math.floor((startX-ground.startX)/125))*125;
                x<Math.min(ground.endX,endX+125);x+=125) {
                const y=yAt(x);
                rect(x+16,y+42,78,8,"#1c2c37");rect(x+16,y+51,78,2,"#46555f");
                if (Math.floor(x/125)%4===0) {
                    line({x:x+54,y:y+26},{x:x+47,y:y+32},"#23333d",1.5);
                    line({x:x+47,y:y+32},{x:x+51,y:y+37},"#23333d",1.5);
                }
            }
        }

        // Foundations have mass, face thickness and an explicit foot, rather than neon wire boxes.
        for (const item of course.decor.filter(v=>v.primitiveType==="support"&&visible(v))) {
            rect(item.x,item.topY,item.width,item.height,palette.face);
            rect(item.x,item.topY,Math.min(14,item.width*.2),item.height,"#617079");
            rect(item.x+item.width-10,item.topY,10,item.height,palette.shadow);
            rect(item.x-8,item.topY, item.width+16,12,palette.concreteLight);
            rect(item.x-12,item.bottomY-10,item.width+24,18,"#374954");
            joints(item.x,item.x+item.width,()=>item.topY,item.height,80);
            for (let y=item.topY+90;y<Math.min(item.bottomY,viewBottom);y+=110)
                rect(item.x+10,y,item.width-20,4,"#1b2c36");
        }

        for (const ramp of course.ramps.filter(visible)) {
            const points=ramp.surfacePoints;
            const bank=ramp.kind==="long_bank";
            const large=ramp.kind==="big_launch";
            const wood=ramp.kind==="small_kicker";
            ctx.fillStyle=bank?"#53616a":wood?"#765d4e":"#283b48";
            trace(ctx,points);
            if(bank) { for(let i=points.length-1;i>=0;i--)ctx.lineTo(points[i].x,points[i].y+40); }
            else {ctx.lineTo(ramp.endX,ramp.baseY);ctx.lineTo(ramp.startX,ramp.baseY);}
            ctx.closePath();ctx.fill();
            if (!bank) {
                for(let x=ramp.startX+22;x<ramp.endX-8;x+=large?68:50) {
                    const y=sampleRenderedPath(points,x);
                    line({x,y:y+12},{x,y:ramp.baseY},wood?"#3d3534":palette.steel,6);
                    line({x,y:y+14},{x:Math.min(x+55,ramp.endX-4),y:ramp.baseY-3},wood?"#4b3e37":"#576b76",3);
                    rect(x-10,ramp.baseY-3,20,6,"#77838a");
                    bolts(x-10,ramp.baseY-3,20);
                }
                line({x:ramp.startX,y:ramp.baseY},{x:ramp.endX,y:ramp.baseY},"#7c8c94",6);
            }
            // Deck thickness is below the exact collision line; no decorative curve above it.
            pathLine(points,"#142630",15,8);
            pathLine(points,wood?"#c09b70":bank?"#8f9ca1":"#a9b7bc",9,5);
            pathLine(points,palette.launch,3,0);
            pathLine(points,"#ad763e",2,12);
            for(let x=ramp.startX+45;x<ramp.endX-10;x+=large?70:50) {
                const y=sampleRenderedPath(points,x);rect(x,y+4,3,3,"#263b46");
            }
            if(!bank) { const lip=points.at(-1);rect(lip.x-7,lip.y+1,10,9,palette.launch); }
        }

        for (const item of course.decor.filter(visible)) {
            if(item.primitiveType==="platform"||item.primitiveType==="ledge") {
                rect(item.x,item.y,item.width,item.height,palette.face);
                rect(item.x,item.y+12,13,item.height-12,"#667780");
                rect(item.x+item.width-14,item.y+12,14,item.height-12,"#182a35");
                rect(item.x,item.y+1,item.width,13,palette.concreteLight);
                rect(item.x,item.y,item.width,3,"#bbc8cb");
                rect(item.x,item.y+14,item.width,4,"#13232e");
                if(item.primitiveType==="ledge")rect(item.x+5,item.y+6,item.width-10,3,palette.safe);
                else {joints(item.x,item.x+item.width,()=>item.y,item.height,120);
                    for(let x=item.x+25;x<item.x+item.width-25;x+=120)rect(x,item.y+31,60,4,"#536570");}
                rect(item.x-3,item.baseY-6,item.width+6,8,"#374953");
            } else if(item.primitiveType==="bench") {
                const plinth=Math.max(0,item.height-44),feetY=item.baseY-plinth;
                if(plinth){rect(item.x-3,feetY,item.width+6,plinth,"#46565f");rect(item.x-4,feetY,item.width+8,5,"#839097");}
                // Seat, front apron and bolted A-frame legs. A tall placement has a visible plinth.
                rect(item.x,item.y,item.width,11,"#ba8d62");rect(item.x,item.y+11,item.width,5,"#5b4638");
                line({x:item.x,y:item.y},{x:item.x+item.width,y:item.y},"#e3c39a",3);
                for(let x=item.x+10;x<item.x+item.width;x+=38)line({x,y:item.y+1},{x,y:item.y+10},"#75513d",2);
                const legPositions=item.width>240?[item.x+14,item.x+item.width/2,item.x+item.width-22]
                    :[item.x+14,item.x+item.width-22];
                for(const x of legPositions){
                    line({x,y:item.y+14},{x:x-5,y:feetY},palette.steelLight,7);
                    line({x:x+7,y:item.y+14},{x:x+14,y:feetY},palette.steel,5);
                    rect(x-10,feetY-4,28,5,"#657983");bolts(x-10,feetY-4,28);
                }
                line({x:item.x+15,y:item.y+24},{x:item.x+item.width-16,y:item.y+24},"#344753",4);
            } else if(item.primitiveType==="stairs") {
                const foundation=item.baseY+60;
                ctx.fillStyle="#334750";ctx.beginPath();ctx.moveTo(item.x,item.y);
                for(let i=0;i<item.treads.length;i++){
                    const [a,b]=item.treads[i];ctx.lineTo(a.x,a.y);ctx.lineTo(b.x,b.y);
                    const next=item.treads[i+1]?.[0];if(next)ctx.lineTo(b.x,next.y);
                }
                ctx.lineTo(item.x+item.width,foundation);ctx.lineTo(item.x,foundation);ctx.closePath();ctx.fill();
                for(let i=0;i<item.treads.length;i++){
                    const [a,b]=item.treads[i];
                    const nextY=item.treads[i+1]?.[0].y??item.baseY;
                    rect(a.x,a.y,b.x-a.x,Math.max(2,Math.min(5,Math.abs(item.stepHeight)*.3)),"#7b8d94");
                    line(a,b,"#c0cbcc",2);
                    line(b,{x:b.x,y:nextY},"#1c303b",3);
                    if(item.fatalStairs&&i%4===0)rect(a.x+4,a.y+4,Math.min(18,item.stepWidth-8),3,palette.danger);
                }
                rect(item.x,foundation-14,item.width,14,"#21353f");
                joints(item.x,item.x+item.width,x=>item.y+Math.min(item.steps-1,
                    Math.floor((x-item.x)/item.stepWidth))*item.stepHeight,60,100);
                // A stringer follows the underside, tying the staircase into its lower foundation.
                line({x:item.x+6,y:item.y+45},{x:item.x+item.width-6,y:item.baseY+45},"#667b85",6);
            }
            if (/bench|ledge|platform/.test(item.primitiveType) && item.collisionObject?.collisionRegions?.DANGEROUS_SIDE) {
                rect(item.x+2,item.y+7,3,10,palette.danger);
                rect(item.x+item.width-5,item.y+7,3,10,palette.danger);
            }
        }

        for (const rail of course.rails.filter(visible)) {
            const edgeOwner=rail.type==="ledge"&&course.decor.some(v=>/bench|ledge/.test(v.primitiveType)
                &&v.x<=rail.startX+2&&v.x+v.width>=rail.endX-2);
            if(!edgeOwner)for(let i=0;i<rail.supports.length;i++){
                const support=rail.supports[i],height=support.bottomY-support.topY;
                // Tall over-void supports become a braced frame with a foundation beam.
                const w=height>150?10:6;
                rect(support.x-w/2,support.topY+3,w,height-3,"#273e4b");
                rect(support.x-w/2,support.topY+5,2,height-5,"#91a4ae");
                rect(support.x-12,support.bottomY-4,24,7,"#76878d");bolts(support.x-12,support.bottomY-4,24);
                rect(support.x-6,support.topY+4,12,7,"#b6c4c6");
                const next=rail.supports[i+1];
                if(height>150&&next){
                    const beamY=Math.min(support.bottomY,next.bottomY)-25;
                    line({x:support.x,y:beamY},{x:next.x,y:beamY},"#344d5b",8);
                    const upperY=Math.max(support.topY,next.topY)+65;
                    line({x:support.x,y:upperY},{x:next.x,y:beamY},"#465e6b",4);
                    line({x:next.x,y:upperY},{x:support.x,y:beamY},"#2c4452",4);
                }
            }
            pathLine(rail.grindPath,"#10202c",10,4);
            pathLine(rail.grindPath,"#72848d",7,3);
            pathLine(rail.grindPath,`rgba(72,217,255,${.06+(lighting?.neon??1)*.10})`,12,0);
            pathLine(rail.grindPath,palette.rail,3,0);
            for(const s of rail.supports)rect(s.x-4,s.topY+2,8,2,palette.steelLight);
        }
        for(const gap of course.gaps.filter(visible)){
            if(!gap.fatal){
                line({x:gap.startX,y:gap.edgeY+4},{x:gap.startX,y:gap.edgeY+18},palette.danger,2);
                line({x:gap.endX,y:(gap.rightEdgeY??gap.edgeY)+4},{x:gap.endX,y:(gap.rightEdgeY??gap.edgeY)+18},palette.danger,2);
                continue;
            }
            hazardLip(gap.startX,gap.edgeY,-1);hazardLip(gap.endX,gap.rightEdgeY??gap.edgeY,1);
            stripes(gap.startX-42,gap.edgeY+14,40,10);
            const x=gap.startX-95,base=course.groundHeightAt(x)??gap.edgeY;
            warning(x,base,gap.id==='grand-stair-exit');
        }
        const grandRail=course.rails.find(r=>r.id==='grand-stair-handrail');
        if(grandRail){
            const end=grandRail.endX;
            for(const distance of [320,200,100]){
                const x=end-distance;if(x<startX||x>endX)continue;
                const y=sampleRenderedPath(grandRail.grindPath,x);
                stripes(x,y+23,28,6);
                ctx.globalAlpha=.55+.3*Math.sin(clock*5);rect(x+12,y+31,5,4,"#ffc462");ctx.globalAlpha=1;
            }
        }
        for(const cue of course.cues||[]){
            if(cue.x<startX-180||cue.x>endX+180)continue;
            rect(cue.x,cue.y-28,cue.width||150,28,"#182b38");
            ctx.strokeStyle=cue.danger?palette.danger:palette.safe;ctx.lineWidth=2;ctx.strokeRect(cue.x,cue.y-28,cue.width||150,28);
            ctx.fillStyle=cue.danger?"#ffb4cf":"#d0e1e1";ctx.font="bold 10px monospace";ctx.textAlign="left";
            ctx.fillText(cue.text,cue.x+7,cue.y-10);
            line({x:cue.x+5,y:cue.y},{x:cue.x+5,y:cue.baseY},"#657782",4);rect(cue.x-1,cue.baseY-3,13,5,"#718089");
        }
        ctx.restore();
    }

    function sampleRenderedPath(points, x) {
        for(let i=1;i<points.length;i++){
            const a=points[i-1],b=points[i];if(x>=a.x&&x<=b.x)return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
        }
        return points.at(-1).y;
    }

    return Object.freeze({ RAMP_PROFILES, createBuilder, launchSurface, draw });
});
