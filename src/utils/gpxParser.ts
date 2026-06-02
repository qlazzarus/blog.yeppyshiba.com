import { distanceMeters } from './gpxGeo';
import type { GpxPoint } from './gpxRiskTypes';

export function parseGpxText(gpxText: string): GpxPoint[] {
    const parser = new DOMParser();
    const xml = parser.parseFromString(gpxText, 'application/xml');

    const parseError = xml.querySelector('parsererror');
    if (parseError) {
        throw new Error('GPX XML 파싱에 실패했습니다.');
    }

    const trkpts = Array.from(xml.querySelectorAll('trkpt'));

    if (trkpts.length < 2) {
        throw new Error('GPX 트랙 포인트가 부족합니다.');
    }

    let distanceFromStart = 0;

    return trkpts.map((trkpt, index) => {
        const lat = Number(trkpt.getAttribute('lat'));
        const lng = Number(trkpt.getAttribute('lon'));

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error('GPX 좌표 정보가 올바르지 않습니다.');
        }

        const eleText = trkpt.querySelector('ele')?.textContent;
        const timeText = trkpt.querySelector('time')?.textContent;

        const point: GpxPoint = {
            lat,
            lng,
            ele: eleText ? Number(eleText) : undefined,
            time: timeText ? new Date(timeText) : undefined,
            distanceFromStart,
        };

        if (index > 0) {
            const prev = trkpts[index - 1];
            const prevPoint = {
                lat: Number(prev.getAttribute('lat')),
                lng: Number(prev.getAttribute('lon')),
            };

            distanceFromStart += distanceMeters(prevPoint, point);
            point.distanceFromStart = distanceFromStart;
        }

        return point;
    });
}
