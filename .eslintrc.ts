import { Linter } from 'eslint';

const config: Linter.Config = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    extends: [
        'next/core-web-vitals', // Next.js 기본 ESLint 설정
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier', // Prettier와 통합
    ],
    rules: {
        // 프로젝트에 맞는 룰을 추가
        'react/react-in-jsx-scope': 'off', // React 17+에서 JSX Import 불필요
        '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
};

export default config;
