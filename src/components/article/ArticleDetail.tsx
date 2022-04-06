import React, { FunctionComponent } from 'react';
import { Helmet } from 'react-helmet';
import { Box, Container, Heading, HStack, Text } from '@chakra-ui/react';
import { RenderHtml } from '@/components/common';
import { ArticlePageItemType } from '@/types';

interface ArticleDetailProps {
  data: {
    allMarkdownRemark: {
      edges: ArticlePageItemType[];
    };
  };
}

const ArticleDetail: FunctionComponent<ArticleDetailProps> = ({
  data: {
    allMarkdownRemark: { edges },
  },
  //location: { href }
}) => {
  const {
    node: {
      htmlAst,
      frontmatter: {
        title,
        summary,
        date,
        categories,
        /*
            thumbnail: {
                childImageSharp: { gatsbyImageData },
                publicURL
            },
            */
      },
    },
  } = edges[0];

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
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
            <RenderHtml htmlAst={htmlAst} />
            <HStack marginTop="2" spacing="2" display="flex" alignItems="center">
              <Text>{date}</Text>
            </HStack>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default ArticleDetail;
