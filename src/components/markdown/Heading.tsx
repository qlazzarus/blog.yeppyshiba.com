import React from 'react';
import { Heading as ChakraHeading } from '@chakra-ui/react';

const Heading = (props: any) => {
    const sizes = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const level: number = props.level;
  
    return <ChakraHeading my={4} as={`h${level}`} size={sizes[level - 1]} {...props} />;
};

export default Heading;