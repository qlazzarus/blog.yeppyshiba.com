import path from 'path';
import type { GatsbyNode } from 'gatsby';
import { createFilePath } from 'gatsby-source-filesystem';
import Lodash from 'lodash';

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

// generate slug
export const onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;

  if (node.internal.type === 'Mdx' || node.internal.type === 'MarkdownRemark') {
    const pathname = node.frontmatter.pathname;
    const title = node.frontmatter.title;

    const slug = pathname
      ? pathname
          .replace(/(^\/)|(\/$)/g, '')
          .split('/')
          .map((a: string) => Lodash.kebabCase(a))
          .join('/')
      : title.replace(/（/g, '(').replace(/）/g, ')');

    createNodeField({ node, name: 'slug', value: `/article/${slug}` });
  }
};

// generate page
export const createPages = async ({ actions, graphql, reporter }) => {
  const { createPage } = actions;

  const result = await graphql(`
    {
      allMdx(sort: { order: DESC, fields: [frontmatter___date] }) {
        edges {
          node {
            id
            frontmatter {
              title
              date
              tags
            }
            fields {
              slug
            }
          }
        }
      }
    }
  `);

  // handling graphql query error
  if (result.errors) {
    reporter.panicOnBuild(`Error while running query`);
    return;
  }

  const posts = result.data.allMdx.edges;

  // Import post template component
  const PostTemplateComponent = path.resolve('./src/templates/PostTemplate.tsx');

  // page generate function
  // generate post page & passing slug props
  if (posts.length > 0) {
    posts.forEach((post) => {
      const path = post.node.fields.slug;
      const id = post.node.id;
      createPage({
        path,
        component: PostTemplateComponent,
        context: { id },
      });
    });
  }
};
