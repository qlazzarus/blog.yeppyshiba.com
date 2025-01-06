import { PostData } from '@/libraries/PostManager'
import { Container } from '@mui/material'
import React from 'react'

const ArticleContainer = ({ post }: { post: PostData }) => {
    return (
        <Container maxWidth="xl">
            {post.content}
        </Container>
    )
}

export default ArticleContainer