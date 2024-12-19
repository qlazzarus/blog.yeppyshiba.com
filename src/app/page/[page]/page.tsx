import { Container, Typography } from '@mui/material';
import React from 'react';

import Jumbotron from '@/components/Jumbotron';
import PageContainer from '@/components/PageContainer';

import { getAllPosts } from '@/libraries/PostManager';

const POSTS_PER_PAGE = 10;
const posts = (await getAllPosts()).sort((a, b) => {
    // 날짜 문자열을 Date 객체로 변환 후 비교 (내림차순)
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // b가 더 최근이면 양수 -> 내림차순 정렬
});

export function generateStaticParams() {
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    return Array.from({ length: totalPages }, (_, i) => ({
        page: (i + 1).toString(),
    }));
}

const Page = async ({ params }: { params: Promise<{ page: Number }> }) => {
    const page = (await params).page as number;

    return (
        <>
            <Jumbotron />
            <PageContainer page={page} posts={posts} linkPrefix={'/page/'} />
        </>
    );
};

export default Page;
