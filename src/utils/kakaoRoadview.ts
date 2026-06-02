import type { GpxRiskSegment } from './gpxRiskTypes';

declare global {
    interface Window {
        kakao: any;
    }
}

interface KakaoRoadviewOptions {
    containerId: string;
}

export class KakaoRoadview {
    private roadview: any;
    private roadviewClient: any;

    constructor(private options: KakaoRoadviewOptions) {}

    init(): void {
        const container = document.getElementById(this.options.containerId);
        if (!container) throw new Error('로드뷰 컨테이너를 찾을 수 없습니다.');

        this.roadview = new window.kakao.maps.Roadview(container);
        this.roadviewClient = new window.kakao.maps.RoadviewClient();
    }

    showRisk(risk: GpxRiskSegment): void {
        if (!this.roadview || !this.roadviewClient) return;

        const position = new window.kakao.maps.LatLng(risk.centerLat, risk.centerLng);

        this.roadviewClient.getNearestPanoId(position, 80, (panoId: string | null) => {
            if (!panoId) {
                alert('이 구간 주변에서 로드뷰를 찾지 못했습니다.');
                return;
            }

            this.roadview.setPanoId(panoId, position);

            if (risk.heading != null) {
                this.roadview.setViewpoint({
                    pan: risk.heading,
                    tilt: 0,
                    zoom: 0,
                });
            }
        });
    }
}
