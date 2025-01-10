import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // build 파일을 외부 static으로 뽑을 떄 추가하는 옵션
    output: 'export',
    images: {
        unoptimized: true,
    },
    transpilePackages: ['next-mdx-remote'],
};

export default nextConfig;
