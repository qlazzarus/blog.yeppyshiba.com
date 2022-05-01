import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { ArticleList } from '@/components/article';
import { Header, Layout, Pagination } from '@/components/common';
import { ListTemplateProps } from '@/types';

// markup
const TagTemplate: FunctionComponent<ListTemplateProps> = ({
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

  return (
    <Layout title={title}>
      <Header title={title} />
      <ArticleList entries={edges} />
      <Pagination {...pageContext} prefix={'/page/'} prev={'Newer'} next={'Older'} />
    </Layout>
  );
};

export default TagTemplate;

export const getTagList = graphql`
  query getTagList($skip: Int!, $limit: Int!) {
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
          frontmatter {
            title
            date
            image
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
