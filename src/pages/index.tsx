import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { CategoryCloud, Header, Layout, StoryHeader, TagCloud } from '@/components/common';
import { ArticleList } from '@/components/article';
import { ArticleListItemType, GroupCountType } from '@/types';

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
    categories: {
      group: GroupCountType[];
    };
    tags: {
      group: GroupCountType[];
    };
  };
};

// markup
const IndexPage: FunctionComponent<IndexPageProps> = ({
  data: {
    site: { siteMetadata },
    featured,
    categories,
    tags,
  },
}) => {
  const { title } = siteMetadata;

  return (
    <Layout title={title}>
      <Header title={title} />
      <StoryHeader title={'Featured'} />
      <ArticleList entries={featured} />
      <StoryHeader title={'Category'} />
      <CategoryCloud categories={categories.group} />
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
      slug
      id
      frontmatter {
        tags
        title
        summary
        image
        date
        category
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
