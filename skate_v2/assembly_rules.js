(function (root, factory) {
    const api = factory(root.SkateAssetsV2 || (typeof require === "function" ? require("./catalog.js") : null));
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateSpotAssembly = api;
})(typeof globalThis === "object" ? globalThis : this, function (catalog) {
    "use strict";

    if (!catalog) throw new Error("SkateAssetsV2 must be loaded before assembly_rules.js");

    const ASSET_SOURCE = "skate_assets2.0.png";
    const CONTACT_TOLERANCE = 4;
    const assets = new Map(Object.values(catalog.scene).flat().map(asset => [asset.id, asset]));
    const SUPPORT_TYPES = new Set(["ground", "platform", "stairs", "gap-platform", "gap-pillar", "ledge", "block", "planter"]);
    const ROOT_TYPES = new Set(["ground", "gap-platform", "gap-pillar"]);
    const HANDRAILS = new Set([
        "handrail-cyan-descend", "handrail-magenta-ascend", "handrail-magenta-curve-up",
        "rail-magenta-long-ascend"
    ]);

    function assetFor(assetId) {
        const asset = assets.get(assetId);
        if (!asset || asset.source !== ASSET_SOURCE) throw new Error(`Unknown official Skate asset: ${assetId}`);
        return asset;
    }

    function supportRule(assetId) {
        const asset = assetFor(assetId);
        if (asset.id === "cable-wave-linked") return { kind: "anchored-cable", minimumContacts: 2, hosts: ["platform", "gap-platform", "gap-pillar"] };
        if (HANDRAILS.has(asset.id)) return { kind: "connected-handrail", minimumContacts: 2, hosts: ["stairs", "platform", "ground", "gap-platform", "ledge"] };
        if (asset.type === "rail" || asset.type === "curved-rail") return { kind: "visible-legs", minimumContacts: 2, hosts: [...SUPPORT_TYPES] };
        if (asset.type === "stairs") return { kind: "two-level-structure", minimumContacts: 2, hosts: ["ground", "platform", "gap-platform", "ledge"] };
        if (["kicker", "launch", "bank", "quarter", "transition", "special-launch"].includes(asset.type)) {
            return { kind: "ramp-base", minimumContacts: 1, hosts: ["ground", "platform", "gap-platform", "stairs"] };
        }
        if (ROOT_TYPES.has(asset.type)) return { kind: "visible-foundation-or-support", minimumContacts: 1, hosts: [...SUPPORT_TYPES] };
        return { kind: "supported-object", minimumContacts: 1, hosts: [...SUPPORT_TYPES] };
    }

    // geometryHints use the source-sheet region, not the cropped PNG dimensions.
    function toCropPoint(asset, point) {
        const [sx, sy, ex, ey] = asset.sourceRegion;
        const [bx, by] = asset.sourceBounds;
        return [(sx + point[0] * (ex - sx) - bx) / asset.size[0],
            (sy + point[1] * (ey - sy) - by) / asset.size[1]];
    }

    function worldPoint(piece, normalizedPoint) {
        const asset = assetFor(piece.assetId);
        return [piece.x + normalizedPoint[0] * (piece.width || asset.size[0]),
            piece.y + normalizedPoint[1] * (piece.height || asset.size[1])];
    }

    function worldPath(piece, pathName) {
        const asset = assetFor(piece.assetId);
        return (asset.geometryHints[pathName] || []).map(point => worldPoint(piece, toCropPoint(asset, point)));
    }

    function collisionRoles(assetId, options = {}) {
        const asset = assetFor(assetId);
        const flags = asset.collision;
        const fatalStairs = asset.type === "stairs" && options.fatalStairs === true;
        return Object.freeze({
            safeTop: !!flags.safeTop && !fatalStairs,
            grindableTop: !!flags.grindableTop,
            dangerousSide: !!flags.dangerousSide,
            fatalStairs,
            fatalBelow: !!flags.fatalBelow,
            decoration: !!flags.decoration,
            surface: asset.geometryHints.surfacePoints || [],
            grindPath: asset.geometryHints.grindPath || [],
            // Sides and fatal regions must be drawn per placement, never from the full sprite bounds.
            requiresSideGeometry: !!flags.dangerousSide,
            requiresFatalRegion: fatalStairs || !!flags.fatalBelow
        });
    }

    function validateAssembly(layout) {
        const errors = [];
        const pieces = layout.pieces || [];
        const byId = new Map();
        for (const piece of pieces) {
            if (!piece.id || byId.has(piece.id)) { errors.push(`Duplicate or missing piece id: ${piece.id}`); continue; }
            byId.set(piece.id, piece);
            let asset;
            try { asset = assetFor(piece.assetId); } catch (error) { errors.push(error.message); continue; }
            if (![piece.x, piece.y].every(Number.isFinite)) errors.push(`${piece.id}: x/y must be finite`);
            if (piece.width !== undefined && !(piece.width > 0)) errors.push(`${piece.id}: width must be positive`);
            if (piece.height !== undefined && !(piece.height > 0)) errors.push(`${piece.id}: height must be positive`);
            if (piece.motion || piece.falling || piece.spawnFromSky) errors.push(`${piece.id}: moving/falling/flying scenery is forbidden`);
            if (piece.fatalStairs && asset.type !== "stairs") errors.push(`${piece.id}: fatalStairs applies only to stairs`);
            if (asset.collision.dangerousSide && !piece.sideGeometry) errors.push(`${piece.id}: draw the dangerous side separately from the sprite bounds`);
            if ((piece.fatalStairs || asset.collision.fatalBelow) && !piece.fatalRegion) errors.push(`${piece.id}: fatal region must be explicit`);
            const rule = supportRule(piece.assetId);
            const mounts = piece.mounts || [];
            if (piece.rooted) {
                if (!ROOT_TYPES.has(asset.type) || piece.visibleFoundation !== true) {
                    errors.push(`${piece.id}: a root must be a visible ground/gap structure with visibleFoundation=true`);
                }
            } else if (mounts.length < rule.minimumContacts) {
                errors.push(`${piece.id}: ${rule.kind} needs ${rule.minimumContacts} visible contact(s)`);
            }
            if (rule.minimumContacts > 1 && mounts.length > 1) {
                const first = mounts[0]?.at, last = mounts.at(-1)?.at;
                if (Array.isArray(first) && Array.isArray(last) && first.length === 2 && last.length === 2 &&
                    Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.1) {
                    errors.push(`${piece.id}: two supports cannot share the same contact point`);
                }
            }
        }
        for (const piece of pieces) {
            if (!byId.has(piece.id)) continue;
            const rule = assets.has(piece.assetId) ? supportRule(piece.assetId) : null;
            for (const mount of piece.mounts || []) {
                const host = byId.get(mount.on);
                if (!host) { errors.push(`${piece.id}: missing support ${mount.on}`); continue; }
                if (!rule || !assets.has(host.assetId)) continue;
                const hostType = assetFor(host.assetId).type;
                if (!rule.hosts.includes(hostType)) errors.push(`${piece.id}: ${hostType} cannot support ${rule.kind}`);
                if (!Array.isArray(mount.at) || !Array.isArray(mount.hostAt) || mount.at.length !== 2 || mount.hostAt.length !== 2) {
                    errors.push(`${piece.id}: mount needs at/hostAt crop-normalized points`);
                    continue;
                }
                if (![...mount.at, ...mount.hostAt].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
                    errors.push(`${piece.id}: mount points must be finite values within the cropped sprite`);
                    continue;
                }
                const a = worldPoint(piece, mount.at), b = worldPoint(host, mount.hostAt);
                if (Math.hypot(a[0] - b[0], a[1] - b[1]) > CONTACT_TOLERANCE) {
                    errors.push(`${piece.id}: visible contact to ${mount.on} is misaligned by more than ${CONTACT_TOLERANCE}px`);
                }
            }
        }
        const visiting = new Set(), rooted = new Set();
        function reachesFoundation(id) {
            if (rooted.has(id)) return true;
            if (visiting.has(id)) return false;
            const piece = byId.get(id);
            if (!piece) return false;
            if (piece.rooted && piece.visibleFoundation === true) { rooted.add(id); return true; }
            visiting.add(id);
            const ok = (piece.mounts || []).some(mount => reachesFoundation(mount.on));
            visiting.delete(id);
            if (ok) rooted.add(id);
            return ok;
        }
        for (const piece of pieces) if (byId.has(piece.id) && !reachesFoundation(piece.id)) errors.push(`${piece.id}: no visible support chain reaches a foundation`);
        for (const join of layout.joins || []) {
            const a = byId.get(join.from), b = byId.get(join.to);
            if (!a || !b) { errors.push(`Join references a missing piece: ${join.from} -> ${join.to}`); continue; }
            const ap = worldPath(a, "surfacePoints"), bp = worldPath(b, "surfacePoints");
            if (!ap.length || !bp.length || Math.hypot(ap.at(-1)[0] - bp[0][0], ap.at(-1)[1] - bp[0][1]) > CONTACT_TOLERANCE) {
                errors.push(`Surface seam is not continuous: ${join.from} -> ${join.to}`);
            }
        }
        for (const gap of layout.gaps || []) {
            const takeoff = byId.get(gap.takeoffId), landing = byId.get(gap.landingId);
            if (!(gap.endX > gap.startX) || !takeoff || !landing) { errors.push(`${gap.id}: gap needs an ordered void and both visible edges`); continue; }
            if (takeoff.assetId !== "chasm-takeoff-platform" || landing.assetId !== "chasm-landing-platform") {
                errors.push(`${gap.id}: use the official takeoff and landing structures`);
            }
            for (const piece of pieces) {
                if (!assets.has(piece.assetId)) continue;
                if (assetFor(piece.assetId).type !== "ground") continue;
                const surface = worldPath(piece, "surfacePoints");
                if (surface.length && surface[0][0] < gap.endX && surface.at(-1)[0] > gap.startX) {
                    errors.push(`${gap.id}: ground spans the declared void (${piece.id})`);
                }
            }
        }
        return Object.freeze({ ok: errors.length === 0, errors });
    }

    return Object.freeze({ ASSET_SOURCE, CONTACT_TOLERANCE, supportRule, collisionRoles, worldPath, validateAssembly });
});
