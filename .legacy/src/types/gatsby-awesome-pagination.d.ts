declare module "gatsby-awesome-pagination" {
    import type { Actions } from "gatsby";
  
    type PaginateArgs = {
      createPage: Actions[`createPage`];
      items: unknown[];
      itemsPerPage: number;
      itemsPerFirstPage?: number;
      pathPrefix: string;
      component: string;
      context?: unknown;
    };
  
    export const paginate: (args: PaginateArgs) => void;
  
    export type PaginationContext = {
      humanPageNumber: number;
      pageNumber: number;
      numberOfPages: number;
      previousPagePath: string;
      nextPagePath: string;
    };
  }