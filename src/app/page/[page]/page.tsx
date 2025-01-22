import generatePageMetadata from '@/seo';
import { Metadata } from 'next';
import React from 'react';

import Footer from '@/components/Footer';
import Jumbotron from '@/components/Jumbotron';
import PageContainer from '@/components/PageContainer';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';

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

export async function generateMetadata({
    params,
}: {
    params: Promise<{ page: string }>;
}): Promise<Metadata> {
    const page = parseInt((await params).page);
    const title = page === 1 ? 'Home' : `Page ${page}`;
    const url = `/page/${page}`;
    const description = `Explore posts on page ${page}.`;

    return generatePageMetadata({ title, description, url });
}

const Page = async ({ params }: { params: Promise<{ page: string }> }) => {
    const page = parseInt((await params).page);

    return (
        <>
            <ResponsiveAppBar />
            <Jumbotron />
            <PageContainer page={page} posts={posts} linkPrefix={'/page/'} />
            <Footer />
        </>
    );
};

export default Page;
