import { redirect } from 'next/navigation';
import { getAllPosts } from '@/libraries/PostManager';

const posts = getAllPosts();

export async function generateStaticParams() {
    const allCategoriesSet = new Set<string>();
    posts.forEach((post) => {
        allCategoriesSet.add(post.category);
    });

    return Array.from(allCategoriesSet).map((category) => ({
        slug: category,
    }));
}

const CategorySlugIndex = ({ params }: { params: { slug: string } }) => {
    const { slug } = params;
    // 접근 시 항상 /tag/{slug}/1 로 리다이렉트
    redirect(`/category/${slug}/1`);
};

export default CategorySlugIndex;
