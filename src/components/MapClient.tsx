'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

// 게시물(마커) 한 개에 대한 정보를 담을 인터페이스
interface MarkerItem {
    lat: number;
    lng: number;
    slug: string; // 게시물 링크
    image?: string; // 게시물 대표 이미지 (없으면 undefined)
    title?: string; // 게시물 제목 등 추가 가능
}

interface MapClientProps {
    markers: MarkerItem[];
}

declare global {
    interface Window {
        kakao: any;
    }
}

const MapClient = ({ markers }: MapClientProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (typeof window === 'undefined' || markers.length === 0) return;

        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&libraries=clusterer&autoload=false`;
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.kakao.maps.load(() => {
                initMap();
            });
        };

        const initMap = () => {
            if (!mapContainerRef.current || markers.length === 0) return;

            const kakao = window.kakao;
            const mapContainer = mapContainerRef.current;

            // 첫 마커 기준으로 임시 센터
            const mapOption = {
                center: new kakao.maps.LatLng(markers[0].lat, markers[0].lng),
                level: 3,
            };
            const map = new kakao.maps.Map(mapContainer, mapOption);

            const bounds = new kakao.maps.LatLngBounds();

            markers.forEach((item) => {
                const markerPosition = new kakao.maps.LatLng(item.lat, item.lng);
                const marker = new kakao.maps.Marker({ position: markerPosition });
                marker.setMap(map);
                bounds.extend(markerPosition);

                // 1) 커스텀 오버레이 생성 (마우스오버 시 이미지 보여주기)
                let overlay: any = null;
                if (item.image) {
                    const content = document.createElement('div');
                    content.style.border = '1px solid #888';
                    content.style.backgroundColor = '#fff';
                    content.style.padding = '5px';
                    content.style.width = '120px';
                    // 이미지 엘리먼트
                    const img = document.createElement('img');
                    img.src = item.image;
                    img.style.width = '100%';
                    content.appendChild(img);

                    overlay = new kakao.maps.CustomOverlay({
                        content,
                        position: markerPosition,
                        yAnchor: 1.25, // 말풍선 위치를 조금 위로
                    });
                }

                // 2) 마우스 이벤트 연결
                kakao.maps.event.addListener(marker, 'mouseover', () => {
                    if (overlay) {
                        overlay.setMap(map);
                    }
                });
                kakao.maps.event.addListener(marker, 'mouseout', () => {
                    if (overlay) {
                        overlay.setMap(null);
                    }
                });

                // 3) 클릭 시 Next Router로 이동 (또는 window.location)
                kakao.maps.event.addListener(marker, 'click', () => {
                    // /article/[slug] 형태
                    router.push(`/article/${item.slug}`);
                });
            });

            map.setBounds(bounds);
        };
    }, [markers]);

    return <div ref={mapContainerRef} style={{ width: '100%', minHeight: '100vh' }} />;
};

export default MapClient;
