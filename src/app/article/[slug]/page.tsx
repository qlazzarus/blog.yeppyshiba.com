import generatePageMetadata from '@/seo';
import { Box, Button, Chip, Divider, Link as MuiLink } from '@mui/material';
import moment from 'moment';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';
import { slugify } from 'transliteration';

import ArticleContainer from '@/components/ArticleContainer';
import Footer from '@/components/Footer';
import Jumbotron from '@/components/Jumbotron';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';
import ScrollIndicator from '@/components/ScrollIndicator';

import { getAllPosts, getPostBySlug } from '@/libraries/PostManager';

const allPosts = await getAllPosts();

// 날짜 내림차순 정렬
const sortedPosts = [...allPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
);

export function generateStaticParams() {
    return allPosts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const post = allPosts.find((p) => p.slug === slug);

    if (!post) {
        notFound();
    }

    const keywords = post.tags.join(', ');

    return generatePageMetadata({
        title: post.title,
        description: post.summary || 'Read this article on my blog.',
        url: `/article/${post.slug}`,
        image: post.image,
        embeddedImagesLocal: post.embeddedImagesLocal,
        keywords,
    });
}

const Article = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const slug = (await params).slug;
    const post = await getPostBySlug(slug);

    if (!post) {
        notFound();
    }

    // 1) 이전/다음 글 찾기
    const currentIndex = sortedPosts.findIndex((p) => p.slug === slug);
    const prevPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null;

    // 2) 태그 목록 ( /tag/태그/1 이동 링크 )
    const { tags = [] } = post;

    const { title, summary, date, category } = post;

    return (
        <>
            <ResponsiveAppBar />
            <ScrollIndicator />
            <Jumbotron
                title={title}
                summary={summary}
                date={moment(date).fromNow()}
                category={category}
            />

            {/* 본문 내용 */}
            <ArticleContainer post={post} />

            {/* 연관 태그 & 이전/다음 글 섹션 */}
            <Box maxWidth={'lg'} sx={{ mx: 'auto', width: '100%', p: 2 }}>
                <Divider sx={{ my: 3 }} />

                {/* 태그 목록 */}
                {tags.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Box
                            sx={{
                                mt: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                            }}
                        >
                            {tags.map((tag, index) => (
                                <Link
                                    key={index}
                                    href={`/tag/${slugify(tag)}`}
                                    passHref
                                    style={{ textDecoration: 'none' }}
                                >
                                    <Chip label={tag} sx={{ textTransform: 'lowercase' }} />
                                </Link>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* 이전 / 다음 글 */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                    }}
                >
                    {prevPost ? (
                        <Button
                            component={MuiLink}
                            href={`/article/${prevPost.slug}`}
                            variant='outlined'
                            color='primary'
                            sx={{ textAlign: 'left' }}
                        >
                            ← {prevPost.title}
                        </Button>
                    ) : (
                        <Box />
                    )}

                    {nextPost ? (
                        <Button
                            component={MuiLink}
                            href={`/article/${nextPost.slug}`}
                            variant='outlined'
                            color='primary'
                            sx={{ ml: 'auto', textAlign: 'right' }}
                        >
                            {nextPost.title} →
                        </Button>
                    ) : (
                        <Box />
                    )}
                </Box>
            </Box>

            <Footer />
        </>
    );
};

export default Article;
