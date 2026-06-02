import type { GpxPoint } from './gpxRiskTypes';

const EARTH_RADIUS_M = 6371000;

export function distanceMeters(
    a: Pick<GpxPoint, 'lat' | 'lng'>,
    b: Pick<GpxPoint, 'lat' | 'lng'>,
): number {
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function bearingDegrees(
    a: Pick<GpxPoint, 'lat' | 'lng'>,
    b: Pick<GpxPoint, 'lat' | 'lng'>,
): number {
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLng = toRad(b.lng - a.lng);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

export function turnAngleDegrees(a: GpxPoint, b: GpxPoint, c: GpxPoint): number {
    const bearing1 = bearingDegrees(a, b);
    const bearing2 = bearingDegrees(b, c);

    let diff = Math.abs(bearing2 - bearing1);
    if (diff > 180) diff = 360 - diff;

    return diff;
}

export function gradePercent(a: GpxPoint, b: GpxPoint): number | null {
    if (a.ele == null || b.ele == null) return null;

    const distance = distanceMeters(a, b);
    if (distance < 1) return null;

    return ((b.ele - a.ele) / distance) * 100;
}

export function midpoint(points: GpxPoint[]): GpxPoint {
    return points[Math.floor(points.length / 2)];
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}

function normalizeDegrees(deg: number): number {
    return (deg + 360) % 360;
}
