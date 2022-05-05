import React, { FunctionComponent } from 'react';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import { Box, Container, Heading, HStack, Text } from '@chakra-ui/react';
import { CustomProvider } from '@/components/markdown';

type ArticleDetailProps = {
  data: {
    mdx: {
      id: string;
      body: string;
      frontmatter: {
        date: string;
        image: string;
        summary: string;
        tags: string[];
        title: string;
      };
    };
  };
};

const ArticleDetail: FunctionComponent<ArticleDetailProps> = ({ data: { mdx: { body } } }) => {
  return (
    <Container maxW={'7xl'} p="12">
      <Box
        marginTop={{ base: '1', sm: '5' }}
        display="flex"
        flexDirection={{ base: 'column', sm: 'row' }}
        justifyContent="space-between"
      >
        <Box
          display="flex"
          flex="1"
          flexDirection="column"
          justifyContent="center"
          marginTop={{ base: '3', sm: '0' }}
        >
          <CustomProvider>
            <MDXRenderer>{body}</MDXRenderer>
          </CustomProvider>
        </Box>
      </Box>
    </Container>
  );
};

export default ArticleDetail;
