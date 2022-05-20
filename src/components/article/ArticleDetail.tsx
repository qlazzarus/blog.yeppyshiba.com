import React, { FunctionComponent } from 'react';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import { Container } from '@chakra-ui/react';
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

const ArticleDetail: FunctionComponent<ArticleDetailProps> = ({
  data: {
    mdx: { body },
  },
}) => {
  return (
    <Container maxW={'7xl'} p={'12'}>
      <CustomProvider>
        <MDXRenderer>{body}</MDXRenderer>
      </CustomProvider>
    </Container>
  );
};

export default ArticleDetail;
