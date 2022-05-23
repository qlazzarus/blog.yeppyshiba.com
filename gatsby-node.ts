import path from 'path';
import { paginate } from 'gatsby-awesome-pagination';
import Lodash from 'lodash';

const itemsPerPage = 10;
const shuffleLength = 3;

function shuffle(array, length) {
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

  if (newArray.length > length) {
    return newArray.splice(0, length);
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
        '@static': path.resolve('./static/'),
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

          const shuffled = shuffle(entries, shuffleLength);

          if (shuffled.length > 0) {
            return shuffled;
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
          next {
            id
            frontmatter {
              title
              date
              category
              image
              tags
            }
            slug
          }
          previous {
            id
            frontmatter {
              title
              date
              category
              image
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
    const { node: { slug, id }, next, previous } = post;
    const path = `/article/${slug}`;

    createPage({
      path,
      component: ArticleTemplate,
      context: { id, next, previous },
    });
  });

  // pagination generate function
  paginate({
    createPage,
    component: BlogTemplate,
    items,
    itemsPerPage,
    pathPrefix: `/page`,
  });

  // category
  categories.group.forEach((entry) => {
    const category = entry.fieldValue;
    const kebabCategory = Lodash.kebabCase(category);

    paginate({
      createPage,
      component: CategoryTemplate,
      items: items.filter((item) => item.node.fields.category && item.node.fields.category === kebabCategory),
      itemsPerPage,
      pathPrefix: `/category/${kebabCategory}`,
      context: {
        slug: category
      }
    });
  });  

  // tags 
  tags.group.forEach((entry) => {
    const tag = entry.fieldValue;
    const kebabTag = Lodash.kebabCase(tag);

    paginate({
      createPage,
      component: TagTemplate,
      items: items.filter((item) => item.node.fields.tags && item.node.fields.tags.includes(kebabTag)),
      itemsPerPage,
      pathPrefix: `/tag/${kebabTag}`,
      context: {
        slug: tag
      }
    });
  });
};
