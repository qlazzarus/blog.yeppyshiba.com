import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { Header, Layout, StoryHeader, TagCloud } from '@/components/common';
import { ArticleList } from '@/components/article';
import { ArticleListItemsType, ArticleListItemType, GroupCountType } from '@/types';
import { capitalize } from 'lodash';

const categories = ['coding', 'review', 'project'];

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
    codingCategory: {
      edges: ArticleListItemsType[];
    };
    reviewCategory: {
      edges: ArticleListItemsType[];
    };
    projectCategory: {
      edges: ArticleListItemsType[];
    };
    tags: {
      group: GroupCountType[];
    };
  };
};

interface CategorySectionProps extends IndexPageProps {
  category: string;
}

const categoryData = (category: string, data: any) => {
  switch (category) {
    case 'coding':
      return data.codingCategory;
    case 'review':
      return data.reviewCategory;
    case 'project':
      return data.projectCategory;
    default:
      return null;
  }
};

const CategorySection: FunctionComponent<CategorySectionProps> = ({ category, data }) => {
  const entries = categoryData(category, data);
  if (!entries || !entries.edges || !entries.edges.length) {
    return <></>;
  }

  const updateEntries = entries.edges.map((edge: { node: any; }) => edge.node);

  return (
    <>
      <StoryHeader title={`Recent ${capitalize(category)}`} />
      <ArticleList entries={updateEntries} />
    </>
  )
};

const IndexPage: FunctionComponent<IndexPageProps> = ({ data }) => {
  const {
    site: {
      siteMetadata: { title },
    },
    featured,
    tags,
  } = data;

  return (
    <Layout>
      <Header title={title} />
      <StoryHeader title={'Featured'} />
      <ArticleList entries={featured} />
      {categories.map((category) => (
        <CategorySection key={category} category={category} data={data} />
      ))}
      <StoryHeader title={'Tag'} />
      <TagCloud tags={tags.group} />
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
      id
      fields {
        totalCount
        slug
      }
      frontmatter {
        tags
        title
        summary
        image
        embeddedImagesLocal {
          childImageSharp {
            gatsbyImageData
          }
        }
        date
        category
      }
    }
    codingCategory: allMdx(
      filter: { frontmatter: { category: { eq: "coding" } } }
      limit: 3
      sort: { fields: frontmatter___date, order: DESC }
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
    reviewCategory: allMdx(
      filter: { frontmatter: { category: { eq: "review" } } }
      limit: 3
      sort: { fields: frontmatter___date, order: DESC }
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
    projectCategory: allMdx(
      filter: { frontmatter: { category: { eq: "project" } } }
      limit: 3
      sort: { fields: frontmatter___date, order: DESC }
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
    tags: allMdx {
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
    }
  }
`;
