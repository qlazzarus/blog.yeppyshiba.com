// app/map/page.tsx (서버 컴포넌트)
import React from 'react';
import { getAllPosts } from '@/libraries/PostManager';
import MapClient from '@/components/MapClient'; // 클라이언트 컴포넌트

export default async function MapPage() {
    // 서버 환경에서 getAllPosts() 호출 가능
    const posts = (await getAllPosts()).filter((p) => p.lat && p.lng);

    // 좌표 계산 로직도 여기서 실행 가능
    const coordinates = posts.map((post) => ({ lat: post.lat as number, lng: post.lng as number }));

    return (
        <div>
            <h1>지도 페이지</h1>
            <p>아래는 lat/lng를 획득한 게시물들:</p>
            <ul>
                {posts.map((post) => (
                    <li key={post.slug}>
                        <strong>{post.title}</strong>
                        <br />
                        {post.roadAddress || post.parcelAddress}
                        <br />
                        Lat: {post.lat}, Lng: {post.lng}
                    </li>
                ))}
            </ul>
            {/* 클라이언트 컴포넌트에게 coordinates를 props로 전달 */}
            <MapClient coordinates={coordinates} />
        </div>
    );
}
