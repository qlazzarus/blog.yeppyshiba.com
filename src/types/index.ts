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
  roadAddress?: string;
  parcelAddress?: string;
};

export type ArticleFieldType = {
  totalCount: number;
  slug: string;
  category?: string;
  tags?: string[];
  geolocation?: {
    id: string,
    crs: string,    
    point: {
      x: number,
      y: number
    }
  }  
}

export type ArticleMdxType = {
  id: string;
  fields: ArticleFieldType;
  body: string;
  frontmatter: ArticleFrontmatterType;
};

export type ArticleListItemsType = {
  node: ArticleListItemType
}
  
export type ArticleListItemType = {
  id: string;
  fields: ArticleFieldType;
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