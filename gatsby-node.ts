import path from 'path';
import { paginate } from 'gatsby-awesome-pagination';
import Lodash from 'lodash';

const itemsPerPage = 10;

function shuffle(array) {
  const newArray = [...array];
  let m = newArray.length;
  let t;
  let i;

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = newArray[m];
    newArray[m] = newArray[i];
    newArray[i] = t;
  }

  return newArray;
}

// import aliases
export const onCreateWebpackConfig = ({ getConfig, actions }) => {
  const output = getConfig().output || {};

  actions.setWebpackConfig({
    output,
    resolve: {
      alias: {
        '@': path.resolve('./src/'),
      },
    },
  });
};

// generate graphql custom resolvers
export const createResolvers = ({ createResolvers }) => {
  createResolvers({
    Query: {
      randomMdx: {
        type: ["Mdx!"],
        resolve: async (source, args, context) => {
          const { entries } = await context.nodeModel.findAll({
            type: 'Mdx',
          });

          const shuffled = shuffle(entries);

          if (shuffled.length > 0) {
            return [shuffled[0]];
          } else {
            return [];
          }
        }
      }
    }
  });
}

// generate category / tags slug 
export const onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;

  if (node.internal.type === 'Mdx' || node.internal.type === 'MarkdownRemark') {
    const { category, tags } = node.frontmatter;
    
    if (category) {
      createNodeField({ node, name: 'category', value: Lodash.kebabCase(category) });
    }

    if (tags) {
      const queue = Array.isArray(tags) ? tags : [tags];
      createNodeField({ node, name: 'tags', value: queue.map(entry => Lodash.kebabCase(entry))});
    }
  }
};

// generate page
export const createPages = async ({ actions, graphql, reporter }) => {
  const { createPage } = actions;

  const ArticleTemplate = path.resolve('./src/templates/ArticleTemplate.tsx');
  const BlogTemplate = path.resolve('./src/templates/BlogTemplate.tsx');
  const CategoryTemplate = path.resolve('./src/templates/CategoryTemplate.tsx');
  const TagTemplate = path.resolve('./src/templates/TagTemplate.tsx'); 

  const result = await graphql(`
    {
      allMdx(sort: { order: DESC, fields: [frontmatter___date] }) {
        edges {
          node {
            id
            fields {
              category
              tags
            }
            frontmatter {
              title
              date
              category
              tags
            }
            slug
          }
        }
      }
      categories: allMdx {
        group(field: frontmatter___category) {
          fieldValue
        }
      }
      tags: allMdx {
        group(field: frontmatter___tags) {
          fieldValue
        }
      }
    }
  `);

  // handling graphql query error
  if (result.errors) {
    reporter.panicOnBuild(`Error while running query`);
    return;
  }

  const { allMdx, categories, tags } = result.data;
  const items = allMdx.edges;
  
  items.forEach((post) => {
    const { slug, id } = post.node;
    const path = `/article/${slug}`;

    createPage({
      path,
      component: ArticleTemplate,
      context: { id },
    });
  });

  // pagination generate function
  paginate({
    createPage,
    items,
    itemsPerPage,
    pathPrefix: `/page`,
    component: BlogTemplate
  });

  // category
  categories.group.forEach((entry) => {
    const category = entry.fieldValue;
    const kebabCategory = Lodash.kebabCase(category);
    
    paginate({
      createPage,
      items: items.filter((item) => item.node.fields.category === kebabCategory),
      itemsPerPage,
      pathPrefix: `/category/${kebabCategory}`,
      component: CategoryTemplate
    });
  });  

  // tags 
  tags.group.forEach((entry) => {
    const tag = entry.fieldValue;
    const kebabTag = Lodash.kebabCase(tag);

    paginate({
      createPage,
      items: items.filter((item) => item.node.fields.tags.includes(kebabTag)),
      itemsPerPage,
      pathPrefix: `/tag/${kebabTag}`,
      component: TagTemplate
    });
  });
};
