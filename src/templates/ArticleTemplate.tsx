import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { PaginationContext } from 'gatsby-awesome-pagination';
import { ArticleDetail, ArticleHeader, ArticleList } from '@/components/article';
import { Layout, StoryHeader } from '@/components/common';
import { ArticleListItemType } from '@/types';

interface CustomPaginationContext extends PaginationContext {
  next: ArticleListItemType | null;
  previous: ArticleListItemType | null;
}

interface PostTemplateProps {
  data: {
    mdx: {
      id: string;
      body: string;
      frontmatter: {
        date: string;
        image: string;
        category: string;
        summary: string;
        tags: string[];
        title: string;
      };
    };
  };
  pageContext: CustomPaginationContext;
}

const PostTemplate: FunctionComponent<PostTemplateProps> = function ({ data, pageContext }) {
  const {
    mdx: {
      frontmatter: { title, image, summary, category, date, tags },
    },
  } = data;

  const { next, previous } = pageContext;
  const entries = [];
  if (previous) entries.push(previous);
  if (next) entries.push(next);

  return (
    <Layout title={title} image={image} description={summary} category={category} date={date} keywords={tags} >
      <ArticleHeader title={title} image={image} category={category} date={date} tags={tags} />
      <ArticleDetail data={data} />
      {entries.length > 0 && (
        <>
          <StoryHeader title={`Relate`} />
          <ArticleList entries={entries} />
        </>
      )}
    </Layout>
  );
};

export default PostTemplate;

export const queryMarkdownDataBySlug = graphql`
  query getBlogEntry($id: String) {
    mdx(id: { eq: $id }) {
      id
      body
      frontmatter {
        title
        date
        image
        category
        tags
        summary
      }
    }
  }
`;
