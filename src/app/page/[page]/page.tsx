import React from 'react';
import Link from 'next/link';
import { getAllPosts } from '@/libraries/PostManager';

const POSTS_PER_PAGE = 10;
const posts = getAllPosts().sort((a, b) => {
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

    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const entries = posts.slice(startIndex, endIndex);

    return (
        <>
            <h1>Page {page}</h1>
            <ul>
                {entries.map((entry) => (
                    <li key={entry.slug}>
                        <Link href={`/article/${entry.slug}`}>{entry.title}</Link>
                    </li>
                ))}
            </ul>
        </>
    );
};

export default Page;
