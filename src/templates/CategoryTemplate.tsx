import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { ArticleList } from '@/components/article';
import { Header, Layout, Pagination, StoryHeader } from '@/components/common';
import { ListTemplateProps } from '@/types';
import { capitalize } from 'lodash';
import { slugify } from 'transliteration';

const allowedChars = 'a-zA-Z0-9';

// markup
const CategoryTemplate: FunctionComponent<ListTemplateProps> = ({ errors, data, pageContext, ...props }) => {
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
    <Layout title={`${capitalize(slug)} Category Stories`}>
      <Header title={title} />
      <StoryHeader title={`${capitalize(slug)} Category`} />
      <ArticleList entries={entries} />
      <Pagination {...pageContext} prefix={`/category/${slugify(slug || '', { allowedChars })}/`} prev={'Newer'} next={'Older'} />
    </Layout>
  );
};

export default CategoryTemplate;

export const getCategoryList = graphql`
  query getCategoryList($slug: String, $skip: Int!, $limit: Int!) {
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
      filter: { frontmatter: { category: { eq: $slug } } }
    ) {
      edges {
        node {
          id
          fields {
            totalCount
            slug
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
        }
      }
    }
  }
`;
