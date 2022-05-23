import React, { FunctionComponent } from 'react';
import { Box, Image as ChakraImage } from '@chakra-ui/react';

interface ImageProps {
  src: string;
  alt?: string
}

const Image: FunctionComponent<ImageProps> = ({ src, alt, ...props }) => {
  const isExternal = /^([a-zA-Z]{2,20}):\/\/.+/.test(src);
  if (isExternal) {
    return (
      <figure>
        <Box maxW={1000} mx={'auto'}>
          <ChakraImage 
            src={src} 
            alt={alt || ''} 
            loading={'lazy'} 
            mx={'auto'}
          />
        </Box>
        {alt && <figcaption>{alt}</figcaption>}
      </figure>
    );
  }
  
  // here goes to 
  return <ChakraImage src={src} alt={alt || ''} {...props} />;
};

export default Image;
