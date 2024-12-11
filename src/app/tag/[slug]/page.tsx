import { redirect } from 'next/navigation';
import { getAllPosts } from '@/libraries/PostManager';

const posts = getAllPosts();

export async function generateStaticParams() {
    const allTagsSet = new Set<string>();
    posts.forEach((post) => {
        post.tags.forEach((tag) => allTagsSet.add(tag));
    });

    return Array.from(allTagsSet).map((tag) => ({
        slug: tag,
    }));
}

const TagSlugIndex = ({ params }: { params: { slug: string } }) => {
    const { slug } = params;
    // 접근 시 항상 /tag/{slug}/1 로 리다이렉트
    redirect(`/tag/${slug}/1`);
};

export default TagSlugIndex;
