import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { IGatsbyImageData } from 'gatsby-plugin-image';
import { ArticleList } from '@/components/article';
import { Layout } from '@/components/common';
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
    allMarkdownRemark: {
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
    site: {
      siteMetadata: { title, description, siteUrl },
    },
    allMarkdownRemark: { edges },
    /*
    file: {
      publicURL
    }
    */
  },
}) => {
  return (
    <Layout title={title}>
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
    allMarkdownRemark(sort: { order: DESC, fields: [frontmatter___date, frontmatter___title] }) {
      edges {
        node {
          id
          fields {
            slug
            path
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
/*
export const getPostList = graphql`
  query getPostList {
    site {
      siteMetadata {
        title
        description
        siteUrl
      }
    }
    allMarkdownRemark(
      sort: { 
        order: DESC,
        fields: [frontmatter___date, frontmatter___title]
      }
    ) {
      edges {
        node {
          id
          fields {
            slug
          }
          frontmatter {
            title
            summary
            date
            categories
            thumbnail {
              childImageSharp {
                gatsbyImageData(width: 768, height: 400)
              }
            }
          }
        }
      }
    }
  }
`
*/
