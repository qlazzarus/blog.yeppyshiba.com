// app/map/page.tsx (서버 컴포넌트)
import generatePageMetadata from '@/seo';
import React from 'react';

import MapClient from '@/components/MapClient';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';

import { getAllPosts } from '@/libraries/PostManager';

export async function generateMetadata() {
    return generatePageMetadata({
        title: 'Map',
        description: 'Explore blog posts on an interactive map. Click markers to see more details.',
        url: `/map`,
    });
}

// 클라이언트 컴포넌트
export default async function MapPage() {
    // 서버 환경에서 getAllPosts() 호출 가능
    const posts = (await getAllPosts()).filter((p) => p.lat && p.lng);

    // 좌표 계산 로직도 여기서 실행 가능
    const markers = posts.map((post) => ({
        lat: post.lat as number,
        lng: post.lng as number,
        slug: post.slug,
        image: post.image || post.embeddedImagesLocal,
        title: post.title,
    }));

    return (
        <>
            <ResponsiveAppBar />
            <MapClient markers={markers} />
        </>
    );
}
