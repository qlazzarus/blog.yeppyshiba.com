import { slugify } from 'transliteration';
import { redirect } from 'next/navigation';
import { getAllPosts } from '@/libraries/PostManager';
import generatePageMetadata from '@/seo';

const posts = await getAllPosts();

export async function generateStaticParams() {
    const allCategoriesSet = new Set<string>();
    posts.forEach((post) => {
        allCategoriesSet.add(post.category);
    });

    return Array.from(allCategoriesSet).map((category) => ({
        slug: slugify(category),
    }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; }>;
}) {
    const slug = (await params).slug;

    // 현재 카테고리에 해당하는 게시물 필터링
    const categoryPosts = posts.filter((p) => slugify(p.category.toLowerCase()) === slug);


    const title = `Posts in category "${slug}"`;

    const description = `Explore posts in the category "${slug}" on page 1. Discover articles about ${slug} and related topics.`;

    const url = `/category/${slug}/1`;
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

const CategorySlugIndex = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const slug = (await params).slug as string;
    // 접근 시 항상 /category/{slug}/1 로 리다이렉트
    redirect(`/category/${slug}/1`);
};

export default CategorySlugIndex;
