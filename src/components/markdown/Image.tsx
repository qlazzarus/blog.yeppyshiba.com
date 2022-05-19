import React, { FunctionComponent } from 'react';
import { Box, Image as ChakraImage, Text, VStack } from '@chakra-ui/react';

interface ImageProps {
  src: string;
  alt?: string
}

const Image: FunctionComponent<ImageProps> = ({ src, alt, ...props }) => {
  const isExternal = /^([a-zA-Z]{2,20}):\/\/.+/.test(src);
  if (isExternal) {
    return (
      <VStack as={'span'} justify={'center'} my={4}>
        <Box as={'span'} maxW={1000}>
          <ChakraImage 
            src={src} 
            alt={alt || ''} 
            loading={'lazy'} 
          />
        </Box>
        {alt && <Text as={'span'}>{alt}</Text>}
      </VStack>
    );
  }
  
  // here goes to 
  return <ChakraImage src={src} alt={alt || ''} {...props} />;
};

export default Image;
