import { Container } from '@mui/material';
import { MDXRemote } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import React from 'react';

import { PostData } from '@/libraries/PostManager';

const ArticleContainer = ({ post }: { post: PostData }) => {
    return <Container maxWidth='xl'>{post.content}</Container>;
};

export default ArticleContainer;
