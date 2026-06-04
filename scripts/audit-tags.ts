import fs from 'fs';
import path from 'path';
import { slugify } from 'transliteration';

import { tagRegistry } from '../src/config/tagRegistry';

const contentDir = path.join(process.cwd(), 'contents');
const weakTags = new Set([
    'in',
    'to',
    'with',
    'by',
    'of',
    'what',
    'look',
    'back',
    'dev',
    'coding',
    'review',
    'math',
    'essay',
    'analytics',
]);

type Finding = {
    file?: string;
    message: string;
};

const errors: Finding[] = [];
const warnings: Finding[] = [];
const tagCounts = new Map<string, number>();
const unregisteredTags = new Map<string, Set<string>>();
const registrySlugs = new Map<string, string>();
const registeredLabels = new Set<string>();

function readFrontmatter(source: string) {
    return source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
}

function readTags(frontmatter: string) {
    return (
        frontmatter
            .match(/^tags:\n((?:\s*- .*\n?)*)/m)?.[1]
            ?.split('\n')
            .map((line) => line.replace(/^\s*-\s*/, '').trim())
            .filter(Boolean) ?? []
    );
}

function normalizeTag(tag: string) {
    return tag.trim().toLowerCase();
}

for (const meta of tagRegistry) {
    const previous = registrySlugs.get(meta.slug);
    if (previous) {
        errors.push({
            message: `Registry slug collision: "${meta.slug}" is used by "${previous}" and "${meta.label}"`,
        });
    }
    registrySlugs.set(meta.slug, meta.label);
    [meta.label, meta.slug, ...(meta.aliases ?? [])].forEach((value) => {
        registeredLabels.add(normalizeTag(value));
        registeredLabels.add(slugify(value).toLowerCase());
    });
}

for (const file of fs.readdirSync(contentDir).filter((name) => name.endsWith('.md'))) {
    const fullPath = path.join(contentDir, file);
    const frontmatter = readFrontmatter(fs.readFileSync(fullPath, 'utf8'));
    const tags = readTags(frontmatter);

    if (tags.length > 8) {
        errors.push({ file, message: `Too many tags: ${tags.length} > 8` });
    }

    const seen = new Set<string>();
    for (const tag of tags) {
        const normalized = normalizeTag(tag);
        const slug = slugify(tag).toLowerCase();
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);

        if (seen.has(normalized)) {
            errors.push({ file, message: `Duplicate tag: ${tag}` });
        }
        seen.add(normalized);

        if (weakTags.has(normalized)) {
            errors.push({ file, message: `Weak/category duplicate tag: ${tag}` });
        }

        if (!registeredLabels.has(normalized) && !registeredLabels.has(slug)) {
            const files = unregisteredTags.get(tag) ?? new Set<string>();
            files.add(file);
            unregisteredTags.set(tag, files);
        }
    }
}

if (unregisteredTags.size > 0) {
    warnings.push({
        message: `${unregisteredTags.size} unregistered tags: ${Array.from(
            unregisteredTags.keys(),
        )
            .sort((a, b) => a.localeCompare(b))
            .slice(0, 25)
            .join(', ')}${unregisteredTags.size > 25 ? ', ...' : ''}`,
    });
}

const singleUseTags = Array.from(tagCounts.entries())
    .filter(([, count]) => count === 1)
    .map(([tag]) => tag)
    .sort((a, b) => a.localeCompare(b));

if (singleUseTags.length > 0) {
    warnings.push({
        message: `${singleUseTags.length} single-use tags: ${singleUseTags.slice(0, 25).join(', ')}${singleUseTags.length > 25 ? ', ...' : ''}`,
    });
}

for (const warning of warnings) {
    console.warn(`${warning.file ? `${warning.file}: ` : ''}${warning.message}`);
}

for (const error of errors) {
    console.error(`${error.file ? `${error.file}: ` : ''}${error.message}`);
}

console.log(
    `Audited ${tagCounts.size} unique tags. ${warnings.length} warning(s), ${errors.length} error(s).`,
);

if (errors.length > 0) process.exit(1);
