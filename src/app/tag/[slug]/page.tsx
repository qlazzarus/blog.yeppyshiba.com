import { slugify } from 'transliteration';
import { redirect } from 'next/navigation';
import { getAllPosts } from '@/libraries/PostManager';
import generatePageMetadata from '@/seo';
import type { Metadata } from 'next';

const posts = await getAllPosts();

export async function generateStaticParams() {
    const allTagsSet = new Set<string>();
    posts.forEach((post) => {
        post.tags.forEach((tag) => allTagsSet.add(tag));
    });

    return Array.from(allTagsSet).map((tag) => ({
        slug: slugify(tag),
    }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; }>;
}): Promise<Metadata> {
    const slug = (await params).slug;

    const tagPosts = posts.filter((post) =>
        post.tags.some((t) => slugify(t.toLowerCase()) === slug),
    );

    const title = `Posts tagged "${slug}"`;

    const description = `Explore posts tagged "${slug}" on page $1. Find articles about ${slug} and related topics.`;

    const url = `/tag/${slug}/1`;

    const image = tagPosts[0]?.image;
    const embeddedImagesLocal = tagPosts[0]?.embeddedImagesLocal;

    return generatePageMetadata({
        title,
        description,
        url,
        image,
        embeddedImagesLocal,
    });
}

const TagSlugIndex = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const slug = (await params).slug as string;
    // 접근 시 항상 /tag/{slug}/1 로 리다이렉트
    redirect(`/tag/${slug}/1`);
};

export default TagSlugIndex;
