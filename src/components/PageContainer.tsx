import { Container } from '@mui/material';
import React from 'react';

import { PostData } from '@/libraries/PostManager';

import EntryContainer from './EntryContainer';
import PaginationContainer from './PaginationContainer';

const POSTS_PER_PAGE = 12;

const PageContainer = ({
    page,
    posts,
    linkPrefix,
}: {
    page: number;
    posts: PostData[];
    linkPrefix: string;
}) => {
    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const entries = posts.slice(startIndex, endIndex);
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

    return (
        <Container maxWidth='lg'>
            <EntryContainer entries={entries} />
            <PaginationContainer page={page} linkPrefix={linkPrefix} totalPages={totalPages} />
        </Container>
    );
};

export default PageContainer;
