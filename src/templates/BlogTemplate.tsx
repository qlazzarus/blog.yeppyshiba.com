import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { ArticleList } from '@/components/article';
import { Header, Layout, Pagination, StoryHeader } from '@/components/common';
import { ListTemplateProps } from '@/types';

// markup
const BlogTemplate: FunctionComponent<ListTemplateProps> = ({
  errors,
  data,
  pageContext
}) => {
  if (errors || !data) {
    // error handles
    console.log(errors);
    return (<>TODO errors</>);
  }

  const { site: { siteMetadata: { title } }, allMdx: { edges } } = data;
  const entries = edges.map(edge => edge.node);

  return (
    <Layout title={'All Stories'}>
      <Header title={title} />
      <StoryHeader title={`All`} />
      <ArticleList entries={entries} />
      <Pagination {...pageContext} prefix={'/page/'} prev={'Newer'} next={'Older'} />
    </Layout>
  );
};

export default BlogTemplate;

export const getBlogList = graphql`
  query getBlogList($skip: Int!, $limit: Int!) {
    site {
      siteMetadata {
        title
        description
        siteUrl
      }
    }
    allMdx(
      sort: { order: DESC, fields: [frontmatter___date] }
      limit: $limit
      skip: $skip
    ) {
      edges {
        node {
          id
          fields {
            totalCount
          }
          frontmatter {
            title
            date
            image
            embeddedImagesLocal {
              childImageSharp {
                gatsbyImageData
              }
            }
            category
            tags
            summary
          }
          slug
        }
      }
    }
  }
`;
