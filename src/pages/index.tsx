import React, { FunctionComponent } from 'react';
import { graphql, Link } from 'gatsby';
import { Header, Layout } from '@/components/common';
import { GroupCountType } from '@/types';

type IndexPageProps = {
  data: {
    site: {
      siteMetadata: {
        title: string;
        description: string;
        siteUrl: string;
      };
    };
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
    categories,
    tags
  },
}) => {
  const { title } = siteMetadata;

  console.log({
    categories,
    tags
  });

  return (
    <Layout title={title}>
      <Header title={title} />
      <Link to={`/page`}>into the Blog</Link>
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
