import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { ArticleHeader, ArticleDetail } from '@/components/article';
import { Layout } from '@/components/common';

type PostTemplateProps = {
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
};

const PostTemplate: FunctionComponent<PostTemplateProps> = function ({ data }) {
  const {
    mdx: {
      frontmatter: { title, image, summary, category, date, tags },
    },
  } = data;

  return (
    <Layout title={title} description={summary} keywords={tags}>
      <ArticleHeader 
        title={title} 
        image={image}
        category={category}
        date={date}
        tags={tags} 
      />
      <ArticleDetail data={data} />
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
