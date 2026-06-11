export type TagGroup =
    | 'series'
    | 'topic'
    | 'tech'
    | 'place'
    | 'food'
    | 'cycling'
    | 'lifestyle'
    | 'finance'
    | 'meta';

export type TagMeta = {
    label: string;
    slug: string;
    group: TagGroup;
    description?: string;
    aliases?: string[];
    hidden?: boolean;
    relatedWeight?: number;
    featured?: boolean;
};

export const tagRegistry = [
    {
        label: '생각하는중등수학',
        slug: 'thinking-middle-school-math',
        group: 'series',
        description: '중등수학 개념을 직관과 맥락으로 다시 생각하는 글 모음',
        featured: true,
        relatedWeight: 2,
    },
    {
        label: '용돈30만원',
        slug: 'allowance-300k',
        group: 'series',
        description: '직장인 한 달 용돈 30만원 실험 기록',
        featured: true,
        relatedWeight: 2,
    },
    {
        label: '카페리뷰',
        slug: 'cafe-review',
        group: 'topic',
        description: '직접 다녀온 카페 후기 모음',
        featured: true,
        relatedWeight: 1.5,
    },
    {
        label: '맛집리뷰',
        slug: 'restaurant-review',
        group: 'topic',
        description: '직접 다녀온 식당과 먹거리 후기 모음',
        featured: true,
        relatedWeight: 1.5,
    },
    {
        label: 'phaser',
        slug: 'phaser',
        group: 'tech',
        description: 'Phaser 기반 게임 개발 글 모음',
        featured: true,
        relatedWeight: 3,
    },
    {
        label: 'phaser4',
        slug: 'phaser4',
        group: 'tech',
        relatedWeight: 3,
    },
    {
        label: 'migration',
        slug: 'migration',
        group: 'tech',
        description: '기술 이전과 마이그레이션 기록',
        featured: true,
        relatedWeight: 2.5,
    },
    {
        label: 'javascript',
        slug: 'javascript',
        group: 'tech',
        relatedWeight: 2.5,
    },
    {
        label: 'astro',
        slug: 'astro',
        group: 'tech',
        relatedWeight: 2.5,
    },
    {
        label: '의왕',
        slug: 'uiwang',
        group: 'place',
        description: '의왕 지역 방문 후기 모음',
        featured: true,
        relatedWeight: 3,
    },
    {
        label: '강화도',
        slug: 'ganghwa',
        group: 'place',
        description: '강화도 여행과 맛집, 카페 후기',
        featured: true,
        relatedWeight: 3,
    },
    {
        label: '수원',
        slug: 'suwon',
        group: 'place',
        relatedWeight: 3,
    },
    {
        label: '용인',
        slug: 'yongin',
        group: 'place',
        relatedWeight: 3,
    },
    {
        label: '생활비절약',
        slug: 'living-cost-saving',
        group: 'finance',
        description: '생활비를 줄이는 실험과 기록',
        featured: true,
        relatedWeight: 2.5,
    },
    {
        label: '예산관리',
        slug: 'budgeting',
        group: 'finance',
        relatedWeight: 2.5,
    },
    {
        label: '신생아특례대출',
        slug: 'newborn-special-loan',
        group: 'finance',
        description: '신생아 특례대출과 주택담보대출 기록',
        featured: true,
        relatedWeight: 3,
    },
    {
        label: '주택담보대출',
        slug: 'mortgage',
        group: 'finance',
        aliases: ['mortgage'],
        relatedWeight: 3,
    },
    {
        label: '회고',
        slug: 'retrospective',
        group: 'lifestyle',
        description: '삶과 일의 흐름을 돌아보는 글',
        featured: true,
        relatedWeight: 2,
    },
    {
        label: '장기계획',
        slug: 'long-term-planning',
        group: 'lifestyle',
        relatedWeight: 2.5,
    },
    {
        label: '삶의기준',
        slug: 'life-principles',
        group: 'lifestyle',
        relatedWeight: 2.5,
    },
    {
        label: 'GPX',
        slug: 'gpx',
        group: 'cycling',
        description: 'GPX 경로와 지도 기반 기록',
        featured: true,
        relatedWeight: 2.5,
    },
    {
        label: '자전거',
        slug: 'jajeongeo',
        group: 'cycling',
        aliases: ['cycling', 'bike', 'bicycle'],
        description: '자전거 관련 글 모음',
        featured: true,
        relatedWeight: 3,
    },
    {
        label: '라이딩',
        slug: 'raiding',
        group: 'cycling',
        aliases: ['riding'],
        description: '라이딩 관련 글 모음',
        featured: true,
        relatedWeight: 3,
    },
    {
        label: '라이딩 기록',
        slug: 'ride-log',
        group: 'cycling',
        description: '자전거 라이딩 기록 모음',
        featured: true,
        relatedWeight: 3,
    },
    {
        label: '자전거 코스',
        slug: 'cycling-route',
        group: 'cycling',
        description: '자전거 코스와 경로 기록',
        relatedWeight: 2.5,
    },
    {
        label: '저녁 라이딩',
        slug: 'evening-ride',
        group: 'cycling',
        relatedWeight: 2,
    },
    {
        label: '하트코스',
        slug: 'heart-course',
        group: 'cycling',
        relatedWeight: 2,
    },
    {
        label: '안장 피팅',
        slug: 'saddle-fitting',
        group: 'cycling',
        relatedWeight: 2,
    },
    {
        label: '사이클 언더웨어',
        slug: 'cycling-underwear',
        group: 'cycling',
        relatedWeight: 2,
    },
] satisfies TagMeta[];
