(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.SkateCollisionGeometry = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
    const COLLISION_REGION = Object.freeze({
        SAFE_TOP: "SAFE_TOP",
        GRINDABLE_TOP: "GRINDABLE_TOP",
        DANGEROUS_SIDE: "DANGEROUS_SIDE",
        DANGEROUS_STAIR_FALL: "DANGEROUS_STAIR_FALL",
        DECORATION: "DECORATION"
    });
    const DEFAULT_RIDER_COLLIDER = Object.freeze({ width: 24, height: 44, offsetX: 0, offsetY: 0 });

    function transformNormalizedPath(points, bounds) {
        if (!Array.isArray(points) || !bounds) return [];
        return points.map(([x, y]) => ({
            x: bounds.x + x * bounds.width,
            y: bounds.bottomY - (1 - y) * bounds.height
        }));
    }

    function samplePolyline(points, x) {
        if (!Array.isArray(points) || points.length < 2) return null;
        for (let index = 1; index < points.length; index++) {
            const a = points[index - 1];
            const b = points[index];
            const dx = b.x - a.x;
            if (dx === 0 || x < a.x || x > b.x) continue;
            const t = (x - a.x) / dx;
            return { y: a.y + (b.y - a.y) * t, slope: (b.y - a.y) / dx, segmentIndex: index - 1 };
        }
        return null;
    }

    function createRampGeometry(asset, placement) {
        if (!asset) return null;
        const surfacePoints = transformNormalizedPath(asset.surfacePointsNormalized, placement);
        return {
            id: placement.id || asset.id,
            type: asset.type,
            sprite: asset.file,
            width: placement.width,
            height: placement.height,
            surfacePoints,
            collisionRegions: {
                [COLLISION_REGION.SAFE_TOP]: surfacePoints,
                [COLLISION_REGION.DANGEROUS_SIDE]: {
                    type: "RAMP_BODY",
                    surfacePoints,
                    left: placement.x,
                    right: placement.x + placement.width,
                    top: Math.min(...surfacePoints.map(point => point.y)),
                    bottom: placement.bottomY,
                    rampId: placement.id || asset.id
                }
            },
            collisionEnabled: true,
            launchStrength: Number(placement.launchStrength ?? asset.launchStrength) || 0,
            angle: Math.atan2(
                surfacePoints[surfacePoints.length - 1]?.y - surfacePoints[0]?.y,
                surfacePoints[surfacePoints.length - 1]?.x - surfacePoints[0]?.x
            ),
            collisionOffset: asset.collisionOffset || [0, 0]
        };
    }

    function createPlatformGeometry(asset, placement) {
        if (!asset) return null;
        const mapBounds = placement;
        const standing = transformNormalizedPath(asset.standingSurfaceNormalized, mapBounds);
        const standingSurfaceSegments = [];
        for (let index = 1; index < standing.length; index++) {
            const a = standing[index - 1];
            const b = standing[index];
            if (Math.abs(a.y - b.y) <= 1) standingSurfaceSegments.push([a, b]);
        }
        const grindPath = transformNormalizedPath(asset.grindPathNormalized, mapBounds);
        const normalizedSolid = asset.solidColliderNormalized;
        const solidCollider = normalizedSolid ? {
            left: placement.x + normalizedSolid[0] * placement.width,
            top: placement.bottomY - (1 - normalizedSolid[1]) * placement.height,
            right: placement.x + normalizedSolid[2] * placement.width,
            bottom: placement.bottomY - (1 - normalizedSolid[3]) * placement.height
        } : null;
        const type = String(asset.type || "").toLowerCase();
        const isStair = type === "stairs";
        const highestStandingY = standing.length ? Math.min(...standing.map(point => point.y)) : null;
        if (solidCollider && Number.isFinite(highestStandingY)) {
            // The dangerous side starts at the walkable top, even when the art's
            // broad solid box extends above a raised platform surface.
            solidCollider.top = Math.max(solidCollider.top, highestStandingY);
        }
        const stairDangerSegments = isStair ? standing.reduce((result, point, index) => {
            const next = standing[index + 1];
            if (!next || Math.abs(point.y - next.y) > 1) return result;
            result.push({
                left: Math.min(point.x, next.x), right: Math.max(point.x, next.x),
                top: point.y, bottom: solidCollider?.bottom ?? placement.bottomY
            });
            return result;
        }, []) : [];
        const grindable = Array.isArray(asset.grindPathNormalized) && asset.grindPathNormalized.length > 1;
        const collisionRegions = {
            [COLLISION_REGION.SAFE_TOP]: isStair ? [] : standingSurfaceSegments,
            [COLLISION_REGION.GRINDABLE_TOP]: grindable ? grindPath : [],
            [COLLISION_REGION.DANGEROUS_SIDE]: isStair ? null : solidCollider,
            [COLLISION_REGION.DANGEROUS_STAIR_FALL]: isStair
                ? { type: "STAIR_SEGMENTS", segments: stairDangerSegments }
                : null,
            [COLLISION_REGION.DECORATION]: null
        };
        return {
            id: placement.id || asset.id,
            type,
            sprite: asset.file,
            standingSurfaceSegments,
            grindPath: grindPath.length > 1 ? grindPath : null,
            solidCollider,
            collisionRegions,
            safeTop: !isStair,
            dangerousStairFall: isStair,
            stairDangerSegments,
            collisionOffset: asset.collisionOffset || [0, 0]
        };
    }

    function classifyAssetCollision(asset) {
        if (!asset || asset.category === "DECORATION" || asset.type === "decoration") {
            return [COLLISION_REGION.DECORATION];
        }
        if (asset.type === "stairs") return [COLLISION_REGION.DANGEROUS_STAIR_FALL];
        const regions = [COLLISION_REGION.SAFE_TOP];
        if (Array.isArray(asset.grindPathNormalized) && asset.grindPathNormalized.length > 1) {
            regions.push(COLLISION_REGION.GRINDABLE_TOP);
        }
        regions.push(COLLISION_REGION.DANGEROUS_SIDE);
        return regions;
    }

    function riderColliderBounds(player, collider = DEFAULT_RIDER_COLLIDER) {
        const centerX = player.x + (collider.offsetX || 0);
        const bottom = (player.groundContactY ?? player.y) + (collider.offsetY || 0);
        const halfWidth = collider.width / 2;
        return {
            left: centerX - halfWidth,
            right: centerX + halfWidth,
            top: bottom - collider.height,
            bottom
        };
    }

    function rampSurfaceAt(ramps, x) {
        if (!Array.isArray(ramps)) return null;
        const ramp = ramps.find(item => Array.isArray(item.surfacePoints)
            && item.surfacePoints.length > 1
            && item.collisionEnabled !== false
            && x >= item.surfacePoints[0].x
            && x <= item.surfacePoints[item.surfacePoints.length - 1].x);
        if (!ramp) return null;
        const sample = samplePolyline(ramp.surfacePoints, x);
        return sample ? { ...sample, ramp } : null;
    }

    return Object.freeze({
        COLLISION_REGION,
        DEFAULT_RIDER_COLLIDER,
        transformNormalizedPath,
        samplePolyline,
        createRampGeometry,
        createPlatformGeometry,
        classifyAssetCollision,
        riderColliderBounds,
        rampSurfaceAt
    });
});
