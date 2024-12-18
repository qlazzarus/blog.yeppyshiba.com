import { notFound } from 'next/navigation';
import React from 'react';
import Jumbotron from '@/components/Jumbotron';
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
            <Jumbotron />
            {post.title}
        </>
    );
};

export default Article;
