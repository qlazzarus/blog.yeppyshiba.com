import generatePageMetadata from '@/seo';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Grid2 as Grid,
    Link as MuiLink,
    Typography,
} from '@mui/material';
import { Metadata } from 'next';
import React from 'react';
import { slugify } from 'transliteration';

import Footer from '@/components/Footer';
import Jumbotron from '@/components/Jumbotron';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';

import { getAllPosts } from '@/libraries/PostManager';

export async function generateMetadata(): Promise<Metadata> {
    const title = 'Categories';
    const url = `/category`;
    const description = `Browse various categories and discover related blog posts.`;

    return generatePageMetadata({ title, description, url });
}

// 카테고리 목록 페이지
const CategoryIndexPage = async () => {
    const posts = await getAllPosts();

    // 1) 카테고리별 대표 이미지, 게시물 수 추출
    // { categoryName: { count, image, slug } }
    const categoryMap: Record<string, { count: number; image?: string; slug: string }> = {};

    for (const post of posts) {
        const category = post.category;
        const categoryKey = category.toLowerCase();
        if (!categoryMap[categoryKey]) {
            categoryMap[categoryKey] = {
                count: 0,
                image: post.image || post.embeddedImagesLocal, // 첫 게시물의 이미지를 대표 이미지로
                slug: slugify(category), // URL 슬러그화
            };
        }
        categoryMap[categoryKey].count += 1;

        // 대표 이미지가 없고 현재 포스트에 image가 있으면 갱신 (또는 더 고도화 가능)
        if (!categoryMap[categoryKey].image && post.image) {
            categoryMap[categoryKey].image = post.image;
        }
    }

    // 2) 정렬(예: 게시물 많은 순), 또는 알파벳 순 등
    // 배열 형태로 변환
    const categoryList = Object.entries(categoryMap).map(([key, data]) => ({
        name: key, // 소문자
        slug: data.slug,
        count: data.count,
        image: data.image,
    }));

    // 예: 게시물 수가 많은 순으로 정렬
    categoryList.sort((a, b) => b.count - a.count);

    return (
        <>
            <ResponsiveAppBar />
            <Jumbotron />
            <Grid container spacing={2} px={2} maxWidth={'lg'} mx={'auto'}>
                {categoryList.map((cat) => {
                    const displayName = cat.name; // 실제 카테고리 문자열
                    const imageUrl = cat.image || '/images/wp7317693-jeju-wallpapers.jpg';

                    return (
                        <Grid size={{ xs: 12, md: 6, xl: 4 }} key={cat.slug}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                {/* 대표 이미지 */}
                                <CardMedia
                                    component='img'
                                    height='140'
                                    image={imageUrl}
                                    alt={displayName}
                                    sx={{
                                        objectFit: 'cover',
                                    }}
                                />
                                <CardContent sx={{ flex: '1 1 0' }}>
                                    <Typography variant='h6' gutterBottom>
                                        {displayName} ({cat.count})
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                        Posts in {displayName} category
                                    </Typography>
                                </CardContent>
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                    <Button
                                        component={MuiLink}
                                        href={`/category/${cat.slug}/1`}
                                        variant='outlined'
                                    >
                                        View Posts
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
            <Footer />
        </>
    );
};

export default CategoryIndexPage;
