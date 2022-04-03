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
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-embed-video`,
            options: {
              width: 768,
            },
          },
          `gatsby-remark-emojis`,
          {
            resolve: `gatsby-remark-prismjs`,
            options: {
              classPrefix: 'language-',
            },
          },
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 768,
              quality: 100,
              withWebp: true,
            },
          },
          {
            resolve: `gatsby-remark-external-links`,
            options: {
              target: '_blank',
              ref: 'nofollow',
            },
          },
        ],
      },
    },
  ],
};

export default config;
