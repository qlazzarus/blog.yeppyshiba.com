import fs from 'fs';
import matter from 'gray-matter';
import { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import path from 'path';
import remarkGfm from 'remark-gfm';
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
    source?: MDXRemoteSerializeResult;
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

    // allPosts.forEach(...) 내부:
    allPosts.forEach((post) => {
        const pathWithPrefix = `/article/${post.slug}`;

        // 1) 여러 개가 걸릴 수 있으므로 filter 후 reduce로 합산
        const matchedRows = gaData.filter((d) => {
            const cleanPath = d.path.replace(/\/+$/, '');
            return cleanPath === pathWithPrefix;
        });

        const sum = matchedRows.reduce((acc, cur) => {
            return acc + parseInt(cur.totalCount, 10);
        }, 0);

        post.viewCount = sum;
    });

    cachedPosts = allPosts;
    return cachedPosts;
};

/** slug로 특정 글(본문 포함) 정보를 가져오기 */
export async function getPostBySlug(slug: string): Promise<PostData | null> {
    // 1) 파일명 추론
    const fileNames = fs.readdirSync(postDirectory);
    // 예: slug === 'my-first-post' 라면,
    //    파일이 'my-first-post.mdx' 또는 frontMatter의 data.slug가 같은 걸 찾기
    let foundFile = '';
    for (const fileName of fileNames) {
        const filePath = path.join(postDirectory, fileName);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);
        const fileSlug = slugify(data.slug || fileName.replace(/\.mdx?$/, ''));

        if (fileSlug === slug) {
            foundFile = filePath;
            break;
        }
    }

    if (!foundFile) {
        return null; // 해당 slug를 가진 파일 없음
    }

    // 2) 파일 내용 읽기
    const rawContents = fs.readFileSync(foundFile, 'utf8');
    const {
        data: {
            title = '',
            date = '',
            summary = '',
            category = '',
            image,
            embeddedImagesLocal,
            tags = [],
            roadAddress,
            parcelAddress,
            lat,
            lng,
        },
        content,
    } = matter(rawContents);

    // 3) MDX 변환
    const source = await serialize(content, {
        mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [],
            format: 'mdx',
        },
    });

    // 4) getAllPosts()로부터 뷰 카운트를 가져오고 싶다면
    //    이미 캐시된 목록 중 해당 slug 찾아서 viewCount만 갖고 옴
    const allPosts = await getAllPosts();
    const matchedPost = allPosts.find((p) => p.slug === slug);

    return {
        slug,
        title,
        date,
        summary,
        category,
        image,
        embeddedImagesLocal,
        tags,
        content,
        source,
        roadAddress,
        parcelAddress,
        lat,
        lng,
        viewCount: matchedPost ? matchedPost.viewCount : 0,
    };
}
