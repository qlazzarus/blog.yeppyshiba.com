import React, { FunctionalComponent } from 'react';
import { Image as ChakraImage } from '@chakra-ui/react';

interface ImageProps = {
  src: string;
  alt?: string
}

const Image: FunctionalComponent<ImageProps> = ({ src, alt, ...props }) => {
  const isExternal = /^([a-zA-Z]{2,20}):\/\/.+/.test(src);
  if (isExternal) {
    return <ChakraImage src={src} alt={props.alt || ''} loading={'lazy'} />;
  }

  return <ChakraImage src={src} alt={props.alt || ''} {...props} />;
};

export default Image;
