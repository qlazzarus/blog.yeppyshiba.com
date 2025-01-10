'use client';

import components from '@/components';
import { Box, Container } from '@mui/material';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import React from 'react';

import { PostData } from '@/libraries/PostManager';

const ArticleContainer = ({ post }: { post: PostData }) => {
    const source = post.source as MDXRemoteSerializeResult;
    return (
        <Container maxWidth='xl'>
            <Box py={4}>
                <MDXRemote {...source} components={components} />
            </Box>
        </Container>
    );
};

export default ArticleContainer;
