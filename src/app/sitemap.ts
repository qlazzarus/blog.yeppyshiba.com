import type { MetadataRoute } from 'next';
import getConfig from 'next/config';
import { slugify } from 'transliteration';

import { getAllPosts } from '@/libraries/PostManager';

// Next.js Config 가져오기
const { publicRuntimeConfig } = getConfig();
const { siteMetadata } = publicRuntimeConfig;

export const dynamic = 'force-static';

const BASE_URL = siteMetadata.siteUrl;
const POSTS_PER_PAGE = 10;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await getAllPosts();

    // 모든 게시물 슬러그
    const allPostsSlugs = posts.map((p) => p.slug);

    // 태그 추출
    const allTagsSet = new Set<string>();
    posts.forEach((post) => {
        if (Array.isArray(post.tags)) {
            post.tags.forEach((t) => allTagsSet.add(t));
        }
    });
    const allTags = Array.from(allTagsSet);

    const tagPaths: string[] = [];
    for (const tag of allTags) {
        const filteredPosts = posts.filter((p) =>
            p.tags.map((tt) => slugify(tt.toLowerCase())).includes(slugify(tag.toLowerCase())),
        );
        const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
        const tagSlug = slugify(tag);
        // /tag/{slug} 메인 페이지
        tagPaths.push(`/tag/${tagSlug}`);
        // /tag/{slug}/{page}
        for (let i = 1; i <= totalPages; i++) {
            tagPaths.push(`/tag/${tagSlug}/${i}`);
        }
    }

    // 카테고리 추출
    const categorySet = new Set<string>();
    posts.forEach((post) => {
        if (Array.isArray(post.category)) {
            post.category.forEach((c) => categorySet.add(c));
        } else if (typeof post.category === 'string' && post.category) {
            categorySet.add(post.category);
        }
    });
    const categories = Array.from(categorySet);
    const categoryPaths = categories.map((c) => `/category/${slugify(c.toLowerCase())}`);

    // 페이징 처리: /page/{page}
    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    const pagePaths = [];
    for (let i = 1; i <= totalPages; i++) {
        pagePaths.push(`/page/${i}`);
    }

    // 정적 경로
    const staticPaths = ['/', '/about', '/map', '/tag', '/category'];

    // 게시물 경로
    const articlePaths = allPostsSlugs.map((slug) => `/article/${slug}`);

    // 모든 경로 합치기
    const allPaths = [...staticPaths, ...articlePaths, ...pagePaths, ...tagPaths, ...categoryPaths];

    const uniquePaths = Array.from(new Set(allPaths));

    // 모든 경로에 대해 사이트맵 엔트리 생성
    // 변경 빈도나 우선순위는 각자 정책에 따라 조정 가능
    const sitemapEntries: MetadataRoute.Sitemap = uniquePaths.map((path) => ({
        url: path === '/' ? BASE_URL : `${BASE_URL}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: path === '/' ? 1 : 0.5,
    }));

    return sitemapEntries;
}
