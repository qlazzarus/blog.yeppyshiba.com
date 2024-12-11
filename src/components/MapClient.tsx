'use client';
import React, { useEffect, useRef } from 'react';

interface Coordinates {
    lat: number;
    lng: number;
}

declare global {
    interface Window {
        kakao: any;
    }
}

interface MapClientProps {
    coordinates: Coordinates[];
}

const MapClient = ({ coordinates }: MapClientProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || coordinates.length === 0) return;

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
            if (!mapContainerRef.current || coordinates.length === 0) return;

            const kakao = window.kakao;
            const mapContainer = mapContainerRef.current;

            // 첫 마커 기준으로 임시 센터
            const mapOption = {
                center: new kakao.maps.LatLng(coordinates[0].lat, coordinates[0].lng),
                level: 3,
            };
            const map = new kakao.maps.Map(mapContainer, mapOption);

            const bounds = new kakao.maps.LatLngBounds();

            coordinates.forEach((coord) => {
                const markerPosition = new kakao.maps.LatLng(coord.lat, coord.lng);
                const marker = new kakao.maps.Marker({ position: markerPosition });
                marker.setMap(map);
                bounds.extend(markerPosition);
            });

            map.setBounds(bounds);
        };
    }, [coordinates]);

    return <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />;
};

export default MapClient;
