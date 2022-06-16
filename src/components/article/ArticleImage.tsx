import React, { FunctionComponent } from 'react';
import { navigate } from 'gatsby';
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import { Image } from '@chakra-ui/react';
import { ArticleListItemType } from '@/types';
import { ImageUtil } from '@/utils';

const ArticleImage: FunctionComponent<{ entry: ArticleListItemType }> = ({
  entry: {
    fields: { slug },
    frontmatter: { image, embeddedImagesLocal, title },
  },
}) => {
  const gatsbyImage = embeddedImagesLocal && getImage(embeddedImagesLocal.childImageSharp.gatsbyImageData);

  if (gatsbyImage) {
    return (
      <GatsbyImage
        alt={title}
        image={gatsbyImage}
        onClick={() => navigate(`/article/${slug}`)}
        objectFit={'cover'}
        objectPosition={'center'}
        style={{
          cursor: 'pointer',
          width: '100%',
          height: '100%',
        }}
      />
    );
  }

  return (
    <Image
      alt={title}
      src={ImageUtil.getImage(image)}
      objectFit={'cover'}
      objectPosition={'center'}
      width={'full'}
      height={'full'}
      onClick={() => navigate(`/article/${slug}`)}
      cursor={'pointer'}
      loading={'lazy'}
    />
  );
};

export default ArticleImage;
