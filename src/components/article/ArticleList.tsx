import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import { Box, Container, Heading, Link } from '@chakra-ui/react';
import { ArticleListItemType } from '@/types';

interface ArticleListProps {
    entries: ArticleListItemType[]
}

interface ArticleEntryProps {
    entry: ArticleListItemType
}

const ArticleEntry: FunctionComponent<ArticleEntryProps> = ({ entry }) => {
    const { node: { fields: { path }, frontmatter: { title } } } = entry;

    return (
        <Box
            marginTop={{ base: '1', sm: '5' }}
            display="flex"
            flexDirection={{ base: 'column', sm: 'row' }}
            justifyContent="space-between">
            <Box
                display="flex"
                flex="1"
                flexDirection="column"
                justifyContent="center"
                marginTop={{ base: '3', sm: '0' }}>
                <Heading marginTop="1">
                    <Link as={GatsbyLink} to={path} textDecoration="none" _hover={{ textDecoration: 'none' }}>
                        {title}
                    </Link>
                </Heading>
            </Box>
        </Box>
    )
}

const ArticleList: FunctionComponent<ArticleListProps> = ({ entries }) => {
    return (
        <Container maxW={'7xl'} p='12'>
            {entries.map((entry) => <ArticleEntry entry={entry} key={entry.node.id} />)}
        </Container>
    )
}

export default ArticleList;
