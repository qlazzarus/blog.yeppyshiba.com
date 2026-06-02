import type { GpxPoint, GpxRiskSegment } from './gpxRiskTypes';

declare global {
    interface Window {
        kakao: any;
    }
}

interface KakaoGpxRiskMapOptions {
    containerId: string;
}

export class KakaoGpxRiskMap {
    private map: any;
    private routePolyline: any;
    private riskPolylines: any[] = [];
    private riskMarkers: any[] = [];

    constructor(private options: KakaoGpxRiskMapOptions) {}

    init(centerLat = 37.5665, centerLng = 126.978): void {
        const container = document.getElementById(this.options.containerId);
        if (!container) throw new Error('지도 컨테이너를 찾을 수 없습니다.');

        const center = new window.kakao.maps.LatLng(centerLat, centerLng);

        this.map = new window.kakao.maps.Map(container, {
            center,
            level: 7,
        });
    }

    renderRoute(points: GpxPoint[]): void {
        if (!this.map) return;

        if (this.routePolyline) {
            this.routePolyline.setMap(null);
        }

        const path = points.map(
            (point) => new window.kakao.maps.LatLng(point.lat, point.lng),
        );

        this.routePolyline = new window.kakao.maps.Polyline({
            path,
            strokeWeight: 4,
            strokeColor: '#2563eb',
            strokeOpacity: 0.8,
            strokeStyle: 'solid',
        });

        this.routePolyline.setMap(this.map);
        this.fitBounds(points);
    }

    renderRisks(points: GpxPoint[], risks: GpxRiskSegment[]): void {
        this.clearRisks();

        risks.forEach((risk) => {
            const markerPosition = new window.kakao.maps.LatLng(
                risk.centerLat,
                risk.centerLng,
            );

            const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                title: risk.title,
            });

            marker.setMap(this.map);
            this.riskMarkers.push(marker);

            const segmentPath = points
                .slice(risk.startIndex, risk.endIndex + 1)
                .map((point) => new window.kakao.maps.LatLng(point.lat, point.lng));

            const polyline = new window.kakao.maps.Polyline({
                path: segmentPath,
                strokeWeight: 7,
                strokeColor: getRiskColor(risk.severity),
                strokeOpacity: 0.9,
                strokeStyle: 'solid',
            });

            polyline.setMap(this.map);
            this.riskPolylines.push(polyline);
        });
    }

    focusRisk(risk: GpxRiskSegment): void {
        if (!this.map) return;

        const center = new window.kakao.maps.LatLng(risk.centerLat, risk.centerLng);
        this.map.panTo(center);
        this.map.setLevel(4);
    }

    private fitBounds(points: GpxPoint[]): void {
        const bounds = new window.kakao.maps.LatLngBounds();

        points.forEach((point) => {
            bounds.extend(new window.kakao.maps.LatLng(point.lat, point.lng));
        });

        this.map.setBounds(bounds);
    }

    private clearRisks(): void {
        this.riskMarkers.forEach((marker) => marker.setMap(null));
        this.riskPolylines.forEach((polyline) => polyline.setMap(null));

        this.riskMarkers = [];
        this.riskPolylines = [];
    }
}

function getRiskColor(severity: string): string {
    switch (severity) {
        case 'high':
            return '#dc2626';
        case 'medium':
            return '#f97316';
        default:
            return '#eab308';
    }
}
