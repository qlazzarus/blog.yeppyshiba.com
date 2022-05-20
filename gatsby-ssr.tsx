import React from 'react';
import config from './gatsby-config';

export const onRenderBody = ({ pathname, setHeadComponents }) => {
    const siteUrl = `${config.siteMetadata.siteUrl}${pathname}`;

    setHeadComponents([
        <link key={'link-canonical'} rel="canonical" href={siteUrl} />,
        <meta key={'og-url'} property="og:url" content={siteUrl} />
    ]);
};
