import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { IGatsbyImageData } from 'gatsby-plugin-image';
import { ArticleList } from '@/components/article';
import { Header, Layout } from '@/components/common';
import { ArticleListItemType } from '@/types';

type IndexPageProps = {
  location: {
    search: string;
  };
  data: {
    site: {
      siteMetadata: {
        title: string;
        description: string;
        siteUrl: string;
      };
    };
    allMdx: {
      edges: ArticleListItemType[];
    };
    file: {
      childImageSharp: {
        gatsbyImageData: IGatsbyImageData;
      };
      publicURL: string;
    };
  };
};

// markup
const IndexPage: FunctionComponent<IndexPageProps> = ({
  location: { search },
  data: {
    site: { siteMetadata },
    allMdx: { edges },
    /*
    file: {
      publicURL
    }
    */
  },
}) => {
  const { title } = siteMetadata;

  return (
    <Layout title={title}>
      <Header title={title} />
      <ArticleList entries={edges} />
    </Layout>
  );
};

export default IndexPage;

export const getPostList = graphql`
  query getPostList {
    site {
      siteMetadata {
        title
        description
        siteUrl
      }
    }
    allMdx(sort: { order: DESC, fields: [frontmatter___date] }) {
      edges {
        node {
          id
          fields {
            slug
          }
          frontmatter {
            title
            date
          }
        }
      }
    }
  }
`;