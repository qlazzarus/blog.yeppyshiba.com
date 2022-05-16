import React from 'react';
import { Image as ChakraImage } from '@chakra-ui/react';

const Image = (props: any) => {
  const isExternal = /^([a-zA-Z]{2,20}):\/\/.+/.test(props.src);
  if (isExternal) {
    console.log(props);
  }

  return <ChakraImage {...props} />;
};

export default Image;
