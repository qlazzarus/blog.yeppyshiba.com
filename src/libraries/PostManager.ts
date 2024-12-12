import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
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

    const allPosts = fileNames.map((fileName) => {
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

    // gaData에 있는 path로부터 slug를 추출하는 로직 필요
    // 예: path가 '/article/jeju-food-review-goraehimjul' 형태라면
    // slugify 한 결과와 매칭
    // 아래는 가정: path의 마지막 세그먼트가 slugify 후 slug와 동일하다고 가정
    // 만약 구조가 다르다면 그에 맞게 수정해야 함.
    allPosts.forEach((post) => {
        const matching = gaData.find((d) => {
            // d.path 가 /article/slug 형태라고 가정
            const segments = d.path.split('/');
            const lastSegment = segments[segments.length - 1];
            return lastSegment === post.slug;
        });

        if (matching) {
            post.viewCount = parseInt(matching.totalCount, 10) || 0;
        }
    });

    cachedPosts = allPosts;
    return cachedPosts;
};
