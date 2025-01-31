import type { NextConfig } from 'next';

const title = 'Yeppyshiba Blog';
const description = 'A blog about web development, programming, and technology. and 3D printing';
const siteUrl = 'https://blog.yeppyshiba.com';

const nextConfig: NextConfig = {
    // build 파일을 외부 static으로 뽑을 떄 추가하는 옵션
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    transpilePackages: ['next-mdx-remote'],
    publicRuntimeConfig: {
        siteMetadata: {
            title,
            description,
            siteUrl,
            author: 'yeppyshiba',
            social: {
                github: 'https://github.com/qlazzarus',
                thread: 'https://www.threads.net/@yeppyshiba',
                linkedin: 'https://www.linkedin.com/in/yeppyshiba/',
                instagram: 'https://www.instagram.com/yeppyshiba',
                rocketpunch: 'https://www.rocketpunch.com/@yeppyshiba',
            },
        },
    },
    env: {
        NEXT_PUBLIC_SITE_TITLE: title,
        NEXT_PUBLIC_SITE_DESCRIPTION: description,
        NEXT_PUBLIC_SITE_URL: siteUrl,
    },
};

export default nextConfig;
