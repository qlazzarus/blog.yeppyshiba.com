import path from 'path';
import type { GatsbyNode } from 'gatsby';
import { createFilePath } from 'gatsby-source-filesystem';

// import aliases
export const onCreateWebpackConfig = ({ getConfig, actions }) => {
    const output = getConfig().output || {};

    actions.setWebpackConfig({
        output,
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        }
    });
}

// generate slug
export const onCreateNode = ({ node, getNode, actions }) => {
    const { createNodeField } = actions;

    if (node.internal.type === 'MarkdownRemark') {
        const slug = createFilePath({ node, getNode });
        const path = `/article${slug}`;

        createNodeField({ node, name: 'slug', value: slug });
        createNodeField({ node, name: 'path', value: path });
    }
}

// generate page
export const createPages = async({ actions, graphql, reporter }) => {
    const { createPage } = actions;

    const queryAllMarkdownData = await graphql(`
        {
            allMarkdownRemark(
                sort: { 
                    order: DESC
                    fields: [frontmatter___date, frontmatter___title]
                }
            ) {
                edges {
                    node {
                        fields {
                            path
                            slug
                        }
                    }
                }
            }
        }
    `);

    // handling graphql query error
    if (queryAllMarkdownData.errors) {
        reporter.panicOnBuild(`Error while running query`);
        return;
    }

    // Import post template component
    const PostTemplateComponent = path.resolve('./src/templates/PostTemplate.tsx');

    // page generate function
    const generatePostPage = ({
        node: {
            fields: { path, slug },
        }
    }) => {
        createPage({
            path,
            component: PostTemplateComponent,
            context: { slug }
        });
    }

    // generate post page & passing slug props
    queryAllMarkdownData.data.allMarkdownRemark.edges.forEach(generatePostPage);
}