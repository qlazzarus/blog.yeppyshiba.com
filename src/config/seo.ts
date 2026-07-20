import type { TagMeta } from './tagRegistry';

export const MIN_INDEXABLE_TAG_POSTS = 3;

/**
 * Thin tag archives stay crawlable through internal links but are not indexed.
 * A curated tag can opt in below the count threshold only when it has both a
 * featured flag and a real, hand-written description.
 */
export function isTagIndexable(meta: TagMeta, postCount: number) {
    return (
        postCount >= MIN_INDEXABLE_TAG_POSTS ||
        Boolean(meta.featured && meta.description?.trim())
    );
}
