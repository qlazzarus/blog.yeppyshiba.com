import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { ArticleDetail } from '@/components/article';
import { Layout } from '@/components/common';
import { ArticlePageItemType } from '@/types';

type PostTemplateProps = {
  data: {
    allMarkdownRemark: {
      edges: ArticlePageItemType[];
    };
  };
  location: {
    href: string;
  };
};

const PostTemplate: FunctionComponent<PostTemplateProps> = function ({ data }) {
  return (
    <Layout>
      <ArticleDetail data={data} />
    </Layout>
  );
};

export default PostTemplate;

export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($slug: String) {
    allMarkdownRemark(filter: { fields: { slug: { eq: $slug } } }) {
      edges {
        node {
          htmlAst
          frontmatter {
            title
            summary
            date
          }
        }
      }
    }
  }
`;
/*
export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($slug: String) {
    allMarkdownRemark(filter: { fields: { slug: { eq: $slug } } }) {
      edges {
        node {
          html
          frontmatter {
            title
            summary
            date
            categories
            thumbnail {
              childImageSharp {
                gatsbyImageData
              }
              publicURL
            }
          }
        }
      }
    }
  }
`
*/
