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
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: 'G-P6NE4VJRLC',
        head: false,
        anonymize: false,
        respectDNT: false,
        exclude: [],
        pageTransitionDelay: 0,
        defer: false,
        enableWebVitalsTracking: true,
      },
    },
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
    `gatsby-plugin-image`,
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
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.mdx`, `.md`],
        gatsbyRemarkPlugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 1000,
              linkImagesToOriginal: false,
              showCaptions: true,
              withWebp: true,
            },
          },
        ],
        rehypePlugins: [],
      },
    },
  ],
};

export default config;
