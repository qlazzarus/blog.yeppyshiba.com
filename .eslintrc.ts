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
        // 추가 플러그인 등록
        plugins: [
            // 기타 필요한 플러그인('react', '@typescript-eslint', 'react-hooks') 등이
            // next/core-web-vitals에 이미 포함되었을 수 있으므로,
            // 명시적으로 추가가 필요하다면 여기에 넣어 주세요.
            'sort-keys-fix', // <= 객체 키 정렬을 위한 플러그인
        ],
    // 추가로 필요한 plugin이 있다면 아래 plugins 배열에 명시
    // e.g., plugins: ['react', '@typescript-eslint', 'react-hooks']
    rules: {
        // ----- React 관련 룰 -----
        'react/react-in-jsx-scope': 'off', // React 17+에서는 JSX에 React import 불필요
        'react/jsx-sort-props': [
            'warn',
            {
                callbacksLast: true,
                shorthandFirst: true,
                ignoreCase: true,
                noSortAlphabetically: false,
                reservedFirst: true,
            },
        ],
        // TS 사용 시 prop-types 사용 안 하므로 off
        'react/prop-types': 'off',

        // ----- React Hooks 관련 룰 -----
        // next/core-web-vitals에서 이미 포함되어 있을 수도 있지만,
        // 혹시 놓친 경우를 대비해 명시적으로 추가해볼 수 있습니다.
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn', // effect dependencies 체크

        // ----- TypeScript 관련 룰 -----
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        // no-unused-vars는 TS 플러그인이 대신 관리하는 편이 좋습니다.
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { vars: 'all', args: 'after-used', ignoreRestSiblings: true },
        ],

        // 필요하다면 strict 모드로:
        // '@typescript-eslint/no-explicit-any': 'warn',

        // ----- 기타 권장될 수 있는 룰들 -----
        'import/no-anonymous-default-export': 'off', // Next.js에서 자주 사용하는 경우
    },
    settings: {
        react: {
            version: 'detect', // React 버전을 자동으로 감지
        },
    },
};

export default config;
