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
          <ChakraImage 
            src={src} 
            alt={props.alt || ''} 
            loading={'lazy'} 
          />
        </Box>
      </HStack>
    );
  }

  return <ChakraImage src={src} alt={props.alt || ''} {...props} />;
};

export default Image;
