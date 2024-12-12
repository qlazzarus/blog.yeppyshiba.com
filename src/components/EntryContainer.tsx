import React from 'react';
import Link from 'next/link';
import { PostData } from '@/libraries/PostManager';

const EntryContainer = ({ entries }: { entries: PostData[] }) => {
    return (
        <ul>
            {entries.map((entry) => (
                <li key={entry.slug}>
                    <Link href={`/article/${entry.slug}`}>{entry.title}</Link>
                </li>
            ))}
        </ul>
    );
};

export default EntryContainer;
