'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function useGAPageView() {
    const pathname = usePathname(); // 현재 페이지 경로를 가져온다.

    useEffect(() => {
        console.log(`sendGAEvent - ${pathname}`);
        sendGAEvent('page_view', { page_path: pathname }); // 페이지 경로가 변경될 때마다 페이지뷰 이벤트를 전송한다.
    }, [pathname]); // pathname이 변경될 때마다 useEffect 훅이 실행된다.

    return null;
}

export function GAPageView() {
    useGAPageView(); // useGAPageView 훅을 호출하여 페이지뷰 이벤트를 전송한다.
    return null;
}
