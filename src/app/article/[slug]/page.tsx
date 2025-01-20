import { notFound } from 'next/navigation';
import React from 'react';

import ArticleContainer from '@/components/ArticleContainer';
import Jumbotron from '@/components/Jumbotron';
import ScrollIndicator from '@/components/ScrollIndicator';

import { getAllPosts } from '@/libraries/PostManager';

const posts = await getAllPosts();

export function generateStaticParams() {
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

const Article = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const slug = (await params).slug as string;
    const post = posts.find((p) => p.slug === slug);

    if (!post) {
        notFound();
    }

    return (
        <>
            {/* 스크롤 진행 바 */}
            <ScrollIndicator />
            <Jumbotron />
            <ArticleContainer post={post} />
        </>
    );
};

export default Article;
