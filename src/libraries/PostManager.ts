import fs from 'fs';
import matter from 'gray-matter';
import { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import path from 'path';
import { slugify } from 'transliteration';

import { getViewCount } from './AnalyticsManager';

export interface PostData {
    slug: string;
    title: string;
    date: string;
    summary: string;
    category: string;
    image?: string;
    embeddedImagesLocal?: string;
    tags: string[];
    content: string;
    source?: MDXRemoteSerializeResult<Record<string, unknown>, Record<string, unknown>>;
    roadAddress?: string;
    parcelAddress?: string;
    lat?: number;
    lng?: number;
    viewCount?: number;
}

const postDirectory = path.join(process.cwd(), 'contents');

// articlePrefix 는 GA에서 필터링할 때 사용했던 prefix (예: '/article')
const articlePrefix = '/article';

let cachedPosts: PostData[] | null = null;

export const getAllPosts = async () => {
    if (cachedPosts) {
        return cachedPosts;
    }

    const fileNames = fs.readdirSync(postDirectory);

    const allPosts: PostData[] = fileNames.map((fileName) => {
        const fullPath = path.join(postDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const {
            data: {
                slug: originalSlug,
                title,
                date,
                summary,
                category,
                image,
                embeddedImagesLocal,
                tags,
                roadAddress,
                parcelAddress,
                lat,
                lng,
            },
            content,
        } = matter(fileContents);

        // 파일명 또는 title을 기반으로 slug 생성
        const slug = slugify(originalSlug || fileName.replace(/\.mdx?$/, ''));

        return {
            slug,
            title,
            date,
            summary,
            category: category || [],
            image,
            embeddedImagesLocal,
            tags: tags || [],
            content,
            roadAddress,
            parcelAddress,
            lat,
            lng,
            viewCount: 0,
        };
    });

    // GA 조회수 가져오기
    const gaData = await getViewCount(articlePrefix);

    allPosts.forEach((post) => {
        // 1) post.slug 앞에 /article/ 접두사를 붙인다.
        //    예: post.slug === "adding-view-count-in-gatsby" 라면
        //        pathWithPrefix === "/article/adding-view-count-in-gatsby"
        const pathWithPrefix = `/article/${post.slug}`;

        // 2) gaData 중에서 path가 위에서 만든 pathWithPrefix와 동일한 항목을 찾는다.
        const matching = gaData.find((d) => {
            // /article/ 뒤에 슬래시로 끝나는 경우를 제거하기 위해,
            // d.path 의 트레일링 슬래시를 모두 제거한다. (ex. '/article/adding-view-count-in-gatsby/' -> '/article/adding-view-count-in-gatsby')
            const cleanPath = d.path.replace(/\/+$/, '');

            return cleanPath === pathWithPrefix;
        });

        // 3) 매칭된 항목이 있다면, GA에서 받은 viewCount를 숫자로 변환하여 post.viewCount에 할당
        if (matching) {
            post.viewCount = parseInt(matching.totalCount, 10) || 0;
        } else {
            post.viewCount = 0;
        }
    });

    allPosts.forEach(async (post) => {
        try {
            post.source = await serialize(post.content);
        } catch (e) {
            console.error(`${post.slug} error`, e);
        }
    });

    cachedPosts = allPosts;
    return cachedPosts;
};
