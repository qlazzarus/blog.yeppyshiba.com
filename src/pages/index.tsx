import React, { FunctionComponent } from 'react';
import { graphql, Link as GatsbyLink } from 'gatsby';
import { Box, Button, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { Header, Layout } from '@/components/common';
import { ArticleList } from '@/components/article';
import { ArticleListItemType, GroupCountType } from '@/types';

type IndexPageProps = {
  data: {
    site: {
      siteMetadata: {
        title: string;
        description: string;
        siteUrl: string;
      };
    };
    featured: ArticleListItemType[];
    categories: {
      group: GroupCountType[]
    };
    tags: {
      group: GroupCountType[]
    };
  };
};

// markup
const IndexPage: FunctionComponent<IndexPageProps> = ({
  data: {
    site: { siteMetadata },
    featured,
    categories,
    tags
  },
}) => {
  const { title } = siteMetadata;

  return (
    <Layout title={title}>
      <Header title={title} />
      <Container
        maxW={'7xl'}>
        <Stack
          as={Box}
          textAlign={'center'}
          spacing={{ base: 8, md: 14 }} 
          pt={{ base: 20, md: 36 }}
        >
          <Heading
            fontWeight={600}
            fontSize={{ base: '2xl', sm: '4xl', md: '6xl' }}
            lineHeight={'110%'}>
            Featured <br />
            <Text as={'span'} color={'green.400'}>
              Stories
            </Text>
          </Heading>
        </Stack>
        <ArticleList entries={featured} />
      </Container>
    </Layout>
  );
};

export default IndexPage;

export const getIndex = graphql`
  query getIndex {
    site {
      siteMetadata {
        title
        description
        siteUrl
      }
    }
    featured: randomMdx {
      slug
      id
      frontmatter {
        tags
        title
        summary
        image
        date
        category
      }
    }
    categories: allMdx {
      group(field: frontmatter___category) {
        fieldValue
        totalCount
      }
    }
    tags: allMdx {
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
    }    
  }
`;
