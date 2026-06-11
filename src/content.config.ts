import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    loader: glob({ base: './contents', pattern: '**/*.{md,mdx}' }),
    // Type-check frontmatter using a schema
    schema: () =>
        z.object({
            title: z.string(),
            date: z.coerce.date(),
            category: z.enum([
                'review',
                'coding',
                'essay',
                'math',
                'aviation',
                'finance',
                'ride',
            ]),
            summary: z.string(),
            // optional tags array
            tags: z.array(z.union([z.number(), z.string()])).optional(),
            // image: either an absolute http(s) URL or a local path (starting with '/')
            image: z
                .union([
                    z.string().url(), // https://...
                    z.string().startsWith('/images/'), // /images/...
                ])
                .optional(),
            // optional parcel/shipping info
            parcelAddress: z.string().optional(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            gpxUrl: z.string().startsWith('/gpx/').optional(),
            mediaManifestUrl: z.string().startsWith('/rides/').optional(),
            coverCredit: z.string().optional(),
            coverLicense: z.string().optional(),
            coverSource: z.string().url().optional(),
            roadviewUpdateIntervalMs: z.number().optional(),
        }),
});

export const collections = { blog };
