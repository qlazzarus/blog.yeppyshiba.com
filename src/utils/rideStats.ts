import { readFile } from 'node:fs/promises';
import path from 'node:path';

type RoutePoint = {
    ele: number | null;
    lat: number;
    lng: number;
    time: number | null;
};

export type RouteStats = {
    avgSpeedKmh: number | null;
    distanceKm: number | null;
    elevationGainM: number | null;
};

export async function readRouteStats(gpxUrl: string): Promise<RouteStats> {
    try {
        const gpxPath = path.join(process.cwd(), 'public', gpxUrl);
        const xml = await readFile(gpxPath, 'utf8');
        return calculateRouteStats(parseRoutePoints(xml));
    } catch {
        return {
            avgSpeedKmh: null,
            distanceKm: null,
            elevationGainM: null,
        };
    }
}

export function formatDistance(value: number | null) {
    return value === null ? '-' : `${value.toFixed(1)} km`;
}

export function formatElevation(value: number | null) {
    return value === null ? '-' : `${Math.round(value).toLocaleString()} m`;
}

export function formatSpeed(value: number | null) {
    return value === null ? '-' : `${value.toFixed(1)} km/h`;
}

function parseRoutePoints(xml: string): RoutePoint[] {
    const matches = xml.matchAll(
        /<trkpt\b[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g,
    );

    return Array.from(matches)
        .map((match) => {
            const [, lat, lng, body] = match;
            const time = Date.parse(readTag(body, 'time'));

            return {
                ele: readNumber(body, 'ele'),
                lat: Number(lat),
                lng: Number(lng),
                time: Number.isFinite(time) ? time : null,
            };
        })
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function readTag(source: string, tagName: string) {
    return source.match(new RegExp(`<${tagName}>([^<]*)</${tagName}>`))?.[1] ?? '';
}

function readNumber(source: string, tagName: string) {
    const value = Number(readTag(source, tagName));
    return Number.isFinite(value) ? value : null;
}

function calculateRouteStats(points: RoutePoint[]): RouteStats {
    if (points.length < 2) {
        return {
            avgSpeedKmh: null,
            distanceKm: null,
            elevationGainM: null,
        };
    }

    let distanceKm = 0;
    let elevationGainM = 0;

    for (let i = 1; i < points.length; i += 1) {
        distanceKm += haversine(points[i - 1], points[i]);

        const prevEle = points[i - 1].ele;
        const nextEle = points[i].ele;
        if (prevEle !== null && nextEle !== null && nextEle > prevEle) {
            elevationGainM += nextEle - prevEle;
        }
    }

    const firstTime = points.find((point) => point.time !== null)?.time;
    const lastTime = [...points].reverse().find((point) => point.time !== null)?.time;
    const durationHours =
        firstTime !== undefined && lastTime !== undefined
            ? (lastTime - firstTime) / 3600000
            : 0;

    return {
        avgSpeedKmh: durationHours > 0 ? distanceKm / durationHours : null,
        distanceKm,
        elevationGainM,
    };
}

function haversine(a: RoutePoint, b: RoutePoint) {
    const radiusKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function toRad(value: number) {
    return (value * Math.PI) / 180;
}
