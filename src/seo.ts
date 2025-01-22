import { Metadata } from 'next';
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig();
const { siteMetadata } = publicRuntimeConfig;

interface GenerateMetadataOptions {
    title?: string;
    description?: string;
    url?: string;
    image?: string;
    embeddedImagesLocal?: string;
    keywords?: string;
}

const generatePageMetadata = ({
    title,
    description,
    url,
    image,
    embeddedImagesLocal,
    keywords,
}: GenerateMetadataOptions): Metadata => {
    const defaultTitle = siteMetadata.title;
    const defaultDescription = siteMetadata.description;
    const defaultUrl = siteMetadata.siteUrl;
    const defaultImage = `${defaultUrl}/assets/og-image.png`;

    if (embeddedImagesLocal) {
        image = `${defaultUrl}${embeddedImagesLocal}`;
    }

    return {
        title: title ? `${title} - ${defaultTitle}` : defaultTitle,
        description: description || defaultDescription,
        keywords,
        openGraph: {
            type: 'website',
            title: title || defaultTitle,
            description: description || defaultDescription,
            url: `${defaultUrl}${url}` || defaultUrl,
            images: [image || defaultImage],
        },
        alternates: {
            canonical: url || defaultUrl,
        },
    };
};

export default generatePageMetadata;
