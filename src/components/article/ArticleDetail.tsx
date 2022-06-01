import React, { FunctionComponent } from 'react';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import { Container } from '@chakra-ui/react';
import { CustomProvider } from '@/components/markdown';
import { ArticleMdxType } from '@/types';

type ArticleDetailProps = {
  data: {
    mdx: ArticleMdxType
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
