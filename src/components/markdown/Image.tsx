import React, { FunctionalComponent } from 'react';
import { Box, HStack, Image as ChakraImage } from '@chakra-ui/react';

interface ImageProps {
  src: string;
  alt?: string
}

const Image: FunctionalComponent<ImageProps> = ({ src, alt, ...props }) => {
  const isExternal = /^([a-zA-Z]{2,20}):\/\/.+/.test(src);
  if (isExternal) {
    return (
      <HStack justify={'center'}>
        <Box maxW={1000}>
          <figure>
            <ChakraImage 
              src={src} 
              alt={alt || ''} 
              loading={'lazy'} 
            />
            {alt && <figcaption>{alt}</figcaption>}
          </figure>
        </Box>
      </HStack>
    );
  }
  
  return <ChakraImage src={src} alt={alt || ''} {...props} />;
};

export default Image;
