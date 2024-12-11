import React from 'react';
import { getAllPosts } from '@/libraries/PostManager';
import { notFound } from 'next/navigation';

const posts = getAllPosts();

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

    return <>{post.title}</>;
};

export default Article;
