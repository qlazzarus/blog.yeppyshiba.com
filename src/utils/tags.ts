import { isTagIndexable } from '@/config/seo';
import { type TagGroup, type TagMeta, tagRegistry } from '@/config/tagRegistry';
import type { CollectionEntry } from 'astro:content';
import { slugify } from 'transliteration';

type BlogPost = CollectionEntry<'blog'>;

export type TagEntry = {
    meta: TagMeta;
    count: number;
    posts: BlogPost[];
};

const groupWeights: Record<TagGroup, number> = {
    series: 2,
    topic: 2,
    tech: 2.5,
    place: 3,
    food: 2.5,
    cycling: 3,
    lifestyle: 2,
    finance: 2.5,
    meta: 0.5,
};

const tagLookup = new Map<string, TagMeta>();
const slugLookup = new Map<string, TagMeta>();

const normalizeTag = (tag: string | number) => String(tag).trim().toLowerCase();
const fallbackSlug = (tag: string | number) => slugify(String(tag)).toLowerCase();

for (const meta of tagRegistry) {
    slugLookup.set(meta.slug, meta);
    [meta.label, meta.slug, ...(meta.aliases ?? [])].forEach((value) => {
        tagLookup.set(normalizeTag(value), meta);
        tagLookup.set(fallbackSlug(value), meta);
    });
}

export function getTagMeta(tag: string | number): TagMeta {
    const key = normalizeTag(tag);
    const slug = fallbackSlug(tag);
    return (
        tagLookup.get(key) ??
        slugLookup.get(slug) ?? {
            label: String(tag),
            slug,
            group: 'topic',
        }
    );
}

export function getTagMetaBySlug(slug: string): TagMeta | undefined {
    return slugLookup.get(slug) ?? tagLookup.get(normalizeTag(slug));
}

export function getTagMetaFromPostsBySlug(
    posts: BlogPost[],
    slug: string,
): TagMeta | undefined {
    for (const post of posts) {
        const found = getPublicTags(post.data.tags ?? []).find(
            (meta) => meta.slug === slug,
        );
        if (found) return found;
    }
    return getTagMetaBySlug(slug);
}

export function getTagSlug(tag: string | number): string {
    return getTagMeta(tag).slug;
}

export function getTagLabel(tag: string | number): string {
    return getTagMeta(tag).label;
}

export function getPublicTags(tags: Array<string | number> = []): TagMeta[] {
    const metas = tags.map((tag) => getTagMeta(tag)).filter((meta) => !meta.hidden);
    const seen = new Set<string>();
    return metas.filter((meta) => {
        if (seen.has(meta.slug)) return false;
        seen.add(meta.slug);
        return true;
    });
}

export function getTagEntries(posts: BlogPost[]): TagEntry[] {
    const entries = new Map<string, TagEntry>();

    for (const post of posts) {
        for (const meta of getPublicTags(post.data.tags ?? [])) {
            const current = entries.get(meta.slug) ?? {
                meta,
                count: 0,
                posts: [],
            };
            current.count += 1;
            current.posts.push(post);
            entries.set(meta.slug, current);
        }
    }

    return Array.from(entries.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.meta.label.localeCompare(b.meta.label);
    });
}

export function getVisibleTagEntries(posts: BlogPost[]): TagEntry[] {
    return getTagEntries(posts).filter(
        ({ meta, count }) => meta.featured || count >= 2,
    );
}

export function getIndexableTagEntries(posts: BlogPost[]): TagEntry[] {
    return getTagEntries(posts).filter(({ meta, count }) =>
        isTagIndexable(meta, count),
    );
}

export function getPostsByTag(posts: BlogPost[], slug: string): BlogPost[] {
    return posts.filter((post) =>
        getPublicTags(post.data.tags ?? []).some((meta) => meta.slug === slug),
    );
}

export function sortDisplayTags(tags: Array<string | number> = []): TagMeta[] {
    const groupOrder: Record<TagGroup, number> = {
        series: 0,
        place: 1,
        topic: 2,
        cycling: 3,
        tech: 4,
        food: 5,
        finance: 6,
        lifestyle: 7,
        meta: 8,
    };

    return getPublicTags(tags).sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        if (groupOrder[a.group] !== groupOrder[b.group]) {
            return groupOrder[a.group] - groupOrder[b.group];
        }
        return a.label.localeCompare(b.label);
    });
}

export function getRelatedPostScore(
    current: BlogPost,
    candidate: BlogPost,
    now = Date.now(),
) {
    const currentTags = new Set(
        getPublicTags(current.data.tags ?? []).map((meta) => meta.slug),
    );
    let score = 0;

    for (const meta of getPublicTags(candidate.data.tags ?? [])) {
        if (!currentTags.has(meta.slug)) continue;
        score += meta.relatedWeight ?? groupWeights[meta.group];
    }

    if (current.data.category === candidate.data.category) score += 0.75;

    const ageDays = Math.max(
        0,
        (now - new Date(candidate.data.date).getTime()) / (1000 * 60 * 60 * 24),
    );
    score += Math.max(0, 0.5 - ageDays / 3650);

    return score;
}
