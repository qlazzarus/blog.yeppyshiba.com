import generatePageMetadata from '@/seo';
import { slugify } from 'transliteration';

import Footer from '@/components/Footer';
import Jumbotron from '@/components/Jumbotron';
import PageContainer from '@/components/PageContainer';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';

import { getAllPosts } from '@/libraries/PostManager';

const POSTS_PER_PAGE = 10;

// 모든 게시물 로딩 후 날짜 내림차순 정렬(최신글 우선)
const posts = (await getAllPosts()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
);

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; page: string }>;
}) {
    const slug = (await params).slug;
    const page = parseInt((await params).page, 10);

    // 현재 카테고리에 해당하는 게시물 필터링
    const categoryPosts = posts.filter((p) => slugify(p.category.toLowerCase()) === slug);

    const totalPages = Math.ceil(categoryPosts.length / POSTS_PER_PAGE);

    if (page < 1 || page > totalPages) {
        return generatePageMetadata({
            title: 'Page Not Found',
            description: 'The page you are looking for does not exist.',
            url: `/category/${slug}/${page}`,
        });
    }

    const title =
        page === 1 ? `Posts in category "${slug}"` : `Page ${page} - Posts in category "${slug}"`;

    const description = `Explore posts in the category "${slug}" on page ${page}. Discover articles about ${slug} and related topics.`;

    const url = `/category/${slug}/${page}`;
    const image = categoryPosts[0]?.image;
    const embeddedImagesLocal = categoryPosts[0]?.embeddedImagesLocal;

    return generatePageMetadata({
        title,
        description,
        url,
        image,
        embeddedImagesLocal,
    });
}

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
        const categoryPosts = posts.filter(
            (p) => p.category.toLowerCase() === category.toLocaleLowerCase(),
        );
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
            <ResponsiveAppBar />
            <Jumbotron />
            <PageContainer page={page} posts={entries} linkPrefix={`/category/${slug}/`} />
            <Footer />
        </>
    );
};

export default CategoryPage;
