import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { ArticleList } from '@/components/article';
import { Header, Layout, Pagination, StoryHeader } from '@/components/common';
import { ListTemplateProps } from '@/types';
import { kebabCase } from 'lodash';

// markup
const TagTemplate: FunctionComponent<ListTemplateProps> = ({ errors, data, pageContext }) => {
  if (errors || !data) {
    // error handles
    console.log(errors);
    return <>TODO errors</>;
  }

  const {
    site: {
      siteMetadata: { title },
    },
    allMdx: { edges },
  } = data;
  const { slug } = pageContext;
  const entries = edges.map((edge) => edge.node);

  return (
    <Layout title={`${slug} Tag Stories`}>
      <Header title={title} />
      <StoryHeader title={`${slug} Tag`} />
      <ArticleList entries={entries} />
      <Pagination {...pageContext} prefix={`/tag/${kebabCase(slug)}/`} prev={'Newer'} next={'Older'} />
    </Layout>
  );
};

export default TagTemplate;

export const getTagList = graphql`
  query getTagList($slug: [String], $skip: Int!, $limit: Int!) {
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
      filter: { frontmatter: { tags: { in: $slug } } }
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
