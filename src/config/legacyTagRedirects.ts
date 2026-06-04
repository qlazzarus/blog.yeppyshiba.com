export type LegacyTagRedirect = {
    from: `/tag/${string}`;
    target: `/${string}`;
    reason: string;
};

export const legacyTagRedirects = [
    {
        from: '/tag/adding/',
        target: '/article/adding-view-count-in-gatsby/',
        reason: 'Legacy auto tag for the Gatsby view-count article',
    },
    {
        from: '/tag/akita/',
        target: '/article/akita-inu/',
        reason: 'Legacy dog tag for the Akita Inu post',
    },
    {
        from: '/tag/bakery/',
        target: '/tag/beikeori/',
        reason: 'Legacy English bakery tag to current Korean transliterated tag',
    },
    {
        from: '/tag/cd/',
        target: '/tag/ci-cd/',
        reason: 'Legacy split CI/CD tag',
    },
    {
        from: '/tag/prime-number/',
        target: '/article/deep-learning-prime-number/',
        reason: 'Legacy prime-number tag for the deep-learning prime article',
    },
    {
        from: '/tag/probability/',
        target: '/tag/hwagryul/',
        reason: 'Legacy English probability tag to current Korean transliterated tag',
    },
    {
        from: '/tag/3d/',
        target: '/tag/pseudo-3d/',
        reason: 'Legacy broad 3D tag to current pseudo-3d tag',
    },
    {
        from: '/tag/akita-inu/',
        target: '/article/akita-inu/',
        reason: 'Legacy Akita Inu tag for the Akita Inu post',
    },
    {
        from: '/tag/average/',
        target: '/tag/pyeonggyun/',
        reason: 'Legacy English average tag to current Korean transliterated tag',
    },
    {
        from: '/tag/by/',
        target: '/tag/',
        reason: 'Removed weak auto-generated tag',
    },
    {
        from: '/tag/chunk/',
        target: '/article/chunk-upload-vue-axios-laravel/',
        reason: 'Legacy chunk tag for the chunk upload article',
    },
    {
        from: '/tag/continuing/',
        target: '/article/rethink-blog-meaning-while-continuing-development/',
        reason: 'Legacy auto tag for the blog meaning article',
    },
    {
        from: '/tag/curve/',
        target: '/tag/geuraepeu/',
        reason: 'Legacy curve tag to graph topic',
    },
    {
        from: '/tag/development/',
        target: '/category/coding/',
        reason: 'Legacy broad development tag to coding category',
    },
    {
        from: '/tag/direction/',
        target: '/tag/banghyang/',
        reason: 'Legacy English direction tag to current Korean transliterated tag',
    },
    {
        from: '/tag/division/',
        target: '/tag/nanussem/',
        reason: 'Legacy English division tag to current Korean transliterated tag',
    },
    {
        from: '/tag/flight/',
        target: '/category/aviation/',
        reason: 'Legacy flight tag to aviation category',
    },
    {
        from: '/tag/gwacheon/',
        target: '/tag/gwaceon/',
        reason: 'Legacy English Gwacheon tag to current Korean transliterated tag',
    },
    {
        from: '/tag/in/',
        target: '/tag/',
        reason: 'Removed weak auto-generated tag',
    },
    {
        from: '/tag/nid/',
        target: '/article/gwacheon-nid-bakery-dessert-cafe/',
        reason: 'Legacy NID tag for the NID bakery cafe article',
    },
    {
        from: '/tag/of/',
        target: '/tag/',
        reason: 'Removed weak auto-generated tag',
    },
    {
        from: '/tag/olle-trail/',
        target: '/tag/olregil/',
        reason: 'Legacy olle-trail tag to current Korean transliterated tag',
    },
    {
        from: '/tag/ratio/',
        target: '/tag/biyul/',
        reason: 'Legacy English ratio tag to current Korean transliterated tag',
    },
    {
        from: '/tag/uiwang-cafe/',
        target: '/tag/yiwangkape/',
        reason: 'Legacy Uiwang cafe tag to current Korean transliterated tag',
    },
    {
        from: '/tag/uiwang-restaurant/',
        target: '/tag/yiwangmasjib/',
        reason: 'Legacy Uiwang restaurant tag to current Korean transliterated tag',
    },
] satisfies LegacyTagRedirect[];
