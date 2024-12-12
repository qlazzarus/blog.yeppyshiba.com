import React from 'react';
import { getAllPosts } from '@/libraries/PostManager';

const posts = await getAllPosts();

const TagCloud = () => {
    const clouds: Record<string, number> = {};

    posts.forEach((post) => {
        if (Array.isArray(post.tags)) {
            post.tags.forEach((tag) => {
                const lowerTag = tag.toLowerCase();
                clouds[lowerTag] = (clouds[lowerTag] || 0) + 1;
            });
        }
    });

    return (
        <div>
            <h1>태그 클라우드 데이터</h1>
            <ul>
                {Object.entries(clouds).map(([tag, count]) => (
                    <li key={tag}>
                        {tag}: {count}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TagCloud;
