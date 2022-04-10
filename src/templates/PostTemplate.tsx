import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { ArticleDetail } from '@/components/article';
import { Header, Layout } from '@/components/common';
import { ArticlePageItemType } from '@/types';

type PostTemplateProps = {
  data: {
    mdx: {
      id: string
      mdxAST: string,
      frontmatter: { 
        date: string
        image: string
        summary: string
        tags: string[]
        title: string
      },
    };
  }
};

const PostTemplate: FunctionComponent<PostTemplateProps> = function ({ data }) {
  const { mdx: { frontmatter: { title, image } } } = data;
  console.log(data);

  return (
    <Layout>
      <Header title={title} image={image} />
      {/*<ArticleDetail data={data} />*/}
    </Layout>
  );
};

export default PostTemplate;

export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($id: String) {
    mdx(id: { eq: $id }) {
      id
      mdxAST
      frontmatter {
        date
        image
        summary
        tags
        title
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
