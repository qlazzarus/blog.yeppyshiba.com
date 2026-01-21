#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CONTENTS_DIR = path.join(__dirname, '..', 'contents');

const keywordMap = [
    ['astro', 'astro'],
    ['gatsby', 'gatsby'],
    ['nextjs', 'nextjs'],
    ['next.js', 'nextjs'],
    ['next', 'nextjs'],
    ['php', 'php'],
    ['laravel', 'laravel'],
    ['vue', 'vue'],
    ['docker', 'docker'],
    ['git', 'git'],
    ['jekyll', 'jekyll'],
    ['math', 'math'],
    ['수학', 'math'],
    ['phaser', 'phaser'],
    ['game', 'game-dev'],
    ['flutter', 'flutter'],
    ['mobx', 'mobx'],
    ['image drm', 'image-drm'],
    ['drm', 'image-drm'],
    ['ga', 'analytics'],
    ['google analytics', 'analytics'],
    ['svn', 'svn'],
    ['migration', 'migration'],
    ['deploy', 'deploy'],
    ['browser', 'browser'],
    ['php8', 'php'],
    ['raycasting', 'graphics'],
    ['parallax', 'graphics'],
];

function inferTagsFromText(text, filename) {
    const lowered = text.toLowerCase();
    const tags = new Set();

    // filename tokens
    filename.split(/[-_\.\s]+/).forEach((tok) => {
        const t = tok.toLowerCase();
        if (t.length > 1) tags.add(t);
    });

    for (const [kw, tag] of keywordMap) {
        if (lowered.includes(kw)) tags.add(tag);
    }

    return Array.from(tags).filter(Boolean);
}

function parseFrontmatter(content) {
    if (!content.startsWith('---')) return { fm: null, body: content };
    const parts = content.split(/\n---\n/);
    if (parts.length < 2) return { fm: null, body: content };
    const fmRaw = parts[0].replace(/^---\n?/, '');
    const body = parts.slice(1).join('\n---\n');
    return { fm: fmRaw, body };
}

function extractTagsFromFM(fmRaw) {
    if (!fmRaw) return [];
    const lines = fmRaw.split(/\n/);
    let inTagsBlock = false;
    const tags = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('tags:')) {
            const rest = line.slice(5).trim();
            if (rest.startsWith('[')) {
                // inline array
                const inside = rest.replace(/^\[|\]$/g, '');
                inside.split(',').forEach((x) => {
                    const v = x.trim().replace(/^['\"]|['\"]$/g, '');
                    if (v) tags.push(v);
                });
            } else if (rest === '') {
                // block list below
                inTagsBlock = true;
            } else {
                // single value
                tags.push(rest.replace(/^['\"]|['\"]$/g, ''));
            }
        } else if (inTagsBlock) {
            if (line.startsWith('-')) {
                const v = line.replace(/^-\s*/, '').replace(/^['\"]|['\"]$/g, '');
                if (v) tags.push(v);
            } else if (line === '') {
                continue;
            } else {
                break;
            }
        }
    }
    return tags;
}

function rebuildFrontmatter(fmRaw, mergedTags) {
    // Preserve other frontmatter lines, but replace or add tags: block
    const fmLines = fmRaw ? fmRaw.split(/\n/) : [];
    const out = [];
    let replaced = false;
    let i = 0;
    while (i < fmLines.length) {
        const line = fmLines[i];
        if (line.trim().startsWith('tags:')) {
            // skip existing tags block
            i++;
            const rest = line.trim().slice(5).trim();
            if (rest.startsWith('[')) {
                // single-line array, skip
                i; // nothing
            } else if (rest === '') {
                // skip following - lines
                while (i < fmLines.length && fmLines[i].trim().startsWith('-')) i++;
            }
            // insert new tags block
            out.push('tags:');
            mergedTags.forEach((t) => out.push(`  - ${t}`));
            replaced = true;
            continue;
        }
        out.push(line);
        i++;
    }
    if (!replaced) {
        // append tags
        out.push('tags:');
        mergedTags.forEach((t) => out.push(`  - ${t}`));
    }
    return out.join('\n');
}

function processFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    const existingTags = extractTagsFromFM(fm);
    const inferred = inferTagsFromText(body, path.basename(filePath, '.md'));
    const merged = Array.from(new Set([...existingTags, ...inferred]));
    merged.sort();

    const newFM = rebuildFrontmatter(fm || '', merged);
    const newContent = `---\n${newFM}\n---\n${body}`;
    if (newContent !== raw) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        return true;
    }
    return false;
}

function main() {
    const files = fs.readdirSync(CONTENTS_DIR).filter((f) => f.endsWith('.md'));
    const modified = [];
    for (const f of files) {
        const full = path.join(CONTENTS_DIR, f);
        try {
            const changed = processFile(full);
            if (changed) modified.push(f);
        } catch (err) {
            console.error('Error processing', f, err.message);
        }
    }
    console.log('Modified files:', modified.length ? modified.join(', ') : '(none)');
}

main();
