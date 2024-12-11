import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { slugify } from 'transliteration';

export interface PostData {
    slug: string;
    title: string;
    date: string;
    summary: string;
    category: string;
    tags: string[];
    content: string;
    roadAddress?: string;
    parcelAddress?: string;
    lat?: number;
    lng?: number;
}

const postDirectory = path.join(process.cwd(), 'contents');

let cachedPosts: PostData[] | null = null;

export const getAllPosts = () => {
    if (cachedPosts) {
        return cachedPosts;
    }

    const fileNames = fs.readdirSync(postDirectory);

    const allPosts = fileNames.map((fileName) => {
        const fullPath = path.join(postDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const {
            data: { slug: originalSlug, title, date, summary, category, tags, roadAddress, parcelAddress, lat, lng },
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
            tags: tags || [],
            content,
            roadAddress,
            parcelAddress,
            lat,
            lng,
        };
    });

    cachedPosts = allPosts;
    return cachedPosts;
};
