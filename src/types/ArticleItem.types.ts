import { IGatsbyImageData } from 'gatsby-plugin-image';

export type ArticleFrontmatterType = {
  title: string;
  date: string;
  categories: string[];
  summary: string;
  thumbnail: {
    childImageSharp: {
      gatsbyImageData: IGatsbyImageData;
    };
    publicURL: string;
  };
};

export type ArticleListItemType = {
  node: {
    id: string;
    fields: {
      path: string;
      slug: string;
    };
    frontmatter: ArticleFrontmatterType;
  };
};

export type ArticlePageItemType = {
  node: {
    html: string;
    htmlAst: string;
    frontmatter: ArticleFrontmatterType;
  };
};
