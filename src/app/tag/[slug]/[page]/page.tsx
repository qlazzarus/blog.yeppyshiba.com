import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPosts } from '@/libraries/PostManager';

const POSTS_PER_PAGE = 10;

// 모든 게시물 로딩 후 날짜 내림차순 정렬(최신글 우선)
const posts = getAllPosts().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export async function generateStaticParams() {
    // 모든 게시물의 태그를 추출
    const allTagsSet = new Set<string>();
    posts.forEach((post) => {
        post.tags.forEach((t) => allTagsSet.add(t));
    });

    const allTags = Array.from(allTagsSet);
    const params = [];

    // 각 태그별 총 페이지 수를 계산하고, 해당 페이지들에 대한 params를 생성
    for (const tag of allTags) {
        const tagPosts = posts.filter((p) => p.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()));
        const totalPages = Math.ceil(tagPosts.length / POSTS_PER_PAGE);

        for (let i = 1; i <= totalPages; i++) {
            params.push({ slug: tag, page: i.toString() });
        }
    }

    return params;
}

const TagPage = async ({ params }: { params: Promise<{ slug: string; page: number }> }) => {
    const slug = (await params).slug as string;
    const page = (await params).page as number;

    // 현재 태그에 해당하는 게시물 필터링
    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const entries = posts
        .filter((p) => p.tags.map((t) => t.toLowerCase()).includes(slug.toLowerCase()))
        .slice(startIndex, endIndex);

    return <>hello {entries[0].title}</>;
};

export default TagPage;
