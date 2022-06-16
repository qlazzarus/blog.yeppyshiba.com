import 'dotenv/config';
import path from 'path';
import crypto from 'crypto';
import { paginate } from 'gatsby-awesome-pagination';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import GeoUtil from './src/utils/GeoUtil';
import StringUtil from './src/utils/StringUtil';

const itemsPerPage = 10;
const shuffleLength = 3;
const articlePrefix = '/article';

const shuffle = (array, length) => {
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
};

const getViewCount = async () => {
  let analyticsResult: any[] = [];
  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: JSON.parse(process.env.ANALYTICS_CREDENTIALS || '{}'),
    });

    analyticsResult = await analyticsDataClient.runReport({
      property: `properties/${process.env.ANALYTICS_PROPERTY_ID || ''}`,
      dateRanges: [{ startDate: '2022-05-30', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'BEGINS_WITH',
            value: `${articlePrefix}/`,
          },
        },
      },
    });
  } catch (error) {
    console.log('-> google analytics api call failed!!');
    console.error(error);
  }

  // analytics data arrange
  return (
    analyticsResult
      .filter((item: any) => item !== null && item.rows)
      .map((item: any) => {
        return item.rows.map((row: any) => {
          return {
            path: row.dimensionValues[0].value,
            totalCount: row.metricValues[0].value,
          };
        });
      })[0] || []
  );
};

// import aliases
export const onCreateWebpackConfig = ({ stage, loaders, getConfig, actions }) => {
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

  if (stage === 'build-html') {
    actions.setWebpackConfig({
      module: {
          rules: [
          {
            test: /bad-module/,
            use: loaders.null(),
          },
         ],
      },
    });
  }
};

export const onPluginInit = async ({ cache }) => {
  await cache.set('viewCount', await getViewCount());
};

// generate graphql custom resolvers
export const createResolvers = async ({ createResolvers }) => {
  createResolvers({
    Query: {
      randomMdx: {
        type: ['Mdx!'],
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
        },
      },
    },
  });
};

// generate category / tags slug
export const onCreateNode = async ({ node, getNode, actions, cache }) => {
  const viewCount = await cache.get('viewCount');
  const { createNodeField } = actions;

  if (node.internal.type === 'Mdx' || node.internal.type === 'MarkdownRemark') {
    const { category, tags, parcelAddress, roadAddress } = node.frontmatter;

    // slug
    const { fileAbsolutePath } = node;
    const fileName = path.basename(fileAbsolutePath, '.md');
    const slug = StringUtil.slugify(fileName);
    const itemPath = `${articlePrefix}/${slug}/`;
    createNodeField({ node, name: 'slug', value: slug });

    // count
    const totalCount = (viewCount.filter((item: any) => item.path === itemPath)[0] || { totalCount: 0 }).totalCount;
    createNodeField({ node, name: 'totalCount', value: parseInt(totalCount) });

    // category
    if (category) {
      createNodeField({ node, name: 'category', value: StringUtil.slugify(category) });
    }

    // tags
    if (tags) {
      const queue = Array.isArray(tags) ? tags : [tags];
      createNodeField({ node, name: 'tags', value: queue.map((entry) => StringUtil.slugify(entry)) });
    }

    // address
    if (parcelAddress || roadAddress) {
      const address = parcelAddress || roadAddress;
      const type = (parcelAddress && 'parcel') || 'road';

      const geolocation = await GeoUtil.geolocation(address, type).then((data: any) => {
        if (data) {
          const { crs, point: { x, y } } = data;
          const id = crypto.createHash('sha512').update(crs + x + y).digest('hex');
          data.id = id;
        }

        return data;
      });

      createNodeField({ node, name: 'geolocation', value: geolocation });
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
              slug
            }
            frontmatter {
              title
              date
              category
              tags
            }
          }
          next {
            id
            fields {
              totalCount
              slug
            }
            frontmatter {
              title
              date
              category
              image
              tags
              summary
            }
          }
          previous {
            id
            fields {
              totalCount
              slug
            }
            frontmatter {
              title
              date
              category
              image
              tags
              summary
            }
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
    const {
      node: {
        id,
        fields: { slug },
      },
      next,
      previous,
    } = post;
    const path = `${articlePrefix}/${slug}`;

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
    const kebabCategory = StringUtil.slugify(category);

    paginate({
      createPage,
      component: CategoryTemplate,
      items: items.filter((item) => item.node.fields.category && item.node.fields.category === kebabCategory),
      itemsPerPage,
      pathPrefix: `/category/${kebabCategory}`,
      context: {
        slug: category,
      },
    });
  });

  // tags
  tags.group.forEach((entry) => {
    const tag = entry.fieldValue;
    const kebabTag = StringUtil.slugify(tag);

    paginate({
      createPage,
      component: TagTemplate,
      items: items.filter((item) => item.node.fields.tags && item.node.fields.tags.includes(kebabTag)),
      itemsPerPage,
      pathPrefix: `/tag/${kebabTag}`,
      context: {
        slug: tag,
      },
    });
  });
};
