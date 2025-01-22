import generatePageMetadata from '@/seo';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import { Metadata } from 'next';
import React from 'react';
import { slugify } from 'transliteration';

import Footer from '@/components/Footer';
import Jumbotron from '@/components/Jumbotron';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';

import { getAllPosts } from '@/libraries/PostManager';

interface PostData {
    tags: string[];
    // 필요한 필드...
}

export async function generateMetadata(): Promise<Metadata> {
    const title = 'Tag Cloud';
    const description = 'Explore all tags used in the blog and find articles on various topics.';
    const url = '/tag';

    return generatePageMetadata({
        title,
        description,
        url,
    });
}

const TagCloudPage = async () => {
    const posts: PostData[] = await getAllPosts();

    // 1) 태그별 빈도 계산
    const tagCountMap: Record<string, number> = {};
    posts.forEach((post) => {
        if (Array.isArray(post.tags)) {
            post.tags.forEach((tag) => {
                const lowerTag = tag.toLowerCase();
                tagCountMap[lowerTag] = (tagCountMap[lowerTag] || 0) + 1;
            });
        }
    });

    const tagEntries = Object.entries(tagCountMap);
    if (tagEntries.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='h4'>No tags found.</Typography>
            </Box>
        );
    }

    // 2) 빈도 → 1~9 범위 매핑
    const maxCount = Math.max(...tagEntries.map(([, c]) => c));
    const minCount = Math.min(...tagEntries.map(([, c]) => c));

    const mapCountToWeight = (count: number) => {
        if (maxCount === minCount) {
            // 모든 태그 빈도가 동일하면 중간값(5)으로
            return 5;
        }
        // 선형 변환 (minCount -> 1, maxCount -> 9)
        return Math.round(1 + ((count - minCount) * (9 - 1)) / (maxCount - minCount));
    };

    // 3) 정렬(자주 등장하는 태그 우선)
    tagEntries.sort((a, b) => b[1] - a[1]);

    // 4) 색상 결정 (원래 nth-child 대신 index 기반)
    const getColorByIndex = (idx: number) => {
        // 예: (2n+1)은 #181, (3n+1)은 #33a, (4n+1)은 #c38 등
        // CodePen CSS를 간단히 흉내낸 예시
        if (idx % 4 === 1) return '#c38';
        if (idx % 3 === 1) return '#33a';
        if (idx % 2 === 1) return '#181';
        return '#a33';
    };

    // 5) 렌더
    return (
        <>
            <ResponsiveAppBar />
            <Jumbotron />
            <Box
                sx={{
                    width: '100%',
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <Box
                    component='ul'
                    sx={{
                        listStyle: 'none',
                        p: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '2.75rem',
                        width: '100%',
                        m: '0 auto',
                    }}
                >
                    {tagEntries.map(([tag, count], index) => {
                        const weight = mapCountToWeight(count);
                        const color = getColorByIndex(index);
                        const slug = slugify(tag);
                        return (
                            <Box
                                key={tag}
                                component='li'
                                sx={{ mx: 0.5, my: 0.5, position: 'relative' }}
                            >
                                <MuiLink
                                    href={`/tag/${slug}/1`}
                                    underline='none'
                                    sx={{
                                        // --size, --color 식 대신, MUI sx로 직접 구현
                                        position: 'relative',
                                        display: 'inline-block',
                                        color,
                                        fontSize: `calc(${weight} * 0.25rem + 0.5rem)`, // CodePen의 calc
                                        p: '2px 4px',
                                        transition: '0.25s',
                                        '&:hover::before, &:focus::before': {
                                            width: '100%',
                                        },
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: '50%',
                                            width: 0,
                                            height: '100%',
                                            backgroundColor: color,
                                            transform: 'translateX(-50%)',
                                            opacity: 0.15,
                                            transition: 'width 0.25s',
                                        },
                                        '&:focus': {
                                            outline: '1px dashed',
                                            outlineOffset: 2,
                                        },
                                    }}
                                >
                                    {tag}
                                </MuiLink>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
            <Footer />
        </>
    );
};

export default TagCloudPage;
