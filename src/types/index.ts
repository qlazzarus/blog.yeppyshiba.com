import { PaginationContext } from 'gatsby-awesome-pagination';
import { IGatsbyImageData } from 'gatsby-plugin-image';

export type ArticleFrontmatterType = {
  title: string;
  date?: string;
  image?: string;
  embeddedImagesLocal?: {
    childImageSharp: {
      gatsbyImageData: IGatsbyImageData
    }
  }
  category?: string;
  tags?: string[];
  summary?: string;
};

export type ArticleMdxType = {
  id: string;
  fields?: {
    totalCount: number
  }
  body: string;
  frontmatter: ArticleFrontmatterType;
};

export type ArticleListItemsType = {
  node: ArticleListItemType
}
  
export type ArticleListItemType = {
  id: string;
  fields: {
    totalCount: number;
    slug: string;
  }
  frontmatter: ArticleFrontmatterType;
};

export type GroupCountType = {
  fieldValue: string;
  totalCount: number;
};

export type GraphqlErrorType = {
  locations: GraphqlErrorLocationType[],
  message: string
};

export type GraphqlErrorLocationType = {
  column: number;
  line: number;
};

export interface CustomPaginationContext extends PaginationContext {
  slug?: string
}

export type ListTemplateProps = {
  errors?: GraphqlErrorType[],
  data?: {
    site: {
      siteMetadata: {
        title: string;
        description: string;
        siteUrl: string;
      };
    };
    allMdx: { 
      edges: ArticleListItemsType[] 
    };
  };
  pageContext: CustomPaginationContext;
};