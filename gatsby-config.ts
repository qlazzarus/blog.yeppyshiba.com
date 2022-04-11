import type { GatsbyConfig } from 'gatsby';
import path from 'path';

const siteUrl = `https://blog.yeppyshiba.com`;

interface SiteMetadata {
  [index: string]: string;
  title: string;
  siteUrl: string;
}

const siteMetadata: SiteMetadata = {
  title: `Yeppyshiba Blog`,
  siteUrl,
};

const config: GatsbyConfig = {
  siteMetadata,
  plugins: [
    {
      resolve: `@chakra-ui/gatsby-plugin`,
      options: {
        resetCSS: true,
        isUsingColorMode: true,
      },
    },
    {
      resolve: `gatsby-plugin-canonical-urls`,
      options: {
        siteUrl,
        stripQueryString: true,
      },
    },
    {
      resolve: `gatsby-plugin-robots-txt`,
      options: {
        policy: [{ userAgent: '*', allow: '/' }],
      },
    },
    {
      resolve: `gatsby-plugin-typescript`,
      options: {
        isTSX: true,
        allExtensions: true,
      },
    },
    `gatsby-plugin-emotion`,
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `contents`,
        path: path.resolve('contents'),
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: path.resolve('static'),
      },
    },
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-sharp`,
      options: {
        defaults: {
          formats: ['auto', 'webp'],
          quality: 100,
          placeholder: 'blurred',
        },
      },
    },
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.mdx`, `.md`],
        gatsbyRemarkPlugins: [
          {
            resolve: `gatsby-remark-images`,
          },
        ],
        rehypePlugins: [
          /*
          require('rehype-slug'),
          [
            require('rehype-autolink-headings'),
            {
              behavior: 'wrap'
            }
          ]
          */
        ],
      },
    },
  ],
};

export default config;
