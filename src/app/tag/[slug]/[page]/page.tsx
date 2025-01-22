import generatePageMetadata from '@/seo';
import { Metadata } from 'next';
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
}): Promise<Metadata> {
    const slug = (await params).slug;
    const page = parseInt((await params).page);

    const tagPosts = posts.filter((post) =>
        post.tags.some((t) => slugify(t.toLowerCase()) === slug),
    );

    const totalPages = Math.ceil(tagPosts.length / POSTS_PER_PAGE);

    if (page < 1 || page > totalPages) {
        return generatePageMetadata({
            title: 'Page Not Found',
            description: 'The page you are looking for does not exist.',
            url: `/tag/${slug}/${page}`,
        });
    }

    const title = page === 1 ? `Posts tagged "${slug}"` : `Page ${page} - Posts tagged "${slug}"`;

    const description = `Explore posts tagged "${slug}" on page ${page}. Find articles about ${slug} and related topics.`;

    const url = `/tag/${slug}/${page}`;

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
        const tagPosts = posts.filter((p) =>
            p.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()),
        );
        const totalPages = Math.ceil(tagPosts.length / POSTS_PER_PAGE);

        for (let i = 1; i <= totalPages; i++) {
            params.push({ slug: slugify(tag), page: i.toString() });
        }
    }

    return params;
}

const TagPage = async ({ params }: { params: Promise<{ slug: string; page: string }> }) => {
    const slug = (await params).slug as string;
    const page = parseInt((await params).page);

    // 현재 태그에 해당하는 게시물 필터링
    const entries = posts.filter((p) =>
        p.tags.map((t) => slugify(t.toLowerCase())).includes(slug.toLowerCase()),
    );

    return (
        <>
            <ResponsiveAppBar />
            <Jumbotron />
            <PageContainer page={page} posts={entries} linkPrefix={`/tag/${slug}/`} />
            <Footer />
        </>
    );
};

export default TagPage;
