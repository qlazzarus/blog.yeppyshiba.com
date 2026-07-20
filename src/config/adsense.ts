const isEnabled = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

export const ADSENSE_CLIENT = import.meta.env.PUBLIC_ADSENSE_CLIENT?.trim() ?? '';
export const ADSENSE_ENABLED =
    import.meta.env.PROD &&
    isEnabled(import.meta.env.PUBLIC_ADSENSE_ENABLED) &&
    Boolean(ADSENSE_CLIENT);
export const ADSENSE_DEBUG = isEnabled(import.meta.env.PUBLIC_ADSENSE_DEBUG);

export const ADSENSE_SLOTS = {
    articleTop: import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_TOP?.trim() ?? '',
    articleMiddle: import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_MIDDLE?.trim() ?? '',
    articleBottom: import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM?.trim() ?? '',
    sidebar: import.meta.env.PUBLIC_ADSENSE_SLOT_SIDEBAR?.trim() ?? '',
    toolsBottom: import.meta.env.PUBLIC_ADSENSE_SLOT_TOOLS_BOTTOM?.trim() ?? '',
} as const;
