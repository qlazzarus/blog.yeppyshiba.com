import { slugify } from 'transliteration';

import Jumbotron from '@/components/Jumbotron';
import PageContainer from '@/components/PageContainer';

import { getAllPosts } from '@/libraries/PostManager';

const POSTS_PER_PAGE = 10;

// 모든 게시물 로딩 후 날짜 내림차순 정렬(최신글 우선)
const posts = (await getAllPosts()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export async function generateStaticParams() {
    // 모든 게시물의 태그를 추출
    const allCategoriesSet = new Set<string>();
    posts.forEach((post) => {
        allCategoriesSet.add(post.category);
    });

    const allCategories = Array.from(allCategoriesSet);
    const params = [];

    // 각 태그별 총 페이지 수를 계산하고, 해당 페이지들에 대한 params를 생성
    for (const category of allCategories) {
        const categoryPosts = posts.filter((p) => p.category.toLowerCase() === category.toLocaleLowerCase());
        const totalPages = Math.ceil(categoryPosts.length / POSTS_PER_PAGE);

        for (let i = 1; i <= totalPages; i++) {
            params.push({ slug: slugify(category), page: i.toString() });
        }
    }

    return params;
}

const CategoryPage = async ({ params }: { params: Promise<{ slug: string; page: string }> }) => {
    const slug = (await params).slug as string;
    const page = parseInt((await params).page);

    // 현재 카케고리에 해당하는 게시물 필터링
    const entries = posts.filter((p) => p.category.toLowerCase() === slugify(slug.toLowerCase()));

    return (
        <>
            <Jumbotron />
            <PageContainer page={page} posts={entries} linkPrefix={`/category/${slug}/`} />
        </>
    );
};

export default CategoryPage;
